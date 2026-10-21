// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import QRCode from "npm:qrcode@1.5.3";
import nodemailer from "npm:nodemailer@6.9.4";

console.log("send-return-email function booted");

// Escape user-controlled values before interpolating them into HTML.
// doctor.name comes from signUp metadata, so it must never be trusted as markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// This endpoint is server-to-server only (called by the Postgres trigger via pg_net),
// so we only accept the "secret" auth mode — never "publishable" / client-facing.
export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    try {
      const { ticket_id } = await req.json();

      if (!ticket_id) {
        return Response.json(
          { error: "ticket_id is required" },
          { status: 400 },
        );
      }

      // ctx.supabaseAdmin bypasses RLS — needed here since this runs server-side
      // with no doctor/staff session attached.
      const { data: ticket, error: ticketError } = await ctx.supabaseAdmin
        .from("tickets")
        .select(
          "id, display_id, return_token, doctor_id, status, return_code_emailed_at",
        )
        .eq("id", ticket_id)
        .single();

      if (ticketError || !ticket) {
        console.error("Ticket lookup failed:", ticketError);
        return Response.json({ error: "Ticket not found" }, { status: 404 });
      }

      // Guard: only send for tickets actually in 'issued' status.
      if (ticket.status !== "issued") {
        return Response.json(
          { error: `Ticket status is '${ticket.status}', expected 'issued'` },
          { status: 409 },
        );
      }

      // Guard: avoid double-sending if this has already fired for this ticket.
      if (ticket.return_code_emailed_at) {
        return Response.json(
          { message: "Return email already sent for this ticket, skipping" },
          { status: 200 },
        );
      }

      const { data: doctor, error: doctorError } = await ctx.supabaseAdmin
        .from("users")
        .select("id, name, email")
        .eq("id", ticket.doctor_id)
        .single();

      if (doctorError || !doctor) {
        console.error("Doctor lookup failed:", doctorError);
        return Response.json({ error: "Doctor not found" }, { status: 404 });
      }

      const appUrl = Deno.env.get("APP_URL");
      const gmailUser = Deno.env.get("GMAIL_USER");
      const gmailPasswordRaw = Deno.env.get("GMAIL_APP_PASSWORD");

      if (!appUrl || !gmailUser || !gmailPasswordRaw) {
        console.error(
          "Missing APP_URL, GMAIL_USER or GMAIL_APP_PASSWORD secret",
        );
        return Response.json(
          { error: "Server misconfiguration" },
          { status: 500 },
        );
      }

      // Google displays app passwords in groups of four with spaces; strip them
      // in case they were pasted in that way.
      const gmailPassword = gmailPasswordRaw.replace(/\s+/g, "");

      // Strip any trailing slash on APP_URL so we never produce a double slash.
      const normalizedAppUrl = appUrl.replace(/\/+$/, "");
      const returnUrl = `${normalizedAppUrl}/return/${ticket.return_token}`;

      // Generate the QR code as a base64 PNG, then send it as a CID attachment.
      // Gmail blocks <img src="data:..."> inline images, but CID attachments render
      // reliably across clients.
      const qrDataUrl = await QRCode.toDataURL(returnUrl, {
        width: 300,
        margin: 2,
      });
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");

      const safeName = escapeHtml(doctor.name ?? "");
      const safeDisplayId = escapeHtml(ticket.display_id ?? "");
      const safeReturnUrl = escapeHtml(returnUrl);

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Your lab coat is ready</h2>
          <p>Hi ${safeName},</p>
          <p>Your lab coat request (<strong>${safeDisplayId}</strong>) has been issued.</p>
          <p>When you're ready to return it, show this QR code to linen staff so they can scan it and close out your ticket:</p>
          <img src="cid:return-qr-code" alt="Return QR code" width="300" height="300" />
          <p style="color: #666; font-size: 13px;">
            If the QR code doesn't display, you can also share this link with staff:<br />
            <a href="${safeReturnUrl}">${safeReturnUrl}</a>
          </p>
        </div>
      `;

      const emailText =
        `Hi ${doctor.name ?? ""},\n\n` +
        `Your lab coat request (${ticket.display_id}) has been issued.\n\n` +
        `When you're ready to return it, show this link to linen staff:\n` +
        `${returnUrl}\n`;

      // Port 465 (implicit TLS). Supabase edge functions block outbound 25 and 587.
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPassword },
      });

      try {
        await transporter.sendMail({
          from: `"Linen Ops" <${gmailUser}>`,
          to: doctor.email,
          subject: `Your lab coat is ready — ${ticket.display_id}`,
          text: emailText,
          html: emailHtml,
          attachments: [
            {
              filename: "return-qr-code.png",
              content: qrBase64,
              encoding: "base64",
              cid: "return-qr-code",
            },
          ],
        });
      } catch (sendError) {
        console.error("SMTP send failed:", sendError);
        return Response.json(
          { error: "Failed to send email" },
          { status: 502 },
        );
      }

      // Mark the email as sent so we don't send it again for this ticket.
      const { error: updateError } = await ctx.supabaseAdmin
        .from("tickets")
        .update({ return_code_emailed_at: new Date().toISOString() })
        .eq("id", ticket.id);

      if (updateError) {
        // Email already sent successfully at this point — log but don't fail the request.
        console.error("Failed to update return_code_emailed_at:", updateError);
      }

      return Response.json({ success: true, sent_to: doctor.email });
    } catch (err) {
      console.error("Unexpected error in send-return-email:", err);
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  }),
};
