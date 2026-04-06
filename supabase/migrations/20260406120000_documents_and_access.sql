-- Documents metadata, sharing, and activity logs
-- Run in Supabase SQL Editor or via supabase db push

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_owner_user_id_idx ON public.documents (owner_user_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON public.documents (created_at DESC);

CREATE TABLE IF NOT EXISTS public.document_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  investor_email text NOT NULL,
  granted_by_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (document_id, investor_email)
);

CREATE INDEX IF NOT EXISTS document_access_document_id_idx ON public.document_access (document_id);
CREATE INDEX IF NOT EXISTS document_access_investor_email_lower_idx ON public.document_access (lower(investor_email));

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- documents
DROP POLICY IF EXISTS "documents_select_owner" ON public.documents;
CREATE POLICY "documents_select_owner"
  ON public.documents FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "documents_select_shared_investor" ON public.documents;
CREATE POLICY "documents_select_shared_investor"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.document_access da
      WHERE da.document_id = documents.id
        AND lower(da.investor_email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "documents_insert_owner" ON public.documents;
CREATE POLICY "documents_insert_owner"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "documents_update_owner" ON public.documents;
CREATE POLICY "documents_update_owner"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "documents_delete_owner" ON public.documents;
CREATE POLICY "documents_delete_owner"
  ON public.documents FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- document_access: owners manage rows for their documents; investors can read only their own rows
DROP POLICY IF EXISTS "document_access_select_owner" ON public.document_access;
CREATE POLICY "document_access_select_owner"
  ON public.document_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_access.document_id
        AND d.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "document_access_select_investor" ON public.document_access;
CREATE POLICY "document_access_select_investor"
  ON public.document_access FOR SELECT
  TO authenticated
  USING (
    lower(investor_email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "document_access_insert_owner" ON public.document_access;
CREATE POLICY "document_access_insert_owner"
  ON public.document_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_access.document_id
        AND d.owner_user_id = auth.uid()
    )
    AND granted_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "document_access_delete_owner" ON public.document_access;
CREATE POLICY "document_access_delete_owner"
  ON public.document_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_access.document_id
        AND d.owner_user_id = auth.uid()
    )
  );

-- activity_logs
DROP POLICY IF EXISTS "activity_logs_select_own" ON public.activity_logs;
CREATE POLICY "activity_logs_select_own"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_own"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, null, null)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS policies
DROP POLICY IF EXISTS "documents_storage_owner_insert" ON storage.objects;
CREATE POLICY "documents_storage_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_storage_owner_update" ON storage.objects;
CREATE POLICY "documents_storage_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_storage_owner_delete" ON storage.objects;
CREATE POLICY "documents_storage_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_storage_owner_select" ON storage.objects;
CREATE POLICY "documents_storage_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_storage_shared_investor_select" ON storage.objects;
CREATE POLICY "documents_storage_shared_investor_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      JOIN public.document_access da ON da.document_id = d.id
      WHERE d.file_path = name
        AND lower(da.investor_email) = lower(auth.jwt() ->> 'email')
    )
  );
