import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Smartphone, Building2, Check, ShieldCheck, Save } from 'lucide-react';
import { supabase } from './supabaseClient'; // ⭐ Supabaseクライアントをインポート

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
  success: '#1f9a56',
  paypayRed: '#ff0033'
};

export default function AdminPaymentSettings({ productionId, onBack }) {
  // Stripe設定
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripePublishableKey, setStripePublishableKey] = useState('pk_test_sample123456');
  const [stripeSecretKey, setStripeSecretKey] = useState('sk_test_sample654321');

  // PayPay（個人送金URL）設定
  const [paypayEnabled, setPaypayEnabled] = useState(true);
  const [paypayUrl, setPaypayUrl] = useState('https://paypay.me/sample_theater');
  const [paypayId, setPaypayId] = useState('sample_theater');
  const [paypayMessage, setPaypayMessage] = useState('ご予約ありがとうございます！以下のURLより【●●●●円】の送金をお願いいたします。\n※お支払い確認後、予約完了（精算済み）となります。');

  // 銀行振込設定
  const [bankEnabled, setBankEnabled] = useState(true);
  const [bankName, setBankName] = useState('〇〇銀行');
  const [branchName, setBranchName] = useState('本町支店（123）');
  const [accountType, setAccountType] = useState('普通');
  const [accountNumber, setAccountNumber] = useState('1234567');
  const [accountHolder, setAccountHolder] = useState('ゲキダン サンプル');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  // 1. Supabaseから決済設定を取得
  const fetchPaymentSettings = async () => {
    setLoading(true);
    let query = supabase.from('payment_settings').select('*');

    if (productionId) {
      query = query.eq('production_id', productionId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const s = data[0];
      setStripeEnabled(s.stripe_enabled ?? true);
      setStripePublishableKey(s.stripe_publishable_key || '');
      setStripeSecretKey(s.stripe_secret_key || '');

      setPaypayEnabled(s.paypay_enabled ?? true);
      setPaypayUrl(s.paypay_url || '');
      setPaypayId(s.paypay_id || '');
      setPaypayMessage(s.paypay_message || '');

      setBankEnabled(s.bank_enabled ?? true);
      setBankName(s.bank_name || '');
      setBranchName(s.branch_name || '');
      setAccountType(s.account_type || '普通');
      setAccountNumber(s.account_number || '');
      setAccountHolder(s.account_holder || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPaymentSettings();
  }, [productionId]);

  // 2. Supabaseへ全決済設定を保存 (UPSERT)
  const handleSaveAll = async () => {
    setSaving(true);
    const payload = {
      production_id: productionId,
      stripe_enabled: stripeEnabled,
      stripe_publishable_key: stripePublishableKey,
      stripe_secret_key: stripeSecretKey,
      paypay_enabled: paypayEnabled,
      paypay_url: paypayUrl,
      paypay_id: paypayId,
      paypay_message: paypayMessage,
      bank_enabled: bankEnabled,
      bank_name: bankName,
      branch_name: branchName,
      account_type: accountType,
      account_number: accountNumber,
      account_holder: accountHolder,
    };

    const { error } = await supabase
      .from('payment_settings')
      .upsert([payload], { onConflict: 'production_id' });

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
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        決済設定を読み込み中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .form-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 16px;
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

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button 
            onClick={onBack} 
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: "'Shippori Mincho', serif", color: COLORS.text, fontWeight: 700 }}>
            決済アカウント・外部連携設定（劇団共通）
          </h1>
          <button onClick={handleSaveAll} disabled={saving} className="btn-gold" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Save size={15} /> {saving ? '保存中...' : '保存する'}
          </button>
        </div>

        {savedNotice && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(31,154,86,0.15)', border: `1px solid ${COLORS.success}`, borderRadius: '10px', color: COLORS.success, fontWeight: 700, fontSize: '13px', marginBottom: '16px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={16} /> 決済設定をSupabaseに保存しました！
          </div>
        )}

        {/* 💳 1. クレジットカード決済（Stripe連携） */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color={COLORS.gold} />
              <h2 style={{ margin: 0, fontSize: '16px', fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>クレジットカード決済（Stripe）</h2>
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
                <ShieldCheck size={13} color={COLORS.success} /> オンラインでチケット代金を即時回収・自動発券できます。
              </div>
            </div>
          )}
        </div>

        {/* 📱 2. PayPay送金（個人リンク・自動案内） */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={20} color={COLORS.paypayRed} />
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>PayPay（個人送金URL案内）</h2>
                <span style={{ fontSize: '11px', color: COLORS.muted }}>加盟店契約なしで個人のPayPay受取リンクを活用</span>
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
                <label className="input-label">PayPay受取用URL（マイコードリンク）</label>
                <input type="text" value={paypayUrl} onChange={(e) => setPaypayUrl(e.target.value)} placeholder="https://paypay.me/your_id" className="text-input" />
              </div>
              <div>
                <label className="input-label">PayPay ID（補足用）</label>
                <input type="text" value={paypayId} onChange={(e) => setPaypayId(e.target.value)} placeholder="your_id" className="text-input" />
              </div>
              <div>
                <label className="input-label">予約完了メール/LINEでのPayPay案内文言</label>
                <textarea rows={3} value={paypayMessage} onChange={(e) => setPaypayMessage(e.target.value)} className="text-input" style={{ lineHeight: '1.4' }} />
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', fontSize: '11px', color: COLORS.text, border: `1px solid ${COLORS.border}` }}>
                💡 <strong>運用イメージ:</strong> 予約完了時の自動メール/LINEにこのURLが記載されます。お客様から送金通知が届いたら、受付・制作画面でステータスを『精算済み』に切り替えるだけ！
              </div>
            </div>
          )}
        </div>

        {/* 🏦 3. 銀行振込 */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color={COLORS.gold} />
              <h2 style={{ margin: 0, fontSize: '16px', fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>銀行振込（事前案内）</h2>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={bankEnabled} onChange={(e) => setBankEnabled(e.target.checked)} style={{ accentColor: COLORS.gold }} />
              {bankEnabled ? '利用可能' : '停止中'}
            </label>
          </div>

          {bankEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}` }}>
              <div>
                <label className="input-label">金融機関名</label>
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="text-input" />
              </div>
              <div>
                <label className="input-label">支店名・支店番号</label>
                <input type="text" value={branchName} onChange={(e) => setBranchName(e.target.value)} className="text-input" />
              </div>
              <div>
                <label className="input-label">預金種別・口座番号</label>
                <input type="text" value={`${accountType} ${accountNumber}`} onChange={(e) => setAccountNumber(e.target.value)} className="text-input" />
              </div>
              <div>
                <label className="input-label">口座名義（フリガナ）</label>
                <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="text-input" />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}