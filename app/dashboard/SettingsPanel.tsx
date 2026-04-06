"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type SettingsSection =
  | "account"
  | "security"
  | "documents"
  | "access"
  | "notifications"
  | "branding"
  | "analytics"
  | "advanced";

const SECTIONS: { id: SettingsSection; label: string; hint: string }[] = [
  { id: "account", label: "Account", hint: "Profile & sign-in" },
  { id: "security", label: "Security", hint: "2FA & sessions" },
  { id: "documents", label: "Documents", hint: "Data room controls" },
  { id: "access", label: "Access control", hint: "Roles & invites" },
  { id: "notifications", label: "Notifications", hint: "Email alerts" },
  { id: "branding", label: "Branding", hint: "White-label" },
  { id: "analytics", label: "Analytics", hint: "Views & time" },
  { id: "advanced", label: "Advanced", hint: "Export & API" },
];

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Toggle({
  checked,
  onChange,
  disabled,
  id,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id: string;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

interface SettingsPanelProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

export default function SettingsPanel({ user, onUserUpdated }: SettingsPanelProps) {
  const [section, setSection] = useState<SettingsSection>("security");
  const [displayName, setDisplayName] = useState(
    (user.user_metadata?.full_name as string | undefined) || ""
  );
  const [avatarUrl, setAvatarUrl] = useState(
    (user.user_metadata?.avatar_url as string | undefined) || ""
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Security & experience toggles (UI state; wire to backend when ready)
  const [twoFactor, setTwoFactor] = useState(false);
  const [loginEmailAlerts, setLoginEmailAlerts] = useState(false);
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(60);
  const [docDownloadDisabled, setDocDownloadDisabled] = useState(false);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const [watermarkDocs, setWatermarkDocs] = useState(false);
  const [notifyNewDoc, setNotifyNewDoc] = useState(true);
  const [notifyDocViewed, setNotifyDocViewed] = useState(true);
  const [notifyInvestorActivity, setNotifyInvestorActivity] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    setProfileError(null);
    setSavingProfile(true);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: displayName.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      },
    });
    setSavingProfile(false);
    if (error) {
      setProfileError(error.message);
      return;
    }
    if (data.user) {
      onUserUpdated(data.user);
      setProfileMessage("Profile updated.");
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated.");
  };

  return (
    <div className="flex min-h-[480px] flex-col gap-6 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:flex-row">
      <nav
        className="shrink-0 border-b border-zinc-200 p-4 lg:w-56 lg:border-b-0 lg:border-r dark:border-zinc-800"
        aria-label="Settings sections"
      >
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Settings
        </p>
        <ul className="space-y-0.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex w-full flex-col items-start rounded-lg px-2 py-2 text-left text-sm transition ${
                  section === s.id
                    ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/25 dark:text-blue-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                <span>{s.label}</span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-500">{s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 p-6">
        {section === "account" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Account</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Basic profile and credentials for this portal.
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Email</label>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{user.email}</p>
              </div>
              <div>
                <label htmlFor="display-name" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Display name
                </label>
                <input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="avatar-url" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Profile picture URL
                </label>
                <input
                  id="avatar-url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="https://…"
                  inputMode="url"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  Use a public image URL, or replace with storage upload later.
                </p>
              </div>
              {profileError && <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>}
              {profileMessage && <p className="text-sm text-green-600 dark:text-green-400">{profileMessage}</p>}
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </div>

            <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Change password</h3>
              <div>
                <label htmlFor="new-password" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  autoComplete="new-password"
                />
              </div>
              {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
              {passwordMessage && <p className="text-sm text-green-600 dark:text-green-400">{passwordMessage}</p>}
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {savingPassword ? "Updating…" : "Update password"}
              </button>
            </div>

            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Login activity</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500 dark:text-zinc-400">Last sign-in</dt>
                  <dd className="text-right text-zinc-900 dark:text-zinc-100">{formatDateTime(user.last_sign_in_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500 dark:text-zinc-400">Account created</dt>
                  <dd className="text-right text-zinc-900 dark:text-zinc-100">{formatDateTime(user.created_at)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                Per-device history will appear here once you log session metadata server-side.
              </p>
            </div>
          </div>
        )}

        {section === "security" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Security</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Protect founder and investor data with strong access controls.
              </p>
            </div>

            <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              <div className="p-4">
                <Toggle
                  id="2fa"
                  label="Two-factor authentication (TOTP)"
                  description="Require a code from Google Authenticator or a similar app. Connect Supabase MFA or your IdP to enable."
                  checked={twoFactor}
                  onChange={setTwoFactor}
                />
              </div>
              <div className="p-4">
                <Toggle
                  id="login-alerts"
                  label="Email alerts for new logins"
                  description="Notify when your account signs in from a new device or location."
                  checked={loginEmailAlerts}
                  onChange={setLoginEmailAlerts}
                />
              </div>
              <div className="p-4">
                <label htmlFor="session-timeout" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Session timeout
                </label>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Auto sign-out after inactivity (client hint; enforce in your API layer).
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="session-timeout"
                    type="number"
                    min={5}
                    max={1440}
                    value={sessionTimeoutMins}
                    onChange={(e) => setSessionTimeoutMins(Number(e.target.value) || 60)}
                    className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">minutes</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Active sessions</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                List refresh tokens / device sessions from your backend. Placeholder below.
              </p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/80">
                  <span className="text-zinc-800 dark:text-zinc-200">This browser · current session</span>
                  <span className="text-xs text-zinc-500">Active now</span>
                </li>
              </ul>
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Log out from all devices
              </button>
              <p className="mt-2 text-xs text-zinc-500">Implement via Supabase admin revoke or custom session store.</p>
            </div>
          </div>
        )}

        {section === "documents" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Document access</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Defaults for your data room; per-investor overrides can live on share links.
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <label htmlFor="access-expiry" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Default link expiry
                </label>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  How long invited investors keep access unless renewed.
                </p>
                <select
                  id="access-expiry"
                  defaultValue="7"
                  className="mt-2 w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="0">No expiry (not recommended)</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              <div className="p-4">
                <Toggle
                  id="disable-download"
                  label="Disable download"
                  description="View in browser only; blocks direct file download where enforced."
                  checked={docDownloadDisabled}
                  onChange={setDocDownloadDisabled}
                />
              </div>
              <div className="p-4">
                <Toggle
                  id="view-only"
                  label="View-only mode"
                  description="Prevent edits or comments if your product adds collaboration."
                  checked={viewOnlyMode}
                  onChange={setViewOnlyMode}
                />
              </div>
              <div className="p-4">
                <Toggle
                  id="watermark"
                  label="Watermark previews"
                  description="Overlay email or name on PDF/image previews (server-side render)."
                  checked={watermarkDocs}
                  onChange={setWatermarkDocs}
                />
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Who can view</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Map to your sharing model: only invited emails, domain allowlist, or SSO groups. Configure in backend
                policies.
              </p>
            </div>
          </div>
        )}

        {section === "access" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Investor access control</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Invite investors, assign roles, and revoke access anytime.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Use the <strong className="font-medium">Investors</strong> tab to email document access. Next step:
                persist invites in Postgres with roles (Viewer / Editor / Admin) and audit log.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2">Investor</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr>
                    <td className="px-4 py-3 text-zinc-500" colSpan={3}>
                      No directory synced yet — example row below.
                    </td>
                  </tr>
                  <tr className="text-zinc-600 dark:text-zinc-300">
                    <td className="px-4 py-3">investor@example.com</td>
                    <td className="px-4 py-3">Viewer</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="text-red-600 hover:underline dark:text-red-400">
                        Revoke
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "notifications" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Email updates for important data room events.</p>
            </div>
            <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              <div className="p-4">
                <Toggle
                  id="notif-upload"
                  label="New document uploaded"
                  checked={notifyNewDoc}
                  onChange={setNotifyNewDoc}
                />
              </div>
              <div className="p-4">
                <Toggle
                  id="notif-viewed"
                  label="Document viewed by an investor"
                  checked={notifyDocViewed}
                  onChange={setNotifyDocViewed}
                />
              </div>
              <div className="p-4">
                <Toggle
                  id="notif-activity"
                  label="Investor activity digest"
                  description="Periodic summary of views and logins."
                  checked={notifyInvestorActivity}
                  onChange={setNotifyInvestorActivity}
                />
              </div>
            </div>
          </div>
        )}

        {section === "branding" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Branding</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">White-label the investor-facing experience.</p>
            </div>
            <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Company name</label>
                <input
                  type="text"
                  defaultValue="Investor Portal"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:text-zinc-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Primary theme color</label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="color" defaultValue="#2563eb" className="h-9 w-14 cursor-pointer rounded border border-zinc-200 bg-white p-0 dark:border-zinc-700" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">#2563eb</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500">Persist per workspace in your database; apply via CSS variables on the investor route.</p>
            </div>
          </div>
        )}

        {section === "analytics" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Analytics</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Understand which documents investors actually read.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <Toggle
                id="analytics-master"
                label="Enable document analytics"
                description="Track views, time on document, and top files. Honor privacy policy and regional rules."
                checked={analyticsEnabled}
                onChange={setAnalyticsEnabled}
              />
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Who opened each document</li>
              <li>Time spent (aggregated)</li>
              <li>Most viewed files</li>
            </ul>
          </div>
        )}

        {section === "advanced" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Advanced</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Export, APIs, and integrations for power users.</p>
            </div>
            <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <button
                type="button"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Export activity (CSV)
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Export report (PDF)
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                API keys
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Integrations (Notion, Google Drive, …)
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Wire these to server routes when you are ready; keep secrets off the client.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
