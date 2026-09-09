CREATE TABLE public.portal_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  student_name text NOT NULL,
  assignment text NOT NULL,
  subject text,
  rubric text,
  submission text,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100,
  letter text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_grades TO authenticated;
GRANT ALL ON public.portal_grades TO service_role;
ALTER TABLE public.portal_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own grades"
ON public.portal_grades FOR ALL TO authenticated
USING (teacher_id = auth.uid() AND public.has_role(auth.uid(), 'teacher'))
WITH CHECK (teacher_id = auth.uid() AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers read their own files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'teacher-files' AND public.has_role(auth.uid(), 'teacher') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers upload their own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'teacher-files' AND public.has_role(auth.uid(), 'teacher') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'teacher-files' AND public.has_role(auth.uid(), 'teacher') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'teacher-files' AND public.has_role(auth.uid(), 'teacher') AND (storage.foldername(name))[1] = auth.uid()::text);