-- =============================================================================
-- Phase 10: Shot-Cam Penalty Portal - Supabase Storage & Row-Level Security (RLS)
-- File: supabase/penalty_media_storage_and_rls.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create 'penalty-media' Storage Bucket
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'penalty-media',
    'penalty-media',
    false, -- Private bucket: access strictly controlled via RLS
    20971520, -- 20 MB max file size limit (enforces client/storage limits)
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/heic',
        'video/mp4',
        'video/quicktime',
        'video/webm'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Storage Path Resolution Helper Functions
-- Supports storage path formats:
--   a) 'pools/<pool_id>/penalties/<penalty_id>/<filename>'
--   b) '<pool_id>/<penalty_id>/<filename>'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pool_id_from_storage_path(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF split_part(object_name, '/', 1) = 'pools' THEN
        RETURN split_part(object_name, '/', 2)::uuid;
    ELSE
        RETURN split_part(object_name, '/', 1)::uuid;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_penalty_id_from_storage_path(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF split_part(object_name, '/', 1) = 'pools' THEN
        RETURN split_part(object_name, '/', 4)::uuid;
    ELSE
        RETURN split_part(object_name, '/', 2)::uuid;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Storage Row-Level Security (storage.objects)
-- -----------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies for idempotency
DROP POLICY IF EXISTS "Allow pool members to view penalty media" ON storage.objects;
DROP POLICY IF EXISTS "Allow penalty owner or commissioner to upload penalty media" ON storage.objects;
DROP POLICY IF EXISTS "Allow penalty owner or commissioner to update penalty media" ON storage.objects;
DROP POLICY IF EXISTS "Allow penalty owner or commissioner to delete penalty media" ON storage.objects;

-- Policy 1: SELECT (Restricted to active pool members or pool commissioner)
CREATE POLICY "Allow pool members to view penalty media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'penalty-media'
    AND (
        -- Global admin bypass
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
        OR
        -- Active pool member or pool commissioner
        EXISTS (
            SELECT 1
            FROM public.pool_memberships pm
            JOIN public.pools p ON p.id = pm.pool_id
            WHERE pm.pool_id = public.get_pool_id_from_storage_path(storage.objects.name)
              AND (
                  (pm.user_id = auth.uid() AND pm.status = 'ACTIVE')
                  OR p.admin_id = auth.uid()
              )
        )
    )
);

-- Policy 2: INSERT (Restricted to the penalty owner or pool commissioner)
CREATE POLICY "Allow penalty owner or commissioner to upload penalty media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'penalty-media'
    AND (
        -- Global admin bypass
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
        OR
        -- Penalty owner or Pool commissioner
        EXISTS (
            SELECT 1
            FROM public.penalty_ledger pl
            JOIN public.pools p ON p.id = pl.pool_id
            WHERE pl.id = public.get_penalty_id_from_storage_path(storage.objects.name)
              AND (
                  pl.user_id = auth.uid()
                  OR p.admin_id = auth.uid()
              )
        )
    )
);

-- Policy 3: UPDATE (Restricted to the penalty owner or pool commissioner)
CREATE POLICY "Allow penalty owner or commissioner to update penalty media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'penalty-media'
    AND (
        -- Global admin bypass
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
        OR
        -- Penalty owner or Pool commissioner
        EXISTS (
            SELECT 1
            FROM public.penalty_ledger pl
            JOIN public.pools p ON p.id = pl.pool_id
            WHERE pl.id = public.get_penalty_id_from_storage_path(storage.objects.name)
              AND (
                  pl.user_id = auth.uid()
                  OR p.admin_id = auth.uid()
              )
        )
    )
)
WITH CHECK (
    bucket_id = 'penalty-media'
    AND (
        -- Global admin bypass
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
        OR
        -- Penalty owner or Pool commissioner
        EXISTS (
            SELECT 1
            FROM public.penalty_ledger pl
            JOIN public.pools p ON p.id = pl.pool_id
            WHERE pl.id = public.get_penalty_id_from_storage_path(storage.objects.name)
              AND (
                  pl.user_id = auth.uid()
                  OR p.admin_id = auth.uid()
              )
        )
    )
);

-- Policy 4: DELETE (Restricted to the penalty owner or pool commissioner)
CREATE POLICY "Allow penalty owner or commissioner to delete penalty media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'penalty-media'
    AND (
        -- Global admin bypass
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
        OR
        -- Penalty owner or Pool commissioner
        EXISTS (
            SELECT 1
            FROM public.penalty_ledger pl
            JOIN public.pools p ON p.id = pl.pool_id
            WHERE pl.id = public.get_penalty_id_from_storage_path(storage.objects.name)
              AND (
                  pl.user_id = auth.uid()
                  OR p.admin_id = auth.uid()
              )
        )
    )
);

-- -----------------------------------------------------------------------------
-- 4. Database Table Row-Level Security (public.penalty_media)
-- -----------------------------------------------------------------------------
ALTER TABLE public.penalty_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow pool members to view penalty media metadata" ON public.penalty_media;
DROP POLICY IF EXISTS "Allow penalty owner or commissioner to insert penalty media metadata" ON public.penalty_media;
DROP POLICY IF EXISTS "Allow penalty owner or commissioner to update penalty media metadata" ON public.penalty_media;
DROP POLICY IF EXISTS "Allow penalty owner or commissioner to delete penalty media metadata" ON public.penalty_media;

-- SELECT: Accessible to active pool members or pool commissioner
CREATE POLICY "Allow pool members to view penalty media metadata"
ON public.penalty_media
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
    OR
    EXISTS (
        SELECT 1
        FROM public.pool_memberships pm
        JOIN public.pools p ON p.id = pm.pool_id
        WHERE pm.pool_id = penalty_media.pool_id
          AND (
              (pm.user_id = auth.uid() AND pm.status = 'ACTIVE')
              OR p.admin_id = auth.uid()
          )
    )
);

-- INSERT: Restricted to penalty owner or pool commissioner
CREATE POLICY "Allow penalty owner or commissioner to insert penalty media metadata"
ON public.penalty_media
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
    OR
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.pools p
        WHERE p.id = penalty_media.pool_id AND p.admin_id = auth.uid()
    )
);

-- UPDATE: Restricted to penalty owner or pool commissioner
CREATE POLICY "Allow penalty owner or commissioner to update penalty media metadata"
ON public.penalty_media
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
    OR
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.pools p
        WHERE p.id = penalty_media.pool_id AND p.admin_id = auth.uid()
    )
);

-- DELETE: Restricted to penalty owner or pool commissioner
CREATE POLICY "Allow penalty owner or commissioner to delete penalty media metadata"
ON public.penalty_media
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
    OR
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.pools p
        WHERE p.id = penalty_media.pool_id AND p.admin_id = auth.uid()
    )
);
