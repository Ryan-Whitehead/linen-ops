// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import QRCode from "npm:qrcode@1.5.3";

console.log("send-return-email function booted");

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
      // Protects against the function being called out of order or twice.
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
      const resendApiKey = Deno.env.get("RESEND_API_KEY");

      if (!appUrl || !resendApiKey) {
        console.error("Missing APP_URL or RESEND_API_KEY secret");
        return Response.json(
          { error: "Server misconfiguration" },
          { status: 500 },
        );
      }

      const returnUrl = `${appUrl}/return/${ticket.return_token}`;

      // Generate QR code as a base64 PNG data URI, embedded directly in the email.
      const qrDataUrl = await QRCode.toDataURL(returnUrl, {
        width: 300,
        margin: 2,
      });

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Your lab coat is ready</h2>
          <p>Hi ${doctor.name},</p>
          <p>Your lab coat request (<strong>${ticket.display_id}</strong>) has been issued.</p>
          <p>When you're ready to return it, show this QR code to linen staff so they can scan it and close out your ticket:</p>
          <img src="${qrDataUrl}" alt="Return QR code" width="300" height="300" />
          <p style="color: #666; font-size: 13px;">
            If the QR code doesn't display, you can also share this link with staff:<br />
            <a href="${returnUrl}">${returnUrl}</a>
          </p>
        </div>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Linen Ops <onboarding@resend.dev>",
          to: [doctor.email],
          subject: `Your lab coat is ready — ${ticket.display_id}`,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errBody = await resendResponse.text();
        console.error("Resend API error:", resendResponse.status, errBody);
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-return-email' \
    --header 'apiKey: YOUR_SECRET_KEY' \
    --data '{"ticket_id":"some-ticket-uuid"}'

*/
