"use client";

import type { PreviewKind } from "@/lib/file-preview";

interface DocumentViewerClientProps {
  title: string;
  signedUrl: string;
  previewKind: PreviewKind;
  expiresInSeconds: number;
}

export default function DocumentViewerClient({
  title,
  signedUrl,
  previewKind,
  expiresInSeconds,
}: DocumentViewerClientProps) {
  const minutes = Math.round(expiresInSeconds / 60);

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Secure link expires in about {minutes} minutes. Refresh the page if the preview stops loading.
      </p>

      <div className="flex flex-wrap gap-3">
        <a
          href={signedUrl}
          download={title}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Download file
        </a>
      </div>

      {previewKind === null ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Preview is not available for this file type. Use <strong>Download file</strong> to open it on your device.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {previewKind === "image" ? (
            <img
              src={signedUrl}
              alt={title}
              className="mx-auto max-h-[min(80vh,900px)] w-full object-contain"
            />
          ) : previewKind === "pdf" ? (
            <iframe
              title={title}
              src={signedUrl}
              className="h-[min(85vh,900px)] w-full border-0 bg-white"
            />
          ) : (
            <iframe
              title={title}
              src={signedUrl}
              className="h-[min(70vh,640px)] w-full border-0 bg-white font-mono text-sm"
            />
          )}
        </div>
      )}
    </div>
  );
}
