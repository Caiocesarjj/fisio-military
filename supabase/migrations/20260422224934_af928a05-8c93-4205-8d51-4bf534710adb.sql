CREATE OR REPLACE FUNCTION public.can_confirm_own_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.militares m ON m.id = s.militar_id
    JOIN public.profiles p ON p.id = m.profile_id
    WHERE s.id = _session_id
      AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.restrict_military_session_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_confirm_own_session(OLD.id) THEN
    RAISE EXCEPTION 'Você não pode alterar esta sessão.';
  END IF;

  IF NEW.militar_id IS DISTINCT FROM OLD.militar_id
     OR NEW.fisio_id IS DISTINCT FROM OLD.fisio_id
     OR NEW.data_hora IS DISTINCT FROM OLD.data_hora
     OR NEW.duracao IS DISTINCT FROM OLD.duracao
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.anotacao_clinica IS DISTINCT FROM OLD.anotacao_clinica
     OR NEW.queixa IS DISTINCT FROM OLD.queixa
     OR NEW.lesoes IS DISTINCT FROM OLD.lesoes
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    RAISE EXCEPTION 'Você só pode confirmar a própria presença.';
  END IF;

  IF OLD.status <> 'agendado' THEN
    RAISE EXCEPTION 'Somente sessões agendadas podem ser confirmadas.';
  END IF;

  IF NEW.status NOT IN ('agendado', 'confirmado') THEN
    RAISE EXCEPTION 'Status inválido para confirmação.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_military_session_confirmation_trigger ON public.sessions;
CREATE TRIGGER restrict_military_session_confirmation_trigger
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.restrict_military_session_confirmation();

DROP POLICY IF EXISTS "Military confirm own sessions" ON public.sessions;
CREATE POLICY "Military confirm own sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (
  militar_id IN (
    SELECT m.id
    FROM public.militares m
    JOIN public.profiles p ON p.id = m.profile_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  militar_id IN (
    SELECT m.id
    FROM public.militares m
    JOIN public.profiles p ON p.id = m.profile_id
    WHERE p.user_id = auth.uid()
  )
);