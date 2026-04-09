
-- Add discharge columns to militares
ALTER TABLE public.militares
  ADD COLUMN IF NOT EXISTS status_militar TEXT NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS motivo_alta TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_alta TEXT,
  ADD COLUMN IF NOT EXISTS data_alta TIMESTAMP WITH TIME ZONE;

-- Migrate existing data from ativo boolean
UPDATE public.militares SET status_militar = CASE WHEN ativo = true THEN 'ativo' ELSE 'inativo' END;
