
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'military');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Militares table
CREATE TABLE public.militares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nip TEXT NOT NULL UNIQUE,
  nome_completo TEXT NOT NULL,
  nome_guerra TEXT NOT NULL,
  posto_graduacao TEXT NOT NULL,
  companhia TEXT NOT NULL,
  setor TEXT,
  telefone TEXT,
  email TEXT NOT NULL,
  foto_url TEXT,
  diagnostico TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.militares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage militares" ON public.militares
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Military can view own record" ON public.militares
  FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Exercises table
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL,
  dificuldade TEXT NOT NULL DEFAULT 'Moderado',
  instrucoes TEXT,
  video_url TEXT,
  imagem_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exercises" ON public.exercises
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view exercises" ON public.exercises
  FOR SELECT TO authenticated USING (true);

-- Treatment plans
CREATE TABLE public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  militar_id UUID REFERENCES public.militares(id) ON DELETE CASCADE NOT NULL,
  fisio_id UUID REFERENCES auth.users(id) NOT NULL,
  nome TEXT NOT NULL,
  objetivo TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plans" ON public.treatment_plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Military can view own plans" ON public.treatment_plans
  FOR SELECT USING (
    militar_id IN (
      SELECT m.id FROM public.militares m
      JOIN public.profiles p ON m.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Plan exercises
CREATE TABLE public.plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  series INTEGER DEFAULT 3,
  repeticoes INTEGER DEFAULT 10,
  descanso TEXT DEFAULT '60s',
  frequencia_semanal INTEGER DEFAULT 3,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plan exercises" ON public.plan_exercises
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Military can view own plan exercises" ON public.plan_exercises
  FOR SELECT USING (
    plan_id IN (
      SELECT tp.id FROM public.treatment_plans tp
      JOIN public.militares m ON tp.militar_id = m.id
      JOIN public.profiles p ON m.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  militar_id UUID REFERENCES public.militares(id) ON DELETE CASCADE NOT NULL,
  fisio_id UUID REFERENCES auth.users(id) NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao INTEGER NOT NULL DEFAULT 60,
  tipo TEXT NOT NULL DEFAULT 'presencial',
  status TEXT NOT NULL DEFAULT 'agendado',
  anotacao_clinica TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sessions" ON public.sessions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Military can view own sessions" ON public.sessions
  FOR SELECT USING (
    militar_id IN (
      SELECT m.id FROM public.militares m
      JOIN public.profiles p ON m.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Session notes
CREATE TABLE public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  militar_id UUID REFERENCES public.militares(id) ON DELETE CASCADE NOT NULL,
  nivel_dor INTEGER CHECK (nivel_dor >= 0 AND nivel_dor <= 10),
  observacoes_paciente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage session notes" ON public.session_notes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Military can manage own notes" ON public.session_notes
  FOR ALL USING (
    militar_id IN (
      SELECT m.id FROM public.militares m
      JOIN public.profiles p ON m.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_militares_updated_at BEFORE UPDATE ON public.militares FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_treatment_plans_updated_at BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for military photos
INSERT INTO storage.buckets (id, name, public) VALUES ('military-photos', 'military-photos', true);

CREATE POLICY "Anyone can view military photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'military-photos');
CREATE POLICY "Admins can upload military photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'military-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update military photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'military-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete military photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'military-photos' AND public.has_role(auth.uid(), 'admin'));
