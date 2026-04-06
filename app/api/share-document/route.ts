import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase-server";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDisplayName(params: {
  email: string | undefined;
  fullName: string | undefined;
}): string {
  const name = params.fullName?.trim();
  if (name) return name;
  const email = params.email ?? "";
  const local = email.split("@")[0] ?? "";
  if (!local) return "Someone";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = process.env.INVESTOR_PORTAL_FROM_EMAIL?.trim();
    const siteUrlRaw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    if (!resendApiKey || !fromEmail || !siteUrlRaw) {
      return NextResponse.json(
        {
          error:
            "Server email is not configured. Set RESEND_API_KEY, INVESTOR_PORTAL_FROM_EMAIL, and NEXT_PUBLIC_SITE_URL.",
        },
        { status: 500 }
      );
    }

    const siteUrl = siteUrlRaw.replace(/\/$/, "");
    const body = (await req.json()) as { documentId?: unknown; investorEmail?: unknown };
    const documentId =
      typeof body.documentId === "string" ? body.documentId.trim() : "";
    const investorEmailRaw =
      typeof body.investorEmail === "string" ? body.investorEmail.trim() : "";
    const investorEmail = investorEmailRaw.toLowerCase();

    if (!documentId || !investorEmail) {
      return NextResponse.json(
        { error: "documentId and investorEmail are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(investorEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid investor email address." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, title, owner_user_id")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found or you do not have access." },
        { status: 404 }
      );
    }

    if (doc.owner_user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the document owner can share this file." },
        { status: 403 }
      );
    }

    const { error: insertAccessError } = await supabase
      .from("document_access")
      .insert({
        document_id: documentId,
        investor_email: investorEmail,
        granted_by_user_id: user.id,
      });

    if (insertAccessError) {
      if (insertAccessError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "This investor already has access to this document. You can resend the link from your dashboard if needed.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: insertAccessError.message ?? "Could not grant access." },
        { status: 500 }
      );
    }

    const sharedBy = getDisplayName({
      email: user.email,
      fullName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined,
    });

    const viewUrl = `${siteUrl}/documents/${documentId}`;
    const safeTitle = escapeHtml(doc.title);
    const safeSharedBy = escapeHtml(sharedBy);

    const resend = new Resend(resendApiKey);
    const sendResult = await resend.emails.send({
      from: fromEmail,
      to: investorEmail,
      subject: "A document has been shared with you",
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #18181b;">
          <p style="margin: 0 0 12px;">${safeSharedBy} shared a document with you on Investor Portal.</p>
          <p style="margin: 0 0 16px;"><strong>${safeTitle}</strong></p>
          <a href="${viewUrl}" style="display: inline-block; background: #18181b; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600;">View Document</a>
          <p style="margin: 20px 0 0; font-size: 12px; color: #71717a;">If the button does not work, copy and paste this link into your browser:<br /><span style="word-break: break-all;">${escapeHtml(viewUrl)}</span></p>
        </div>
      `,
    });

    if (sendResult.error) {
      await supabase
        .from("document_access")
        .delete()
        .eq("document_id", documentId)
        .eq("investor_email", investorEmail);

      return NextResponse.json(
        {
          error:
            typeof sendResult.error.message === "string"
              ? sendResult.error.message
              : "Failed to send email.",
        },
        { status: 500 }
      );
    }

    const { error: logError } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "Shared document with investor",
      meta: {
        document_id: documentId,
        investor_email: investorEmail,
        document_title: doc.title,
      },
    });

    if (logError) {
      console.error("activity_logs insert failed after share email:", logError.message);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
