CREATE TABLE public.lesoes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  militar_id uuid NOT NULL,
  regiao text NOT NULL,
  segmento text NOT NULL,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  status text NOT NULL DEFAULT 'ativa',
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesoes_historico_militar ON public.lesoes_historico(militar_id);

ALTER TABLE public.lesoes_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access lesoes_historico"
ON public.lesoes_historico FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Military view own lesoes_historico"
ON public.lesoes_historico FOR SELECT TO authenticated
USING (militar_id IN (
  SELECT m.id FROM militares m
  JOIN profiles p ON m.profile_id = p.id
  WHERE p.user_id = auth.uid()
));

CREATE TRIGGER update_lesoes_historico_updated_at
BEFORE UPDATE ON public.lesoes_historico
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();