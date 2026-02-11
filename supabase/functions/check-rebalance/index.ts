import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_MAP: Record<string, string> = {
  crypto: "crypto_allocation",
  stocks: "stocks_allocation",
  commodities: "commodities_allocation",
  banking: "emergency_fund_target",
};

const FREQUENCY_HOURS: Record<string, number> = {
  daily: 24,
  weekly: 168,
  monthly: 720,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all users with investment preferences
    const { data: prefs, error: prefsError } = await supabase
      .from("user_investment_preferences")
      .select("*");

    if (prefsError) throw prefsError;
    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let alertsCreated = 0;

    for (const pref of prefs) {
      // Check frequency
      const freqHours = FREQUENCY_HOURS[pref.rebalance_frequency] || 168;
      if (pref.last_rebalance_check) {
        const lastCheck = new Date(pref.last_rebalance_check).getTime();
        const hoursElapsed = (Date.now() - lastCheck) / (1000 * 60 * 60);
        if (hoursElapsed < freqHours) continue;
      }

      // Check for existing undismissed alert
      const { data: existingAlerts } = await supabase
        .from("rebalance_alerts")
        .select("id")
        .eq("user_id", pref.user_id)
        .eq("is_dismissed", false)
        .limit(1);

      if (existingAlerts && existingAlerts.length > 0) {
        // Update last check time anyway
        await supabase
          .from("user_investment_preferences")
          .update({ last_rebalance_check: new Date().toISOString() })
          .eq("id", pref.id);
        continue;
      }

      // Fetch user's assets
      const { data: assets, error: assetsError } = await supabase
        .from("assets")
        .select("category, value")
        .eq("user_id", pref.user_id);

      if (assetsError || !assets || assets.length === 0) continue;

      // Compute category totals
      const categoryTotals: Record<string, number> = {};
      let totalValue = 0;

      for (const asset of assets) {
        const allocKey = CATEGORY_MAP[asset.category];
        if (allocKey) {
          const label = asset.category;
          categoryTotals[label] = (categoryTotals[label] || 0) + asset.value;
        }
        totalValue += asset.value;
      }

      if (totalValue <= 0) continue;

      // Compute drift
      const driftData: Array<{
        category: string;
        target: number;
        actual: number;
        diff: number;
      }> = [];
      let maxDrift = 0;

      const LABEL_MAP: Record<string, string> = {
        crypto: "Crypto",
        stocks: "Stocks/ETFs",
        commodities: "Commodities",
        banking: "Emergency Fund",
      };

      for (const [assetCat, allocKey] of Object.entries(CATEGORY_MAP)) {
        const target = Number(pref[allocKey]) || 0;
        if (target <= 0) continue;

        const actual = ((categoryTotals[assetCat] || 0) / totalValue) * 100;
        const diff = Math.round((actual - target) * 10) / 10;
        const absDiff = Math.abs(diff);

        driftData.push({
          category: LABEL_MAP[assetCat] || assetCat,
          target: Math.round(target * 10) / 10,
          actual: Math.round(actual * 10) / 10,
          diff,
        });

        if (absDiff > maxDrift) maxDrift = absDiff;
      }

      // Check threshold
      const threshold = pref.rebalance_threshold || 10;
      if (maxDrift > threshold) {
        // Insert alert
        await supabase.from("rebalance_alerts").insert({
          user_id: pref.user_id,
          drift_data: driftData,
          max_drift: maxDrift,
        });
        alertsCreated++;
      }

      // Update last check timestamp
      await supabase
        .from("user_investment_preferences")
        .update({ last_rebalance_check: new Date().toISOString() })
        .eq("id", pref.id);
    }

    return new Response(
      JSON.stringify({ processed: prefs.length, alerts_created: alertsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-rebalance error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
