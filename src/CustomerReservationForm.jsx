import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Calendar, User, Ticket, CheckCircle2, AlertCircle, Sparkles, MapPin, Check } from 'lucide-react';

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
  const [currentProd, setCurrentProd] = useState(null);
  const [productions, setProductions] = useState([]);
  const [stagesMap, setStagesMap] = useState({});
  const [ticketTypesMap, setTicketTypesMap] = useState({});
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // 選択モード: 'single_0' (A公演) | 'single_1' (B公演) | 'both' (両方)
  const [reservationMode, setReservationMode] = useState('single_0');

  // お客様基本情報
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerMemo, setCustomerMemo] = useState('');

  // 公演ごとの選択ステート [A公演, B公演]
  const [selectedStageIds, setSelectedStageIds] = useState(['', '']);
  const [selectedTicketTypeIds, setSelectedTicketTypeIds] = useState(['', '']);
  const [ticketCounts, setTicketCounts] = useState([1, 1]);
  const [donationAmounts, setDonationAmounts] = useState([500, 500]);
  const [selectedStaffNames, setSelectedStaffNames] = useState(['', '']);

  // 両公演で同じ扱いに設定するフラグ
  const [isSameStaff, setIsSameStaff] = useState(true);

  // 予約送信ステート
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [mypageToken, setMypageToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const staffParam = urlParams.get('staff') || '';

        // 1. まずアクセスされた公演情報を取得
        const { data: thisProd, error: prodErr } = await supabase
          .from('productions')
          .select('*')
          .eq('id', productionId)
          .single();

        if (prodErr || !thisProd) throw prodErr;
        setCurrentProd(thisProd);

        // 2. 同じ劇団（organization_id）の全公演を取得
        let prodList = [thisProd];
        if (thisProd.organization_id) {
          const { data: orgProds } = await supabase
            .from('productions')
            .select('*')
            .eq('organization_id', thisProd.organization_id)
            .order('created_at', { ascending: true });

          if (orgProds && orgProds.length > 0) {
            // A公演（あなたとコンビ、に）を先頭、B公演（爆弾よりもハードです）を2番目に整列
            prodList = orgProds.sort((a, b) => {
              if (a.title.includes('あなたとコンビ')) return -1;
              if (b.title.includes('あなたとコンビ')) return 1;
              return 0;
            });
          }
        }
        setProductions(prodList);

        // 開いたURLの公演がどちらかを判定して初期モードを設定
        const initialIdx = prodList.findIndex(p => p.id === productionId);
        setReservationMode(initialIdx >= 0 ? `single_${initialIdx}` : 'single_0');

        // 3. 全公演のステージ・券種・キャストを取得
        const prodIds = prodList.map(p => p.id);
        const [{ data: stageData }, { data: ticketData }, { data: staffData }] = await Promise.all([
          supabase.from('stages').select('*').in('production_id', prodIds).order('performance_date', { ascending: true }).order('start_time', { ascending: true }),
          supabase.from('ticket_types').select('*').in('production_id', prodIds).order('price', { ascending: true }),
          supabase.from('cast_staff').select('*').in('production_id', prodIds),
        ]);

        const sMap = {};
        const tMap = {};
        const initialStages = ['', ''];
        const initialTickets = ['', ''];

        prodList.forEach((p, idx) => {
          const pStages = (stageData || []).filter(s => s.production_id === p.id);
          const pTickets = (ticketData || []).filter(t => t.production_id === p.id);
          sMap[p.id] = pStages;
          tMap[p.id] = pTickets;

          if (pStages.length > 0) initialStages[idx] = pStages[0].id;
          if (pTickets.length > 0) initialTickets[idx] = pTickets[0].id;
        });

        setStagesMap(sMap);
        setTicketTypesMap(tMap);
        setSelectedStageIds(initialStages);
        setSelectedTicketTypeIds(initialTickets);

        // キャストリストの重複排除とURLキャスト設定
        const uniqueStaff = [];
        const seenNames = new Set();
        (staffData || []).forEach(st => {
          if (!seenNames.has(st.name)) {
            seenNames.add(st.name);
            uniqueStaff.push(st);
          }
        });
        setAllStaff(uniqueStaff);

        if (staffParam) {
          setSelectedStaffNames([staffParam, staffParam]);
        }
      } catch (err) {
        console.error('Reservation form load error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (productionId) loadData();
  }, [productionId]);

  // キャスト変更処理
  const handleStaffChange = (index, value) => {
    setSelectedStaffNames(prev => {
      const next = [...prev];
      next[index] = value;
      if (index === 0 && isSameStaff) {
        next[1] = value;
      }
      return next;
    });
  };

  // キャストの優先2段表示（出演者を上段、その他を下段）
  const getSortedStaffOptions = (prodId) => {
    const currentProdStaff = allStaff.filter(s => s.production_id === prodId);
    const otherStaff = allStaff.filter(s => s.production_id !== prodId);
    return { currentProdStaff, otherStaff };
  };

  // 予約送信処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      alert('お名前とメールアドレスは必須です。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const sharedMypageToken = crypto.randomUUID();
      const recordsToInsert = [];

      const targetIndices = reservationMode === 'both' ? [0, 1] : [parseInt(reservationMode.replace('single_', ''))];

      for (const idx of targetIndices) {
        const prod = productions[idx];
        if (!prod) continue;

        const stageId = selectedStageIds[idx];
        const ticketTypeId = selectedTicketTypeIds[idx];
        const ticketType = (ticketTypesMap[prod.id] || []).find(t => t.id === ticketTypeId);

        recordsToInsert.push({
          production_id: prod.id,
          stage_id: stageId,
          ticket_type_id: ticketTypeId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim(),
          count: ticketCounts[idx],
          staff_name: selectedStaffNames[idx] || null,
          memo: customerMemo.trim() || null,
          donation_amount: ticketType?.is_donation ? donationAmounts[idx] : null,
          mypage_token: sharedMypageToken,
          notification_method: 'email',
        });
      }

      const { error } = await supabase.from('reservations').insert(recordsToInsert);
      if (error) throw error;

      setMypageToken(sharedMypageToken);
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMessage('予約の送信に失敗しました。もう一度お試しください。');
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
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: COLORS.gold, fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
            <Sparkles size={13} /> office Knight プロデュース公演
          </div>
          <h1 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 6px 0', color: COLORS.text }}>
            vol.3 & vol.3.5 『秋の大笑会-ダイエンカイ-』
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: COLORS.gold }}>
            <MapPin size={13} /> 布施PEベース
          </div>
        </div>

        {/* 🎭 演目選択カードタブ (A公演 / B公演 / ⭐両方) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {productions.map((prod, idx) => {
            const isA = prod.title.includes('あなたとコンビ');
            const label = isA ? 'A公演: あなたとコンビ、に' : 'B公演: 爆弾よりもハードです';
            const isSelected = reservationMode === `single_${idx}`;

            return (
              <button
                key={prod.id}
                type="button"
                onClick={() => setReservationMode(`single_${idx}`)}
                style={{
                  flex: 1,
                  padding: '12px 6px',
                  borderRadius: '10px',
                  border: `2px solid ${isSelected ? COLORS.gold : COLORS.border}`,
                  backgroundColor: isSelected ? COLORS.surfaceAlt : COLORS.surface,
                  color: isSelected ? COLORS.gold : COLORS.text,
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  lineHeight: '1.3',
                }}
              >
                {label}
              </button>
            );
          })}

          {productions.length >= 2 && (
            <button
              type="button"
              onClick={() => setReservationMode('both')}
              style={{
                flex: 1,
                padding: '12px 6px',
                borderRadius: '10px',
                border: `2px solid ${reservationMode === 'both' ? COLORS.gold : COLORS.border}`,
                backgroundColor: reservationMode === 'both' ? COLORS.surfaceAlt : COLORS.surface,
                color: reservationMode === 'both' ? COLORS.gold : COLORS.text,
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                lineHeight: '1.3',
              }}
            >
              ⭐ 両方観劇<br />（セット予約）
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 各演目の入力エリア */}
          {productions.map((prod, idx) => {
            const isVisible = reservationMode === 'both' || reservationMode === `single_${idx}`;
            if (!isVisible) return null;

            const stages = stagesMap[prod.id] || [];
            const tickets = ticketTypesMap[prod.id] || [];
            const { currentProdStaff, otherStaff } = getSortedStaffOptions(prod.id);
            const currentTicket = tickets.find(t => t.id === selectedTicketTypeIds[idx]);
            const isA = prod.title.includes('あなたとコンビ');

            return (
              <div key={prod.id} style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '18px' }}>
                <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.gold, backgroundColor: COLORS.surfaceAlt, padding: '2px 8px', borderRadius: '4px' }}>
                    {isA ? 'A公演' : 'B公演'}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0 0 0', color: COLORS.text }}>
                    {prod.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  {/* 日時選択 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                      観劇日時（ステージ）
                    </label>
                    <select
                      value={selectedStageIds[idx]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedStageIds(prev => {
                          const n = [...prev];
                          n[idx] = val;
                          return n;
                        });
                      }}
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                        券種
                      </label>
                      <select
                        value={selectedTicketTypeIds[idx]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTicketTypeIds(prev => {
                            const n = [...prev];
                            n[idx] = val;
                            return n;
                          });
                        }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
                      >
                        {tickets.map(tk => (
                          <option key={tk.id} value={tk.id}>
                            {tk.name} ({tk.is_donation ? 'カンパ制' : `¥${tk.price?.toLocaleString()}`})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                        枚数
                      </label>
                      <select
                        value={ticketCounts[idx]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setTicketCounts(prev => {
                            const n = [...prev];
                            n[idx] = val;
                            return n;
                          });
                        }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cnt => (
                          <option key={cnt} value={cnt}>{cnt}枚</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* カンパ制金額 */}
                  {currentTicket?.is_donation && (
                    <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                        カンパ金額（1枚あたり下限500円〜）
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>¥</span>
                        <input
                          type="number"
                          min={500}
                          step={100}
                          value={donationAmounts[idx]}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 500;
                            setDonationAmounts(prev => {
                              const n = [...prev];
                              n[idx] = val;
                              return n;
                            });
                          }}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '14px' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 扱いキャスト選択 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                      扱いキャスト・スタッフ
                    </label>

                    {idx === 1 && reservationMode === 'both' && isSameStaff ? (
                      <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '13px', color: COLORS.muted }}>
                        A公演と同じ扱い（{selectedStaffNames[0] || '劇団扱い'}）
                      </div>
                    ) : (
                      <select
                        value={selectedStaffNames[idx]}
                        onChange={(e) => handleStaffChange(idx, e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
                      >
                        <option value="">-- 劇団扱い --</option>
                        {currentProdStaff.length > 0 && (
                          <optgroup label="【この公演の出演キャスト】">
                            {currentProdStaff.map(st => (
                              <option key={st.id} value={st.name}>{st.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {otherStaff.length > 0 && (
                          <optgroup label="【その他の関係者・スタッフ】">
                            {otherStaff.map(st => (
                              <option key={st.id} value={st.name}>{st.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    )}
                  </div>

                  {/* 両方予約時：A公演の下に同一設定チェックを配置 */}
                  {idx === 0 && reservationMode === 'both' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <input
                        type="checkbox"
                        id="sameStaffCheck"
                        checked={isSameStaff}
                        onChange={(e) => {
                          setIsSameStaff(e.target.checked);
                          if (e.target.checked) setSelectedStaffNames(prev => [prev[0], prev[0]]);
                        }}
                        style={{ accentColor: COLORS.gold, width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="sameStaffCheck" style={{ fontSize: '12px', color: COLORS.text, cursor: 'pointer', fontWeight: 700 }}>
                        B公演（『爆弾よりもハードです』）も同じ扱いに設定する
                      </label>
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          {/* お客様情報 */}
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} /> お客様情報
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
            {isSubmitting ? '予約処理中...' : (reservationMode === 'both' ? '2公演まとめて予約を確定する' : '予約を確定する')}
          </button>
        </form>

      </div>
    </div>
  );
}