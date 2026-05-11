import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { signMagicLink } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function emailHtml(link: string, email: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ededf0;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:48px 24px;">
    <table width="100%" style="max-width:480px;margin:0 auto;background:#131316;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;">
      <tr><td style="padding:32px 32px 24px;text-align:center;">
        <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#ff8a3a,#ff5e3a);box-shadow:0 0 32px rgba(255,94,58,0.4);color:#fff;font-weight:800;font-size:24px;line-height:48px;text-align:center;">Y</div>
        <h1 style="margin:20px 0 8px;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Your magic link is here</h1>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.6);">Click below to sign in to Yap as <strong style="color:#fff;">${escapeHtml(email)}</strong>.</p>
      </td></tr>
      <tr><td style="padding:8px 32px 32px;text-align:center;">
        <a href="${link}" style="display:inline-block;padding:14px 32px;border-radius:10px;background:linear-gradient(135deg,#ff8a3a,#ff5e3a);color:#fff;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 8px 32px rgba(255,94,58,0.35);">Sign in to Yap →</a>
        <p style="margin:24px 0 0;font-family:ui-monospace,monospace;font-size:11px;color:rgba(255,255,255,0.4);">This link expires in 10 minutes.</p>
      </td></tr>
      <tr><td style="padding:0 32px 32px;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="margin:16px 0 0;font-family:ui-monospace,monospace;font-size:10px;color:rgba(255,255,255,0.35);line-height:1.6;">
          If the button doesn't work, paste this link into your browser:<br/>
          <span style="color:rgba(255,255,255,0.5);word-break:break-all;">${link}</span>
        </p>
      </td></tr>
    </table>
    <p style="text-align:center;margin:24px 0 0;font-family:ui-monospace,monospace;font-size:10px;color:rgba(255,255,255,0.35);">
      You're receiving this because someone (hopefully you) requested a sign-in link for Yap.
    </p>
  </td></tr></table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "valid email required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

    const token = await signMagicLink(email.toLowerCase().trim());
    // Prefer the actual request origin so cookies stay on the same host as the user's browser.
    // Honor x-forwarded-* if present (production). Falls back to env override only if explicitly set.
    const hdrs = req.headers;
    const proto = hdrs.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "");
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || new URL(req.url).host;
    const base = process.env.PUBLIC_APP_URL?.trim() || `${proto}://${host}`;
    const link = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`;

    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send({
      from: process.env.AUTH_FROM_EMAIL || "Yap <onboarding@resend.dev>",
      to: email,
      subject: "Your magic link to Yap",
      html: emailHtml(link, email),
    });

    if (error) {
      console.error("Resend error:", error);
      // Even if the email fails, return the link so dev/demo can continue.
      return NextResponse.json({
        ok: false,
        emailError: error.message || String(error),
        devLink: link,
      }, { status: 502 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
