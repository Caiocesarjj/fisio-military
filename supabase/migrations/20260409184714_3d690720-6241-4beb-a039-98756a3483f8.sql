
-- =============================================
-- 1. FIX RLS POLICIES
-- =============================================

-- Drop existing policies to recreate them properly
-- militares
DROP POLICY IF EXISTS "Admins can manage militares" ON public.militares;
DROP POLICY IF EXISTS "Military can view own record" ON public.militares;

CREATE POLICY "Admins full access militares" ON public.militares FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Military view own record" ON public.militares FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Military update own record" ON public.militares FOR UPDATE TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- sessions
DROP POLICY IF EXISTS "Admins can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Military can view own sessions" ON public.sessions;

CREATE POLICY "Admins full access sessions" ON public.sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Military view own sessions" ON public.sessions FOR SELECT TO authenticated
  USING (militar_id IN (
    SELECT m.id FROM public.militares m
    JOIN public.profiles p ON m.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- treatment_plans
DROP POLICY IF EXISTS "Admins can manage plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Military can view own plans" ON public.treatment_plans;

CREATE POLICY "Admins full access plans" ON public.treatment_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Military view own plans" ON public.treatment_plans FOR SELECT TO authenticated
  USING (militar_id IN (
    SELECT m.id FROM public.militares m
    JOIN public.profiles p ON m.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- plan_exercises
DROP POLICY IF EXISTS "Admins can manage plan exercises" ON public.plan_exercises;
DROP POLICY IF EXISTS "Military can view own plan exercises" ON public.plan_exercises;

CREATE POLICY "Admins full access plan_exercises" ON public.plan_exercises FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Military view own plan_exercises" ON public.plan_exercises FOR SELECT TO authenticated
  USING (plan_id IN (
    SELECT tp.id FROM public.treatment_plans tp
    JOIN public.militares m ON tp.militar_id = m.id
    JOIN public.profiles p ON m.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- session_notes
DROP POLICY IF EXISTS "Admins can manage session notes" ON public.session_notes;
DROP POLICY IF EXISTS "Military can manage own notes" ON public.session_notes;

CREATE POLICY "Admins full access session_notes" ON public.session_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Military manage own notes" ON public.session_notes FOR ALL TO authenticated
  USING (militar_id IN (
    SELECT m.id FROM public.militares m
    JOIN public.profiles p ON m.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ))
  WITH CHECK (militar_id IN (
    SELECT m.id FROM public.militares m
    JOIN public.profiles p ON m.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- =============================================
-- 2. AUDIT LOGS TABLE
-- =============================================

CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela_afetada TEXT NOT NULL,
  operacao TEXT NOT NULL,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  usuario_id UUID,
  usuario_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_tabela ON public.audit_logs (tabela_afetada);

-- =============================================
-- 3. AUDIT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _user_name TEXT;
BEGIN
  _user_id := auth.uid();
  SELECT full_name INTO _user_name FROM public.profiles WHERE user_id = _user_id LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (tabela_afetada, operacao, registro_id, dados_novos, usuario_id, usuario_nome)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, to_jsonb(NEW), _user_id, _user_name);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (tabela_afetada, operacao, registro_id, dados_anteriores, dados_novos, usuario_id, usuario_nome)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), _user_id, _user_name);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (tabela_afetada, operacao, registro_id, dados_anteriores, usuario_id, usuario_nome)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, to_jsonb(OLD), _user_id, _user_name);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- =============================================
-- 4. ATTACH TRIGGERS
-- =============================================

CREATE TRIGGER audit_militares
  AFTER INSERT OR UPDATE OR DELETE ON public.militares
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_sessions
  AFTER INSERT OR UPDATE OR DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_treatment_plans
  AFTER INSERT OR UPDATE OR DELETE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
