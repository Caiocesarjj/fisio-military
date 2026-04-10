
-- Tabela principal de prontuários
CREATE TABLE public.prontuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  militar_id UUID NOT NULL REFERENCES public.militares(id) ON DELETE CASCADE,
  fisio_id UUID NOT NULL,
  
  -- Anamnese
  queixa_principal TEXT,
  historia_doenca_atual TEXT,
  doencas_associadas TEXT,
  historico_cirurgias TEXT,
  uso_medicamentos TEXT,
  habitos_vida TEXT,
  
  -- Avaliação Fisioterapêutica
  inspecao TEXT,
  palpacao TEXT,
  amplitude_movimento TEXT,
  forca_muscular TEXT,
  testes_funcionais TEXT,
  escalas TEXT,
  
  -- Diagnóstico e Prognóstico
  diagnostico_fisio TEXT,
  prognostico TEXT,
  
  -- Plano Terapêutico
  objetivos TEXT,
  tecnicas_recursos TEXT,
  frequencia_tratamento TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de evoluções diárias
CREATE TABLE public.prontuario_evolucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  militar_id UUID NOT NULL REFERENCES public.militares(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  procedimentos_realizados TEXT,
  resposta_paciente TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS prontuarios
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access prontuarios"
ON public.prontuarios FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Military view own prontuarios"
ON public.prontuarios FOR SELECT
TO authenticated
USING (
  militar_id IN (
    SELECT m.id FROM militares m
    JOIN profiles p ON m.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS prontuario_evolucoes
ALTER TABLE public.prontuario_evolucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access prontuario_evolucoes"
ON public.prontuario_evolucoes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Military view own prontuario_evolucoes"
ON public.prontuario_evolucoes FOR SELECT
TO authenticated
USING (
  militar_id IN (
    SELECT m.id FROM militares m
    JOIN profiles p ON m.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Trigger updated_at
CREATE TRIGGER update_prontuarios_updated_at
BEFORE UPDATE ON public.prontuarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
