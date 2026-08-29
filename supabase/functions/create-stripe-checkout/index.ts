// supabase/functions/create-stripe-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS プリフライトリクエストの処理
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { productionId, reservationId, ticketTitle, amount, quantity, customerEmail, returnUrl } = await req.json();

    // 1. Supabaseから該当公演の Stripe Secret Key を取得
    // ※Edge Function内では SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY は自動注入されます
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // production_id指定、なければ最新の決済設定をフォールバック取得
    let { data: settings, error: dbError } = await supabaseAdmin
      .from("payment_settings")
      .select("stripe_secret_key, stripe_enabled")
      .eq("production_id", productionId)
      .maybeSingle();

    if (!settings || !settings.stripe_secret_key) {
      const { data: fallbackSettings } = await supabaseAdmin
        .from("payment_settings")
        .select("stripe_secret_key, stripe_enabled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      settings = fallbackSettings;
    }

    if (!settings || !settings.stripe_enabled || !settings.stripe_secret_key) {
      throw new Error("Stripe決済の設定が見つからないか、無効になっています。");
    }

    if (dbError || !settings || !settings.stripe_enabled || !settings.stripe_secret_key) {
      throw new Error("Stripe決済の設定が見つからないか、無効になっています。");
    }

    // 2. 登録されているシークレットキーでStripeを初期化
    const stripe = new Stripe(settings.stripe_secret_key, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 3. Checkout Session を作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: ticketTitle || "公演チケット",
            },
            unit_amount: Number(amount),
          },
          quantity: Number(quantity) || 1,
        },
      ],
      metadata: {
        reservation_id: String(reservationId),
        production_id: String(productionId),
      },
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&res_id=${reservationId}&status=success`,
      cancel_url: `${returnUrl}?res_id=${reservationId}&status=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});