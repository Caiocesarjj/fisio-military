
ALTER TABLE public.sessions ADD COLUMN queixa text;
ALTER TABLE public.sessions ADD COLUMN lesoes jsonb DEFAULT '[]'::jsonb;
