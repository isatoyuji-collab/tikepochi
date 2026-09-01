// supabase/functions/generate-promo-text/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productionTitle, venueName, stageDateTime, appealPoints, bookingUrl } = await req.json();

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY が設定されていません');
    }

    const prompt = `あなたは小劇場の出演者・関係者として、観客や知人に向けて観劇のお誘い文を作成します。
AI特有の大げさな煽り（「奇跡の舞台」「必見！」など）は避けつつ、作品への思いや見どころがしっかり伝わる、丁寧で親しみやすい文章を作成してください。
名前（〜扱いなど）は含めないでください。

以下の情報をもとに、【LINE用】と【X投稿用】の2種類を作成してください。

【公演情報】
・公演名：${productionTitle || '公演'}
・会場：${venueName || '劇場'}
・日時：${stageDateTime || '日程未定'}
・アピールポイント：${appealPoints?.trim() || '（特に指定なし）'}
・予約URL：${bookingUrl || ''}

【作成指示】
① LINE用
・知り合いに個別やお知らせで送るメッセージ。
・作品の魅力や見どころを丁寧に伝えつつ、日時・会場の要点をすっきり整理した改行レイアウトにする。
・末尾に「▼ご予約はこちらから」などの案内文とともに【予約URL】を配置する。

② X用
・本文は100文字程度にコンパクトにまとめ、タイムラインで魅力が端的に伝わるようにする。
・末尾に必ず半角スペースを空けて【予約URL】と「#ダイエンカイ」を配置する。

出力は必ず以下の形式（「①」「②」で区切る）のみを出力してください。
① (LINE用メッセージ本文)
② (X用ポスト本文)`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic APIエラー: ${errText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});