"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface Document {
  name: string;
  path: string;
  created_at: string;
  size: number;
  id: string;
}

interface Activity {
  id: string;
  action: string;
  document: string;
  timestamp: string;
  user?: string;
}

function getNameFromEmail(email: string): string {
  const name = email.split("@")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts.pop() ?? "").toLowerCase() : "";
}

function getDocumentTypeLabel(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "Image";
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "Spreadsheet";
  if (ext === "txt") return "Text";
  return ext ? ext.toUpperCase() : "File";
}

type PreviewCategory = "image" | "pdf";

function getPreviewCategory(fileName: string): PreviewCategory | null {
  const ext = getFileExtension(fileName);
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return null;
}

interface DashboardClientProps {
  initialUser?: User | null;
}

export default function DashboardClient({ initialUser = null }: DashboardClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareDocument, setShareDocument] = useState<string | null>(null);
  const [shareDocumentName, setShareDocumentName] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; category: PreviewCategory } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function loadDocuments(userId: string) {
    const { data, error } = await supabase.storage
      .from("documents")
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (!error && data) {
      const docs: Document[] = data.map((file) => ({
        name: file.name,
        path: `${userId}/${file.name}`,
        created_at: file.created_at,
        size: file.metadata?.size || 0,
        id: file.id || file.name,
      }));
      setDocuments(docs);
    }
  }

  async function loadActivities() {
    const mockActivities: Activity[] = [
      {
        id: "1",
        action: "uploaded",
        document: "PitchDeck.pdf",
        timestamp: new Date().toISOString(),
      },
    ];
    setActivities(mockActivities);
  }

  useEffect(() => {
    const ensureUser = async () => {
      if (initialUser) {
        setUser(initialUser);
        setLoading(false);
        loadDocuments(initialUser.id);
        loadActivities();
        return;
      }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
      loadDocuments(data.user.id);
      loadActivities();
    };
    ensureUser();
  }, [router, initialUser]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleUpload = async () => {
    setUploadError(null);
    setUploadMessage(null);
    if (!file || !user) {
      setUploadError("Please choose a file first.");
      return;
    }
    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${user.id}/${fileName}`;
    const { error } = await supabase.storage.from("documents").upload(filePath, file);
    setUploading(false);
    if (error) {
      setUploadError(error.message);
      return;
    }
    setFile(null);
    setUploadMessage("File uploaded successfully!");
    loadDocuments(user.id);
    loadActivities();
  };

  const handleDelete = async (path: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    const { error } = await supabase.storage.from("documents").remove([path]);
    if (!error && user) loadDocuments(user.id);
  };

  const viewDocument = async (doc: Document) => {
    setPreviewLoading(true);
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.path, 3600);
    setPreviewLoading(false);
    if (error || !data?.signedUrl) {
      alert(error?.message ?? "Could not open this document. Try again.");
      return;
    }
    const category = getPreviewCategory(doc.name);
    if (!category) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setPreview({ url: data.signedUrl, name: doc.name, category });
  };

  const handleShare = async () => {
    const email = shareEmail.trim();
    if (!email || !shareDocument) return;
    const docLabel = shareDocumentName ?? shareDocument.split("/").pop() ?? "document";
    setSharing(true);
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: `${userName} shared a document with you: ${docLabel}`,
        text: [
          `${userName} (${user?.email ?? "Investor Portal"}) shared a document with you.`,
          ``,
          `File: ${docLabel}`,
          ``,
          `The recipient can sign in to Investor Portal with this email to access shared materials when that workflow is enabled. For now, keep this email as a record of what was sent.`,
        ].join("\n"),
      }),
    });
    setSharing(false);
    if (response.ok) {
      setShareEmail("");
      alert("Document shared successfully!");
    } else {
      alert("Failed to share document. Please try again.");
    }
  };

  const startShareWithInvestor = (doc: Document) => {
    setShareDocument(doc.path);
    setShareDocumentName(doc.name);
    setActiveTab("investors");
  };

  const getInitials = (email: string): string => {
    const name = getNameFromEmail(email);
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-50" />
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const userName = user?.user_metadata?.full_name || getNameFromEmail(user?.email || "");
  const totalDocuments = documents.length;
  const totalViews = 0;
  const lastUpload = documents[0]?.created_at || null;

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      <aside className="w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">IP</div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Investor Portal</span>
        </div>
        <nav className="p-4">
          {["dashboard", "documents", "investors", "settings", "activity"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <span>{["📊", "📁", "👥", "⚙️", "📋"][["dashboard", "documents", "investors", "settings", "activity"].indexOf(tab)]}</span>
              {tab === "activity" ? "Activity Log" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {getInitials(user?.email || "")}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{userName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Welcome back, {userName} 👋
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {user?.email_confirmed_at ? "Email verified • your account is protected" : "Email not verified • please check your inbox"}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Documents</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalDocuments}</p>
                </div>
                <div className="text-2xl">📄</div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Views</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalViews}</p>
                </div>
                <div className="text-2xl">👁</div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Last Upload</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{lastUpload ? formatDate(lastUpload) : "Never"}</p>
                </div>
                <div className="text-2xl">🗓</div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Access Level</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Standard</p>
                </div>
                <div className="text-2xl">🔒</div>
              </div>
            </div>
          </div>

          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Upload Documents</h2>
                  <div className="space-y-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 dark:text-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploading || !file}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                    >
                      {uploading ? "Uploading..." : "Upload File"}
                    </button>
                    {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
                    {uploadMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{uploadMessage}</p>}
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Documents</h2>
                  </div>
                  {documents.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">No documents yet.</p>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Upload your first investor document to get started.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">File Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Uploaded</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Size</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {documents.slice(0, 5).map((doc) => (
                            <tr key={doc.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
                              <td className="max-w-[200px] truncate px-4 py-3 text-sm">
                                <button
                                  type="button"
                                  onClick={() => viewDocument(doc)}
                                  disabled={previewLoading}
                                  className="text-left font-medium text-blue-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-blue-400"
                                  title="Open or preview document"
                                >
                                  {doc.name}
                                </button>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{getDocumentTypeLabel(doc.name)}</td>
                              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatDate(doc.created_at)}</td>
                              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatFileSize(doc.size)}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => viewDocument(doc)}
                                    disabled={previewLoading}
                                    className="rounded px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startShareWithInvestor(doc)}
                                    className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                  >
                                    Share
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(doc.path)}
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
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Activity Feed</h2>
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity yet</p>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <p className="text-sm text-zinc-900 dark:text-zinc-50"><span className="font-medium">You</span> {activity.action} <span className="font-medium">{activity.document}</span></p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(activity.timestamp)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">All Documents</h2>
              </div>
              {documents.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No documents yet.</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Upload your first investor document to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">File Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Uploaded</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Shared With</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
                          <td className="max-w-xs px-4 py-3 text-sm">
                            <button
                              type="button"
                              onClick={() => viewDocument(doc)}
                              disabled={previewLoading}
                              className="text-left font-medium text-blue-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-blue-400"
                              title="Open or preview document"
                            >
                              {doc.name}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{getDocumentTypeLabel(doc.name)}</td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatDate(doc.created_at)}</td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatFileSize(doc.size)}</td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">-</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => viewDocument(doc)}
                                disabled={previewLoading}
                                className="rounded px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => startShareWithInvestor(doc)}
                                className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                              >
                                Share
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(doc.path)}
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
              )}
            </div>
          )}

          {activeTab === "investors" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Share with an investor</h2>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Choose which file from your portal to include, then enter the investor&apos;s email.
              </p>
              {documents.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  You have no documents yet. Upload files from the Dashboard or Documents tab, then return here to send one to an investor.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="share-document-select"
                      className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Document to send
                    </label>
                    <select
                      id="share-document-select"
                      value={shareDocument ?? ""}
                      onChange={(e) => {
                        const path = e.target.value;
                        if (!path) {
                          setShareDocument(null);
                          setShareDocumentName(null);
                          return;
                        }
                        const doc = documents.find((d) => d.path === path);
                        setShareDocument(path);
                        setShareDocumentName(doc?.name ?? path.split("/").pop() ?? null);
                      }}
                      className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                    >
                      <option value="">Select a document…</option>
                      {documents.map((doc) => (
                        <option key={doc.path} value={doc.path}>
                          {doc.name} — {getDocumentTypeLabel(doc.name)} · {formatDate(doc.created_at)}
                        </option>
                      ))}
                    </select>
                    {shareDocument && (
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        This is the file that will be referenced in the email to the investor:{" "}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {shareDocumentName ?? shareDocument.split("/").pop()}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Investor email</label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="investor@example.com"
                      className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={sharing || !shareEmail.trim() || !shareDocument}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    {sharing ? "Sending…" : "Send to investor"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Activity Log</h2>
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity yet</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                      <p className="text-sm text-zinc-900 dark:text-zinc-50"><span className="font-medium">You</span> {activity.action} <span className="font-medium">{activity.document}</span></p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(activity.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Settings</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Settings coming soon...</p>
            </div>
          )}
        </div>
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-preview-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p id="doc-preview-title" className="truncate pr-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {preview.name}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900">
              {preview.category === "image" ? (
                <img src={preview.url} alt={preview.name} className="mx-auto max-h-[80vh] w-auto max-w-full object-contain" />
              ) : (
                <iframe title={preview.name} src={preview.url} className="h-[min(80vh,720px)] w-full border-0 bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
