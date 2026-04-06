"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import DocumentsTable from "@/components/DocumentsTable";
import ShareDocumentModal from "@/components/ShareDocumentModal";
import type { ActivityLogRow, UserDocument } from "@/lib/types/documents";
import { formatDate } from "@/lib/format";
import SettingsPanel from "./SettingsPanel";

function getNameFromEmail(email: string): string {
  const name = email.split("@")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

interface DashboardClientProps {
  initialUser?: User | null;
}

export default function DashboardClient({ initialUser = null }: DashboardClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [activities, setActivities] = useState<ActivityLogRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<UserDocument | null>(null);

  async function loadDocuments(userId: string) {
    const { data, error } = await supabase
      .from("documents")
      .select(
        `
        id,
        title,
        file_path,
        file_type,
        file_size,
        created_at,
        document_access ( investor_email )
      `
      )
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadDocuments:", error.message);
      setDocuments([]);
      return;
    }

    const rows = data ?? [];
    const mapped: UserDocument[] = rows.map((row) => {
      const access = row.document_access as { investor_email: string }[] | null | undefined;
      const sharedWith = Array.isArray(access)
        ? access.map((a) => a.investor_email)
        : [];
      return {
        id: row.id as string,
        title: row.title as string,
        file_path: row.file_path as string,
        file_type: (row.file_type as string | null) ?? null,
        file_size: row.file_size != null ? Number(row.file_size) : null,
        created_at: row.created_at as string,
        sharedWith,
      };
    });
    setDocuments(mapped);
  }

  async function loadActivities(userId: string) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, meta, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("loadActivities:", error.message);
      setActivities([]);
      return;
    }

    setActivities((data ?? []) as ActivityLogRow[]);
  }

  useEffect(() => {
    const ensureUser = async () => {
      if (initialUser) {
        setUser(initialUser);
        setLoading(false);
        await loadDocuments(initialUser.id);
        await loadActivities(initialUser.id);
        return;
      }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
      await loadDocuments(data.user.id);
      await loadActivities(data.user.id);
    };
    void ensureUser();
  }, [router, initialUser]);

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

    const { error: uploadErrorResult } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadErrorResult) {
      setUploading(false);
      setUploadError(uploadErrorResult.message);
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      owner_user_id: user.id,
      title: file.name,
      file_path: filePath,
      file_type: file.type || null,
      file_size: file.size,
    });

    if (insertError) {
      await supabase.storage.from("documents").remove([filePath]);
      setUploading(false);
      setUploadError(insertError.message);
      return;
    }

    setFile(null);
    setUploadMessage("File uploaded successfully!");
    setUploading(false);
    await loadDocuments(user.id);
    await loadActivities(user.id);
  };

  const handleDelete = async (doc: UserDocument) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this file?")) return;

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id)
      .eq("owner_user_id", user.id);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([doc.file_path]);

    if (storageError) {
      console.error("Storage delete:", storageError.message);
    }

    await loadDocuments(user.id);
    await loadActivities(user.id);
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

  const userName =
    user?.user_metadata?.full_name && typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : getNameFromEmail(user?.email || "");
  const totalDocuments = documents.length;
  const totalViews = activities.filter((a) => a.action === "Viewed shared document").length;
  const lastUpload = documents[0]?.created_at || null;

  const refreshAfterShare = async () => {
    if (!user) return;
    await loadDocuments(user.id);
    await loadActivities(user.id);
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      <aside className="relative w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            IP
          </div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Investor Portal</span>
        </div>
        <nav className="p-4">
          {["dashboard", "documents", "investors", "settings", "activity"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <span>
                {["📊", "📁", "👥", "⚙️", "📋"][
                  ["dashboard", "documents", "investors", "settings", "activity"].indexOf(tab)
                ]}
              </span>
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
            type="button"
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
              {user?.email_confirmed_at
                ? "Email verified • your account is protected"
                : "Email not verified • please check your inbox"}
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
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Document views</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalViews}</p>
                </div>
                <div className="text-2xl">👁</div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Last Upload</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {lastUpload ? formatDate(lastUpload) : "Never"}
                  </p>
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
                      onClick={() => void handleUpload()}
                      disabled={uploading || !file}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                    >
                      {uploading ? "Uploading..." : "Upload File"}
                    </button>
                    {uploadError && (
                      <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                    )}
                    {uploadMessage && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">{uploadMessage}</p>
                    )}
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Documents</h2>
                  </div>
                  <DocumentsTable
                    documents={documents}
                    maxRows={5}
                    onShare={(doc) => setShareTarget(doc)}
                    onDelete={(doc) => void handleDelete(doc)}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Activity Feed</h2>
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity yet</p>
                  ) : (
                    activities.slice(0, 8).map((activity) => {
                      const meta = activity.meta;
                      const docTitle =
                        meta &&
                        typeof meta === "object" &&
                        "document_title" in meta &&
                        typeof (meta as { document_title?: unknown }).document_title === "string"
                          ? (meta as { document_title: string }).document_title
                          : null;
                      return (
                        <div key={activity.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                          <p className="text-sm text-zinc-900 dark:text-zinc-50">
                            <span className="font-medium">You</span> {activity.action}
                            {docTitle ? (
                              <>
                                {" "}
                                <span className="font-medium">{docTitle}</span>
                              </>
                            ) : null}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Upload Documents</h2>
                <div className="space-y-4">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 dark:text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => void handleUpload()}
                    disabled={uploading || !file}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    {uploading ? "Uploading..." : "Upload File"}
                  </button>
                  {uploadError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                  )}
                  {uploadMessage && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{uploadMessage}</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">All Documents</h2>
                </div>
                <DocumentsTable
                  documents={documents}
                  onShare={(doc) => setShareTarget(doc)}
                  onDelete={(doc) => void handleDelete(doc)}
                />
              </div>
            </div>
          )}

          {activeTab === "investors" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Share with investors</h2>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Open the Documents tab, then use <strong>Share</strong> on a row to invite an investor by email. They
                receive a secure link to sign in and view only what you shared.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                Go to Documents
              </button>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Activity Log</h2>
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity yet</p>
                ) : (
                  activities.map((activity) => {
                    const meta = activity.meta;
                    const docTitle =
                      meta &&
                      typeof meta === "object" &&
                      "document_title" in meta &&
                      typeof (meta as { document_title?: unknown }).document_title === "string"
                        ? (meta as { document_title: string }).document_title
                        : null;
                    return (
                      <div key={activity.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <p className="text-sm text-zinc-900 dark:text-zinc-50">
                          <span className="font-medium">You</span> {activity.action}
                          {docTitle ? (
                            <>
                              {" "}
                              <span className="font-medium">{docTitle}</span>
                            </>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDate(activity.created_at)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && user && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Settings</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Account, security, and data room preferences.
                </p>
              </div>
              <SettingsPanel user={user} onUserUpdated={setUser} />
            </div>
          )}
        </div>
      </main>

      <ShareDocumentModal
        open={shareTarget !== null}
        documentId={shareTarget?.id ?? ""}
        documentTitle={shareTarget?.title ?? ""}
        onClose={() => setShareTarget(null)}
        onShared={() => void refreshAfterShare()}
      />
    </div>
  );
}
