-- Authoritative server time voor caller/crew clock sync.
-- Client meet offset tussen Date.now() en server_time bij connect,
-- past offset toe op alle countdown/elapsed berekeningen, zodat timers
-- niet driften door klokverschillen tussen devices.

CREATE OR REPLACE FUNCTION public.server_time()
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT now() $$;

GRANT EXECUTE ON FUNCTION public.server_time() TO anon, authenticated;

COMMENT ON FUNCTION public.server_time() IS
  'Retourneert Postgres now() als authoritative clock voor client-side offset correctie.';
