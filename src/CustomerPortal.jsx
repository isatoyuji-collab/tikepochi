import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Sparkles, Calendar, User, Ticket, Check, CheckCircle2, AlertCircle } from 'lucide-react';

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

export default function CustomerPortal({ orgId }) {
  const [org, setOrg] = useState(null);
  const [productions, setProductions] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [stagesMap, setStagesMap] = useState({});
  const [ticketTypesMap, setTicketTypesMap] = useState({});
  const [loading, setLoading] = useState(true);

  // 予約モード: 'single_0' | 'single_1' | 'both'
  const [reservationMode, setReservationMode] = useState('both');

  // お客様基本情報
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerMemo, setCustomerMemo] = useState('');

  // 公演ごとの選択ステート [prodIndex 0, prodIndex 1]
  const [selectedStageIds, setSelectedStageIds] = useState(['', '']);
  const [selectedTicketTypeIds, setSelectedTicketTypeIds] = useState(['', '']);
  const [ticketCounts, setTicketCounts] = useState([1, 1]);
  const [donationAmounts, setDonationAmounts] = useState([500, 500]);
  const [selectedStaffNames, setSelectedStaffNames] = useState(['', '']);

  // キャスト同一設定チェック
  const [isSameStaff, setIsSameStaff] = useState(true);

  // 完了ステート
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [mypageToken, setMypageToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 初期データ読み込み
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // URLパラメータからの扱いキャスト初期設定 (?staff=xxx)
        const urlParams = new URLSearchParams(window.location.search);
        const staffParam = urlParams.get('staff') || '';

        // 劇団情報の取得
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .maybeSingle();
        if (orgData) setOrg(orgData);

        // 劇団に紐づく公演の取得（直近2件をメイン対象として取得）
        const { data: prodData } = await supabase
          .from('productions')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: true })
          .limit(2);

        if (prodData && prodData.length > 0) {
          setProductions(prodData);

          const stagesObj = {};
          const ticketsObj = {};
          const prodIds = prodData.map(p => p.id);

          // 全公演のステージと券種、キャストを一括取得
          const [{ data: stageData }, { data: ticketData }, { data: staffData }] = await Promise.all([
            supabase.from('stages').select('*').in('production_id', prodIds).order('performance_date', { ascending: true }).order('start_time', { ascending: true }),
            supabase.from('ticket_types').select('*').in('production_id', prodIds).order('price', { ascending: true }),
            supabase.from('cast_staff').select('*').in('production_id', prodIds),
          ]);

          prodData.forEach((p, index) => {
            const pStages = (stageData || []).filter(s => s.production_id === p.id);
            const pTickets = (ticketData || []).filter(t => t.production_id === p.id);
            stagesObj[p.id] = pStages;
            ticketsObj[p.id] = pTickets;

            // 初期選択値のセット
            if (pStages.length > 0) {
              setSelectedStageIds(prev => {
                const next = [...prev];
                next[index] = pStages[0].id;
                return next;
              });
            }
            if (pTickets.length > 0) {
              setSelectedTicketTypeIds(prev => {
                const next = [...prev];
                next[index] = pTickets[0].id;
                return next;
              });
            }
          });

          setStagesMap(stagesObj);
          setTicketTypesMap(ticketsObj);

          // キャストリスト（重複排除）
          const uniqueStaff = [];
          const seenNames = new Set();
          (staffData || []).forEach(st => {
            if (!seenNames.has(st.name)) {
              seenNames.add(st.name);
              uniqueStaff.push(st);
            }
          });
          setAllStaff(uniqueStaff);

          // URL指定キャストがあれば初期セット
          if (staffParam) {
            setSelectedStaffNames([staffParam, staffParam]);
          } else if (uniqueStaff.length > 0) {
            setSelectedStaffNames([uniqueStaff[0].name, uniqueStaff[0].name]);
          }
        }
      } catch (err) {
        console.error('Data load error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (orgId) loadData();
  }, [orgId]);

  // A公演のキャスト変更時の連動処理
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

  const handleToggleSameStaff = (checked) => {
    setIsSameStaff(checked);
    if (checked) {
      setSelectedStaffNames(prev => [prev[0], prev[0]]);
    }
  };

  // キャストの2段ソート（対象公演の出演者が上段、その他が下段）
  const getSortedStaffOptions = (prodId) => {
    if (!prodId) return allStaff;
    const currentProdStaff = allStaff.filter(s => s.production_id === prodId);
    const otherStaff = allStaff.filter(s => s.production_id !== prodId);
    return { currentProdStaff, otherStaff };
  };

  // 予約送信処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      alert('お名前とメールアドレスは必須項目です。');
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
      console.error('Reservation submit error:', err);
      setErrorMessage('予約の送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.text, fontFamily: 'sans-serif' }}>
        公演ポータルを読み込み中...
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
            ご登録のメールアドレス（{customerEmail}）宛に予約完了メールを送信いたしました。
          </p>

          <div style={{ padding: '16px', backgroundColor: COLORS.surfaceAlt, borderRadius: '12px', border: `1px solid ${COLORS.border}`, marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.gold, marginBottom: '6px' }}>ご予約者様情報</div>
            <div style={{ fontSize: '14px', color: COLORS.text }}>{customerName} 様 ({customerPhone})</div>
          </div>

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
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: COLORS.gold, fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            <Sparkles size={14} /> {org?.name || 'office Knight'} プロデュース公演
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: COLORS.text }}>
            チケットご予約フォーム
          </h1>
          <p style={{ fontSize: '13px', color: COLORS.muted, margin: 0 }}>
            観劇される演目・日時をご選択ください
          </p>
        </div>

        {/* 観劇選択モードタブ (A公演 / B公演 / 両方) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {productions.length >= 2 && (
            <button
              type="button"
              onClick={() => setReservationMode('both')}
              style={{
                flex: 1.2,
                padding: '12px 6px',
                borderRadius: '10px',
                border: `2px solid ${reservationMode === 'both' ? COLORS.gold : COLORS.border}`,
                backgroundColor: reservationMode === 'both' ? COLORS.surfaceAlt : COLORS.surface,
                color: reservationMode === 'both' ? COLORS.gold : COLORS.text,
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ⭐ 両方観劇（セット）
            </button>
          )}

          {productions.map((prod, idx) => (
            <button
              key={prod.id}
              type="button"
              onClick={() => setReservationMode(`single_${idx}`)}
              style={{
                flex: 1,
                padding: '12px 6px',
                borderRadius: '10px',
                border: `2px solid ${reservationMode === `single_${idx}` ? COLORS.gold : COLORS.border}`,
                backgroundColor: reservationMode === `single_${idx}` ? COLORS.surfaceAlt : COLORS.surface,
                color: reservationMode === `single_${idx}` ? COLORS.gold : COLORS.text,
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {prod.title.length > 10 ? prod.title.slice(0, 9) + '…' : prod.title}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* お客様情報 */}
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.gold, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> お客様情報
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>メールアドレス（必須・予約確認通知用）</label>
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
            </div>
          </div>

          {/* 各演目の予約設定カード */}
          {productions.map((prod, idx) => {
            const isVisible = reservationMode === 'both' || reservationMode === `single_${idx}`;
            if (!isVisible) return null;

            const stages = stagesMap[prod.id] || [];
            const tickets = ticketTypesMap[prod.id] || [];
            const { currentProdStaff, otherStaff } = getSortedStaffOptions(prod.id);
            const currentTicket = tickets.find(t => t.id === selectedTicketTypeIds[idx]);

            return (
              <div key={prod.id} style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '20px' }}>
                <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.gold, backgroundColor: COLORS.surfaceAlt, padding: '2px 8px', borderRadius: '4px' }}>
                    演目 {idx + 1}
                  </span>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '6px 0 0 0', color: COLORS.text }}>
                    {prod.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* 観劇日時選択 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} color={COLORS.gold} /> 観劇日時（ステージ）
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
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Ticket size={13} color={COLORS.gold} /> 券種
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
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>枚数</label>
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

                  {/* カンパ制（ダイエンカイ）の金額入力 */}
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
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      扱いキャスト・スタッフ
                    </label>

                    {/* 2演目目で「同一設定」がONの場合は固定表示 */}
                    {idx === 1 && reservationMode === 'both' && isSameStaff ? (
                      <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '13px', color: COLORS.muted }}>
                        『{productions[0]?.title}』と同じ扱い（{selectedStaffNames[0] || '劇団・共通扱い'}）
                      </div>
                    ) : (
                      <select
                        value={selectedStaffNames[idx]}
                        onChange={(e) => handleStaffChange(idx, e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
                      >
                        <option value="">-- 劇団・共通扱い --</option>
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

                  {/* 1演目目の下に「両方同じ扱いに設定」チェックボックスを配置 */}
                  {idx === 0 && reservationMode === 'both' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <input
                        type="checkbox"
                        id="sameStaffCheck"
                        checked={isSameStaff}
                        onChange={(e) => handleToggleSameStaff(e.target.checked)}
                        style={{ accentColor: COLORS.gold, width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="sameStaffCheck" style={{ fontSize: '12px', color: COLORS.text, cursor: 'pointer', fontWeight: 700 }}>
                        もう片方の演目（『{productions[1]?.title}』）も同じ扱いに設定する
                      </label>
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          {/* 備考欄 */}
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>備考・ご要望（任意）</label>
            <textarea
              rows={2}
              placeholder="車椅子でのご来場、その他ご要望がございましたらご記入ください"
              value={customerMemo}
              onChange={(e) => setCustomerMemo(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '13px', lineHeight: '1.5' }}
            />
          </div>

          {errorMessage && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} /> {errorMessage}
            </div>
          )}

          {/* 送信ボタン */}
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
              transition: 'filter 0.15s ease',
            }}
          >
            {isSubmitting ? 'ご予約処理中...' : (reservationMode === 'both' ? '2公演まとめて予約を確定する' : '予約を確定する')}
          </button>

        </form>

      </div>
    </div>
  );
}