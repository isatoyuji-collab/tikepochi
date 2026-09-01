import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      to,
      customerName,
      productionTitle,
      stageDateTime,
      ticketSummary,
      seatNumbers,
      paymentMethod,
      totalAmount,
      mypageUrl,
      isBoth
    } = await req.json();

    if (!to) {
      throw new Error("宛先メールアドレスがありません");
    }

    const GMAIL_USER = Deno.env.get("GMAIL_USER") || "officeknight06@gmail.com";
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_APP_PASSWORD) {
      throw new Error("GMAIL_APP_PASSWORD is not configured");
    }

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
    });

    let paymentText = "";
    if (paymentMethod === "STRIPE_CARD") {
      paymentText = "■ お支払い方法：クレジットカード決済（決済完了）";
    } else if (paymentMethod === "BANK_TRANSFER") {
      paymentText = "■ お支払い方法：銀行振込（事前精算）\n※お振込先口座情報は下記マイページよりご確認いただけます。期日までにお振込をお願い申し上げます。";
    } else {
      paymentText = "■ お支払い方法：当日受付精算（現金）";
    }

    const seatText = seatNumbers ? `\n■ 指定座席：${seatNumbers}` : "";

    const emailBody = `${customerName} 様

この度は『${productionTitle}』のご予約をいただき、誠にありがとうございます。
以下の内容でご予約を承りました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【ご予約内容】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isBoth ? "★ 両公演セット予約\n" : ""}■ 公演名：${productionTitle}
■ 日時：${stageDateTime}
■ 券種・枚数：${ticketSummary}${seatText}
■ 合計金額：¥${Number(totalAmount || 0).toLocaleString()}
${paymentText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【マイページ・電子チケットのご案内】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ご予約内容の確認、座席の確認、道順動画は下記マイページよりアクセスいただけます。
${mypageUrl}

※当日は受付にてお名前をお知らせいただくか、マイページ画面をご提示ください。
劇場でお会いできることを心より楽しみにしております！🐾

────────────────────────────
office Knight 制作部
メール: ${GMAIL_USER}
────────────────────────────`;

    await client.send({
      from: `office Knight <${GMAIL_USER}>`,
      to: to,
      subject: `【予約完了】『${productionTitle}』ご予約ありがとうございます`,
      content: emailBody,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
