-- Phase 38-S2: Enum Hardening, Generic Auth Trigger & Onboarding RPCs
ALTER TYPE public."PoolRole" ADD VALUE IF NOT EXISTS 'COMMISSIONER';

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ DECLARE v_default_pool_id UUID := '9b893bef-3b5a-4ffa-951d-8ba27f9c9782'; v_display_name TEXT; v_global_role public."Role" := 'USER'::public."Role"; v_pool_role public."PoolRole" := 'MEMBER'::public."PoolRole"; v_status public."Status" := 'PENDING'::public."Status"; BEGIN v_display_name := COALESCE( NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), SPLIT_PART(NEW.email, '@', 1) );    IF LOWER(NEW.email) = 'jack.w.cone@gmail.com' THEN v_global_role := 'ADMIN'::public."Role"; v_pool_role := 'COMMISSIONER'::public."PoolRole"; v_status := 'ACTIVE'::public."Status"; END IF;    INSERT INTO public.users (id, email, display_name, role, created_at, updated_at) VALUES (NEW.id, NEW.email, v_display_name, v_global_role, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, display_name = COALESCE(public.users.display_name, EXCLUDED.display_name), role = CASE WHEN LOWER(EXCLUDED.email) = 'jack.w.cone@gmail.com' THEN 'ADMIN'::public."Role" ELSE public.users.role END, updated_at = NOW();    INSERT INTO public.pool_memberships (id, pool_id, user_id, role, status, joined_at) VALUES (gen_random_uuid(), v_default_pool_id, NEW.id, v_pool_role, v_status, NOW()) ON CONFLICT (pool_id, user_id) DO UPDATE SET role = CASE WHEN LOWER(NEW.email) = 'jack.w.cone@gmail.com' THEN 'COMMISSIONER'::public."PoolRole" ELSE public.pool_memberships.role END, status = CASE WHEN LOWER(NEW.email) = 'jack.w.cone@gmail.com' THEN 'ACTIVE'::public."Status" ELSE public.pool_memberships.status END;    RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.get_pending_applicants(p_pool_id UUID)
RETURNS TABLE (
  membership_id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  status public."Status",
  role public."PoolRole",
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN RETURN QUERY SELECT pm.id AS membership_id, pm.user_id, u.email, u.display_name, pm.status, pm.role, pm.joined_at FROM public.pool_memberships pm JOIN public.users u ON u.id = pm.user_id WHERE pm.pool_id = p_pool_id AND pm.status = 'PENDING'::public."Status" ORDER BY pm.joined_at ASC; END; $$;

CREATE OR REPLACE FUNCTION public.adjudicate_applicant(
  p_pool_id UUID,
  p_target_user_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN UPDATE public.pool_memberships SET status = p_status::public."Status" WHERE pool_id = p_pool_id AND user_id = p_target_user_id;    RETURN FOUND; END; $$;

NOTIFY pgrst, 'reload schema';
