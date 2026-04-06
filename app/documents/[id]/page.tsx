import Link from "next/link";
import { redirect } from "next/navigation";
import DocumentViewerClient from "./DocumentViewerClient";
import {
  createDocumentSignedUrl,
  documentSignedUrlTtlSeconds,
  getCurrentUser,
} from "@/lib/document-auth";
import { createClient } from "@/lib/supabase-server";
import { getPreviewKind } from "@/lib/file-preview";
import { getSafeNextPath } from "@/lib/safe-next-path";

interface PageProps {
  params: Promise<{ id: string }>;
}

function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You do not have permission to view this document, or it no longer exists.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export default async function DocumentPage({ params }: PageProps) {
  const { id: documentId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  if (!user) {
    const next = getSafeNextPath(`/documents/${documentId}`);
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, title, file_path, file_type, owner_user_id")
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !doc) {
    return <AccessDenied />;
  }

  const owner = doc.owner_user_id === user.id;

  const signed = await createDocumentSignedUrl(supabase, doc.file_path);
  if ("error" in signed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/40 dark:bg-zinc-950">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Could not open document
          </h1>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{signed.error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { error: logError } = await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: "Viewed shared document",
    meta: { document_id: documentId, document_title: doc.title },
  });

  if (logError) {
    console.error("activity_logs insert failed:", logError.message);
  }

  const previewKind = getPreviewKind(doc.title, doc.file_type);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {doc.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {owner ? "You own this document" : "Shared with you"}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
          <DocumentViewerClient
            title={doc.title}
            signedUrl={signed.signedUrl}
            previewKind={previewKind}
            expiresInSeconds={documentSignedUrlTtlSeconds}
          />
        </div>
      </div>
    </div>
  );
}
