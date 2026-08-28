import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { User, CheckCircle2, AlertCircle, Sparkles, MapPin, ChevronLeft, ChevronRight, HeartHandshake, Ticket, Calendar } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  indigo: '#4338ca',
  text: '#2b2438',
  muted: '#8a8398',
  success: '#1f9a56',
  danger: '#e85a45',
};

function ProgressDots({ steps, stepIndex }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '18px' }}>
      {steps.map((s, i) => (
        <div
          key={s}
          style={{
            width: i === stepIndex ? '20px' : '7px',
            height: '7px',
            borderRadius: '4px',
            backgroundColor: i <= stepIndex ? COLORS.gold : COLORS.border,
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel = '次へ', nextDisabled = false, showBack = true }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          style={{ flex: '0 0 88px', padding: '14px 0', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, color: COLORS.text, fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
        >
          <ChevronLeft size={16} /> 戻る
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        style={{ flex: 1, padding: '14px 0', borderRadius: '12px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, fontSize: '15px', cursor: nextDisabled ? 'not-allowed' : 'pointer', opacity: nextDisabled ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(201,121,31,0.25)' }}
      >
        {nextLabel} {nextLabel === '次へ' && <ChevronRight size={16} />}
      </button>
    </div>
  );
}

function CardWrap({ children }) {
  return (
    <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '18px' }}>
      {children}
    </div>
  );
}

function buildSteps(reservationMode) {
  const steps = ['select'];
  if (reservationMode === 'both') {
    steps.push('detail_0', 'detail_1');
  } else if (reservationMode === 'single_0') {
    steps.push('detail_0');
  } else if (reservationMode === 'single_1') {
    steps.push('detail_1');
  }
  steps.push('customer', 'confirm');
  return steps;
}

export default function CustomerReservationForm({ productionId }) {
  const [productions, setProductions] = useState([]);
  const [stagesMap, setStagesMap] = useState({});
  const [ticketTypesMap, setTicketTypesMap] = useState({});
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reservationMode, setReservationMode] = useState('');
  const [stepIndex, setStepIndex] = useState(0);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerMemo, setCustomerMemo] = useState('');

  const [selectedStageIds, setSelectedStageIds] = useState(['', '']);
  const [selectedTicketTypeIds, setSelectedTicketTypeIds] = useState(['', '']);
  const [ticketCounts, setTicketCounts] = useState([1, 1]);
  const [selectedStaffNames, setSelectedStaffNames] = useState(['', '']);
  const [selectedOptions, setSelectedOptions] = useState([[], []]);

  const [hasDonation, setHasDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState(500);
  const [isSameStaff, setIsSameStaff] = useState(true);

  const [stepError, setStepError] = useState('');
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

        // 1. 公演情報の取得
        let thisProd = null;
        if (productionId.length === 36) {
          const { data, error } = await supabase
            .from('productions')
            .select('*')
            .eq('id', productionId)
            .single();
          if (error) throw error;
          thisProd = data;
        } else {
          const { data, error } = await supabase
            .from('productions')
            .select('*')
            .like('id', `${productionId}%`)
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          thisProd = data;
        }

        if (!thisProd) throw new Error('公演情報が見つかりませんでした');

        // 2. 同じ劇団の全公演を取得
        let prodList = [thisProd];
        if (thisProd.organization_id) {
          const { data: orgProds } = await supabase
            .from('productions')
            .select('*')
            .eq('organization_id', thisProd.organization_id)
            .order('created_at', { ascending: true });

          if (orgProds && orgProds.length > 0) {
            prodList = orgProds.sort((a, b) => {
              if (a.title?.includes('あなたとコンビ')) return -1;
              if (b.title?.includes('あなたとコンビ')) return 1;
              return 0;
            });
          }
        }
        setProductions(prodList);

        // 3. 全ステージ・券種・キャストを取得
        const prodIds = prodList.map(p => p.id);
        const [{ data: stageData }, { data: ticketData }, { data: staffData }] = await Promise.all([
          supabase.from('stages').select('*').in('production_id', prodIds).order('start_time', { ascending: true }),
          supabase.from('ticket_types').select('*').in('production_id', prodIds).order('price', { ascending: true }),
          supabase.from('cast_staff').select('*').in('production_id', prodIds),
        ]);

        const sMap = {};
        const tMap = {};
        const initialStages = ['', ''];
        const initialTickets = ['', ''];

        prodList.forEach((p, idx) => {
          const pStages = (stageData || [])
            .filter(s => s.production_id === p.id)
            .sort((a, b) => {
              const dateA = a.performance_date || a.stage_date || '';
              const dateB = b.performance_date || b.stage_date || '';
              return dateA.localeCompare(dateB) || (a.start_time || '').localeCompare(b.start_time || '');
            });

          const pTickets = (ticketData || []).filter(t => t.production_id === p.id);
          sMap[p.id] = pStages;
          tMap[p.id] = pTickets;

          if (pStages.length > 0) initialStages[idx] = pStages[0].id;
          const baseTk = pTickets.find(t => !t.is_donation && !t.description?.includes('【オプション】'));
          if (baseTk) initialTickets[idx] = baseTk.id;
          else if (pTickets.length > 0) initialTickets[idx] = pTickets[0].id;
        });

        setStagesMap(sMap);
        setTicketTypesMap(tMap);
        setSelectedStageIds(initialStages);
        setSelectedTicketTypeIds(initialTickets);

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

  const handleToggleOption = (prodIdx, optId) => {
    setSelectedOptions(prev => {
      const next = [...prev];
      const currentOpts = next[prodIdx] || [];
      if (currentOpts.includes(optId)) {
        next[prodIdx] = currentOpts.filter(id => id !== optId);
      } else {
        next[prodIdx] = [...currentOpts, optId];
      }
      return next;
    });
  };

  const getSortedStaffOptions = (prod) => {
    if (!prod) return { currentProdStaff: allStaff, otherStaff: [] };
    const isA = prod.title?.includes('あなたとコンビ');

    const currentProdStaff = allStaff.filter((s) => {
      const tag = s.team_tag || '';
      if (tag.includes('スタッフ')) return false;
      if (tag === '共通・両公演' || tag === 'チームなし（共通・シングル）' || !tag) return true;
      if (isA) return tag.includes('A公演') || tag.includes('Aチーム') || tag.includes('A班') || tag.includes('コンビ');
      return tag.includes('B公演') || tag.includes('Bチーム') || tag.includes('B班') || tag.includes('爆弾');
    });

    const otherStaff = allStaff.filter((s) => !currentProdStaff.some((cp) => cp.id === s.id));
    return { currentProdStaff, otherStaff };
  };

  const calculateTotal = () => {
    let total = 0;
    const targetIndices = reservationMode === 'both' ? [0, 1] : [parseInt(reservationMode.replace('single_', ''), 10)];

    if (reservationMode === 'both') {
      const prodA = productions[0];
      const tkA = (ticketTypesMap[prodA?.id] || []).find(t => t.id === selectedTicketTypeIds[0]);
      const count = ticketCounts[0] || 1;
      total += (tkA?.price || 0) * count;

      [0, 1].forEach(idx => {
        const prod = productions[idx];
        const allOpts = ticketTypesMap[prod?.id] || [];
        (selectedOptions[idx] || []).forEach(optId => {
          const opt = allOpts.find(t => t.id === optId);
          if (opt) total += (opt.price || 0) * count;
        });
      });
    } else {
      const idx = targetIndices[0];
      const prod = productions[idx];
      const tk = (ticketTypesMap[prod?.id] || []).find(t => t.id === selectedTicketTypeIds[idx]);
      const count = ticketCounts[idx] || 1;
      total += (tk?.price || 0) * count;

      const allOpts = ticketTypesMap[prod?.id] || [];
      (selectedOptions[idx] || []).forEach(optId => {
        const opt = allOpts.find(t => t.id === optId);
        if (opt) total += (opt.price || 0) * count;
      });
    }

    if (hasDonation) {
      total += (parseInt(donationAmount, 10) || 500);
    }

    return total;
  };

  const steps = reservationMode ? buildSteps(reservationMode) : ['select'];
  const currentStepKey = steps[stepIndex] || 'select';

  const goNext = () => {
    setStepError('');
    setStepIndex(i => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    setStepError('');
    setStepIndex(i => Math.max(i - 1, 0));
  };

  const selectProduction = (mode) => {
    setReservationMode(mode);
    setStepIndex(1);
  };

  const validateDetailStep = (idx) => {
    const prod = productions[idx];
    if (!prod) return '公演情報が見つかりません。';
    if (!selectedStageIds[idx]) return '観劇日時を選択してください。';
    if (!selectedTicketTypeIds[idx]) return '券種を選択してください。';
    return '';
  };

  const validateCustomerStep = () => {
    if (!customerName.trim()) return 'お名前を入力してください。';
    if (!customerEmail.trim()) return 'メールアドレスを入力してください。';
    if (hasDonation && (!donationAmount || donationAmount < 500)) {
      return '応援カンパは500円以上でご入力ください。';
    }
    return '';
  };

  const handleDetailNext = (idx) => {
    const err = validateDetailStep(idx);
    if (err) {
      setStepError(err);
      return;
    }
    goNext();
  };

  const handleCustomerNext = () => {
    const err = validateCustomerStep();
    if (err) {
      setStepError(err);
      return;
    }
    goNext();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const sharedMypageToken = crypto.randomUUID();
      const recordsToInsert = [];

      const isBoth = reservationMode === 'both';
      const targetIndices = isBoth ? [0, 1] : [parseInt(reservationMode.replace('single_', ''), 10)];

      for (let i = 0; i < targetIndices.length; i++) {
        const idx = targetIndices[i];
        const prod = productions[idx];
        if (!prod) continue;

        const stageId = selectedStageIds[idx];
        const ticketTypeId = selectedTicketTypeIds[idx];
        const count = isBoth ? ticketCounts[0] : ticketCounts[idx];
        const chosenStaff = selectedStaffNames[idx] || '';

        const allOpts = ticketTypesMap[prod.id] || [];
        const chosenOptNames = (selectedOptions[idx] || [])
          .map(optId => allOpts.find(t => t.id === optId)?.name)
          .filter(Boolean);

        let fullMemo = customerMemo.trim();
        if (chosenOptNames.length > 0) {
          fullMemo = `【選択オプション】: ${chosenOptNames.join(', ')}\n${fullMemo}`.trim();
        }
        if (chosenStaff) {
          fullMemo = `【扱い】: ${chosenStaff}\n${fullMemo}`.trim();
        }
        if (isBoth) {
          fullMemo = `【両公演セット予約】\n${fullMemo}`.trim();
        }

        // DBに確実に存在するカラムのみを送信（存在しないカラムエラーを完全防止）
        recordsToInsert.push({
          production_id: prod.id,
          stage_id: stageId,
          ticket_type_id: ticketTypeId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim(),
          count: count,
          memo: fullMemo || null,
          mypage_token: sharedMypageToken,
        });
      }

      const { error } = await supabase.from('reservations').insert(recordsToInsert);
      if (error) throw error;

      setMypageToken(sharedMypageToken);
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMessage('予約の送信に失敗しました: ' + (err.message || 'もう一度お試しください。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '14px', backgroundColor: COLORS.surface };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' };

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
            {reservationMode === 'both' && <><br /><strong>※両公演（A公演・B公演）ともにお席を確保いたしました。</strong></>}
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

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: COLORS.gold, fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
            <Sparkles size={13} /> office Knight プロデュース公演
          </div>
          <h1 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 6px 0', color: COLORS.text }}>
            vol.3 & vol.3.5 『秋の大笑会-ダイエンカイ-』
          </h1>
        </div>

        <ProgressDots steps={steps} stepIndex={stepIndex} />

        {stepError && (
          <div style={{ padding: '10px 12px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <AlertCircle size={16} /> {stepError}
          </div>
        )}

        {/* STEP 1: 公演選択 */}
        {currentStepKey === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: 700, color: COLORS.text, margin: '0 0 4px 0' }}>
              観劇する公演をお選びください
            </p>

            {productions.map((prod, idx) => {
              const isA = prod.title?.includes('あなたとコンビ');
              const label = isA ? 'A公演' : 'B公演';
              const tagCol = isA ? COLORS.gold : COLORS.indigo;

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => selectProduction(`single_${idx}`)}
                  style={{
                    textAlign: 'left',
                    padding: '18px',
                    borderRadius: '14px',
                    border: `2px solid ${COLORS.border}`,
                    backgroundColor: COLORS.surface,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', backgroundColor: tagCol, padding: '2px 8px', borderRadius: '4px' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: '12px', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <MapPin size={12} color={tagCol} /> {prod.venue_name || '布施PEベース'}
                    </span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text }}>{prod.title}</div>
                </button>
              );
            })}

            {productions.length >= 2 && (
              <button
                type="button"
                onClick={() => selectProduction('both')}
                style={{
                  textAlign: 'left',
                  padding: '18px',
                  borderRadius: '14px',
                  border: `2px solid ${COLORS.gold}`,
                  backgroundColor: COLORS.surfaceAlt,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.gold, marginBottom: '6px' }}>⭐ セット予約（通し券）</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.text }}>両方観劇する（A公演 ＆ B公演）</div>
              </button>
            )}
          </div>
        )}

        {/* STEP 2: 各公演の詳細入力 */}
        {currentStepKey.startsWith('detail_') && (() => {
          const idx = parseInt(currentStepKey.split('_')[1], 10);
          const prod = productions[idx];
          if (!prod) return null;

          const stages = stagesMap[prod.id] || [];
          const allTickets = ticketTypesMap[prod.id] || [];
          const baseTickets = allTickets.filter(t => !t.is_donation && !t.description?.includes('【オプション】'));
          const optionTickets = allTickets.filter(t => !t.is_donation && t.description?.includes('【オプション】'));

          const { currentProdStaff, otherStaff } = getSortedStaffOptions(prod);
          const isA = prod.title?.includes('あなたとコンビ');
          const isFirstOfBoth = reservationMode === 'both' && idx === 0;
          const isSecondOfBoth = reservationMode === 'both' && idx === 1;

          return (
            <>
              <CardWrap>
                <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', backgroundColor: isA ? COLORS.gold : COLORS.indigo, padding: '2px 8px', borderRadius: '4px' }}>
                      {isA ? 'A公演' : 'B公演'}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '4px 0 0 0', color: COLORS.text }}>
                      {prod.title}
                    </h3>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.gold, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={13} /> {prod.venue_name || '布施PEベース'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>観劇日時（ステージ）</label>
                    <select
                      value={selectedStageIds[idx]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedStageIds(prev => { const n = [...prev]; n[idx] = val; return n; });
                      }}
                      style={inputStyle}
                    >
                      <option value="">-- 選択してください --</option>
                      {stages.length === 0 ? (
                        <option value="" disabled>ステージ日程が登録されていません</option>
                      ) : (
                        stages.map(st => {
                          const dStr = st.performance_date || st.stage_date || '日程未定';
                          return (
                            <option key={st.id} value={st.id}>
                              {dStr} {st.start_time?.slice(0, 5)}開演 {st.team_name ? `(${st.team_name})` : ''}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle}>基本券種</label>
                      <select
                        value={selectedTicketTypeIds[idx]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTicketTypeIds(prev => { const n = [...prev]; n[idx] = val; return n; });
                        }}
                        style={inputStyle}
                      >
                        <option value="">-- 選択してください --</option>
                        {baseTickets.map(tk => (
                          <option key={tk.id} value={tk.id}>
                            {tk.name} (¥{tk.price?.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    {(reservationMode !== 'both' || idx === 0) && (
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>枚数</label>
                        <select
                          value={ticketCounts[idx]}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setTicketCounts(prev => {
                              const n = [...prev];
                              n[idx] = val;
                              if (reservationMode === 'both') n[1] = val;
                              return n;
                            });
                          }}
                          style={inputStyle}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cnt => (
                            <option key={cnt} value={cnt}>{cnt}枚</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {optionTickets.length > 0 && (
                    <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.indigo, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={13} /> 追加オプション（任意）
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {optionTickets.map(opt => {
                          const isChecked = (selectedOptions[idx] || []).includes(opt.id);
                          return (
                            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: isChecked ? 700 : 400 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleOption(idx, opt.id)}
                                style={{ accentColor: COLORS.indigo, width: '16px', height: '16px' }}
                              />
                              <span>{opt.name}</span>
                              <span style={{ fontSize: '12px', color: COLORS.gold, marginLeft: 'auto' }}>
                                +¥{opt.price?.toLocaleString()}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>扱いキャスト・スタッフ</label>
                    {isSecondOfBoth && isSameStaff ? (
                      <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '13px', color: COLORS.muted }}>
                        A公演と同じ扱い（{selectedStaffNames[0] || '劇団扱い'}）
                      </div>
                    ) : (
                      <select
                        value={selectedStaffNames[idx]}
                        onChange={(e) => handleStaffChange(idx, e.target.value)}
                        style={inputStyle}
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

                  {isFirstOfBoth && (
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
                        B公演も同じ扱いに設定する
                      </label>
                    </div>
                  )}
                </div>
              </CardWrap>
              <NavButtons onBack={goBack} onNext={() => handleDetailNext(idx)} />
            </>
          );
        })()}

        {/* STEP 3: お客様情報 */}
        {currentStepKey === 'customer' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CardWrap>
                <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <User size={15} /> お客様情報
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
                      style={inputStyle}
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
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>お電話番号</label>
                    <input
                      type="tel"
                      placeholder="090-0000-0000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>備考</label>
                    <textarea
                      rows={2}
                      placeholder="ご要望や車椅子利用などがあればご記入ください"
                      value={customerMemo}
                      onChange={(e) => setCustomerMemo(e.target.value)}
                      style={{ ...inputStyle, fontSize: '13px' }}
                    />
                  </div>
                </div>
              </CardWrap>

              <CardWrap>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: COLORS.text }}>
                  <input
                    type="checkbox"
                    checked={hasDonation}
                    onChange={(e) => setHasDonation(e.target.checked)}
                    style={{ accentColor: COLORS.gold, width: '16px', height: '16px' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: COLORS.gold }}>
                    <HeartHandshake size={15} /> 劇団・キャスト応援カンパを送る（任意）
                  </span>
                </label>

                {hasDonation && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: '12px', color: COLORS.muted, marginBottom: '6px' }}>
                      下限500円から、100円刻みでお好きな金額をご入力いただけます。
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700 }}>¥</span>
                      <input
                        type="number"
                        min={500}
                        step={100}
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        style={{ width: '150px', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>円</span>
                    </div>
                  </div>
                )}
              </CardWrap>
            </div>
            <NavButtons onBack={goBack} onNext={handleCustomerNext} />
          </>
        )}

        {/* STEP 4: 最終確認 */}
        {currentStepKey === 'confirm' && (() => {
          const targetIndices = reservationMode === 'both' ? [0, 1] : [parseInt(reservationMode.replace('single_', ''), 10)];
          const total = calculateTotal();

          return (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {targetIndices.map(idx => {
                  const prod = productions[idx];
                  if (!prod) return null;
                  const isA = prod.title?.includes('あなたとコンビ');
                  const stage = (stagesMap[prod.id] || []).find(s => s.id === selectedStageIds[idx]);
                  const ticket = (ticketTypesMap[prod.id] || []).find(t => t.id === selectedTicketTypeIds[idx]);
                  const allOpts = ticketTypesMap[prod.id] || [];
                  const chosenOpts = (selectedOptions[idx] || []).map(optId => allOpts.find(t => t.id === optId)).filter(Boolean);
                  const stageDateStr = stage ? (stage.performance_date || stage.stage_date || '') : '';

                  return (
                    <CardWrap key={prod.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', backgroundColor: isA ? COLORS.gold : COLORS.indigo, padding: '2px 8px', borderRadius: '4px' }}>
                          {isA ? 'A公演' : 'B公演'}
                        </span>
                        <span style={{ fontSize: '12px', color: COLORS.gold, fontWeight: 700 }}>
                          <MapPin size={12} /> {prod.venue_name || '布施PEベース'}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{prod.title}</div>
                      <div style={{ fontSize: '13px', lineHeight: '1.9', color: COLORS.text }}>
                        <div>日時：{stage ? `${stageDateStr} ${stage.start_time?.slice(0, 5)}開演` : '未選択'}</div>
                        <div>券種：{ticket?.name || '未選択'}（¥{ticket?.price?.toLocaleString()} × {ticketCounts[idx]}枚）</div>
                        {chosenOpts.length > 0 && (
                          <div>オプション：{chosenOpts.map(o => `${o.name} (+¥${o.price?.toLocaleString()})`).join(', ')}</div>
                        )}
                        <div>扱い：{selectedStaffNames[idx] || '劇団扱い'}</div>
                      </div>
                    </CardWrap>
                  );
                })}

                {hasDonation && (
                  <CardWrap>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>応援カンパ</div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>¥{(parseInt(donationAmount, 10) || 500).toLocaleString()}</div>
                  </CardWrap>
                )}

                <CardWrap>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.gold, marginBottom: '6px' }}>お客様情報</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.9', color: COLORS.text }}>
                    <div>お名前：{customerName}</div>
                    <div>メール：{customerEmail}</div>
                    {customerPhone && <div>電話：{customerPhone}</div>}
                    {customerMemo && <div>備考：{customerMemo}</div>}
                  </div>
                </CardWrap>

                <div style={{ backgroundColor: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>合計お支払い予定額（当日精算）</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: COLORS.gold }}>¥{total.toLocaleString()}</span>
                </div>

                {errorMessage && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} /> {errorMessage}
                  </div>
                )}
              </div>

              <NavButtons
                onBack={goBack}
                onNext={handleSubmit}
                nextLabel={isSubmitting ? '予約処理中...' : '予約を確定する'}
                nextDisabled={isSubmitting}
              />
            </>
          );
        })()}

      </div>
    </div>
  );
}