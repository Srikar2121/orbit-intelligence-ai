-- 1. Stop self-assignment of roles
DROP POLICY IF EXISTS "Users claim own role" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;

-- 2. Requests table
CREATE TABLE IF NOT EXISTS public.teacher_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);

GRANT SELECT ON public.teacher_access_requests TO authenticated;
GRANT ALL ON public.teacher_access_requests TO service_role;
ALTER TABLE public.teacher_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own teacher request" ON public.teacher_access_requests;
CREATE POLICY "Users view own teacher request" ON public.teacher_access_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view teacher requests" ON public.teacher_access_requests;
CREATE POLICY "Admins view teacher requests" ON public.teacher_access_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Owner becomes admin (and teacher)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role FROM auth.users u
WHERE lower(u.email) = lower('Challavenkatasrikar21@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'teacher'::public.app_role FROM auth.users u
WHERE lower(u.email) = lower('Challavenkatasrikar21@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Request function (self-service, never grants the role)
CREATE OR REPLACE FUNCTION public.request_teacher_access(_contact_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF public.has_role(_uid, 'teacher') THEN
    RETURN 'approved';
  END IF;

  INSERT INTO public.teacher_access_requests (user_id, contact_email)
  VALUES (_uid, left(coalesce(_contact_email, ''), 200))
  ON CONFLICT (user_id) DO UPDATE SET contact_email = excluded.contact_email;

  RETURN (SELECT status FROM public.teacher_access_requests WHERE user_id = _uid);
END;
$$;

REVOKE ALL ON FUNCTION public.request_teacher_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_teacher_access(text) TO authenticated;

-- 5. Admin decision function
CREATE OR REPLACE FUNCTION public.decide_teacher_access(_user_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  UPDATE public.teacher_access_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         decided_at = now(),
         decided_by = auth.uid()
   WHERE user_id = _user_id;

  IF _approve THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'teacher')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'teacher';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_teacher_access(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_teacher_access(uuid, boolean) TO authenticated;