// src/CustomerReservationForm.jsx (TIKEPOCHI側)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  User, CheckCircle2, AlertCircle, Sparkles, MapPin, 
  ChevronLeft, ChevronRight, HeartHandshake, Ticket, Calendar,
  CreditCard, Building2, Banknote, ShieldCheck
} from 'lucide-react';

// -----------------------------------------------------------------
// チケポチ ブランドカラー（マイページと共通）
// -----------------------------------------------------------------
const COLORS = {
  bg: '#fff8e6',
  surface: '#ffffff',
  surfaceAlt: '#fff3d1',
  border: 'rgba(245, 158, 11, 0.3)',
  yellow: '#ffb300',
  yellowSoft: '#ffe08a',
  yellowDeep: '#f59e0b',
  blue: '#2f6fed',
  blueDeep: '#1e4fc4',
  blueSoft: '#e3edff',
  pouchiDark: '#3a2a18',
  text: '#2b2438',
  muted: '#8a8398',
  success: '#1f9a56',
  danger: '#e85a45',
};

// -----------------------------------------------------------------
// マスコット画像
// -----------------------------------------------------------------
const MASCOT = {
  iconApp: '/images/mascot/icon_app_yellow.png',
  bigdog: '/images/mascot/bigdog_only.png',
  pochitto: '/images/mascot/pose_pochitto_dog.png',
  ticketWait: '/images/mascot/pose_ticket_wait_dog.png',
  checking: '/images/mascot/pose_checking_dog.png',
  naruhodo: '/images/mascot/pose_naruhodo_dog.png',
  waai: '/images/mascot/pose_waai_dog.png',
};

const MascotSprite = ({ src, size = 48, borderRadius = '14px', style = {} }) => (
  <img
    src={src}
    alt=""
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      borderRadius,
      flexShrink: 0,
      ...style,
    }}
  />
);

const StickerBadge = ({ children, bg, color = '#fff', rotate = -3 }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: 900,
      color,
      backgroundColor: bg,
      padding: '4px 10px',
      borderRadius: '999px',
      transform: `rotate(${rotate}deg)`,
      boxShadow: '0 2px 0 rgba(0,0,0,0.12)',
      border: '2px solid rgba(255,255,255,0.6)',
    }}
  >
    {children}
  </span>
);

const PageChrome = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap');

    body { background-color: ${COLORS.bg}; }

    .pouchi-page-bg {
      background-color: ${COLORS.bg};
      background-image:
        radial-gradient(circle at 12px 12px, rgba(245,158,11,0.08) 2px, transparent 2.6px),
        radial-gradient(circle at 30px 30px, rgba(47,111,237,0.06) 2px, transparent 2.6px);
      background-size: 42px 42px;
    }

    .pouchi-corner-peek {
      position: fixed;
      bottom: -14px;
      right: -10px;
      width: 90px;
      height: auto;
      opacity: 0.9;
      pointer-events: none;
      z-index: 0;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.12));
    }

    .pouchi-font {
      font-family: 'Zen Maru Gothic', 'Zen Kaku Gothic New', sans-serif;
    }

    .btn-bounce:active { transform: scale(0.96); }

    .btn-pouchi-primary {
      background: linear-gradient(180deg, #ffc94d, #ffb300);
      color: ${COLORS.pouchiDark};
      border: 2px solid #e8940a;
      box-shadow: 0 4px 0 #d9820a;
    }
    .btn-pouchi-primary:active { box-shadow: 0 1px 0 #d9820a; transform: translateY(3px); }
    .btn-pouchi-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .payment-option-card {
      border: 2px solid ${COLORS.border};
      border-radius: 14px;
      padding: 12px 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      background-color: ${COLORS.surface};
      transition: all 0.15s ease;
    }
    .payment-option-card.selected {
      border-color: ${COLORS.yellowDeep};
      background-color: ${COLORS.surfaceAlt};
      box-shadow: 0 2px 0 rgba(245,158,11,0.2);
    }

    @keyframes pouchi-pop {
      0% { transform: scale(0.5) rotate(-6deg); opacity: 0; }
      60% { transform: scale(1.1) rotate(3deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    .pouchi-pop { animation: pouchi-pop 0.4s ease-out; }

    @keyframes pouchi-confetti-fall {
      0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
      15% { opacity: 1; }
      100% { transform: translateY(90px) rotate(200deg); opacity: 0; }
    }
    .pouchi-confetti span {
      position: absolute;
      font-size: 18px;
      animation: pouchi-confetti-fall 1.6s ease-in forwards;
    }
  `}</style>
);

function ProgressPaws({ steps, stepIndex }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '18px' }}>
      {steps.map((s, i) => (
        <span
          key={s}
          style={{
            fontSize: i === stepIndex ? '18px' : '13px',
            filter: i <= stepIndex ? 'grayscale(0)' : 'grayscale(1)',
            opacity: i <= stepIndex ? 1 : 0.35,
            transform: i === stepIndex ? 'scale(1.15)' : 'scale(1)',
            transition: 'all 0.2s ease',
          }}
        >
          🐾
        </span>
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
          style={{ flex: '0 0 88px', padding: '14px 0', borderRadius: '999px', border: `2px solid ${COLORS.border}`, backgroundColor: COLORS.surface, color: COLORS.text, fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
        >
          <ChevronLeft size={16} /> 戻る
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="btn-bounce btn-pouchi-primary"
        style={{ flex: 1, padding: '14px 0', borderRadius: '999px', fontWeight: 800, fontSize: '15px', cursor: nextDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
      >
        {nextLabel} {nextLabel === '次へ' && <ChevronRight size={16} />}
      </button>
    </div>
  );
}

function CardWrap({ children }) {
  return (
    <div style={{ backgroundColor: COLORS.surface, border: `2px solid ${COLORS.border}`, borderRadius: '20px', padding: '18px', boxShadow: '0 4px 0 rgba(245,158,11,0.08)' }}>
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

const CONFETTI_EMOJI = ['🎉', '🐾', '✨', '🎊', '⭐'];

export default function CustomerReservationForm({ productionId }) {
  const [productions, setProductions] = useState([]);
  const [stagesMap, setStagesMap] = useState({});
  const [ticketTypesMap, setTicketTypesMap] = useState({});
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 決済設定の状態
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('STRIPE_CARD'); // デフォルトはクレカ

  const [reservationMode, setReservationMode] = useState('');
  const [stepIndex, setStepIndex] = useState(0);

  const [customerName, setCustomerName] = useState('');
  const [customerKana, setCustomerKana] = useState('');
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
  const [urlStaffParam, setUrlStaffParam] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const staffParam = urlParams.get('staff') || '';
        setUrlStaffParam(staffParam);

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
          const { data: allProds, error } = await supabase
            .from('productions')
            .select('*');
          if (error) throw error;
          thisProd = (allProds || []).find(p => p.id.startsWith(productionId)) || null;
        }

        if (!thisProd) throw new Error('公演情報が見つかりませんでした');

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

        const prodIds = prodList.map(p => p.id);
        const [{ data: stageData }, { data: ticketData }, { data: staffData }, { data: pSettings }] = await Promise.all([
          supabase.from('stages').select('*').in('production_id', prodIds).order('start_time', { ascending: true }),
          supabase.from('ticket_types').select('*').in('production_id', prodIds).order('price', { ascending: true }),
          supabase.from('cast_staff').select('*').in('production_id', prodIds),
          supabase.from('payment_settings').select('*').eq('production_id', thisProd.id).maybeSingle()
        ]);

        if (pSettings) {
          setPaymentSettings(pSettings);
          if (!pSettings.stripe_enabled) {
            setSelectedPaymentMethod(pSettings.bank_enabled ? 'BANK_TRANSFER' : 'CASH');
          }
        }

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
        setLoadError(err.message || '公演情報の読み込みに失敗しました。URLをご確認ください。');
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

  // ⭐ 合計金額の計算ロジック（両公演セット・単独・オプション・カンパを正しく合算）
  const calculateTotal = () => {
    let total = 0;
    const targetIndices = reservationMode === 'both' ? [0, 1] : [parseInt(reservationMode.replace('single_', ''), 10)];

    targetIndices.forEach(idx => {
      const prod = productions[idx];
      if (!prod) return;

      const count = reservationMode === 'both' ? (ticketCounts[0] || 1) : (ticketCounts[idx] || 1);
      
      // 1. 基本チケット代金
      const tk = (ticketTypesMap[prod.id] || []).find(t => t.id === selectedTicketTypeIds[idx]);
      if (tk) {
        total += (tk.price || 0) * count;
      }

      // 2. 選択オプション代金
      const allOpts = ticketTypesMap[prod.id] || [];
      (selectedOptions[idx] || []).forEach(optId => {
        const opt = allOpts.find(t => t.id === optId);
        if (opt) {
          total += (opt.price || 0) * count;
        }
      });
    });

    // 3. 応援カンパ
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
    if (!customerKana.trim()) return 'ふりがなを入力してください。';
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
      const totalAmount = calculateTotal();

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
        if (customerKana.trim()) {
          fullMemo = `【かな】: ${customerKana.trim()}\n${fullMemo}`.trim();
        }
        if (isBoth) {
          fullMemo = `【両公演セット予約】\n${fullMemo}`.trim();
        }

        recordsToInsert.push({
          production_id: prod.id,
          stage_id: stageId,
          ticket_type_id: ticketTypeId,
          customer_name: customerName.trim(),
          customer_name_kana: customerKana.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim(),
          count: count,
          memo: fullMemo || null,
          mypage_token: sharedMypageToken,
          payment_method: selectedPaymentMethod,
          payment_status: selectedPaymentMethod === 'STRIPE_CARD' ? 'UNPAID' : 'PENDING',
          donation_amount: (i === 0 && hasDonation) ? (parseInt(donationAmount, 10) || 500) : 0
        });
      }

      // 1. Supabaseの予約テーブルに登録
      const { data: insertedRecords, error: insertError } = await supabase
        .from('reservations')
        .insert(recordsToInsert)
        .select();

      if (insertError) throw insertError;

      // 2. クレジットカード決済の場合は Stripe Checkout を呼び出してリダイレクト
      if (selectedPaymentMethod === 'STRIPE_CARD') {
        const primaryProdId = productions[0]?.id || productionId;
        const reservationId = insertedRecords[0]?.id;
        const ticketTitle = isBoth 
          ? `【両公演セット】${productions[0]?.title} & ${productions[1]?.title}`
          : `${productions[targetIndices[0]]?.title || '公演'} チケット`;

        const { data: sessionData, error: functionError } = await supabase.functions.invoke(
          'create-stripe-checkout',
          {
            body: {
              productionId: primaryProdId,
              reservationId: reservationId,
              ticketTitle: ticketTitle,
              amount: totalAmount,
              quantity: 1,
              customerEmail: customerEmail.trim(),
              returnUrl: `${window.location.origin}/mypage?token=${sharedMypageToken}`,
            },
          }
        );

        if (functionError || !sessionData?.url) {
          throw new Error(functionError?.message || sessionData?.error || 'カード決済画面の生成に失敗しました');
        }

        // Stripe Checkout 決済画面へ遷移
        window.location.href = sessionData.url;
        return;
      }

      // 3. 銀行振込または当日精算の場合は完了画面へ
      setMypageToken(sharedMypageToken);
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMessage('予約の送信に失敗しました: ' + (err.message || 'もう一度お試しください。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '11px 12px', borderRadius: '12px', border: `2px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '14px', backgroundColor: COLORS.surface };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.yellowDeep, marginBottom: '4px' };

  if (loading) {
    return (
      <div className="pouchi-page-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", gap: '12px' }}>
        <PageChrome />
        <MascotSprite src={MASCOT.ticketWait} size={84} />
        <div className="pouchi-font" style={{ fontWeight: 800, fontSize: '14px' }}>予約フォームを読み込み中...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pouchi-page-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '32px 16px', boxSizing: 'border-box', textAlign: 'center' }}>
        <PageChrome />
        <MascotSprite src={MASCOT.checking} size={84} />
        <h2 className="pouchi-font" style={{ fontSize: '17px', fontWeight: 900, margin: '14px 0 8px 0', color: COLORS.pouchiDark }}>
          公演情報が見つからないワン
        </h2>
        <p style={{ fontSize: '13px', color: COLORS.muted, maxWidth: '340px', lineHeight: '1.6' }}>
          {loadError}
        </p>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="pouchi-page-bg" style={{ minHeight: '100vh', color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '32px 16px', boxSizing: 'border-box' }}>
        <PageChrome />
        <div style={{ maxWidth: '580px', margin: '0 auto', backgroundColor: COLORS.surface, border: `2.5px solid ${COLORS.border}`, borderRadius: '28px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 8px 0 rgba(245,158,11,0.1), 0 10px 24px rgba(43, 36, 56, 0.08)', position: 'relative', overflow: 'hidden' }}>
          <div className="pouchi-confetti" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {[...Array(10)].map((_, i) => (
              <span key={i} style={{ left: `${8 + i * 9}%`, animationDelay: `${(i % 5) * 0.15}s` }}>
                {CONFETTI_EMOJI[i % CONFETTI_EMOJI.length]}
              </span>
            ))}
          </div>

          <div className="pouchi-pop" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <MascotSprite src={MASCOT.waai} size={100} />
          </div>
          <h2 className="pouchi-font" style={{ fontSize: '21px', fontWeight: 900, margin: '0 0 10px 0' }}>ご予約が完了いたしました！</h2>
          <p style={{ fontSize: '14px', color: COLORS.muted, lineHeight: '1.6', margin: '0 0 24px 0' }}>
            ご登録のメールアドレス（{customerEmail}）宛に予約確認メールを送信いたしました。
            {selectedPaymentMethod === 'BANK_TRANSFER' && <><br /><strong style={{ color: COLORS.yellowDeep }}>※振込先口座情報をメールにてご案内しております。</strong></>}
            {reservationMode === 'both' && <><br /><strong>※両公演（A公演・B公演）ともにお席を確保いたしました。</strong></>}
          </p>

          <a
            href={`${window.location.origin}/mypage?token=${mypageToken}`}
            className="btn-bounce btn-pouchi-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '14px', textDecoration: 'none', borderRadius: '18px', fontWeight: 900, fontSize: '15px', boxSizing: 'border-box' }}
          >
            <MascotSprite src={MASCOT.pochitto} size={22} borderRadius="6px" />
            予約内容の確認・変更（マイページへ）
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="pouchi-page-bg" style={{ minHeight: '100vh', color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px 16px 60px 16px', boxSizing: 'border-box', position: 'relative' }}>
      <PageChrome />
      <img src={MASCOT.bigdog} alt="" className="pouchi-corner-peek" />

      <div style={{ maxWidth: '580px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
            <MascotSprite src={MASCOT.iconApp} size={58} borderRadius="18px" style={{ boxShadow: '0 3px 0 rgba(217,119,6,0.3)' }} />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: COLORS.yellowDeep, fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
            <Sparkles size={13} /> office Knight プロデュース公演
          </div>
          <h1 className="pouchi-font" style={{ fontSize: '19px', fontWeight: 900, margin: '0 0 6px 0', color: COLORS.text }}>
            vol.3 & vol.3.5 『秋の大笑会-ダイエンカイ-』
          </h1>
        </div>

        {/* 🐾 扱い担当者バナー：個人URL経由で開いた場合のみ表示 */}
        {urlStaffParam && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            backgroundColor: COLORS.surfaceAlt, border: `2px solid ${COLORS.yellowDeep}`,
            borderRadius: '999px', padding: '8px 16px', marginBottom: '16px',
          }}>
            <MascotSprite src={MASCOT.pochitto} size={24} />
            <span className="pouchi-font" style={{ fontSize: '13px', fontWeight: 800, color: COLORS.pouchiDark }}>
              <strong style={{ color: COLORS.yellowDeep }}>{urlStaffParam}</strong> さん扱いのご予約フォームです
            </span>
          </div>
        )}

        <ProgressPaws steps={steps} stepIndex={stepIndex} />

        {stepError && (
          <div style={{ padding: '10px 12px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, borderRadius: '14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', border: `2px solid rgba(232,90,69,0.2)` }}>
            <MascotSprite src={MASCOT.checking} size={26} />
            {stepError}
          </div>
        )}

        {/* STEP 1: 公演選択 */}
        {currentStepKey === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p className="pouchi-font" style={{ textAlign: 'center', fontSize: '14px', fontWeight: 800, color: COLORS.text, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <MascotSprite src={MASCOT.naruhodo} size={26} />
              観劇する公演をお選びください
            </p>

            {productions.map((prod, idx) => {
              const isA = prod.title?.includes('あなたとコンビ');
              const label = isA ? 'A公演' : 'B公演';
              const tagCol = isA ? COLORS.yellowDeep : COLORS.blue;

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => selectProduction(`single_${idx}`)}
                  className="btn-bounce"
                  style={{
                    textAlign: 'left',
                    padding: '18px',
                    borderRadius: '20px',
                    border: `2.5px solid ${COLORS.border}`,
                    backgroundColor: COLORS.surface,
                    cursor: 'pointer',
                    boxShadow: '0 4px 0 rgba(245,158,11,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <StickerBadge bg={tagCol} rotate={-3}>{label}</StickerBadge>
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
                className="btn-bounce"
                style={{
                  textAlign: 'left',
                  padding: '18px',
                  borderRadius: '20px',
                  border: `2.5px solid ${COLORS.yellowDeep}`,
                  backgroundColor: COLORS.surfaceAlt,
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 rgba(245,158,11,0.15)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.yellowDeep, marginBottom: '6px' }}>⭐ セット予約（通し券）</div>
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
                <div style={{ borderBottom: `2px dashed ${COLORS.yellowSoft}`, paddingBottom: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <StickerBadge bg={isA ? COLORS.yellowDeep : COLORS.blue} rotate={-3}>{isA ? 'A公演' : 'B公演'}</StickerBadge>
                    <h3 className="pouchi-font" style={{ fontSize: '15px', fontWeight: 800, margin: '6px 0 0 0', color: COLORS.text }}>
                      {prod.title}
                    </h3>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.yellowDeep, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                    <div style={{ padding: '10px 12px', backgroundColor: COLORS.blueSoft, borderRadius: '14px', border: `1.5px solid rgba(47,111,237,0.25)` }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.blueDeep, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                style={{ accentColor: COLORS.blue, width: '16px', height: '16px' }}
                              />
                              <span>{opt.name}</span>
                              <span style={{ fontSize: '12px', color: COLORS.yellowDeep, marginLeft: 'auto' }}>
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
                      <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '12px', border: `2px solid ${COLORS.border}`, fontSize: '13px', color: COLORS.muted }}>
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
                        style={{ accentColor: COLORS.yellowDeep, width: '16px', height: '16px', cursor: 'pointer' }}
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
                <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.yellowDeep, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
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
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>ふりがな（必須）</label>
                    <input
                      type="text"
                      required
                      placeholder="例: やまだ たろう"
                      value={customerKana}
                      onChange={(e) => setCustomerKana(e.target.value)}
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
                    style={{ accentColor: COLORS.yellowDeep, width: '16px', height: '16px' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: COLORS.yellowDeep }}>
                    <HeartHandshake size={15} /> 劇団・キャスト応援カンパを送る（任意）
                  </span>
                </label>

                {hasDonation && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '12px', border: `2px solid ${COLORS.border}` }}>
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
                        style={{ width: '150px', padding: '8px 10px', borderRadius: '10px', border: `2px solid ${COLORS.border}`, fontSize: '14px', backgroundColor: COLORS.surface }}
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

        {/* STEP 4: 最終確認 ＆ お支払い方法の選択 */}
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
                  const count = reservationMode === 'both' ? ticketCounts[0] : ticketCounts[idx];

                  return (
                    <CardWrap key={prod.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <StickerBadge bg={isA ? COLORS.yellowDeep : COLORS.blue} rotate={-3}>{isA ? 'A公演' : 'B公演'}</StickerBadge>
                        <span style={{ fontSize: '12px', color: COLORS.yellowDeep, fontWeight: 700 }}>
                          <MapPin size={12} /> {prod.venue_name || '布施PEベース'}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{prod.title}</div>
                      <div style={{ fontSize: '13px', lineHeight: '1.9', color: COLORS.text }}>
                        <div>日時：{stage ? `${stageDateStr} ${stage.start_time?.slice(0, 5)}開演` : '未選択'}</div>
                        <div>券種：{ticket?.name || '未選択'}（¥{ticket?.price?.toLocaleString()} × {count}枚）</div>
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
                    <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.yellowDeep, marginBottom: '4px' }}>応援カンパ</div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>¥{(parseInt(donationAmount, 10) || 500).toLocaleString()}</div>
                  </CardWrap>
                )}

                <CardWrap>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.yellowDeep, marginBottom: '6px' }}>お客様情報</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.9', color: COLORS.text }}>
                    <div>お名前：{customerName}（{customerKana}）</div>
                    <div>メール：{customerEmail}</div>
                    {customerPhone && <div>電話：{customerPhone}</div>}
                    {customerMemo && <div>備考：{customerMemo}</div>}
                  </div>
                </CardWrap>

                {/* 💳 お支払い方法選択カード */}
                <CardWrap>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.yellowDeep, marginBottom: '10px' }}>
                    お支払い方法を選択してください
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* クレジットカード決済 */}
                    {(!paymentSettings || paymentSettings.stripe_enabled) && (
                      <div 
                        className={`payment-option-card ${selectedPaymentMethod === 'STRIPE_CARD' ? 'selected' : ''}`}
                        onClick={() => setSelectedPaymentMethod('STRIPE_CARD')}
                      >
                        <CreditCard size={20} color={COLORS.gold} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700 }}>クレジットカード決済（即時精算）</div>
                          <div style={{ fontSize: '11px', color: COLORS.muted }}>Visa, Mastercard, JCB, AMEX 対応・安全に即時決済</div>
                        </div>
                        <input type="radio" name="payMethod" checked={selectedPaymentMethod === 'STRIPE_CARD'} readOnly style={{ accentColor: COLORS.yellowDeep }} />
                      </div>
                    )}

                    {/* 銀行振込 */}
                    {(!paymentSettings || paymentSettings.bank_enabled) && (
                      <div 
                        className={`payment-option-card ${selectedPaymentMethod === 'BANK_TRANSFER' ? 'selected' : ''}`}
                        onClick={() => setSelectedPaymentMethod('BANK_TRANSFER')}
                      >
                        <Building2 size={20} color={COLORS.yellowDeep} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700 }}>銀行振込（事前精算）</div>
                          <div style={{ fontSize: '11px', color: COLORS.muted }}>予約完了後、メールにて振込先口座をご案内します</div>
                        </div>
                        <input type="radio" name="payMethod" checked={selectedPaymentMethod === 'BANK_TRANSFER'} readOnly style={{ accentColor: COLORS.yellowDeep }} />
                      </div>
                    )}

                    {/* 当日現金精算 */}
                    <div 
                      className={`payment-option-card ${selectedPaymentMethod === 'CASH' ? 'selected' : ''}`}
                      onClick={() => setSelectedPaymentMethod('CASH')}
                    >
                      <Banknote size={20} color={COLORS.success} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>当日劇場で精算（現金）</div>
                        <div style={{ fontSize: '11px', color: COLORS.muted }}>公演当日の受付にて現金でお支払いいただきます</div>
                      </div>
                      <input type="radio" name="payMethod" checked={selectedPaymentMethod === 'CASH'} readOnly style={{ accentColor: COLORS.yellowDeep }} />
                    </div>

                  </div>
                </CardWrap>

                <div style={{ backgroundColor: COLORS.surfaceAlt, border: `2.5px solid ${COLORS.yellowDeep}`, borderRadius: '18px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 0 rgba(245,158,11,0.15)' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    合計お支払い額（{selectedPaymentMethod === 'STRIPE_CARD' ? 'カード即時精算' : selectedPaymentMethod === 'BANK_TRANSFER' ? '銀行振込' : '当日精算'}）
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: COLORS.yellowDeep }}>¥{total.toLocaleString()}</span>
                </div>

                {errorMessage && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, borderRadius: '14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: `2px solid rgba(232,90,69,0.2)` }}>
                    <MascotSprite src={MASCOT.checking} size={26} />
                    {errorMessage}
                  </div>
                )}
              </div>

              <NavButtons
                onBack={goBack}
                onNext={handleSubmit}
                nextLabel={
                  isSubmitting 
                    ? '処理中...' 
                    : selectedPaymentMethod === 'STRIPE_CARD' 
                      ? 'カード決済へ進む（Stripe）' 
                      : '予約を確定する'
                }
                nextDisabled={isSubmitting}
              />
            </>
          );
        })()}

      </div>
    </div>
  );
}