// src/AdminPaymentSettings.jsx (TIKEPOCHI側)
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CreditCard, Smartphone, Building2, Check, 
  ShieldCheck, Save, RefreshCw, AlertCircle, HelpCircle, Mail, RotateCcw 
} from 'lucide-react';
import { supabase } from './supabaseClient'; // ⭐ Supabaseクライアントをインポート[cite: 3]

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
  success: '#1f9a56',
  danger: '#e85a45',
  paypayRed: '#ff0033'
};

export default function AdminPaymentSettings({ productionId, onBack }) {
  // 1. Stripe（クレジットカード）設定[cite: 3]
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');

  // 2. PayPay（公式 Developers API）設定[cite: 3]
  const [paypayEnabled, setPaypayEnabled] = useState(false);
  const [paypayApiKey, setPaypayApiKey] = useState('');
  const [paypayApiSecret, setPaypayApiSecret] = useState('');
  const [paypayMerchantId, setPaypayMerchantId] = useState('');

  // 3. 銀行振込設定 ＆ メールテンプレート[cite: 3]
  const [bankEnabled, setBankEnabled] = useState(true);
  const [bankName, setBankName] = useState('三菱UFJ銀行');
  const [branchName, setBranchName] = useState('難波支店（123）');
  const [accountType, setAccountType] = useState('普通');
  const [accountNumber, setAccountNumber] = useState('1234567');
  const [accountHolder, setAccountHolder] = useState('オフィスナイト');
  const [bankDaysLimit, setBankDaysLimit] = useState(5);
  const [bankMailTemplate, setBankMailTemplate] = useState('');

  // 4. キャンセルポリシー・返金手数料設定
  const [cancelFeeAmount, setCancelFeeAmount] = useState(500);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  // 銀行案内メールの標準テンプレート生成
  const generateDefaultBankMail = (bName, brName, aType, aNum, aHolder, days) => {
    return `この度はご予約いただき誠にありがとうございます。
チケット代金のお振込先は以下の通りとなります。

━━━━━━━━━━━━━━━━━━━━
【お振込先口座情報】
・金融機関：${bName || '〇〇銀行'}
・支店名 ：${brName || '〇〇支店'}
・口座種別：${aType || '普通'}
・口座番号：${aNum || '1234567'}
・口座名義：${aHolder || '名義人名'}

【お振込期日】
ご予約日より【${days || 5}日以内】にお振込をお願いいたします。

※お振込手数料はお客様のご負担にてお願いいたします。
※お振込名義は【予約番号 ＋ お客様のお名前】（例: 1024 ヤマダタロウ）にてお願いいたします。名義が異なる場合でも照合可能ですが、ご連絡いただけますと幸いです。
━━━━━━━━━━━━━━━━━━━━

ご入金の確認が取れ次第、ご予約確定（精算完了）の案内をお送りいたします。`;
  };

  // 1. Supabaseから決済設定を取得[cite: 3]
  const fetchPaymentSettings = async () => {
    setLoading(true);
    let query = supabase.from('payment_settings').select('*');[cite: 3]

    if (productionId) {
      query = query.eq('production_id', productionId);[cite: 3]
    }

    const { data, error } = await query;[cite: 3]

    if (!error && data && data.length > 0) {
      const s = data[0];
      setStripeEnabled(s.stripe_enabled ?? true);
      setStripePublishableKey(s.stripe_publishable_key || '');
      setStripeSecretKey(s.stripe_secret_key || '');

      setPaypayEnabled(s.paypay_enabled ?? false);
      setPaypayApiKey(s.paypay_api_key || '');
      setPaypayApiSecret(s.paypay_api_secret || '');
      setPaypayMerchantId(s.paypay_merchant_id || '');

      setBankEnabled(s.bank_enabled ?? true);
      setBankName(s.bank_name || '三菱UFJ銀行');
      setBranchName(s.branch_name || '難波支店');
      setAccountType(s.account_type || '普通');
      setAccountNumber(s.account_number || '');
      setAccountHolder(s.account_holder || '');
      setBankDaysLimit(s.bank_days_limit || 5);
      
      if (s.bank_mail_template) {
        setBankMailTemplate(s.bank_mail_template);
      } else {
        setBankMailTemplate(generateDefaultBankMail(s.bank_name, s.branch_name, s.account_type, s.account_number, s.account_holder, s.bank_days_limit || 5));
      }

      setCancelFeeAmount(s.cancel_fee_amount !== undefined ? s.cancel_fee_amount : 500);
    } else {
      // 初期状態
      setBankMailTemplate(generateDefaultBankMail(bankName, branchName, accountType, accountNumber, accountHolder, bankDaysLimit));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPaymentSettings();
  }, [productionId]);

  // 口座情報をもとにテンプレートを再生成
  const handleResetMailTemplate = () => {
    if (window.confirm('メールテンプレートを現在の口座情報をもとに初期化しますか？')) {
      setBankMailTemplate(generateDefaultBankMail(bankName, branchName, accountType, accountNumber, accountHolder, bankDaysLimit));
    }
  };

  // 2. Supabaseへ全決済設定を保存 (UPSERT)[cite: 3]
  const handleSaveAll = async () => {
    setSaving(true);
    const payload = {
      production_id: productionId,
      stripe_enabled: stripeEnabled,
      stripe_publishable_key: stripePublishableKey.trim(),
      stripe_secret_key: stripeSecretKey.trim(),
      paypay_enabled: paypayEnabled,
      paypay_api_key: paypayApiKey.trim(),
      paypay_api_secret: paypayApiSecret.trim(),
      paypay_merchant_id: paypayMerchantId.trim(),
      bank_enabled: bankEnabled,
      bank_name: bankName.trim(),
      branch_name: branchName.trim(),
      account_type: accountType,
      account_number: accountNumber.trim(),
      account_holder: accountHolder.trim(),
      bank_days_limit: Number(bankDaysLimit),
      bank_mail_template: bankMailTemplate.trim(),
      cancel_fee_amount: Number(cancelFeeAmount),
    };

    const { error } = await supabase
      .from('payment_settings')
      .upsert([payload], { onConflict: 'production_id' });[cite: 3]

    setSaving(false);

    if (error) {
      alert('決済設定の保存に失敗しました: ' + error.message);
    } else {
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
        決済・通知設定を読み込み中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px 16px 80px 16px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .form-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 18px;
          box-shadow: 0 2px 4px rgba(43, 36, 56, 0.04);
        }

        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: ${COLORS.gold};
          margin-bottom: 6px;
        }

        .text-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 14px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          box-sizing: border-box;
        }

        .text-input:focus {
          outline: none;
          border-color: ${COLORS.gold};
        }

        .btn-gold {
          padding: 12px 24px;
          background-color: ${COLORS.gold};
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: filter 0.15s ease;
        }
        .btn-gold:hover { filter: brightness(1.08); }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
        }
      `}</style>

      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button 
            onClick={onBack} 
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, fontFamily: "'Shippori Mincho', serif", color: COLORS.text, fontWeight: 700 }}>
            決済・口座・キャンセル規約設定
          </h1>
          <button onClick={handleSaveAll} disabled={saving} className="btn-gold" style={{ padding: '8px 18px', fontSize: '13px' }}>
            <Save size={15} /> {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>

        {savedNotice && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(31,154,86,0.15)', border: `1px solid ${COLORS.success}`, borderRadius: '10px', color: COLORS.success, fontWeight: 700, fontSize: '13px', marginBottom: '16px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={16} /> 決済設定および振込案内メール設定を保存しました！
          </div>
        )}

        {/* 💳 1. クレジットカード決済（Stripe連携） */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color={COLORS.gold} />
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>クレジットカード決済（Stripe）</h2>
                <span style={{ fontSize: '11px', color: COLORS.muted }}>決済手数料（3.6%）は劇団負担・即時オンライン精算</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={stripeEnabled} onChange={(e) => setStripeEnabled(e.target.checked)} style={{ accentColor: COLORS.gold }} />
              {stripeEnabled ? '利用可能' : '停止中'}
            </label>
          </div>

          {stripeEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}` }}>
              <div>
                <label className="input-label">Stripe 公開可能キー (Publishable Key)</label>
                <input type="text" value={stripePublishableKey} onChange={(e) => setStripePublishableKey(e.target.value)} placeholder="pk_live_..." className="text-input" />
              </div>
              <div>
                <label className="input-label">Stripe シークレットキー (Secret Key)</label>
                <input type="password" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} placeholder="sk_live_..." className="text-input" />
              </div>
              <div style={{ fontSize: '11px', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} color={COLORS.success} /> 芸名・通名・家族名義カードでも予約IDで確実に自動紐付けされます。
              </div>
            </div>
          )}
        </div>

        {/* 📱 2. PayPay（公式ビジネス Developers API） */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={20} color={COLORS.paypayRed} />
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>PayPay決済（公式ビジネス API連携）</h2>
                <span style={{ fontSize: '11px', color: COLORS.muted }}>PayPay for Developersのビジネス加盟店APIを活用</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={paypayEnabled} onChange={(e) => setPaypayEnabled(e.target.checked)} style={{ accentColor: COLORS.gold }} />
              {paypayEnabled ? '利用可能' : '停止中'}
            </label>
          </div>

          {paypayEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}` }}>
              <div>
                <label className="input-label">PayPay API Key</label>
                <input type="text" value={paypayApiKey} onChange={(e) => setPaypayApiKey(e.target.value)} placeholder="a_..." className="text-input" />
              </div>
              <div>
                <label className="input-label">PayPay API Secret</label>
                <input type="password" value={paypayApiSecret} onChange={(e) => setPaypayApiSecret(e.target.value)} placeholder="..." className="text-input" />
              </div>
              <div>
                <label className="input-label">Merchant Payment ID (加盟店ID)</label>
                <input type="text" value={paypayMerchantId} onChange={(e) => setPaypayMerchantId(e.target.value)} placeholder="..." className="text-input" />
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', fontSize: '11px', color: COLORS.text, border: `1px solid ${COLORS.border}` }}>
                💡 <strong>API運用のメリット:</strong> お客様がPayPayで支払った瞬間、WEBフック連携で予約ステータスが『精算済み』に自動更新されます。
              </div>
            </div>
          )}
        </div>

        {/* 🏦 3. 銀行振込（口座登録 ＆ メール自動生成） */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color={COLORS.gold} />
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>銀行振込（口座案内・自動メール通知）</h2>
                <span style={{ fontSize: '11px', color: COLORS.muted }}>※振込手数料はお客様負担・予約完了時に口座メールを即時送信</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={bankEnabled} onChange={(e) => setBankEnabled(e.target.checked)} style={{ accentColor: COLORS.gold }} />
              {bankEnabled ? '利用可能' : '停止中'}
            </label>
          </div>

          {bankEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}` }}>
              
              {/* 口座情報入力グリッド */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="input-label">金融機関名</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="例: 三菱UFJ銀行" className="text-input" />
                </div>
                <div>
                  <label className="input-label">支店名・支店番号</label>
                  <input type="text" value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="例: 難波支店（123）" className="text-input" />
                </div>
                <div>
                  <label className="input-label">預金種別</label>
                  <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="text-input">
                    <option value="普通">普通預金</option>
                    <option value="当座">当座預金</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">口座番号</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567" className="text-input" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">口座名義（カタカナ表記）</label>
                  <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="例: オフィスナイト" className="text-input" />
                </div>
                <div>
                  <label className="input-label">振込期日（予約後●日以内）</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" min={1} max={30} value={bankDaysLimit} onChange={(e) => setBankDaysLimit(e.target.value)} className="text-input" style={{ width: '80px' }} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>日以内</span>
                  </div>
                </div>
              </div>

              {/* ✉️ メール文作成・編集エリア */}
              <div style={{ marginTop: '8px', padding: '16px', backgroundColor: COLORS.surfaceAlt, borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: COLORS.gold, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail size={15} /> 予約完了時にお客様へ届く振込案内メール本文
                  </label>
                  <button
                    type="button"
                    onClick={handleResetMailTemplate}
                    style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'underline' }}
                  >
                    <RotateCcw size={12} /> 上記の口座情報で文面を再生成
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: COLORS.muted, margin: '0 0 8px 0', lineHeight: '1.4' }}>
                  お客様が「銀行振込」を選んで予約完了した際に自動送信されるメール本文です。必要に応じて注意書きを追記・編集できます。
                </p>
                <textarea
                  rows={10}
                  value={bankMailTemplate}
                  onChange={(e) => setBankMailTemplate(e.target.value)}
                  className="text-input"
                  style={{ lineHeight: '1.5', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#ffffff' }}
                />
              </div>

            </div>
          )}
        </div>

        {/* ⚖️ 4. 直前キャンセル・返金手数料ポリシー */}
        <div className="form-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <RotateCcw size={18} color={COLORS.gold} />
            <h2 style={{ margin: 0, fontSize: '16px', fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>直前キャンセル・返金手数料ポリシー</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>前日・当日のキャンセル返金手数料:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>一律 ¥</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={cancelFeeAmount}
                  onChange={(e) => setCancelFeeAmount(e.target.value)}
                  className="text-input"
                  style={{ width: '90px', padding: '6px 10px', fontWeight: 700 }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>円</span>
              </div>
            </div>

            <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '12px', color: '#15803d', lineHeight: '1.5' }}>
              <strong>【自動適用ルール】</strong><br />
              ・<strong>事前決済（Stripe・PayPay・振込）</strong>：前日/当日のキャンセル時、決済総額から一律 <strong>¥{cancelFeeAmount}</strong> を差し引いて一部返金されます。<br />
              ・<strong>当日現金精算</strong>：未精算のためキャンセル料の請求・回収は行わず、お席の在庫のみ即時解放されます。
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}