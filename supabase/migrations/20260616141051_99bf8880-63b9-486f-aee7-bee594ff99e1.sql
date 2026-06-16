
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vercel_token TEXT;

CREATE TABLE public.build_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  framework TEXT NOT NULL DEFAULT 'vite-react',
  files JSONB NOT NULL DEFAULT '{}'::jsonb,
  vercel_project_id TEXT,
  last_deploy_url TEXT,
  last_deploy_status TEXT,
  last_deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.build_projects TO authenticated;
GRANT ALL ON public.build_projects TO service_role;

ALTER TABLE public.build_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own build projects" ON public.build_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own build projects" ON public.build_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own build projects" ON public.build_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own build projects" ON public.build_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER build_projects_touch_updated_at BEFORE UPDATE ON public.build_projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX build_projects_user_id_idx ON public.build_projects(user_id, updated_at DESC);
