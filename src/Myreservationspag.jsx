import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Ticket, Calendar, MapPin, Bell, MessageSquare, ExternalLink, 
  Smartphone, Share2, Star, CheckCircle2, AlertCircle, X, 
  User, Send, Edit3, Heart
} from 'lucide-react';

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

export default function Myreservationspag() {
  const [token, setToken] = useState('');
  const [reservations, setReservations] = useState([]);
  const [stages, setStages] = useState({});
  const [productions, setProductions] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // 変更・キャンセル・アンケート用モーダル
  const [activeModal, setActiveModal] = useState(null); // 'edit' | 'cancel' | 'survey'
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
      // 1. 予約データの取得
      const { data: resData, error: resErr } = await supabase
        .from('reservations')
        .select('*, ticket_types(name, price)')
        .eq('mypage_token', mypageToken)
        .order('created_at', { ascending: false });

      if (resErr) throw resErr;
      setReservations(resData || []);

      if (resData && resData.length > 0) {
        if (resData[0].line_user_id) setIsLineLinked(true);

        const prodIds = [...new Set(resData.map(r => r.production_id).filter(Boolean))];
        const stageIds = [...new Set(resData.map(r => r.stage_id).filter(Boolean))];

        // 2. 公演・ステージ・お知らせの並列取得
        const [{ data: prodList }, { data: stageList }, { data: msgList }] = await Promise.all([
          supabase.from('productions').select('*').in('id', prodIds),
          supabase.from('stages').select('*').in('id', stageIds),
          supabase.from('announcements').select('*').in('production_id', prodIds).order('created_at', { ascending: false }).limit(5)
        ]);

        const pMap = {};
        (prodList || []).forEach(p => { pMap[p.id] = p; });
        setProductions(pMap);

        const sMap = {};
        (stageList || []).forEach(s => { sMap[s.id] = s; });
        setStages(sMap);

        setAnnouncements(msgList || []);
      }
    } catch (e) {
      console.error('Mypage fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Push通知
  const handleTogglePush = async () => {
    if (!('Notification' in window)) {
      alert('お使いのブラウザはプッシュ通知に対応していません。');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      alert('開演前リマインドや重要なお知らせのプッシュ通知をONにしました！');
    } else {
      alert('通知がブロックされました。ブラウザの設定から許可してください。');
    }
  };

  // LINE連携
  const handleLineLink = () => {
    const liffUrl = `https://line.me/R/`; 
    alert('LINE連携画面へ進みます。連携すると別サイトの特典コンテンツが自動アンロックされます。');
    window.location.href = liffUrl;
  };

  // 予約変更の送信
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
      alert('予約内容を変更しました。');
      setActiveModal(null);
      fetchMypageData(token);
    } catch (e) {
      alert('変更に失敗しました: ' + e.message);
    }
  };

  // 予約キャンセルの送信
  const handleCancelReservation = async () => {
    if (!selectedRes) return;
    if (confirm('本当にこの予約をキャンセルしますか？')) {
      try {
        const { error } = await supabase
          .from('reservations')
          .delete()
          .eq('id', selectedRes.id);

        if (error) throw error;
        alert('予約をキャンセルしました。');
        setActiveModal(null);
        fetchMypageData(token);
      } catch (e) {
        alert('キャンセルに失敗しました: ' + e.message);
      }
    }
  };

  // 匿名アンケート送信
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

  // GoogleカレンダーURL生成
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
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.text, fontFamily: 'sans-serif' }}>
        マイページを読み込み中...
      </div>
    );
  }

  if (!token && reservations.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, padding: '32px 16px', boxSizing: 'border-box', fontFamily: "'Zen Kaku Gothic New', sans-serif" }}>
        <div style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <Ticket size={48} color={COLORS.gold} style={{ margin: '0 auto 12px auto' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>予約確認トークンが見つかりません</h2>
          <p style={{ fontSize: '13px', color: COLORS.muted, lineHeight: '1.6' }}>
            予約完了時にお送りしたメールに記載されている「マイページ確認URL」からアクセスしてください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '16px 12px 60px 12px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.gold }}>office Knight チケットポータル</div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0 0' }}>お客様マイページ</h1>
          </div>
          <button
            onClick={handleTogglePush}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: `1px solid ${pushEnabled ? COLORS.success : COLORS.border}`,
              backgroundColor: pushEnabled ? '#f0fdf4' : COLORS.surface,
              color: pushEnabled ? COLORS.success : COLORS.text,
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Bell size={13} /> {pushEnabled ? '通知ON' : '通知設定'}
          </button>
        </div>

        {/* ホーム画面追加（PWA）案内 */}
        <div style={{ backgroundColor: '#fffdf9', border: `1px dashed ${COLORS.gold}`, borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={18} color={COLORS.gold} />
          <div style={{ fontSize: '11px', color: COLORS.text, lineHeight: '1.4' }}>
            <strong>ホーム画面に追加</strong>すると、次回からアプリのようにワンタップでチケットや特典にアクセスできます。
          </div>
        </div>

        {/* LINE連携 */}
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#06c755', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px' }}>
              LINE
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>LINE ID連携</div>
              <div style={{ fontSize: '10px', color: COLORS.muted }}>
                {isLineLinked ? '連携完了（特典サイト自動認証）' : '連携して特典サイトへスムーズにアクセス'}
              </div>
            </div>
          </div>
          {!isLineLinked && (
            <button
              onClick={handleLineLink}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#06c755', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              連携する
            </button>
          )}
        </div>

        {/* 劇団からのお知らせ */}
        {announcements.length > 0 && (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.gold, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <MessageSquare size={13} /> 劇団からのご案内
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {announcements.map(msg => (
                <div key={msg.id} style={{ fontSize: '12px', backgroundColor: COLORS.surfaceAlt, padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>{msg.title}</div>
                  <div style={{ color: COLORS.muted, fontSize: '11px', lineHeight: '1.4' }}>{msg.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 現在予約中の公演チケット */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.gold, marginBottom: '8px' }}>
            🎟️ ご予約中の公演チケット
          </div>

          {currentReservations.length === 0 ? (
            <div style={{ backgroundColor: COLORS.surface, borderRadius: '12px', border: `1px solid ${COLORS.border}`, padding: '24px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>
              現在予約中の公演はありません。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentReservations.map(res => {
                const prod = productions[res.production_id] || {};
                const stage = stages[res.stage_id] || {};
                const tk = res.ticket_types || { name: '一般', price: 0 };
                const subtotal = (tk.price * (res.count || 1)) + (res.donation_amount || 0);

                return (
                  <div
                    key={res.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      border: `1.5px solid ${COLORS.gold}`,
                      borderRadius: '16px',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(201,121,31,0.08)'
                    }}
                  >
                    <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', backgroundColor: COLORS.gold, padding: '2px 8px', borderRadius: '4px' }}>
                        ご予約確定
                      </span>
                      <span style={{ fontSize: '12px', color: COLORS.muted }}>
                        予約番号: #{res.id.slice(0, 6)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px 0', color: COLORS.text }}>
                      {prod.title || '公演情報'}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: COLORS.text, marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color={COLORS.gold} />
                        <strong>{stage.performance_date || stage.stage_date} {stage.start_time?.slice(0, 5)}開演</strong>
                        {stage.team_name && <span style={{ fontSize: '11px', color: COLORS.gold }}>({stage.team_name})</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color={COLORS.gold} />
                        <span>{prod.venue_name || '布施PEベース'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Ticket size={14} color={COLORS.gold} />
                        <span>{tk.name} × <strong>{res.count}枚</strong>（¥{subtotal.toLocaleString()} 当日精算）</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} color={COLORS.gold} />
                        <span>扱いキャスト: <strong>{res.staff_name || '劇団扱い'}</strong></span>
                      </div>
                    </div>

                    {/* 特典コンテンツサイトへの専用導線 */}
                    <button
                      onClick={() => window.open('https://office-knight-partner-site.vercel.app', '_blank')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: COLORS.indigo,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginBottom: '10px',
                        boxShadow: '0 2px 6px rgba(67,56,202,0.25)'
                      }}
                    >
                      <ExternalLink size={15} /> 🎁 観劇者限定コンテンツサイトを開く
                    </button>

                    {/* カレンダー・変更・キャンセル */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <a
                        href={getGoogleCalendarUrl(prod, stage)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ flex: 1, padding: '8px', textAlign: 'center', textDecoration: 'none', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surfaceAlt, color: COLORS.text, fontSize: '11px', fontWeight: 700 }}
                      >
                        📅 カレンダー登録
                      </a>
                      <button
                        onClick={() => {
                          setSelectedRes(res);
                          setEditCount(res.count || 1);
                          setEditMemo(res.memo || '');
                          setActiveModal('edit');
                        }}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, color: COLORS.gold, fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Edit3 size={12} /> 予約変更
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRes(res);
                          setActiveModal('cancel');
                        }}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid rgba(232,90,69,0.3)`, backgroundColor: '#fff', color: COLORS.danger, fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        キャンセル
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 過去の観劇履歴 ＆ 匿名アンケート */}
        {pastReservations.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.muted, marginBottom: '8px' }}>
              📜 過去にご観劇いただいた公演
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pastReservations.map(res => {
                const prod = productions[res.production_id] || {};
                const stage = stages[res.stage_id] || {};

                return (
                  <div key={res.id} style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{prod.title}</div>
                      <div style={{ fontSize: '11px', color: COLORS.muted }}>
                        {stage.performance_date || stage.stage_date} ご来場ありがとうございました
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRes(res);
                        setActiveModal('survey');
                      }}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${COLORS.gold}`, backgroundColor: '#fffdf9', color: COLORS.gold, fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Star size={12} fill={COLORS.gold} /> 感想・評価を送る
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 予約変更モーダル */}
      {activeModal === 'edit' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: COLORS.surface, borderRadius: '16px', padding: '20px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>ご予約内容の変更</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, display: 'block', marginBottom: '4px' }}>枚数</label>
                <select value={editCount} onChange={(e) => setEditCount(parseInt(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cnt => (
                    <option key={cnt} value={cnt}>{cnt}枚</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, display: 'block', marginBottom: '4px' }}>備考・ご要望</label>
                <textarea rows={2} value={editMemo} onChange={(e) => setEditMemo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '12px' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer' }}>戻る</button>
                <button onClick={handleUpdateReservation} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>変更を保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 匿名アンケート・感想モーダル */}
      {activeModal === 'survey' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: COLORS.surface, borderRadius: '16px', padding: '20px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>観劇アンケート・感想</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={18} /></button>
            </div>

            {surveySent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: COLORS.success }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700 }}>ご感想ありがとうございました！</div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>劇団・キャストへ匿名でお届けしました。</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: COLORS.muted, marginBottom: '6px' }}>公演の満足度</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Star size={24} color={COLORS.gold} fill={rating >= star ? COLORS.gold : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, display: 'block', marginBottom: '4px' }}>
                    ご感想・応援メッセージ（匿名）
                  </label>
                  <textarea
                    rows={3}
                    placeholder="劇団やキャストへの熱いメッセージをぜひお寄せください！"
                    value={surveyText}
                    onChange={(e) => setSurveyText(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '12px' }}
                  />
                </div>

                <button
                  onClick={handleSubmitSurvey}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Send size={14} /> 匿名で劇団に送信する
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* キャンセル確認モーダル */}
      {activeModal === 'cancel' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: COLORS.surface, borderRadius: '16px', padding: '20px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
            <AlertCircle size={40} color={COLORS.danger} style={{ margin: '0 auto 10px auto' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>ご予約のキャンセル</h3>
            <p style={{ fontSize: '12px', color: COLORS.muted, lineHeight: '1.5', margin: '0 0 16px 0' }}>
              この操作は取り消せません。本当にお席の確保を解除してよろしいですか？
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer' }}>戻る</button>
              <button onClick={handleCancelReservation} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: COLORS.danger, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>キャンセル確定</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}