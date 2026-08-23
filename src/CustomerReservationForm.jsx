import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Calendar, User, Ticket, CheckCircle2, AlertCircle, Sparkles, MapPin } from 'lucide-react';

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
};

export default function CustomerReservationForm({ productionId }) {
  const [production, setProduction] = useState(null);
  const [stages, setStages] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 予約入力フォーム
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerMemo, setCustomerMemo] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [donationAmount, setDonationAmount] = useState(500);
  const [selectedStaffName, setSelectedStaffName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [mypageToken, setMypageToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function fetchProductionData() {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const staffParam = urlParams.get('staff') || '';

        // 1. 公演情報の取得
        const { data: prodData } = await supabase
          .from('productions')
          .select('*')
          .eq('id', productionId)
          .single();

        if (prodData) setProduction(prodData);

        // 2. ステージ・券種・キャストの取得
        const [{ data: stageData }, { data: ticketData }, { data: staffData }] = await Promise.all([
          supabase.from('stages').select('*').eq('production_id', productionId).order('performance_date', { ascending: true }).order('start_time', { ascending: true }),
          supabase.from('ticket_types').select('*').eq('production_id', productionId).order('price', { ascending: true }),
          supabase.from('cast_staff').select('*').eq('production_id', productionId).order('name', { ascending: true }),
        ]);

        if (stageData && stageData.length > 0) {
          setStages(stageData);
          setSelectedStageId(stageData[0].id);
        }
        if (ticketData && ticketData.length > 0) {
          setTicketTypes(ticketData);
          setSelectedTicketTypeId(ticketData[0].id);
        }
        if (staffData) {
          setStaffList(staffData);
        }

        if (staffParam) {
          setSelectedStaffName(staffParam);
        }
      } catch (err) {
        console.error('Reservation form load error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (productionId) fetchProductionData();
  }, [productionId]);

  const selectedTicket = ticketTypes.find(t => t.id === selectedTicketTypeId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      alert('お名前とメールアドレスは必須です。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const token = crypto.randomUUID();
      const payload = {
        production_id: productionId,
        stage_id: selectedStageId,
        ticket_type_id: selectedTicketTypeId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim(),
        count: ticketCount,
        staff_name: selectedStaffName || null,
        memo: customerMemo.trim() || null,
        donation_amount: selectedTicket?.is_donation ? donationAmount : null,
        mypage_token: token,
        notification_method: 'email',
      };

      const { error } = await supabase.from('reservations').insert([payload]);
      if (error) throw error;

      setMypageToken(token);
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMessage('予約の送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.text, fontFamily: 'sans-serif' }}>
        予約フォームを読み込み中...
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '32px 16px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto', backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 4px 12px rgba(43, 36, 56, 0.06)' }}>
          <CheckCircle2 size={56} color={COLORS.success} style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0' }}>ご予約が完了いたしました</h2>
          <p style={{ fontSize: '14px', color: COLORS.muted, lineHeight: '1.6', margin: '0 0 24px 0' }}>
            ご登録のメールアドレス（{customerEmail}）宛に予約確認メールを送信いたしました。
          </p>

          <a
            href={`${window.location.origin}/mypage?token=${mypageToken}`}
            style={{ display: 'inline-block', width: '100%', padding: '14px', backgroundColor: COLORS.gold, color: '#ffffff', textDecoration: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '15px', boxSizing: 'border-box' }}
          >
            予約内容の確認・変更（マイページへ）
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px 16px 60px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>

        {/* 公演ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: COLORS.text }}>
            {production?.title || '公演タイトル'}
          </h1>
          {production?.subtitle && (
            <p style={{ fontSize: '13px', color: COLORS.muted, margin: '0 0 6px 0' }}>{production.subtitle}</p>
          )}
          {production?.venue_name && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: COLORS.gold, fontWeight: 700 }}>
              <MapPin size={13} /> {production.venue_name}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 公演回（ステージ）選択 */}
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px' }}>
              観劇日時（ステージ）
            </label>
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
            >
              {stages.map(st => (
                <option key={st.id} value={st.id}>
                  {st.performance_date} {st.start_time?.slice(0, 5)}開演 {st.team_name ? `(${st.team_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 券種と枚数 */}
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '18px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px' }}>
                  券種
                </label>
                <select
                  value={selectedTicketTypeId}
                  onChange={(e) => setSelectedTicketTypeId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
                >
                  {ticketTypes.map(tk => (
                    <option key={tk.id} value={tk.id}>
                      {tk.name} ({tk.is_donation ? 'カンパ制' : `¥${tk.price?.toLocaleString()}`})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px' }}>
                  枚数
                </label>
                <select
                  value={ticketCount}
                  onChange={(e) => setTicketCount(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cnt => (
                    <option key={cnt} value={cnt}>{cnt}枚</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTicket?.is_donation && (
              <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginTop: '6px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                  カンパ金額（1枚あたり下限500円〜）
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>¥</span>
                  <input
                    type="number"
                    min={500}
                    step={100}
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(parseInt(e.target.value) || 500)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '14px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 扱いキャスト */}
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px' }}>
              扱いキャスト・スタッフ
            </label>
            <select
              value={selectedStaffName}
              onChange={(e) => setSelectedStaffName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
            >
              <option value="">-- 劇団扱い --</option>
              {staffList.map(st => (
                <option key={st.id} value={st.name}>{st.name}</option>
              ))}
            </select>
          </div>

          {/* お客様情報 */}
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.gold }}>
              お客様情報
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>お名前（必須）</label>
              <input
                type="text"
                required
                placeholder="例: 山田 太郎"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>メールアドレス（必須）</label>
              <input
                type="email"
                required
                placeholder="example@domain.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>お電話番号</label>
              <input
                type="tel"
                placeholder="090-0000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>備考</label>
              <textarea
                rows={2}
                placeholder="ご要望等あればご記入ください"
                value={customerMemo}
                onChange={(e) => setCustomerMemo(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '13px' }}
              />
            </div>
          </div>

          {errorMessage && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} /> {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: COLORS.gold,
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(201,121,31,0.25)',
            }}
          >
            {isSubmitting ? '処理中...' : '予約を確定する'}
          </button>
        </form>

      </div>
    </div>
  );
}