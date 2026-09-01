// supabase/functions/generate-promo-text/index.ts
//
// 担当者個別ページの「AI助けて」ボタンから呼び出される、
// 宣伝用文章をClaude APIで生成するEdge Function。
//
// 【デプロイ前に必要な準備】
// Supabaseダッシュボード → Edge Functions → Secrets で
// ANTHROPIC_API_KEY にご自身のAnthropic APIキーを登録してください。
//
// 【デプロイコマンド】
// supabase functions deploy generate-promo-text
//
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productionTitle, venueName, stageDateTime, staffName, appealPoints } = await req.json();

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY が設定されていません（Supabase側のSecretsを確認してください）');
    }

    const prompt = `あなたは小劇場の宣伝文章を作るプロのコピーライターです。
以下の情報をもとに、SNS（XやLINE）でそのまま使える観劇の宣伝文章を、絵文字を適度に使った親しみやすいトーンで3パターン作成してください。それぞれ140字前後に収めてください。

【公演名】${productionTitle || '公演'}
【会場】${venueName || '劇場'}
【日時】${stageDateTime || '日程未定'}
【担当者名】${staffName || ''}
【アピールポイント】${appealPoints?.trim() || '（特に指定なし）'}

担当者名が入力されている場合は「${staffName || ''}扱いでご予約受付中です！」のような一文を自然に含めてください。
出力は「①」「②」「③」で区切った文章のみを出力し、前置きや説明文、余計な見出しは付けないでください。`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 800,
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});