CREATE TABLE public.user_deploy_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vercel_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.user_deploy_credentials TO service_role;

ALTER TABLE public.user_deploy_credentials ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: tokens are only reachable by trusted server code (service role).

CREATE TRIGGER user_deploy_credentials_touch_updated_at
BEFORE UPDATE ON public.user_deploy_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.user_deploy_credentials (user_id, vercel_token)
SELECT id, vercel_token FROM public.profiles WHERE vercel_token IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN vercel_token;