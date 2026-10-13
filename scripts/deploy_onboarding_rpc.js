const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.hosted'), 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
  if (!dbUrlMatch) throw new Error('DATABASE_URL not found');
  const dbUrl = dbUrlMatch[1];

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to hosted database.');

  try {
    // Check columns of public.users
    const userCols = await client.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users';
    `);
    console.log('users columns:', userCols.rows);

    // Check columns of public.pool_memberships
    const memCols = await client.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'pool_memberships';
    `);
    console.log('pool_memberships columns:', memCols.rows);

    // Check if display_name column exists on public.users
    const hasDisplayName = userCols.rows.some(r => r.column_name === 'display_name');
    if (!hasDisplayName) {
      console.log('Adding display_name to public.users...');
      await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;`);
    }

    // Make sure password_hash is nullable or has default for auth.users sync
    const pwCol = userCols.rows.find(r => r.column_name === 'password_hash');
    if (pwCol && pwCol.is_nullable === 'NO') {
      console.log('Making password_hash nullable...');
      await client.query(`ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;`);
    }

    // Check role column type
    const roleCol = userCols.rows.find(r => r.column_name === 'role');
    console.log('role column info:', roleCol);

    // If role is enum Role ('ADMIN', 'USER'), check if 'MEMBER' is a valid value
    if (roleCol && roleCol.data_type === 'USER-DEFINED') {
      const enumVals = await client.query(`
        SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = $1);
      `, [roleCol.udt_name]);
      console.log('Role enum values:', enumVals.rows.map(r => r.enumlabel));
    }

    // Deploy the requested RPC and data repair
    // Note: We handle role safely (if role is Role enum with USER/ADMIN, cast/default accordingly)
    await client.query(`
      -- 1. Create atomic, RLS-bypassing application RPC
      CREATE OR REPLACE FUNCTION public.apply_for_league(p_invite_code TEXT)
      RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
      DECLARE
        v_user_id UUID := auth.uid();
        v_email TEXT;
        v_pool_id UUID := '9b893bef-3b5a-4ffa-951d-8ba27f9c9782'::UUID;
      BEGIN
        IF v_user_id IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
        END IF;

        IF UPPER(TRIM(p_invite_code)) != 'MAIN26' THEN
          RETURN jsonb_build_object('success', false, 'error', 'Invalid league invite code');
        END IF;

        SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

        -- Upsert into public.users
        INSERT INTO public.users (id, email, display_name, role)
        VALUES (v_user_id, v_email, split_part(v_email, '@', 1), 'USER')
        ON CONFLICT (id) DO UPDATE SET 
          email = EXCLUDED.email,
          display_name = COALESCE(public.users.display_name, EXCLUDED.display_name);

        -- Upsert into public.pool_memberships
        INSERT INTO public.pool_memberships (pool_id, user_id, status, role)
        VALUES (v_pool_id, v_user_id, 'PENDING', 'MEMBER')
        ON CONFLICT (pool_id, user_id) DO UPDATE SET status = 'PENDING';

        RETURN jsonb_build_object('success', true, 'status', 'PENDING');
      END;
      $$;

      GRANT EXECUTE ON FUNCTION public.apply_for_league(TEXT) TO authenticated, anon, service_role;

      -- 2. Repair any orphaned accounts in auth.users missing pool_memberships
      INSERT INTO public.users (id, email, display_name, role)
      SELECT id, email, split_part(email, '@', 1), 'USER'
      FROM auth.users
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.pool_memberships (pool_id, user_id, status, role)
      SELECT '9b893bef-3b5a-4ffa-951d-8ba27f9c9782'::UUID, id, 'PENDING', 'MEMBER'
      FROM auth.users
      WHERE email != 'jack.w.cone@gmail.com'
      ON CONFLICT (pool_id, user_id) DO NOTHING;

      NOTIFY pgrst, 'reload schema';
    `);

    console.log('RPC public.apply_for_league deployed and data repair completed successfully!');

    // Verify applicants in pool_memberships
    const pendingRes = await client.query(`
      SELECT pm.pool_id, pm.user_id, pm.status, u.email, u.display_name
      FROM public.pool_memberships pm
      LEFT JOIN public.users u ON u.id = pm.user_id
      WHERE pm.pool_id = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782'::UUID;
    `);
    console.log('Current pool memberships count:', pendingRes.rowCount);
    console.log('Memberships sample:', pendingRes.rows.slice(0, 10));

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
