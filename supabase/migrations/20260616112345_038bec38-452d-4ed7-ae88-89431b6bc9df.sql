
-- 1. Profiles: restrict SELECT to own row
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. chat_usage: explicitly deny client writes (only SECURITY DEFINER fn can write)
REVOKE INSERT, UPDATE, DELETE ON public.chat_usage FROM authenticated, anon;

-- 3. consume_chat_quota: revoke from anon (only authenticated users)
REVOKE EXECUTE ON FUNCTION public.consume_chat_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_chat_quota(text) TO authenticated;
