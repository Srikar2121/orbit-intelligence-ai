
REVOKE EXECUTE ON FUNCTION public.consume_chat_quota(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_game_credits(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_chat_quota(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_game_credits(text, integer) TO authenticated;
