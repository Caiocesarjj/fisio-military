
INSERT INTO storage.buckets (id, name, public) VALUES ('tcle-documents', 'tcle-documents', true);

CREATE POLICY "Authenticated users can upload TCLE documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tcle-documents');

CREATE POLICY "Authenticated users can view TCLE documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tcle-documents');

CREATE POLICY "Authenticated users can delete TCLE documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tcle-documents');
