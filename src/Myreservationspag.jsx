import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Ticket, Calendar, MapPin, Bell, ExternalLink,
  Smartphone, Star, CheckCircle2, AlertCircle, X,
  Send, Edit3
} from 'lucide-react';

const COLORS = {
  bg: '#fdf8ef',
  surface: '#ffffff',
  surfaceAlt: '#fff4d6',
  cardBg: '#ffffff',
  border: 'rgba(230, 159, 0, 0.25)',
  gold: '#d97706',
  goldLight: '#fef3c7',
  pouchiDark: '#38220f',
  indigo: '#4338ca',
  text: '#2b2438',
  muted: '#8c7d70',
  success: '#16a34a',
  danger: '#e11d48',
};

// -----------------------------------------------------------------
// マスコット画像（切り出し済み・個別ファイル）
// public/images/mascot/ にこのファイル名で配置してください
// -----------------------------------------------------------------
const MASCOT = {
  iconApp: '/images/mascot/icon_app_yellow.png',
  iconEvent: '/images/mascot/icon_event_black_gold.png',
  pochitto: '/images/mascot/pose_pochitto_dog.png',      // ポチッ！（確定・通常）
  ticketWait: '/images/mascot/pose_ticket_wait_dog.png',  // チケット待ち…（未確定・空状態）
  checking: '/images/mascot/pose_checking_dog.png',       // チェック中！（処理中・キャンセル確認）
  naruhodo: '/images/mascot/pose_naruhodo_dog.png',       // なるほど！（案内・説明）
  waai: '/images/mascot/pose_waai_dog.png',                // わーい！（完了・成功）
};

// 汎用マスコットスプライト（角丸・枠なしのシンプル版）
const MascotSprite = ({ src, size = 48, borderRadius = '14px', bg = 'transparent', border = 'none' }) => (
  <img
    src={src}
    alt=""
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      borderRadius,
      backgroundColor: bg,
      border,
      flexShrink: 0,
    }}
  />
);

export default function Myreservationspag() {
  const [token, setToken] = useState('');
  const [reservations, setReservations] = useState([]);
  const [stages, setStages] = useState({});
  const [ticketTypes, setTicketTypes] = useState({});
  const [productions, setProductions] = useState({});
  const [loading, setLoading] = useState(true);

  // 変更・キャンセル・アンケート用モーダル
  const [activeModal, setActiveModal] = useState(null);
  const [selectedRes, setSelectedRes] = useState(null);
  const [editCount, setEditCount] = useState(1);
  const [editMemo, setEditMemo] = useState('');

  // アンケート・評価用
  const [rating, setRating] = useState(5);
  const [surveyText, setSurveyText] = useState('');
  const [surveySent, setSurveySent] = useState(false);

  // PWA / 通知 / LINE
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLineLinked, setIsLineLinked] = useState(false);

  // キャンセル処理中フラグ（チェック中！の表情用）
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('token') || localStorage.getItem('tp_mypage_token') || '';
    setToken(t);

    if (t) {
      localStorage.setItem('tp_mypage_token', t);
      fetchMypageData(t);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMypageData = async (mypageToken) => {
    setLoading(true);
    try {
      const { data: resData, error: resErr } = await supabase
        .from('reservations')
        .select('*')
        .eq('mypage_token', mypageToken)
        .order('created_at', { ascending: false });

      if (resErr) throw resErr;
      setReservations(resData || []);

      if (resData && resData.length > 0) {
        if (resData[0].line_user_id) setIsLineLinked(true);

        const prodIds = [...new Set(resData.map(r => r.production_id).filter(Boolean))];
        const stageIds = [...new Set(resData.map(r => r.stage_id).filter(Boolean))];
        const ticketTypeIds = [...new Set(resData.map(r => r.ticket_type_id).filter(Boolean))];

        const [
          { data: prodList },
          { data: stageList },
          { data: ticketList }
        ] = await Promise.all([
          supabase.from('productions').select('*').in('id', prodIds),
          supabase.from('stages').select('*').in('id', stageIds),
          supabase.from('ticket_types').select('*').in('id', ticketTypeIds),
        ]);

        const pMap = {};
        (prodList || []).forEach(p => { pMap[p.id] = p; });
        setProductions(pMap);

        const sMap = {};
        (stageList || []).forEach(s => { sMap[s.id] = s; });
        setStages(sMap);

        const tMap = {};
        (ticketList || []).forEach(t => { tMap[t.id] = t; });
        setTicketTypes(tMap);
      }
    } catch (e) {
      console.error('Mypage fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePush = async () => {
    if (!('Notification' in window)) {
      alert('お使いのブラウザはプッシュ通知に対応していません。');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      alert('開演前リマインドのプッシュ通知をONにしましたワン！🐾');
    } else {
      alert('通知がブロックされました。ブラウザの設定から許可してください。');
    }
  };

  const handleLineLink = () => {
    const liffUrl = `https://line.me/R/`;
    alert('LINE連携画面へ進みます。連携すると別サイトの特典コンテンツが自動アンロックされます。');
    window.location.href = liffUrl;
  };

  const handleUpdateReservation = async () => {
    if (!selectedRes) return;
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          count: editCount,
          memo: editMemo,
        })
        .eq('id', selectedRes.id);

      if (error) throw error;
      alert('予約内容を変更しました！🐾');
      setActiveModal(null);
      fetchMypageData(token);
    } catch (e) {
      alert('変更に失敗しました: ' + e.message);
    }
  };

  const handleCancelReservation = async () => {
    if (!selectedRes) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', selectedRes.id);

      if (error) throw error;
      setActiveModal(null);
      fetchMypageData(token);
    } catch (e) {
      alert('キャンセルに失敗しました: ' + e.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitSurvey = async () => {
    if (!surveyText.trim()) return;
    try {
      await supabase.from('feedbacks').insert([{
        production_id: selectedRes?.production_id,
        rating: rating,
        comment: surveyText.trim(),
        is_anonymous: true
      }]);
      setSurveySent(true);
      setTimeout(() => {
        setSurveySent(false);
        setActiveModal(null);
        setSurveyText('');
      }, 2000);
    } catch (e) {
      alert('送信に失敗しました');
    }
  };

  const getGoogleCalendarUrl = (prod, stage) => {
    if (!stage || !prod) return '#';
    const dStr = stage.performance_date || stage.stage_date || '';
    const dateFormatted = dStr.replace(/-/g, '');
    const startTime = (stage.start_time || '18:00').replace(':', '') + '00';
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(prod.title)}&dates=${dateFormatted}T${startTime}/${dateFormatted}T${startTime}&location=${encodeURIComponent(prod.venue_name || '劇場')}`;
  };

  const today = new Date().toISOString().slice(0, 10);
  const currentReservations = [];
  const pastReservations = [];

  reservations.forEach(r => {
    const stage = stages[r.stage_id];
    const sDate = stage?.performance_date || stage?.stage_date || '9999-99-99';
    if (sDate >= today) {
      currentReservations.push(r);
    } else {
      pastReservations.push(r);
    }
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLORS.pouchiDark, fontFamily: 'sans-serif', gap: '12px' }}>
        <MascotSprite src={MASCOT.checking} size={80} />
        <div style={{ fontWeight: 700 }}>チケポチが予約を読み込み中...</div>
      </div>
    );
  }

  if (!token && reservations.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, padding: '32px 16px', boxSizing: 'border-box', fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
        <div style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: COLORS.surface, border: `2px solid ${COLORS.border}`, borderRadius: '24px', padding: '28px', textAlign: 'center', boxShadow: '0 8px 24px rgba(217, 119, 6, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <MascotSprite src={MASCOT.ticketWait} size={90} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: COLORS.pouchiDark }}>予約トークンが見つからないワン</h2>
          <p style={{ fontSize: '13px', color: COLORS.muted, lineHeight: '1.6' }}>
            予約完了メールにある「マイページ確認URL」からアクセスしてね！
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '16px 14px 60px 14px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap');

        .pouchi-font {
          font-family: 'Zen Maru Gothic', 'Zen Kaku Gothic New', sans-serif;
        }

        .ticket-card {
          background-color: #ffffff;
          border: 2px solid ${COLORS.border};
          border-radius: 20px;
          padding: 18px;
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.08);
          position: relative;
          overflow: hidden;
        }

        .ticket-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
        }

        .btn-bounce:active {
          transform: scale(0.97);
        }

        @keyframes pouchi-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pouchi-pop {
          animation: pouchi-pop 0.35s ease-out;
        }
      `}</style>

      <div style={{ maxWidth: '540px', margin: '0 auto' }}>

        {/* 🐶 チケポチ ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '20px', border: `2px solid ${COLORS.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MascotSprite src={MASCOT.iconApp} size={48} borderRadius="14px" />
            <div>
              <div className="pouchi-font" style={{ fontSize: '18px', fontWeight: 900, color: '#d97706', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                チケポチ！ <span style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 700 }}>マイページ</span>
              </div>
              <div style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 700 }}>
                チケット、ポチッとしよ！🐾
              </div>
            </div>
          </div>

          <button
            onClick={handleTogglePush}
            className="btn-bounce"
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              border: `1.5px solid ${pushEnabled ? COLORS.success : '#f59e0b'}`,
              backgroundColor: pushEnabled ? '#f0fdf4' : '#fffbeb',
              color: pushEnabled ? COLORS.success : '#d97706',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Bell size={13} /> {pushEnabled ? '通知ON' : '通知設定'}
          </button>
        </div>

        {/* 🍁 秋の大笑会2026 特典コンテンツサイトへの専用バナー */}
        <div
          onClick={() => window.open(`https://office-knight-partner-site.vercel.app?token=${token}`, '_blank')}
          className="btn-bounce"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#ffffff',
            borderRadius: '22px',
            padding: '16px 18px',
            marginBottom: '16px',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(30, 27, 75, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            border: '2px solid rgba(251, 191, 36, 0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MascotSprite src={MASCOT.iconEvent} size={48} borderRadius="12px" />
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 900, marginBottom: '3px' }}>
                ⭐ 観劇予約者限定
              </div>
              <div className="pouchi-font" style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.5px' }}>
                秋の大笑会 特典コンテンツサイト
              </div>
              <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                限定動画・電子パンフ・稽古場日誌はこちら🐾
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fbbf24', color: '#1e1b4b', padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            あそびに行く <ExternalLink size={13} />
          </div>
        </div>

        {/* 📲 ホーム画面追加（PWA）＆ LINE連携 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
          <div style={{ backgroundColor: '#ffffff', border: `1.5px dashed #f59e0b`, borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#d97706' }}>
              <Smartphone size={15} /> ホーム画面追加
            </div>
            <div style={{ fontSize: '10px', color: COLORS.muted, margin: '6px 0', lineHeight: '1.4' }}>
              アプリみたいにホームに置いてすぐチケット表示🐾
            </div>
          </div>

          {/* LINE連携カード：未連携時はチケポチが吹き出しで誘導 */}
          <div style={{ backgroundColor: '#ffffff', border: `1.5px solid ${isLineLinked ? '#86efac' : '#bbf7d0'}`, borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#15803d' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#06c755', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900 }}>L</div>
              LINE ID連携
            </div>

            {isLineLinked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '6px 0' }}>
                <MascotSprite src={MASCOT.waai} size={28} />
                <span style={{ fontSize: '10px', color: COLORS.success, fontWeight: 700 }}>連携完了！自動ログイン</span>
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: COLORS.muted, margin: '6px 0' }}>連携して特典に即アクセス</div>
            )}

            {!isLineLinked && (
              <button
                onClick={handleLineLink}
                className="btn-bounce"
                style={{ width: '100%', padding: '5px', borderRadius: '8px', border: 'none', backgroundColor: '#06c755', color: '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                連携する
              </button>
            )}
          </div>
        </div>

        {/* 🎟️ ご予約中のチケット一覧 */}
        <div style={{ marginBottom: '24px' }}>
          <div className="pouchi-font" style={{ fontSize: '15px', fontWeight: 900, color: COLORS.pouchiDark, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎟️</span> ご予約中のチケット <span style={{ fontSize: '12px', color: '#d97706' }}>（全 {currentReservations.length} 公演）</span>
          </div>

          {currentReservations.length === 0 ? (
            <div className="ticket-card" style={{ textAlign: 'center', padding: '26px 20px', color: COLORS.muted }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <MascotSprite src={MASCOT.ticketWait} size={72} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>現在予約中の公演はありませんワン</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {currentReservations.map(res => {
                const prod = productions[res.production_id] || {};
                const stage = stages[res.stage_id] || {};
                const tk = ticketTypes[res.ticket_type_id] || { name: '一般', price: 0 };
                const subtotal = (tk.price * (res.count || 1)) + (res.donation_amount || 0);

                const isA = prod.title?.includes('あなたとコンビ');
                const badgeColor = isA ? '#d97706' : '#4338ca';
                const badgeText = isA ? 'A公演' : 'B公演';

                return (
                  <div key={res.id} className="ticket-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#ffffff', backgroundColor: badgeColor, padding: '3px 8px', borderRadius: '6px' }}>
                          {badgeText}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.success, backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MascotSprite src={MASCOT.pochitto} size={16} borderRadius="4px" />
                          ご予約確定
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: COLORS.muted, fontFamily: 'monospace' }}>
                        #{res.id.slice(0, 6)}
                      </span>
                    </div>

                    <h3 className="pouchi-font" style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 12px 0', color: COLORS.pouchiDark }}>
                      {prod.title || '公演情報'}
                    </h3>

                    <div style={{ backgroundColor: '#fffbeb', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '14px', border: '1px solid #fef3c7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.pouchiDark }}>
                        <Calendar size={15} color="#d97706" />
                        <strong>{stage.performance_date || stage.stage_date} {stage.start_time?.slice(0, 5)}開演</strong>
                        {stage.team_name && <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 700 }}>({stage.team_name})</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.muted }}>
                        <MapPin size={15} color="#d97706" />
                        <span>{prod.venue_name || '布施PEベース'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.pouchiDark, borderTop: '1px dashed #fde68a', paddingTop: '6px', marginTop: '2px' }}>
                        <Ticket size={15} color="#d97706" />
                        <span>{tk.name} × <strong>{res.count}枚</strong></span>
                        <span style={{ marginLeft: 'auto', fontWeight: 900, color: '#d97706', fontSize: '14px' }}>
                          ¥{subtotal.toLocaleString()} <span style={{ fontSize: '10px', color: COLORS.muted }}>(当日精算)</span>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={getGoogleCalendarUrl(prod, stage)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-bounce"
                        style={{ flex: 1.2, padding: '10px', textAlign: 'center', textDecoration: 'none', borderRadius: '12px', border: `1.5px solid #fde68a`, backgroundColor: '#fffdf9', color: '#b45309', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        📅 カレンダー
                      </a>
                      <button
                        onClick={() => {
                          setSelectedRes(res);
                          setEditCount(res.count || 1);
                          setEditMemo(res.memo || '');
                          setActiveModal('edit');
                        }}
                        className="btn-bounce"
                        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1.5px solid #fde68a`, backgroundColor: '#ffffff', color: '#d97706', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Edit3 size={13} /> 変更
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRes(res);
                          setActiveModal('cancel');
                        }}
                        className="btn-bounce"
                        style={{ padding: '10px 14px', borderRadius: '12px', border: `1.5px solid #fecdd3`, backgroundColor: '#fff', color: COLORS.danger, fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 📜 過去の観劇履歴 ＆ 匿名アンケート */}
        {pastReservations.length > 0 && (
          <div>
            <div className="pouchi-font" style={{ fontSize: '14px', fontWeight: 900, color: COLORS.muted, marginBottom: '10px' }}>
              📜 観劇のおもいで
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pastReservations.map(res => {
                const prod = productions[res.production_id] || {};
                const stage = stages[res.stage_id] || {};

                return (
                  <div key={res.id} style={{ backgroundColor: '#ffffff', border: `1.5px solid ${COLORS.border}`, borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="pouchi-font" style={{ fontSize: '14px', fontWeight: 900, color: COLORS.pouchiDark }}>{prod.title}</div>
                      <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>
                        {stage.performance_date || stage.stage_date} ご来場ありがとうワン！🐾
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRes(res);
                        setActiveModal('survey');
                      }}
                      className="btn-bounce"
                      style={{ padding: '8px 14px', borderRadius: '12px', border: `1.5px solid #f59e0b`, backgroundColor: '#fffbeb', color: '#d97706', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Star size={13} fill="#d97706" /> 感想を送る
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 🛠️ 予約変更モーダル */}
      {activeModal === 'edit' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '22px', border: `2px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 className="pouchi-font" style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: COLORS.pouchiDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MascotSprite src={MASCOT.naruhodo} size={30} />
                予約内容の変更
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', display: 'block', marginBottom: '4px' }}>枚数</label>
                <select value={editCount} onChange={(e) => setEditCount(parseInt(e.target.value, 10))} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1.5px solid ${COLORS.border}`, fontSize: '14px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cnt => (
                    <option key={cnt} value={cnt}>{cnt}枚</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', display: 'block', marginBottom: '4px' }}>備考・ご要望</label>
                <textarea rows={2} value={editMemo} onChange={(e) => setEditMemo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1.5px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontWeight: 800 }}>もどる</button>
                <button onClick={handleUpdateReservation} style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#d97706', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>変更を保存ワン！</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💬 匿名アンケートモーダル */}
      {activeModal === 'survey' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '22px', border: `2px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 className="pouchi-font" style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: COLORS.pouchiDark }}>
                観劇アンケート・感想 💌
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            {surveySent ? (
              <div className="pouchi-pop" style={{ textAlign: 'center', padding: '16px 0', color: COLORS.success }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <MascotSprite src={MASCOT.waai} size={72} />
                </div>
                <div className="pouchi-font" style={{ fontWeight: 900, fontSize: '16px' }}>ご感想ありがとワン！</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '4px' }}>劇団・キャストへ匿名でお届けしたよ🐾</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: COLORS.muted, marginBottom: '6px', fontWeight: 700 }}>公演の満足度</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Star size={28} color="#f59e0b" fill={rating >= star ? "#f59e0b" : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', display: 'block', marginBottom: '4px' }}>
                    ご感想・応援メッセージ（匿名）
                  </label>
                  <textarea
                    rows={3}
                    placeholder="面白かったところやキャストへの熱いメッセージをぜひ教えてね！🐾"
                    value={surveyText}
                    onChange={(e) => setSurveyText(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1.5px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '13px' }}
                  />
                </div>

                <button
                  onClick={handleSubmitSurvey}
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: '#d97706', color: '#fff', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }}
                >
                  <Send size={15} /> 匿名で劇団に届けるワン！
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚠️ キャンセル確認モーダル */}
      {activeModal === 'cancel' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '22px', border: `2px solid ${COLORS.border}`, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <MascotSprite src={MASCOT.checking} size={72} />
            </div>
            <h3 className="pouchi-font" style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 900, color: COLORS.danger }}>ご予約のキャンセル</h3>
            <p style={{ fontSize: '12px', color: COLORS.muted, lineHeight: '1.5', margin: '0 0 16px 0' }}>
              本当にこの予約をキャンセルしてよろしいですかワン？
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setActiveModal(null)} disabled={isCancelling} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontWeight: 800 }}>もどる</button>
              <button onClick={handleCancelReservation} disabled={isCancelling} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: COLORS.danger, color: '#fff', fontWeight: 900, cursor: 'pointer', opacity: isCancelling ? 0.7 : 1 }}>
                {isCancelling ? 'キャンセル中...' : 'キャンセル確定'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}