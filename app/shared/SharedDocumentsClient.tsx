"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SharedDocumentRow } from "@/lib/types/documents";
import { formatDate, formatFileSize, getDocumentTypeLabel } from "@/lib/format";

interface SharedDocumentsClientProps {
  rows: SharedDocumentRow[];
}

export default function SharedDocumentsClient({ rows }: SharedDocumentsClientProps) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          No documents have been shared with you yet. When a founder shares a file, it will appear here and you will
          get an email with a clickable link.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Document
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Shared</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Size</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((row) => (
              <tr key={row.accessId} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="max-w-[280px] px-4 py-3">
                  <Link
                    href={`/documents/${row.documentId}`}
                    className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {getDocumentTypeLabel(row.title)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatDate(row.sharedAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatFileSize(row.fileSize ?? 0)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/documents/${row.documentId}`}
                    className="inline-flex rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
