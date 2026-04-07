import Link from "next/link";
import { redirect } from "next/navigation";
import SharedDocumentsClient from "./SharedDocumentsClient";
import { getCurrentUser } from "@/lib/document-auth";
import { createClient } from "@/lib/supabase-server";
import type { SharedDocumentRow } from "@/lib/types/documents";
import { getSafeNextPath } from "@/lib/safe-next-path";

export default async function SharedWithMePage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  if (!user?.email) {
    redirect(`/login?next=${encodeURIComponent(getSafeNextPath("/shared"))}`);
  }

  const email = user.email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("document_access")
    .select(
      `
      id,
      created_at,
      documents (
        id,
        title,
        file_type,
        file_size,
        created_at
      )
    `
    )
    .eq("investor_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("shared documents query:", error.message);
  }

  const rows: SharedDocumentRow[] = [];
  for (const row of data ?? []) {
    const nested = row.documents as unknown;
    const docRaw = Array.isArray(nested) ? nested[0] : nested;
    const doc = docRaw as
      | {
          id: string;
          title: string;
          file_type: string | null;
          file_size: number | null;
          created_at: string;
        }
      | null
      | undefined;
    if (!doc?.id) continue;
    rows.push({
      accessId: row.id as string,
      documentId: doc.id,
      title: doc.title,
      fileType: doc.file_type,
      fileSize: doc.file_size != null ? Number(doc.file_size) : null,
      documentCreatedAt: doc.created_at,
      sharedAt: row.created_at as string,
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Shared with me</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Click a document to open it. This list includes older shares and new ones.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <SharedDocumentsClient rows={rows} />
      </main>
    </div>
  );
}
