-- 1) Lock down the internal SECURITY DEFINER helper: not callable from the API
REVOKE ALL ON FUNCTION public.is_unlimited_user(uuid) FROM PUBLIC, anon, authenticated;

-- Keep quota RPCs callable only by signed-in users (not anon/public)
REVOKE ALL ON FUNCTION public.consume_chat_quota(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_game_credits(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_chat_quota(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_game_credits(text, integer) TO authenticated;

-- 2) chat_usage: explicit deny-by-default for direct writes
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.chat_usage FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.chat_usage FROM anon;
GRANT SELECT ON public.chat_usage TO authenticated;
GRANT ALL ON public.chat_usage TO service_role;

DROP POLICY IF EXISTS "No direct inserts to chat_usage" ON public.chat_usage;
DROP POLICY IF EXISTS "No direct updates to chat_usage" ON public.chat_usage;
DROP POLICY IF EXISTS "No direct deletes to chat_usage" ON public.chat_usage;

CREATE POLICY "No direct inserts to chat_usage"
  ON public.chat_usage AS RESTRICTIVE FOR INSERT
  TO anon, authenticated WITH CHECK (false);

CREATE POLICY "No direct updates to chat_usage"
  ON public.chat_usage AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No direct deletes to chat_usage"
  ON public.chat_usage AS RESTRICTIVE FOR DELETE
  TO anon, authenticated USING (false);