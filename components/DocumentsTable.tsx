"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserDocument } from "@/lib/types/documents";
import { formatDate, formatFileSize, getDocumentTypeLabel } from "@/lib/format";

interface DocumentsTableProps {
  documents: UserDocument[];
  maxRows?: number;
  onShare: (doc: UserDocument) => void;
  onDelete: (doc: UserDocument) => void;
  emptyMessage?: string;
  emptyHint?: string;
}

export default function DocumentsTable({
  documents,
  maxRows,
  onShare,
  onDelete,
  emptyMessage = "No documents yet.",
  emptyHint = "Upload your first investor document to get started.",
}: DocumentsTableProps) {
  const router = useRouter();
  const rows = maxRows != null ? documents.slice(0, maxRows) : documents;

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
              File name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Uploaded
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Size
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Shared with
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((doc) => (
            <tr key={doc.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <td className="max-w-[220px] truncate px-4 py-3 text-sm">
                <Link
                  href={`/documents/${doc.id}`}
                  className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  {doc.title}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {getDocumentTypeLabel(doc.title)}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {formatDate(doc.created_at)}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {formatFileSize(doc.file_size ?? 0)}
              </td>
              <td className="max-w-[160px] truncate px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {doc.sharedWith.length === 0
                  ? "—"
                  : doc.sharedWith.slice(0, 3).join(", ") +
                    (doc.sharedWith.length > 3 ? ` +${doc.sharedWith.length - 3}` : "")}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="rounded px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => onShare(doc)}
                    className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(doc)}
                    className="rounded px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
