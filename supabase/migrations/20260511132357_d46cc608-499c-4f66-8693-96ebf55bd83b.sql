
CREATE TABLE public.prontuario_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prontuario_id UUID NOT NULL,
  militar_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'laudo',
  descricao TEXT,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prontuario_anexos_prontuario ON public.prontuario_anexos(prontuario_id);

ALTER TABLE public.prontuario_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access prontuario_anexos"
  ON public.prontuario_anexos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Military view own prontuario_anexos"
  ON public.prontuario_anexos FOR SELECT TO authenticated
  USING (militar_id IN (
    SELECT m.id FROM militares m
    JOIN profiles p ON m.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

INSERT INTO storage.buckets (id, name, public) VALUES ('prontuario-anexos', 'prontuario-anexos', false);

CREATE POLICY "Admins manage prontuario-anexos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'prontuario-anexos' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'prontuario-anexos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Military read own prontuario-anexos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'prontuario-anexos'
    AND EXISTS (
      SELECT 1 FROM public.prontuario_anexos a
      JOIN public.militares m ON m.id = a.militar_id
      JOIN public.profiles p ON p.id = m.profile_id
      WHERE a.file_path = storage.objects.name
        AND p.user_id = auth.uid()
    )
  );
