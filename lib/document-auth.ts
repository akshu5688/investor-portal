import type { SupabaseClient, User } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 600;

export async function getCurrentUser(
  supabase: SupabaseClient
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

export async function isDocumentOwner(
  supabase: SupabaseClient,
  documentId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }
  return true;
}

export async function userHasDocumentAccess(
  supabase: SupabaseClient,
  documentId: string,
  userEmail: string
): Promise<boolean> {
  const normalized = userEmail.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const { data, error } = await supabase
    .from("document_access")
    .select("id")
    .eq("document_id", documentId)
    .eq("investor_email", normalized)
    .maybeSingle();

  if (error || !data) {
    return false;
  }
  return true;
}

export async function createDocumentSignedUrl(
  supabase: SupabaseClient,
  filePath: string
): Promise<{ signedUrl: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return {
      error: error?.message ?? "Could not create a secure link for this file.",
    };
  }
  return { signedUrl: data.signedUrl };
}

export const documentSignedUrlTtlSeconds = SIGNED_URL_TTL_SECONDS;
