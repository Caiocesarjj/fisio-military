
-- Criar bucket para mídia dos exercícios (GIFs e vídeos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-media', 'exercise-media', true);

-- Qualquer pessoa pode visualizar os arquivos (bucket público)
CREATE POLICY "Public can view exercise media"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-media');

-- Admins podem fazer upload
CREATE POLICY "Admins can upload exercise media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-media'
  AND public.has_role(auth.uid(), 'admin')
);

-- Admins podem atualizar
CREATE POLICY "Admins can update exercise media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercise-media'
  AND public.has_role(auth.uid(), 'admin')
);

-- Admins podem deletar
CREATE POLICY "Admins can delete exercise media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-media'
  AND public.has_role(auth.uid(), 'admin')
);
