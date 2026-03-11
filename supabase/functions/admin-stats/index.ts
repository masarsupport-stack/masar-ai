import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("User not authenticated");

    // Check admin status
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Fetch comprehensive stats
    const [
      usersResult,
      attemptsResult,
      questionsResult,
      recentUsersResult,
      topUsersResult,
    ] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: false }),
      supabaseAdmin.from('user_quiz_attempts').select('*', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('questions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_profiles').select('id, email, username, name_ar, ai_score, streak, total_sessions, diagnostic_completed').order('id').limit(50),
      supabaseAdmin.from('user_profiles').select('id, email, name_ar, ai_score, total_sessions, streak').order('ai_score', { ascending: false }).limit(10),
    ]);

    const totalUsers = usersResult.count || 0;
    const allUsers = usersResult.data || [];
    const diagnosticDone = allUsers.filter((u: any) => u.diagnostic_completed).length;
    const totalAttempts = attemptsResult.count || 0;
    const totalQuestions = questionsResult.count || 0;

    // Calculate average scores from attempts
    const attempts = attemptsResult.data || [];
    const avgScore = attempts.length > 0
      ? Math.round(attempts.reduce((sum: number, a: any) => sum + (a.score_percent || 0), 0) / attempts.length)
      : 0;

    // Today's activity
    const today = new Date().toISOString().split('T')[0];
    const todayAttempts = attempts.filter((a: any) => a.created_at?.startsWith(today)).length;

    // Exam distribution
    const examDist: Record<string, number> = {};
    attempts.forEach((a: any) => {
      examDist[a.exam_type] = (examDist[a.exam_type] || 0) + 1;
    });

    return new Response(JSON.stringify({
      totalUsers,
      diagnosticCompleted: diagnosticDone,
      totalAttempts,
      totalQuestions,
      avgScore,
      todayAttempts,
      examDistribution: examDist,
      recentUsers: recentUsersResult.data || [],
      topUsers: topUsersResult.data || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
