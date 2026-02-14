import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { to, subject, text } = await req.json();

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: "Missing 'to', 'subject', or 'text' in request body." },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: "Investor Portal <onboarding@resend.dev>",
      to,
      subject,
      text,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

