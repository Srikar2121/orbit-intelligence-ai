CREATE TABLE public.chat_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text CHECK (char_length(description) <= 500),
  icon text NOT NULL DEFAULT '🪐' CHECK (char_length(icon) <= 16),
  context text CHECK (char_length(context) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_projects TO authenticated;
GRANT ALL ON public.chat_projects TO service_role;
ALTER TABLE public.chat_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects select" ON public.chat_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own projects insert" ON public.chat_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own projects update" ON public.chat_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own projects delete" ON public.chat_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX chat_projects_user_idx ON public.chat_projects(user_id, updated_at DESC);

ALTER TABLE public.chat_threads ADD COLUMN project_id uuid REFERENCES public.chat_projects(id) ON DELETE CASCADE;
CREATE INDEX chat_threads_project_idx ON public.chat_threads(project_id);

CREATE TABLE public.user_plugins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled text[] NOT NULL DEFAULT ARRAY['weather','calculator','wikipedia','clock']::text[],
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_plugins TO authenticated;
GRANT ALL ON public.user_plugins TO service_role;
ALTER TABLE public.user_plugins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plugins select" ON public.user_plugins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own plugins insert" ON public.user_plugins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own plugins update" ON public.user_plugins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);