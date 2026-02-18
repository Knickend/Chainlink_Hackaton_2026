import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConfirmationEmailRequest {
  confirmationUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userEmail = claimsData.claims.email as string;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email associated with account" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { confirmationUrl }: ConfirmationEmailRequest = await req.json();

    if (!confirmationUrl) {
      return new Response(JSON.stringify({ error: "Missing confirmationUrl" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate confirmationUrl is from our domain to prevent phishing
    const allowedOrigins = ["https://edtudwkmswyjxamkdkbu.supabase.co", "https://wealth-whisperer-206.lovable.app"];
    let isAllowedUrl = false;
    try {
      const url = new URL(confirmationUrl);
      isAllowedUrl = allowedOrigins.some(origin => url.origin === origin);
    } catch {
      isAllowedUrl = false;
    }
    if (!isAllowedUrl) {
      return new Response(JSON.stringify({ error: "Invalid confirmation URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending confirmation email to authenticated user: ${userEmail}`);

    const emailResponse = await resend.emails.send({
      from: "InControl <noreply@incontrol.finance>",
      to: [userEmail],
      subject: "Confirm your InControl account",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">
                <span style="opacity: 0.9;">In</span><span>Control</span>
              </h1>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="background-color: #18181b; padding: 40px; border-radius: 0 0 16px 16px;">
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #fafafa;">
                Welcome to InControl! 🎉
              </h2>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                Thanks for signing up. Please confirm your email address to get started with managing your finances.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 32px 0;">
                    <a href="${confirmationUrl}" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 24px 0; padding: 12px; background-color: #27272a; border-radius: 6px; word-break: break-all;">
                <a href="${confirmationUrl}" style="font-size: 13px; color: #10b981; text-decoration: none;">
                  ${confirmationUrl}
                </a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;">
              
              <p style="margin: 0; font-size: 13px; color: #52525b; text-align: center;">
                If you didn't create an account with InControl, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #52525b;">
                © ${new Date().getFullYear()} InControl. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
