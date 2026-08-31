import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 決済設定からWebhookシークレットまたはStripeシークレットキーを取得
    const { data: settings } = await supabaseAdmin
      .from("payment_settings")
      .select("stripe_secret_key, stripe_webhook_secret")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stripeKey = settings?.stripe_secret_key || Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = settings?.stripe_webhook_secret || Deno.env.get("STRIPE_WEBHOOK_SECRET");

    const stripe = new Stripe(stripeKey!, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let event: Stripe.Event;

    // Webhookシークレットが設定されている場合は署名検証
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    // 決済成功（checkout.session.completed）イベントを処理
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.client_reference_id || session.metadata?.reservation_id;

      if (reservationId) {
        // 予約ステータスを「受領済み/精算済み」に自動更新
        const { error: updateError } = await supabaseAdmin
          .from("reservations")
          .update({
            payment_status: "paid",
            status: "confirmed",
            paid_at: new Date().toISOString(),
            payment_method: "credit_card",
            stripe_payment_intent_id: session.payment_intent as string || null,
          })
          .eq("id", reservationId);

        if (updateError) {
          console.error("Failed to update reservation:", updateError);
          return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
        }

        console.log(`Reservation ${reservationId} successfully marked as PAID!`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});