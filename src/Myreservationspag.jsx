// src/Myreservationspag.jsx (TIKEPOCHI側 - お客様マイページ)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Ticket, Calendar, MapPin, Bell, ExternalLink,
  Smartphone, Star, CheckCircle2, AlertCircle, X,
  Send, Edit3, Video, PlayCircle, HelpCircle, Lock, Unlock, Sparkles, Check,
  Volume2, BellOff, CircleDot, MessageSquare
} from 'lucide-react';

const COLORS = {
  bg: '#fff8e6',
  surface: '#ffffff',
  surfaceAlt: '#fff3d1',
  cardBg: '#ffffff',
  border: 'rgba(245, 158, 11, 0.3)',
  yellow: '#ffb300',
  yellowSoft: '#ffe08a',
  yellowDeep: '#f59e0b',
  blue: '#2f6fed',
  blueDeep: '#1e4fc4',
  blueSoft: '#e3edff',
  pouchiDark: '#3a2a18',
  text: '#2b2438',
  muted: '#8c7d70',
  success: '#16a34a',
  danger: '#e11d48',
};

const MASCOT = {
  iconApp: '/images/mascot/icon_app_yellow.png',
  iconEvent: '/images/mascot/icon_event_black_gold.png',
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

function getEmbedVideoUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&rel=0`;
  }
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&rel=0`;
  }
  if (url.includes('/embed/')) {
    return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
  }
  return url;
}

export default function Myreservationspag() {
  const [token, setToken] = useState('');
  const [reservations, setReservations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stages, setStages] = useState({});
  const [ticketTypes, setTicketTypes] = useState({});
  const [productions, setProductions] = useState({});
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState(null); // 'edit' | 'survey' | 'cancel' | 'video' | 'pwaGuide' | 'notifList' | 'notifConfig'
  const [selectedRes, setSelectedRes] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState({ url: '', title: '', venue: '' });
  const [editCount, setEditCount] = useState(1);
  const [editMemo, setEditMemo] = useState('');

  const [rating, setRating] = useState(5);
  const [surveyText, setSurveyText] = useState('');
  const [surveySent, setSurveySent] = useState(false);

  // 🔔 通知モード: 'ALL' | 'BADGE_ONLY' | 'OFF'
  const [notifMode, setNotifMode] = useState('ALL');
  const [isLineLinked, setIsLineLinked] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('token') || localStorage.getItem('tp_mypage_token') || '';
    setToken(t);

    if (t) {
      localStorage.setItem('tp_mypage_token', t);
      fetchMypageData(t);
      fetchNotifications(t);
      loadNotificationSetting(t);
    } else {
      setLoading(false);
    }

    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  }, []);

  const loadNotificationSetting = async (mypageToken) => {
    try {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('notif_mode')
        .eq('mypage_token', mypageToken)
        .maybeSingle();

      if (data && data.notif_mode) {
        setNotifMode(data.notif_mode);
      }
    } catch (e) {
      console.error('Load notif config error:', e);
    }
  };

  const fetchNotifications = async (mypageToken) => {
    try {
      const { data, error } = await supabase
        .from('customer_notifications')
        .select('*')
        .eq('mypage_token', mypageToken)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
    } catch (e) {
      console.error('Fetch notif error:', e);
    }
  };

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
        if (resData.some(r => r.line_user_id)) {
          setIsLineLinked(true);
        }

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

  const handleSaveNotifMode = async (mode) => {
    setNotifMode(mode);

    if (mode === 'OFF') {
      await supabase
        .from('push_subscriptions')
        .update({ notif_mode: 'OFF' })
        .eq('mypage_token', token);
      alert('通知をオフに設定しましたワン！');
      setActiveModal(null);
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('お使いのブラウザはプッシュ通知に対応していません。');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('ブラウザの通知権限が許可されていません。設定から許可してください。');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: null
        });
      }

      if (subscription) {
        const subJson = subscription.toJSON();
        await supabase.from('push_subscriptions').upsert({
          mypage_token: token,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || '',
          notif_mode: mode
        }, { onConflict: 'endpoint' });

        if (mode === 'ALL') {
          alert('開演前リマインドなどの通知をすべてONに設定しましたワン！🐾');
        } else {
          alert('「バッジ・一覧のみ」に設定しましたワン！画面ポップアップなしで静かに確認できます。');
        }
      }
    } catch (err) {
      console.error('Notification mode save error:', err);
    }
    setActiveModal(null);
  };

  const handleOpenNotifModal = async () => {
    setActiveModal('notifList');
    if (unreadNotifCount > 0) {
      await supabase
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('mypage_token', token);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  };

  // 🔑 LINEログイン認証画面へ直接遷移（LINE User ID取得・連携）
  const handleLineLink = () => {
    const clientId = '2010532265';
    const redirectUri = encodeURIComponent(window.location.origin + '/line-callback');
    const state = encodeURIComponent(token);
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid`;

    window.location.href = lineAuthUrl;
  };

  const handleOpenVideo = (prod) => {
    if (!prod?.venue_video_url) return;
    setSelectedVideo({
      url: getEmbedVideoUrl(prod.venue_video_url),
      title: prod.title || '',
      venue: prod.venue_name || '劇場'
    });
    setActiveModal('video');
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

  // 💬 LINE問い合わせURL生成（予約者情報プリセット）
  const getLineInquiryUrl = () => {
    const firstRes = reservations[0];
    const prod = firstRes ? productions[firstRes.production_id] : null;
    const stage = firstRes ? stages[firstRes.stage_id] : null;
    
    const stageDateStr = stage ? `${stage.performance_date || stage.stage_date || ''} ${stage.start_time?.slice(0, 5) || ''}開演` : '';
    const text = `【チケポチ問い合わせ】\n予約番号: #${firstRes?.id?.slice(0, 6) || 'なし'}\nお名前: ${firstRes?.customer_name || 'お客様'} 様\n公演: ${prod?.title || '秋の大笑会'}\n日時: ${stageDateStr}\n---\n【お問い合わせ内容】\n`;
    
    return `https://line.me/R/oaMessage/@officeknight/?${encodeURIComponent(text)}`;
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

  const PageChrome = () => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap');

      body { background-color: ${COLORS.bg}; margin: 0; padding: 0; }

      .pouchi-page-bg {
        background-color: ${COLORS.bg};
        background-image:
          radial-gradient(circle at 12px 12px, rgba(245,158,11,0.08) 2px, transparent 2.6px),
          radial-gradient(circle at 30px 30px, rgba(47,111,237,0.06) 2px, transparent 2.6px);
        background-size: 42px 42px;
      }

      .pouchi-floating-mascot {
        position: fixed;
        bottom: 12px;
        right: 12px;
        width: 100px;
        height: auto;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 6px 12px rgba(58, 42, 24, 0.15));
        animation: float-pouchi 3s ease-in-out infinite alternate;
      }

      @keyframes float-pouchi {
        0% { transform: translateY(0px) rotate(0deg); }
        100% { transform: translateY(-6px) rotate(2deg); }
      }

      .pouchi-font {
        font-family: 'Zen Maru Gothic', 'Zen Kaku Gothic New', sans-serif;
      }

      .ticket-card {
        background-color: #ffffff;
        border: 2px solid ${COLORS.border};
        border-radius: 22px;
        padding: 18px;
        box-shadow: 0 6px 0 rgba(245, 158, 11, 0.12), 0 10px 20px rgba(245,158,11,0.08);
        position: relative;
        overflow: hidden;
      }

      .ticket-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 8px;
        background: linear-gradient(90deg, #ffb300, #ffd54f, #ffb300);
      }

      .btn-bounce:active { transform: scale(0.96); }

      .btn-pouchi-primary {
        background: linear-gradient(180deg, #ffc94d, #ffb300);
        color: ${COLORS.pouchiDark};
        border: 2px solid #e8940a;
        box-shadow: 0 4px 0 #d9820a;
      }
      .btn-pouchi-primary:active {
        box-shadow: 0 1px 0 #d9820a;
        transform: translateY(3px);
      }

      .notif-option-card {
        border: 2px solid ${COLORS.border};
        border-radius: 16px;
        padding: 12px 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        background-color: ${COLORS.surface};
        transition: all 0.15s ease;
      }
      .notif-option-card.selected {
        border-color: ${COLORS.yellowDeep};
        background-color: ${COLORS.surfaceAlt};
        box-shadow: 0 2px 0 rgba(245,158,11,0.2);
      }

      .btn-video {
        background-color: #fef2f2;
        border: 1.5px solid #fca5a5;
        color: #dc2626;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .btn-video:hover { background-color: #fee2e2; }

      .video-container {
        position: relative;
        width: 100%;
        padding-bottom: 56.25%;
        height: 0;
        border-radius: 16px;
        overflow: hidden;
        background-color: #000;
      }
      .video-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }

      @keyframes pouchi-pop {
        0% { transform: scale(0.6); opacity: 0; }
        60% { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .pouchi-pop { animation: pouchi-pop 0.35s ease-out; }
    `}</style>
  );

  const MASCOT_ICONAPP = MASCOT.iconApp;

  if (loading) {
    return (
      <div className="pouchi-page-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLORS.pouchiDark, fontFamily: 'sans-serif', gap: '12px' }}>
        <PageChrome />
        <MascotSprite src={MASCOT.checking} size={80} />
        <div className="pouchi-font" style={{ fontWeight: 900 }}>チケポチが予約を読み込み中...</div>
      </div>
    );
  }

  if (!token && reservations.length === 0) {
    return (
      <div className="pouchi-page-bg" style={{ minHeight: '100vh', color: COLORS.text, padding: '32px 16px', boxSizing: 'border-box', fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
        <PageChrome />
        <div style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: COLORS.surface, border: `2.5px solid ${COLORS.border}`, borderRadius: '28px', padding: '28px', textAlign: 'center', boxShadow: '0 8px 0 rgba(245,158,11,0.1), 0 12px 24px rgba(217, 119, 6, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <MascotSprite src={MASCOT.ticketWait} size={90} />
          </div>
          <h2 className="pouchi-font" style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 8px 0', color: COLORS.pouchiDark }}>予約トークンが見つからないワン</h2>
          <p style={{ fontSize: '13px', color: COLORS.muted, lineHeight: '1.6' }}>
            予約完了メールにある「マイページ確認URL」からアクセスしてね！
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pouchi-page-bg" style={{ minHeight: '100vh', color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '16px 14px 80px 14px', boxSizing: 'border-box', position: 'relative' }}>
      <PageChrome />
      
      <img src={MASCOT.bigdog} alt="チケポチ" className="pouchi-floating-mascot" />

      <div style={{ maxWidth: '540px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* 🐶 チケポチ ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '24px', border: `2.5px solid ${COLORS.border}`, boxShadow: '0 4px 0 rgba(245,158,11,0.1), 0 4px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MascotSprite src={MASCOT_ICONAPP} size={52} borderRadius="16px" style={{ boxShadow: '0 3px 0 rgba(217,119,6,0.3)' }} />
            <div>
              <div className="pouchi-font" style={{ fontSize: '19px', fontWeight: 900, color: COLORS.yellowDeep, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                チケポチ！ <span style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 700 }}>マイページ</span>
              </div>
              <div style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 700 }}>
                チケット、ポチッとしよ！🐾
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleOpenNotifModal}
              className="btn-bounce"
              style={{
                position: 'relative',
                padding: '8px 10px',
                borderRadius: '999px',
                border: `2px solid ${unreadNotifCount > 0 ? COLORS.danger : COLORS.yellowDeep}`,
                backgroundColor: unreadNotifCount > 0 ? '#fef2f2' : COLORS.surfaceAlt,
                color: unreadNotifCount > 0 ? COLORS.danger : COLORS.yellowDeep,
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="お知らせを確認"
            >
              <Bell size={14} />
              {unreadNotifCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: COLORS.danger,
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 900,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {unreadNotifCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveModal('notifConfig')}
              className="btn-bounce"
              style={{
                padding: '7px 12px',
                borderRadius: '999px',
                border: `2px solid ${notifMode === 'OFF' ? COLORS.border : COLORS.yellowDeep}`,
                backgroundColor: notifMode === 'OFF' ? '#f3f4f6' : COLORS.surfaceAlt,
                color: notifMode === 'OFF' ? COLORS.muted : COLORS.yellowDeep,
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              {notifMode === 'ALL' && '🔔 通知ON'}
              {notifMode === 'BADGE_ONLY' && '🔴 バッジのみ'}
              {notifMode === 'OFF' && '🔕 通知オフ'}
            </button>
          </div>
        </div>

        {/* 🍁 特典コンテンツサイトへの専用バナー */}
        <div
          onClick={() => window.open(`https://office-knight-partner-site.vercel.app?token=${token}`, '_blank')}
          className="btn-bounce"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#ffffff',
            borderRadius: '24px',
            padding: '16px 18px',
            marginBottom: '16px',
            cursor: 'pointer',
            boxShadow: '0 6px 0 rgba(30,27,75,0.3), 0 8px 20px rgba(30, 27, 75, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            border: '2.5px solid rgba(251, 191, 36, 0.45)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MascotSprite src={MASCOT.iconEvent} size={50} borderRadius="14px" />
            <div>
              <StickerBadge bg="#dc2626" rotate={-4}>⭐ 観劇予約者限定</StickerBadge>
              <div className="pouchi-font" style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.5px', marginTop: '4px' }}>
                秋の大笑会 特典コンテンツサイト
              </div>
              <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                限定動画・電子パンフ・稽古場日誌はこちら🐾
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: COLORS.yellow, color: COLORS.pouchiDark, padding: '9px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, boxShadow: '0 3px 0 #d9820a' }}>
            あそびに行く <ExternalLink size={13} />
          </div>
        </div>

        {/* 📲 ホーム画面追加 ＆ LINE特典アンロックカード */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
          
          <div
            onClick={() => setActiveModal('pwaGuide')}
            className="btn-bounce"
            style={{
              backgroundColor: '#fffdf9',
              border: `2px solid ${COLORS.yellowDeep}`,
              borderRadius: '20px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 3px 0 rgba(245,158,11,0.15)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 900, color: COLORS.yellowDeep }}>
                  <Smartphone size={15} /> ホーム画面追加
                </div>
                <span style={{ fontSize: '9px', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '999px', fontWeight: 800 }}>推奨</span>
              </div>
              <div style={{ fontSize: '11px', color: COLORS.pouchiDark, lineHeight: '1.4', fontWeight: 700 }}>
                当日1タップでチケット表示＆プッシュ通知！🐾
              </div>
            </div>

            <div style={{ marginTop: '6px', fontSize: '11px', color: COLORS.yellowDeep, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <HelpCircle size={12} /> やり方を見る ›
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            border: `2px solid ${isLineLinked ? '#86efac' : '#06c755'}`,
            borderRadius: '20px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 3px 0 rgba(6,199,85,0.15)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 900, color: '#15803d', marginBottom: '4px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#06c755', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900 }}>L</div>
                特典の鍵を開ける
              </div>

              {isLineLinked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  <MascotSprite src={MASCOT.waai} size={26} />
                  <span style={{ fontSize: '11px', color: COLORS.success, fontWeight: 800 }}>アンロック済み！🎉</span>
                </div>
              ) : (
                <div style={{ fontSize: '10px', color: COLORS.muted, lineHeight: '1.35', fontWeight: 600 }}>
                  LINE連携で限定動画・稽古場日誌が見放題！
                </div>
              )}
            </div>

            {!isLineLinked && (
              <button
                onClick={handleLineLink}
                className="btn-bounce"
                style={{ width: '100%', marginTop: '6px', padding: '6px 0', borderRadius: '999px', border: 'none', backgroundColor: '#06c755', color: '#fff', fontSize: '11px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 2px 0 #049543' }}
              >
                <Unlock size={12} /> LINEで鍵を開ける
              </button>
            )}
          </div>

        </div>

        {/* 🎟️ ご予約中のチケット一覧 */}
        <div style={{ marginBottom: '24px' }}>
          <div className="pouchi-font" style={{ fontSize: '15px', fontWeight: 900, color: COLORS.pouchiDark, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎟️</span> ご予約中のチケット <span style={{ fontSize: '12px', color: COLORS.yellowDeep }}>（全 {currentReservations.length} 公演）</span>
          </div>

          {currentReservations.length === 0 ? (
            <div className="ticket-card" style={{ textAlign: 'center', padding: '26px 20px', color: COLORS.muted }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <MascotSprite src={MASCOT.ticketWait} size={72} />
              </div>
              <div className="pouchi-font" style={{ fontWeight: 800, fontSize: '13px' }}>現在予約中の公演はありませんワン</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {currentReservations.map(res => {
                const prod = productions[res.production_id] || {};
                const stage = stages[res.stage_id] || {};
                const tk = ticketTypes[res.ticket_type_id] || { name: '一般', price: 0 };
                const subtotal = (tk.price * (res.count || 1)) + (res.donation_amount || 0);

                const isA = prod.title?.includes('あなたとコンビ');
                const badgeColor = isA ? COLORS.yellowDeep : COLORS.blue;
                const badgeText = isA ? 'A公演' : 'B公演';

                return (
                  <div key={res.id} className="ticket-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StickerBadge bg={badgeColor} rotate={-3}>{badgeText}</StickerBadge>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.success, backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '2px solid #bbf7d0' }}>
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

                    <div style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '14px', border: `1.5px solid ${COLORS.yellowSoft}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.pouchiDark }}>
                        <Calendar size={15} color={COLORS.yellowDeep} />
                        <strong>{stage.performance_date || stage.stage_date} {stage.start_time?.slice(0, 5)}開演</strong>
                        {stage.team_name && <span style={{ fontSize: '11px', color: COLORS.yellowDeep, fontWeight: 700 }}>({stage.team_name})</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.muted }}>
                          <MapPin size={15} color={COLORS.yellowDeep} />
                          <span>{prod.venue_name || '布施PEベース'}</span>
                        </div>
                        {prod.venue_video_url && (
                          <button
                            onClick={() => handleOpenVideo(prod)}
                            className="btn-video btn-bounce"
                          >
                            <PlayCircle size={13} /> 🎬 道順動画
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.pouchiDark, borderTop: `1.5px dashed ${COLORS.yellowSoft}`, paddingTop: '6px', marginTop: '2px' }}>
                        <Ticket size={15} color={COLORS.yellowDeep} />
                        <span>{tk.name} × <strong>{res.count}枚</strong></span>
                        <span style={{ marginLeft: 'auto', fontWeight: 900, color: COLORS.yellowDeep, fontSize: '14px' }}>
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
                        style={{ flex: 1.2, padding: '10px', textAlign: 'center', textDecoration: 'none', borderRadius: '14px', border: `2px solid ${COLORS.yellowSoft}`, backgroundColor: '#fffdf9', color: COLORS.yellowDeep, fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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
                        style={{ flex: 1, padding: '10px', borderRadius: '14px', border: `2px solid ${COLORS.yellowSoft}`, backgroundColor: '#ffffff', color: COLORS.yellowDeep, fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Edit3 size={13} /> 変更
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRes(res);
                          setActiveModal('cancel');
                        }}
                        className="btn-bounce"
                        style={{ padding: '10px 14px', borderRadius: '14px', border: `2px solid #fecdd3`, backgroundColor: '#fff', color: COLORS.danger, fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
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

        {/* 💬 お問い合わせ窓口カード（LINE公式トーク直接起動） */}
        <div style={{
          backgroundColor: '#ffffff',
          border: `2.5px solid ${COLORS.border}`,
          borderRadius: '24px',
          padding: '18px',
          marginBottom: '24px',
          boxShadow: '0 4px 0 rgba(245,158,11,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <MascotSprite src={MASCOT.naruhodo} size={30} />
            <div className="pouchi-font" style={{ fontSize: '15px', fontWeight: 900, color: COLORS.pouchiDark }}>
              ご質問・お問い合わせ窓口 💬
            </div>
          </div>

          <div style={{ fontSize: '12px', color: COLORS.muted, lineHeight: '1.5', marginBottom: '14px' }}>
            当日の遅刻・道順の確認や座席に関するご相談など、劇団公式LINEよりお気軽にお問い合わせくださいワン！🐾
          </div>

          <a
            href={getLineInquiryUrl()}
            target="_blank"
            rel="noreferrer"
            className="btn-bounce"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: '#06c755',
              color: '#ffffff',
              padding: '12px',
              borderRadius: '999px',
              fontWeight: 900,
              fontSize: '13px',
              textDecoration: 'none',
              boxShadow: '0 3px 0 #049543'
            }}
          >
            <MessageSquare size={16} /> LINEでお問い合わせする
          </a>
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
                  <div key={res.id} style={{ backgroundColor: '#ffffff', border: `2px solid ${COLORS.border}`, borderRadius: '18px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                      style={{ padding: '8px 14px', borderRadius: '999px', border: `2px solid ${COLORS.yellowDeep}`, backgroundColor: COLORS.surfaceAlt, color: COLORS.yellowDeep, fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Star size={13} fill={COLORS.yellowDeep} /> 感想を送る
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ⚙️ 通知モード設定モーダル */}
      {activeModal === 'notifConfig' && (
        <div
          onClick={() => setActiveModal(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '28px', padding: '22px', border: `2.5px solid ${COLORS.border}`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MascotSprite src={MASCOT.naruhodo} size={32} />
                <h3 className="pouchi-font" style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: COLORS.pouchiDark }}>
                  通知の受け取り設定 🔔
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            <div style={{ fontSize: '12px', color: COLORS.muted, marginBottom: '14px', lineHeight: '1.5' }}>
              前日リマインドやお知らせの通知スタイルをお好みで選べるワン！🐾
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <div
                className={`notif-option-card ${notifMode === 'ALL' ? 'selected' : ''}`}
                onClick={() => handleSaveNotifMode('ALL')}
              >
                <Volume2 size={20} color={COLORS.yellowDeep} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: COLORS.pouchiDark }}>すべて受け取る（推奨）</div>
                  <div style={{ fontSize: '11px', color: COLORS.muted }}>画面ポップアップ・音・バッジでお知らせ</div>
                </div>
                <input type="radio" name="notifModeOpt" checked={notifMode === 'ALL'} readOnly style={{ accentColor: COLORS.yellowDeep }} />
              </div>

              <div
                className={`notif-option-card ${notifMode === 'BADGE_ONLY' ? 'selected' : ''}`}
                onClick={() => handleSaveNotifMode('BADGE_ONLY')}
              >
                <CircleDot size={20} color={COLORS.yellowDeep} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: COLORS.pouchiDark }}>バッジ・一覧のみ（静かに受け取る）</div>
                  <div style={{ fontSize: '11px', color: COLORS.muted }}>ポップアップなし・未読バッジと通知トレイのみ</div>
                </div>
                <input type="radio" name="notifModeOpt" checked={notifMode === 'BADGE_ONLY'} readOnly style={{ accentColor: COLORS.yellowDeep }} />
              </div>

              <div
                className={`notif-option-card ${notifMode === 'OFF' ? 'selected' : ''}`}
                onClick={() => handleSaveNotifMode('OFF')}
              >
                <BellOff size={20} color={COLORS.danger} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: COLORS.pouchiDark }}>通知を受け取らない</div>
                  <div style={{ fontSize: '11px', color: COLORS.muted }}>リマインドなどの外部通知を停止</div>
                </div>
                <input type="radio" name="notifModeOpt" checked={notifMode === 'OFF'} readOnly style={{ accentColor: COLORS.yellowDeep }} />
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-bounce btn-pouchi-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '999px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
            >
              とじる
            </button>
          </div>
        </div>
      )}

      {/* 🔔 お知らせ・通知履歴モーダル */}
      {activeModal === 'notifList' && (
        <div
          onClick={() => setActiveModal(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', borderRadius: '28px', padding: '22px', border: `2.5px solid ${COLORS.border}`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MascotSprite src={MASCOT.naruhodo} size={32} />
                <h3 className="pouchi-font" style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: COLORS.pouchiDark }}>
                  劇団からのお知らせ・通知 🔔
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: COLORS.muted }}>
                <MascotSprite src={MASCOT.ticketWait} size={64} style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '13px', fontWeight: 700 }}>新しいお知らせはありませんワン！</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>前日リマインドやメッセージが届くとここに表示されます。</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    style={{
                      backgroundColor: COLORS.surfaceAlt,
                      border: `1.5px solid ${COLORS.yellowSoft}`,
                      borderRadius: '16px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: COLORS.pouchiDark }}>
                        {notif.title}
                      </div>
                      <span style={{ fontSize: '10px', color: COLORS.muted }}>
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: COLORS.text, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {notif.body}
                    </div>
                    {notif.link_url && (
                      <a
                        href={notif.link_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: COLORS.yellowDeep, fontWeight: 800, marginTop: '6px', textDecoration: 'none' }}
                      >
                        詳細を見る <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveModal(null)}
              className="btn-bounce btn-pouchi-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '999px', fontWeight: 900, cursor: 'pointer', fontSize: '13px', marginTop: '16px' }}
            >
              とじる
            </button>
          </div>
        </div>
      )}

      {/* 📲 ホーム画面追加手順ガイドモーダル */}
      {activeModal === 'pwaGuide' && (
        <div
          onClick={() => setActiveModal(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', borderRadius: '28px', padding: '22px', border: `2.5px solid ${COLORS.border}`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MascotSprite src={MASCOT.naruhodo} size={34} />
                <h3 className="pouchi-font" style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: COLORS.pouchiDark }}>
                  ホーム画面への追加方法 📱
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            <div style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: '16px', padding: '12px 14px', marginBottom: '16px', border: `1.5px solid ${COLORS.yellowSoft}` }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: COLORS.yellowDeep, marginBottom: '4px' }}>
                🌟 ホーム画面に追加するメリット
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.pouchiDark, lineHeight: '1.6' }}>
                <li>開演前日の<strong>リマインド通知</strong>がスマホに直接届く！</li>
                <li>役者からの<strong>メッセージやお礼</strong>を見逃さない！</li>
                <li>観劇当日、アプリのように<strong>1タップでチケット表示</strong>！</li>
              </ul>
            </div>

            <div style={{ marginBottom: '14px', border: `1.5px solid ${COLORS.border}`, borderRadius: '16px', padding: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: COLORS.pouchiDark, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🍎 iPhone (Safari) の場合
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: '1.7' }}>
                <li>画面下の <strong>「共有アイコン（四角から矢印 ⎘）」</strong> をタップ</li>
                <li>メニューを下にスクロールして <strong>「ホーム画面に追加 ＋」</strong> をタップ</li>
                <li>右上の <strong>「追加」</strong> をタップして完了！</li>
              </ol>
            </div>

            <div style={{ marginBottom: '16px', border: `1.5px solid ${COLORS.border}`, borderRadius: '16px', padding: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: COLORS.pouchiDark, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🤖 Android (Chrome) の場合
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: '1.7' }}>
                <li>画面右上の <strong>「メニュー（縦の3点リーダー ⋮）」</strong> をタップ</li>
                <li><strong>「アプリをインストール」</strong> または <strong>「ホーム画面に追加」</strong> をタップ</li>
                <li>画面の指示に従って <strong>「インストール」</strong> して完了！</li>
              </ol>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-bounce btn-pouchi-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '999px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
            >
              わかったワン！🐾
            </button>
          </div>
        </div>
      )}

      {/* 🎬 劇場への道順動画 ポップアップ再生モーダル */}
      {activeModal === 'video' && (
        <div
          onClick={() => setActiveModal(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '500px', backgroundColor: '#ffffff', borderRadius: '28px', padding: '20px', border: `2.5px solid ${COLORS.border}`, boxShadow: '0 12px 30px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MascotSprite src={MASCOT.naruhodo} size={30} />
                <div>
                  <h3 className="pouchi-font" style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: COLORS.pouchiDark }}>
                    {selectedVideo.venue}への道のり動画 🚶‍♂️
                  </h3>
                  <div style={{ fontSize: '11px', color: COLORS.muted }}>迷わずスムーズにご来場いただけますワン！</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="video-container" style={{ marginBottom: '14px' }}>
              <iframe
                src={selectedVideo.url}
                title="劇場アクセス動画"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn-bounce btn-pouchi-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '999px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
            >
              とじる
            </button>
          </div>
        </div>
      )}

      {/* 🛠️ 予約変更モーダル */}
      {activeModal === 'edit' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '28px', padding: '22px', border: `2.5px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 className="pouchi-font" style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: COLORS.pouchiDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MascotSprite src={MASCOT.naruhodo} size={30} />
                予約内容の変更
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: COLORS.yellowDeep, display: 'block', marginBottom: '4px' }}>枚数</label>
                <select value={editCount} onChange={(e) => setEditCount(parseInt(e.target.value, 10))} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `2px solid ${COLORS.border}`, fontSize: '14px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cnt => (
                    <option key={cnt} value={cnt}>{cnt}枚</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: COLORS.yellowDeep, display: 'block', marginBottom: '4px' }}>備考・ご要望</label>
                <textarea rows={2} value={editMemo} onChange={(e) => setEditMemo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `2px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '999px', border: `2px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontWeight: 800 }}>もどる</button>
                <button onClick={handleUpdateReservation} className="btn-bounce btn-pouchi-primary" style={{ flex: 2, padding: '12px', borderRadius: '999px', fontWeight: 900, cursor: 'pointer' }}>変更を保存ワン！</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💬 匿名アンケートモーダル */}
      {activeModal === 'survey' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '28px', padding: '22px', border: `2.5px solid ${COLORS.border}` }}>
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
                        <Star size={28} color={COLORS.yellowDeep} fill={rating >= star ? COLORS.yellowDeep : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: COLORS.yellowDeep, display: 'block', marginBottom: '4px' }}>
                    ご感想・応援メッセージ（匿名）
                  </label>
                  <textarea
                    rows={3}
                    placeholder="面白かったところやキャストへの熱いメッセージをぜひ教えてね！🐾"
                    value={surveyText}
                    onChange={(e) => setSurveyText(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `2px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '13px' }}
                  />
                </div>

                <button
                  onClick={handleSubmitSurvey}
                  className="btn-bounce btn-pouchi-primary"
                  style={{ width: '100%', padding: '14px', borderRadius: '18px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }}
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
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '28px', padding: '22px', border: `2.5px solid ${COLORS.border}`, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <MascotSprite src={MASCOT.checking} size={72} />
            </div>
            <h3 className="pouchi-font" style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 900, color: COLORS.danger }}>ご予約のキャンセル</h3>
            <p style={{ fontSize: '12px', color: COLORS.muted, lineHeight: '1.5', margin: '0 0 16px 0' }}>
              本当にこの予約をキャンセルしてよろしいですかワン？
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setActiveModal(null)} disabled={isCancelling} style={{ flex: 1, padding: '12px', borderRadius: '999px', border: `2px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontWeight: 800 }}>もどる</button>
              <button onClick={handleCancelReservation} disabled={isCancelling} style={{ flex: 1, padding: '12px', borderRadius: '999px', border: 'none', backgroundColor: COLORS.danger, color: '#fff', fontWeight: 900, cursor: 'pointer', opacity: isCancelling ? 0.7 : 1 }}>
                {isCancelling ? 'キャンセル中...' : 'キャンセル確定'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}