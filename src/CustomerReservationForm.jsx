import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
};

export default function CustomerReservationForm({ productionId, presetCastId }) {
  const [stages, setStages] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [casts, setCasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1:公演回 2:詳細入力
  const [done, setDone] = useState(false);

  // 公演回：'A' | 'B' | 'both'
  const [team, setTeam] = useState('');

  const [form, setForm] = useState({
    stage_id_a: '',
    stage_id_b: '',
    ticket_type_id: '',
    donation_amount: '',
    cast_id_a: '',
    cast_id_b: '',
    count: 1,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    memo: '',
  });

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: stagesData }, { data: ticketsData }, { data: castsData }] = await Promise.all([
        supabase.from('stages').select('*').eq('production_id', productionId).order('stage_date'),
        supabase.from('ticket_types').select('*').eq('production_id', productionId),
        supabase.from('cast_staff').select('*').eq('production_id', productionId).eq('member_type', 'cast'),
      ]);
      setStages(stagesData || []);
      setTicketTypes(ticketsData || []);
      setCasts(castsData || []);
      setLoading(false);
    };
    if (productionId) fetchAll();
  }, [productionId]);

  // --- 公演回選択に応じたフィルタ ---
  const stagesA = stages.filter(s => s.team_tag === 'A');
  const stagesB = stages.filter(s => s.team_tag === 'B');

  const filteredTickets = useMemo(() => {
    if (!team) return [];
    if (team === 'both') return ticketTypes.filter(t => t.applicable_team === 'both');
    return ticketTypes.filter(t => t.applicable_team === team || t.applicable_team === 'both');
  }, [team, ticketTypes]);

  const selectedTicket = ticketTypes.find(t => t.id === form.ticket_type_id);
  const isDonation = selectedTicket?.is_donation;

  const stageA = stages.find(s => s.id === form.stage_id_a);
  const stageB = stages.find(s => s.id === form.stage_id_b);

  // 座席方式：選ばれているステージの seat_type を見る
  const needsSeatSelectionA = stageA?.seat_type === 'reserved';
  const needsSeatSelectionB = stageB?.seat_type === 'reserved';

  // --- 担当者：優先表示の並び替え ---
  const sortCastsForTeam = (t) => {
    const priority = casts.filter(c => c.team_tag === t || c.team_tag === 'both');
    const others = casts.filter(c => c.team_tag !== t && c.team_tag !== 'both');
    return { priority, others };
  };

  const castsForA = sortCastsForTeam('A');
  const castsForB = sortCastsForTeam('B');

  const totalPrice = isDonation
    ? Number(form.donation_amount || 0)
    : (selectedTicket?.price || 0) * form.count;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isDonation && Number(form.donation_amount) < (selectedTicket?.min_amount || 500)) {
      alert(`カンパ金額は¥${selectedTicket?.min_amount || 500}以上でご入力ください。`);
      return;
    }

    setSubmitting(true);

    const payload = {
      production_id: productionId,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email,
      memo: form.memo,
      ticket_type_id: form.ticket_type_id,
      count: Number(form.count),
      total_price: totalPrice,
      donation_amount: isDonation ? Number(form.donation_amount) : null,
      payment_status: 'unpaid',
      checked_in: false,
    };

    if (team === 'both') {
      payload.stage_id = form.stage_id_a; // 主レコードはA公演分を軸に登録
      payload.cast_id = presetCastId || form.cast_id_a || null;
      payload.stage_id_b = form.stage_id_b;
      payload.cast_id_b = presetCastId || form.cast_id_b || null;
    } else if (team === 'A') {
      payload.stage_id = form.stage_id_a;
      payload.cast_id = presetCastId || form.cast_id_a || null;
    } else if (team === 'B') {
      payload.stage_id = form.stage_id_b;
      payload.cast_id = presetCastId || form.cast_id_b || null;
    }

    const { error } = await supabase.from('reservations').insert([payload]);

    setSubmitting(false);

    if (error) {
      alert('予約に失敗しました: ' + error.message);
      return;
    }
    setDone(true);
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>読み込み中...</div>;
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '420px', backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '18px', padding: '28px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.gold, marginBottom: '10px' }}>ご予約ありがとうございます</h2>
          <p style={{ fontSize: '13px', color: COLORS.muted }}>
            ご入力いただいたメールアドレスに、マイページのURLをお送りしました。
          </p>
        </div>
      </div>
    );
  }

  const cardBtnStyle = (active) => ({
    flex: 1,
    padding: '18px 8px',
    borderRadius: '14px',
    border: `2px solid ${active ? COLORS.gold : COLORS.border}`,
    backgroundColor: active ? '#fff6e8' : COLORS.surface,
    color: COLORS.text,
    fontWeight: 700,
    fontSize: '15px',
    textAlign: 'center',
    cursor: 'pointer',
  });

  const inputStyle = {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    marginBottom: '16px',
    fontSize: '16px', // iOSでズームされないよう16px以上
    boxSizing: 'border-box',
  };

  const labelStyle = { fontSize: '13px', fontWeight: 700, color: COLORS.gold, display: 'block', marginBottom: '6px' };

  const renderCastPicker = (label, castGroup, value, onChange) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        {castGroup.priority.map(c => (
          <button
            type="button"
            key={c.id}
            onClick={() => onChange(c.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '20px',
              border: `2px solid ${value === c.id ? COLORS.gold : COLORS.border}`,
              backgroundColor: value === c.id ? COLORS.gold : COLORS.surface,
              color: value === c.id ? '#fff' : COLORS.text,
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
      {castGroup.others.length > 0 && (
        <details>
          <summary style={{ fontSize: '12px', color: COLORS.muted, cursor: 'pointer' }}>その他のキャスト・スタッフから選ぶ</summary>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
            {castGroup.others.map(c => (
              <button
                type="button"
                key={c.id}
                onClick={() => onChange(c.id)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '20px',
                  border: `2px solid ${value === c.id ? COLORS.gold : COLORS.border}`,
                  backgroundColor: value === c.id ? COLORS.gold : COLORS.surface,
                  color: value === c.id ? '#fff' : COLORS.text,
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '20px', color: COLORS.gold, marginBottom: '20px', textAlign: 'center' }}>
          ご予約フォーム
        </h1>

        {/* ステップ1：公演回選択 */}
        {step === 1 && (
          <div>
            <label style={labelStyle}>ご希望の公演回</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <div style={cardBtnStyle(team === 'A')} onClick={() => setTeam('A')}>A公演</div>
              <div style={cardBtnStyle(team === 'B')} onClick={() => setTeam('B')}>B公演</div>
              <div style={cardBtnStyle(team === 'both')} onClick={() => setTeam('both')}>両公演</div>
            </div>
            <button
              type="button"
              disabled={!team}
              onClick={() => setStep(2)}
              style={{ width: '100%', padding: '16px', borderRadius: '10px', border: 'none', backgroundColor: team ? COLORS.gold : COLORS.border, color: '#fff', fontWeight: 700, fontSize: '15px', cursor: team ? 'pointer' : 'not-allowed' }}
            >
              次へ
            </button>
          </div>
        )}

        {/* ステップ2：詳細入力 */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: COLORS.gold, fontWeight: 700, marginBottom: '16px', cursor: 'pointer', padding: 0 }}>
              ← 公演回を選び直す
            </button>

            {/* 観劇日時（A） */}
            {(team === 'A' || team === 'both') && (
              <>
                <label style={labelStyle}>A公演 観劇日時</label>
                <select required value={form.stage_id_a} onChange={e => setForm({ ...form, stage_id_a: e.target.value })} style={inputStyle}>
                  <option value="">選択してください</option>
                  {stagesA.map(s => (
                    <option key={s.id} value={s.id}>{s.stage_date} {s.start_time?.slice(0,5)}</option>
                  ))}
                </select>
                {needsSeatSelectionA && (
                  <div style={{ fontSize: '12px', color: COLORS.gold, marginBottom: '16px', padding: '10px', backgroundColor: '#fff6e8', borderRadius: '8px' }}>
                    A公演は指定席です。予約完了後、座席選択のご案内をお送りします。
                  </div>
                )}
              </>
            )}

            {/* 観劇日時（B） */}
            {(team === 'B' || team === 'both') && (
              <>
                <label style={labelStyle}>B公演 観劇日時</label>
                <select required value={form.stage_id_b} onChange={e => setForm({ ...form, stage_id_b: e.target.value })} style={inputStyle}>
                  <option value="">選択してください</option>
                  {stagesB.map(s => (
                    <option key={s.id} value={s.id}>{s.stage_date} {s.start_time?.slice(0,5)}</option>
                  ))}
                </select>
                {needsSeatSelectionB && (
                  <div style={{ fontSize: '12px', color: COLORS.gold, marginBottom: '16px', padding: '10px', backgroundColor: '#fff6e8', borderRadius: '8px' }}>
                    B公演は指定席です。予約完了後、座席選択のご案内をお送りします。
                  </div>
                )}
              </>
            )}

            {/* 券種 */}
            <label style={labelStyle}>券種</label>
            <select required value={form.ticket_type_id} onChange={e => setForm({ ...form, ticket_type_id: e.target.value })} style={inputStyle}>
              <option value="">選択してください</option>
              {filteredTickets.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.is_donation ? '（カンパ制）' : `（¥${Number(t.price).toLocaleString()}）`}
                </option>
              ))}
            </select>

            {/* カンパ金額入力 or 枚数 */}
            {isDonation ? (
              <>
                <label style={labelStyle}>ご希望のカンパ金額（¥{selectedTicket?.min_amount || 500}以上）</label>
                <input
                  type="number"
                  required
                  min={selectedTicket?.min_amount || 500}
                  value={form.donation_amount}
                  onChange={e => setForm({ ...form, donation_amount: e.target.value })}
                  style={inputStyle}
                  placeholder={`例：${selectedTicket?.min_amount || 500}`}
                />
              </>
            ) : (
              <>
                <label style={labelStyle}>枚数</label>
                <input
                  type="number" min="1" required
                  value={form.count}
                  onChange={e => setForm({ ...form, count: e.target.value })}
                  style={inputStyle}
                />
              </>
            )}

            {/* 担当者選択（presetCastIdがある場合＝個人URL経由はスキップ） */}
            {!presetCastId && (team === 'A' || team === 'both') && renderCastPicker('A公演 担当キャスト', castsForA, form.cast_id_a, (id) => setForm({ ...form, cast_id_a: id }))}
            {!presetCastId && (team === 'B' || team === 'both') && renderCastPicker('B公演 担当キャスト', castsForB, form.cast_id_b, (id) => setForm({ ...form, cast_id_b: id }))}

            <label style={labelStyle}>お名前</label>
            <input required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>電話番号</label>
            <input required value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>メールアドレス（必須・マイページのご案内をお送りします）</label>
            <input type="email" required value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>備考欄（任意）</label>
            <textarea
              value={form.memo}
              onChange={e => setForm({ ...form, memo: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="車椅子スペース希望、同伴者と近い席希望など"
            />

            <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.gold, margin: '10px 0 20px 0', textAlign: 'right' }}>
              合計：¥{totalPrice.toLocaleString()}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '16px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}
            >
              {submitting ? '送信中...' : 'この内容で予約する'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}