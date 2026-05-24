-- Security hardening for the signup trigger (Supabase advisors 0011/0028/0029):
-- pin search_path so the SECURITY DEFINER function cannot be schema-hijacked,
-- and revoke direct RPC execute (it is only ever invoked as a trigger).
ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
