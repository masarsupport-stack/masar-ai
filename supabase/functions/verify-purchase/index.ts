import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header not provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse body
    const body = await req.json();
    const { product_id, purchase_token, transaction_id, platform, original_json } = body;

    if (!product_id || !purchase_token) {
      throw new Error("Missing required fields: product_id, purchase_token");
    }
    logStep("Purchase data received", { product_id, transaction_id, platform });

    // Check for duplicate transaction
    if (transaction_id) {
      const { data: existing } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id')
        .eq('transaction_id', transaction_id)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        logStep("Duplicate transaction found", { id: existing.id });
        return new Response(JSON.stringify({ verified: true, message: "Already verified" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Calculate subscription expiry (1 month from now for monthly sub)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Deactivate any previous subscriptions for this user
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ status: 'replaced', updated_at: now.toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Store the new subscription
    const { data: subData, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        platform: platform || 'android',
        product_id,
        purchase_token,
        transaction_id: transaction_id || null,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        original_json: original_json ? JSON.parse(original_json) : null,
      })
      .select('id')
      .single();

    if (subError) {
      logStep("DB insert error", { error: subError.message });
      throw new Error(`Failed to store subscription: ${subError.message}`);
    }

    logStep("Subscription stored", { id: subData.id, expires_at: expiresAt.toISOString() });

    return new Response(JSON.stringify({
      verified: true,
      subscription_id: subData.id,
      expires_at: expiresAt.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error", { message: errorMessage });
    return new Response(JSON.stringify({ verified: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
