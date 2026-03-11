import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function getHtmlPage(message?: string, isSuccess?: boolean, isError?: boolean, step?: string) {
  const statusHtml = message
    ? `<div class="alert ${isSuccess ? 'success' : isError ? 'error' : 'info'}">${message}</div>`
    : '';

  const otpFormHtml = step === 'otp' ? `
    <form method="POST" class="form">
      <input type="hidden" name="action" value="verify_otp" />
      <input type="hidden" name="email" id="otp_email" value="" />
      <div class="field">
        <label>رمز التحقق / Verification Code</label>
        <input type="text" name="otp" placeholder="أدخل الرمز المرسل لبريدك" required maxlength="4" pattern="[0-9]{4}" inputmode="numeric" />
      </div>
      <p class="hint">تم إرسال رمز التحقق إلى بريدك الإلكتروني<br/>A verification code has been sent to your email</p>
      <button type="submit" class="btn btn-danger">تأكيد الحذف / Confirm Deletion</button>
    </form>
    <script>
      const params = new URLSearchParams(window.location.search);
      document.getElementById('otp_email').value = params.get('email') || '';
    </script>
  ` : `
    <form method="POST" class="form">
      <input type="hidden" name="action" value="send_otp" />
      <div class="field">
        <label>البريد الإلكتروني / Email Address</label>
        <input type="email" name="email" placeholder="example@email.com" required />
      </div>
      <button type="submit" class="btn">إرسال رمز التحقق / Send Verification Code</button>
    </form>
  `;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MasarAI - حذف بيانات المستخدم / Delete User Data</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0B1120;
      color: #E2E8F0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      width: 100%;
      background: #1A2332;
      border-radius: 20px;
      padding: 40px 32px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo h1 {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #14B8A6, #0EA5E9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .logo p {
      color: #94A3B8;
      font-size: 14px;
      margin-top: 4px;
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 8px;
    }
    .subtitle {
      text-align: center;
      color: #94A3B8;
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .info-box {
      background: rgba(14, 165, 233, 0.1);
      border: 1px solid rgba(14, 165, 233, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .info-box h3 {
      font-size: 14px;
      font-weight: 600;
      color: #0EA5E9;
      margin-bottom: 8px;
    }
    .info-box ul {
      list-style: none;
      padding: 0;
    }
    .info-box li {
      font-size: 13px;
      color: #94A3B8;
      padding: 4px 0;
      padding-right: 16px;
      position: relative;
    }
    .info-box li::before {
      content: "•";
      position: absolute;
      right: 0;
      color: #0EA5E9;
    }
    .warning-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    .warning-box p {
      font-size: 13px;
      color: #FCA5A5;
      line-height: 1.6;
    }
    .form { margin-top: 8px; }
    .field { margin-bottom: 16px; }
    .field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #94A3B8;
      margin-bottom: 6px;
    }
    .field input {
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #E2E8F0;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
      direction: ltr;
      text-align: left;
    }
    .field input:focus {
      border-color: #14B8A6;
    }
    .hint {
      text-align: center;
      font-size: 13px;
      color: #94A3B8;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .btn {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      border: none;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      background: linear-gradient(135deg, #14B8A6, #0EA5E9);
      color: #FFF;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-danger {
      background: linear-gradient(135deg, #EF4444, #DC2626);
    }
    .alert {
      padding: 14px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 14px;
      text-align: center;
      line-height: 1.6;
    }
    .alert.success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6EE7B7;
    }
    .alert.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #FCA5A5;
    }
    .alert.info {
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(14, 165, 233, 0.3);
      color: #7DD3FC;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #475569;
    }
    .footer a { color: #14B8A6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>MasarAI</h1>
      <p>مسار الذكاء الاصطناعي للتعلم</p>
    </div>

    <h2>حذف بيانات المستخدم</h2>
    <p class="subtitle">Delete User Data & Account</p>

    ${statusHtml}

    ${isSuccess ? '' : `
    <div class="info-box">
      <h3>البيانات التي سيتم حذفها / Data to be deleted:</h3>
      <ul>
        <li>الملف الشخصي والمعلومات الأساسية / Profile & basic info</li>
        <li>تقدم الاختبارات والنتائج / Exam progress & results</li>
        <li>الخطة اليومية والمهام / Daily plan & tasks</li>
        <li>خريطة المهارات / Skill map</li>
        <li>سجل الاختبارات والإجابات / Quiz history & responses</li>
        <li>الاشتراكات / Subscriptions</li>
        <li>الرؤى والتنبيهات / AI insights</li>
      </ul>
    </div>

    <div class="warning-box">
      <p>⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك نهائياً.<br/>
      This action is irreversible. All your data will be permanently deleted.</p>
    </div>

    ${otpFormHtml}
    `}

    <div class="footer">
      <p>MasarAI &copy; ${new Date().getFullYear()} — <a href="mailto:contact@onspace.ai">contact@onspace.ai</a></p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET — serve the HTML page
  if (req.method === "GET") {
    const step = url.searchParams.get("step") || "";
    const msg = url.searchParams.get("msg") || "";
    const msgType = url.searchParams.get("type") || "";

    return new Response(
      getHtmlPage(
        msg || undefined,
        msgType === "success",
        msgType === "error",
        step || undefined
      ),
      {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        status: 200,
      }
    );
  }

  // POST — handle form submissions
  if (req.method === "POST") {
    try {
      const formData = await req.formData();
      const action = formData.get("action") as string;
      const email = (formData.get("email") as string || "").trim().toLowerCase();

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      if (action === "send_otp") {
        if (!email) {
          return redirectWithMessage(url, "", "الرجاء إدخال البريد الإلكتروني / Please enter your email", "error");
        }

        // Check if user exists
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error("[DELETE-DATA-PAGE] List users error:", listError.message);
          return redirectWithMessage(url, "", "حدث خطأ، حاول مرة أخرى / An error occurred, please try again", "error");
        }

        const userExists = users.users.find((u: any) => u.email?.toLowerCase() === email);
        if (!userExists) {
          return redirectWithMessage(url, "", "لم يتم العثور على حساب بهذا البريد الإلكتروني / No account found with this email", "error");
        }

        // Send OTP for verification
        const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error: otpError } = await supabaseAnon.auth.signInWithOtp({ email });
        if (otpError) {
          console.error("[DELETE-DATA-PAGE] OTP error:", otpError.message);
          return redirectWithMessage(url, "", "فشل إرسال رمز التحقق / Failed to send verification code", "error");
        }

        // Redirect to OTP step
        const redirectUrl = new URL(url.origin + url.pathname);
        redirectUrl.searchParams.set("step", "otp");
        redirectUrl.searchParams.set("email", email);
        redirectUrl.searchParams.set("msg", "تم إرسال رمز التحقق إلى بريدك الإلكتروني / Verification code sent to your email");
        redirectUrl.searchParams.set("type", "info");

        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, "Location": redirectUrl.toString() },
        });
      }

      if (action === "verify_otp") {
        const otp = (formData.get("otp") as string || "").trim();
        const otpEmail = (formData.get("email") as string || url.searchParams.get("email") || "").trim().toLowerCase();

        if (!otpEmail || !otp) {
          return redirectWithMessage(url, "otp", "الرجاء إدخال البريد والرمز / Please enter email and code", "error", otpEmail);
        }

        // Verify OTP
        const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
          email: otpEmail,
          token: otp,
          type: "email",
        });

        if (verifyError || !verifyData.user) {
          console.error("[DELETE-DATA-PAGE] OTP verify error:", verifyError?.message);
          return redirectWithMessage(url, "otp", "رمز التحقق غير صحيح أو منتهي الصلاحية / Invalid or expired verification code", "error", otpEmail);
        }

        const userId = verifyData.user.id;
        console.log(`[DELETE-DATA-PAGE] Verified user ${userId}, proceeding with deletion`);

        // Delete all user data (cascade handles related tables)
        const { error: profileError } = await supabaseAdmin
          .from("user_profiles")
          .delete()
          .eq("id", userId);

        if (profileError) {
          console.error(`[DELETE-DATA-PAGE] Profile delete error: ${profileError.message}`);
        }

        // Delete auth user
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.error(`[DELETE-DATA-PAGE] Auth delete error: ${authError.message}`);
          return redirectWithMessage(url, "", "حدث خطأ أثناء حذف الحساب / Error deleting account", "error");
        }

        console.log(`[DELETE-DATA-PAGE] User ${userId} deleted successfully`);

        return redirectWithMessage(
          url,
          "",
          "تم حذف حسابك وجميع بياناتك بنجاح. شكراً لاستخدامك MasarAI ✅<br/>Your account and all data have been successfully deleted. Thank you for using MasarAI.",
          "success"
        );
      }

      return redirectWithMessage(url, "", "إجراء غير صالح / Invalid action", "error");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[DELETE-DATA-PAGE] Error: ${errorMessage}`);
      return redirectWithMessage(url, "", "حدث خطأ غير متوقع / An unexpected error occurred", "error");
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

function redirectWithMessage(url: URL, step: string, msg: string, type: string, email?: string) {
  const redirectUrl = new URL(url.origin + url.pathname);
  if (step) redirectUrl.searchParams.set("step", step);
  if (email) redirectUrl.searchParams.set("email", email);
  redirectUrl.searchParams.set("msg", msg);
  redirectUrl.searchParams.set("type", type);

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, "Location": redirectUrl.toString() },
  });
}
