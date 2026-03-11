import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const FREE_TRIAL_DAYS = 30;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header not provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check free trial based on account creation date
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const trialDaysLeft = Math.max(0, FREE_TRIAL_DAYS - diffDays);
    const isTrialActive = trialDaysLeft > 0;
    const trialEndDate = new Date(createdAt.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    logStep("Trial check", { diffDays, trialDaysLeft, isTrialActive });

    // If trial is active, user gets full access
    if (isTrialActive) {
      logStep("Free trial active, granting full access");
      return new Response(JSON.stringify({
        subscribed: true,
        is_trial: true,
        trial_end_date: trialEndDate,
        trial_days_left: trialDaysLeft,
        product_id: null,
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Trial expired — check database for active Google Play subscription
    const { data: activeSub, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      logStep("DB query error", { error: subError.message });
    }

    const hasActiveSub = activeSub !== null;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      productId = activeSub.product_id;
      subscriptionEnd = activeSub.expires_at;
      logStep("Active subscription found", { id: activeSub.id, product_id: productId, expires_at: subscriptionEnd });

      // Check if subscription has expired
      if (subscriptionEnd && new Date(subscriptionEnd) < now) {
        logStep("Subscription expired, marking as expired");
        await supabaseClient
          .from('user_subscriptions')
          .update({ status: 'expired', updated_at: now.toISOString() })
          .eq('id', activeSub.id);

        return new Response(JSON.stringify({
          subscribed: false,
          is_trial: false,
          trial_end_date: trialEndDate,
          trial_days_left: 0,
          product_id: null,
          subscription_end: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      logStep("No active subscription, trial expired");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      is_trial: false,
      trial_end_date: trialEndDate,
      trial_days_left: 0,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
