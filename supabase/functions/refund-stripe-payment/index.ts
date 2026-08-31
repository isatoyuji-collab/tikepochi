// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reservationId, mypageToken } = await req.json();

    if (!reservationId || !mypageToken) {
      throw new Error("予約IDまたはマイページトークンが不足しています");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 予約データを取得
    const { data: resData, error: resError } = await supabaseAdmin
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .eq("mypage_token", mypageToken)
      .single();

    if (resError || !resData) {
      throw new Error("予約データが見つかりませんでした");
    }

    // Stripe初期化
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    let refundAmount = 0;
    let refundId = null;

    if (resData.payment_status === "PAID" && resData.stripe_payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        resData.stripe_payment_intent_id
      );

      const totalAmount = paymentIntent.amount_received || paymentIntent.amount;
      refundAmount = Math.max(0, totalAmount - 500); // 500円差し引いて返金

      if (refundAmount > 0) {
        const refund = await stripe.refunds.create({
          payment_intent: resData.stripe_payment_intent_id,
          amount: refundAmount,
          reason: "requested_by_customer",
        });
        refundId = refund.id;
      }
    }

    // 予約ステータスをキャンセル／返金済みに更新
    await supabaseAdmin
      .from("reservations")
      .update({
        payment_status: resData.payment_status === "PAID" ? "REFUNDED" : "CANCELLED",
        memo: `${resData.memo || ""}\n【キャンセル】返金額: ¥${refundAmount} (手数料¥500引)`.trim(),
      })
      .eq("id", resData.id);

    // 座席予約を解放
    await supabaseAdmin
      .from("seat_reservations")
      .delete()
      .eq("reservation_id", resData.id);

    return new Response(
      JSON.stringify({
        success: true,
        refundAmount,
        fee: 500,
        refundId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});