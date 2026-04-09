
ALTER TABLE public.session_notes
  ADD COLUMN IF NOT EXISTS queixa_principal TEXT,
  ADD COLUMN IF NOT EXISTS conduta TEXT,
  ADD COLUMN IF NOT EXISTS progresso_exercicios JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evolucao_geral TEXT,
  ADD COLUMN IF NOT EXISTS proximos_objetivos TEXT;
