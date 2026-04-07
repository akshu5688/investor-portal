"use client";

import { FormEvent, useEffect, useState } from "react";

interface ShareDocumentModalProps {
  open: boolean;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  onShared: () => void;
}

export default function ShareDocumentModal({
  open,
  documentId,
  documentTitle,
  onClose,
  onShared,
}: ShareDocumentModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, [open, documentId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter the investor’s email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/share-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          investorEmail: trimmed,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      onShared();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-doc-title"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h2
          id="share-doc-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Share document
        </h2>
        <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400" title={documentTitle}>
          {documentTitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="investor-email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Investor email
            </label>
            <input
              id="investor-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="investor@example.com"
              className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Invitation sent. The investor will receive an email with clickable links to this document and their
              shared library.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              {success ? "Close" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:disabled:bg-zinc-600"
            >
              {loading ? "Sending…" : success ? "Sent" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
