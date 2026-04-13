
CREATE TABLE public.duvidas_exercicios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  resposta TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.duvidas_exercicios ENABLE ROW LEVEL SECURITY;

-- Patients can view their own questions
CREATE POLICY "Users can view own duvidas"
ON public.duvidas_exercicios
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Patients can create questions
CREATE POLICY "Users can create duvidas"
ON public.duvidas_exercicios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins full access duvidas"
ON public.duvidas_exercicios
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
