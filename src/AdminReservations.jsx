// src/AdminReservations.jsx (TIKEPOCHI側)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ArrowLeft, Tablet, Printer, Search, Check, Users, RefreshCw, 
  Phone, Mail, FileText, Calendar, DollarSign, UserCheck, Armchair,
  X, Edit3, Trash2, AlertCircle, Save, CreditCard, ChevronRight,
  Send, MessageSquare, Share2, Sparkles, CheckSquare, Square
} from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  goldSoft: '#fdf6e7',
  text: '#2b2438',
  muted: '#8a8398',
  success: '#10b981',
  danger: '#e85a45',
};

export default function AdminReservations({ productionId, onBack, onOpenTablet }) {
  const [stages, setStages] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [casts, setCasts] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [productionData, setProductionData] = useState(null);
  const [loading, setLoading] = useState(true);

  // フィルター用
  const [selectedStageId, setSelectedStageId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCast, setSelectedCast] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState('all');
  const [selectedCheckin, setSelectedCheckin] = useState('all');

  // 詳細・編集ステート
  const [selectedDetailRes, setSelectedDetailRes] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // メッセージ・一括配信ステート
  const [messageTarget, setMessageTarget] = useState(null); // resItem | 'broadcast'
  const [messageBody, setMessageBody] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('line'); // 'line' | 'mypage' | 'email'
  const [templateType, setTemplateType] = useState('thanks'); // 'thanks' | 'remind' | 'custom'
  const [isSending, setIsSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    if (!productionId) {
      setLoading(false);
      return;
    }

    try {
      // 公演情報
      const { data: prod } = await supabase
        .from('productions')
        .select('*')
        .eq('id', productionId)
        .single();
      if (prod) setProductionData(prod);

      // 日程・ステージ取得
      const { data: stagesData } = await supabase
        .from('stages')
        .select('*')
        .eq('production_id', productionId)
        .order('stage_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (stagesData) setStages(stagesData);

      // キャスト一覧取得
      const { data: castsData } = await supabase
        .from('cast_staff')
        .select('*')
        .eq('production_id', productionId);
      if (castsData) setCasts(castsData);

      // 券種一覧取得
      const { data: ticketsData } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('production_id', productionId);
      if (ticketsData) setTicketTypes(ticketsData);

      // 予約一覧取得
      const stageIds = (stagesData || []).map(s => s.id);
      let query = supabase
        .from('reservations')
        .select(`
          *,
          stages:stage_id (stage_date, performance_date, start_time, team_name),
          ticket_types:ticket_type_id (name, price),
          cast_staff:cast_id (name)
        `);

      if (stageIds.length > 0) {
        query = query.or(`production_id.eq.${productionId},stage_id.in.(${stageIds.join(',')})`);
      } else {
        query = query.eq('production_id', productionId);
      }

      const { data: resData, error: resError } = await query.order('created_at', { ascending: false });

      if (resError) {
        const { data: fallbackData } = await supabase
          .from('reservations')
          .select('*')
          .order('created_at', { ascending: false });
        if (fallbackData) setReservations(fallbackData);
      } else if (resData) {
        setReservations(resData);
      }

    } catch (err) {
      console.error('Fetch reservations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productionId]);

  const handleToggleCheckin = async (resItem, e) => {
    if (e) e.stopPropagation();
    const nextStatus = !resItem.checked_in;
    await supabase.from('reservations').update({ checked_in: nextStatus }).eq('id', resItem.id);
    setReservations(reservations.map(r => r.id === resItem.id ? { ...r, checked_in: nextStatus } : r));
    if (selectedDetailRes?.id === resItem.id) {
      setSelectedDetailRes(prev => ({ ...prev, checked_in: nextStatus }));
    }
  };

  const getCustomerDisplayName = (r) => {
    return r.customer_name || r.name || r.customer_name_kana || r.kana || (r.customer_email ? `(${r.customer_email})` : '（名前未設定）');
  };

  const extractSeatInfo = (memo) => {
    if (!memo) return null;
    const match = memo.match(/【座席】:\s*([^\n]+)/);
    return match ? match[1] : null;
  };

  const extractCastInfo = (r) => {
    if (r.cast_staff?.name) return r.cast_staff.name;
    if (r.cast_name) return r.cast_name;
    if (r.memo) {
      const match = r.memo.match(/【扱い】:\s*([^\n]+)/);
      if (match) return match[1];
    }
    return r.cast_id ? 'キャスト扱い' : '劇団扱い';
  };

  const openDetailModal = (res) => {
    setSelectedDetailRes(res);
    setIsEditing(false);
    setEditForm({
      customer_name: res.customer_name || '',
      customer_name_kana: res.customer_name_kana || '',
      customer_phone: res.customer_phone || '',
      customer_email: res.customer_email || '',
      count: res.count || 1,
      ticket_type_id: res.ticket_type_id || '',
      cast_name: extractCastInfo(res),
      memo: res.memo || '',
      payment_status: res.payment_status || 'UNPAID',
    });
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          customer_name: editForm.customer_name,
          customer_name_kana: editForm.customer_name_kana,
          customer_phone: editForm.customer_phone,
          customer_email: editForm.customer_email,
          count: parseInt(editForm.count, 10) || 1,
          ticket_type_id: editForm.ticket_type_id,
          memo: editForm.memo,
          payment_status: editForm.payment_status,
        })
        .eq('id', selectedDetailRes.id);

      if (error) throw error;
      alert('予約情報を更新しました');
      setIsEditing(false);
      fetchData();
      setSelectedDetailRes(prev => ({ ...prev, ...editForm, count: parseInt(editForm.count, 10) }));
    } catch (err) {
      alert('更新に失敗しました: ' + err.message);
    }
  };

  const handleAdminRefundAndCancel = async () => {
    if (!confirm('この予約をキャンセルし、返金手続き（または取消）を行ってもよろしいですか？')) return;
    setIsProcessingRefund(true);

    try {
      if (selectedDetailRes.payment_status === 'PAID') {
        const { data, error } = await supabase.functions.invoke(
          'refund-stripe-payment',
          {
            body: {
              reservationId: selectedDetailRes.id,
              mypageToken: selectedDetailRes.mypage_token
            }
          }
        );
        if (error || data?.error) throw new Error(error?.message || data?.error || 'Stripe返金に失敗しました');
        alert(`Stripe返金（¥${data.refundAmount?.toLocaleString()}）と予約のキャンセルが完了しました。`);
      } else {
        await supabase.from('seat_reservations').delete().eq('reservation_id', selectedDetailRes.id);
        await supabase.from('reservations').update({ payment_status: 'CANCELLED' }).eq('id', selectedDetailRes.id);
        alert('予約をキャンセルしました。');
      }

      setSelectedDetailRes(null);
      fetchData();
    } catch (err) {
      alert('返金・キャンセル処理に失敗しました: ' + err.message);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // 📝 テンプレート生成関数
  const generateTemplateText = (type, target) => {
    const isBroadcast = target === 'broadcast';
    const firstRes = isBroadcast ? (filteredReservations[0] || {}) : target;
    const stage = firstRes?.stages || stages.find(s => s.id === firstRes?.stage_id) || {};
    const tk = firstRes?.ticket_types || ticketTypes.find(t => t.id === firstRes?.ticket_type_id) || { name: '一般' };

    const nameStr = isBroadcast ? 'お客様各位' : `${getCustomerDisplayName(firstRes)} 様`;
    const prodTitle = productionData?.title || '公演';
    const sDate = stage.performance_date || stage.stage_date || '';
    const dateTimeStr = sDate ? `${new Date(sDate).getMonth() + 1}/${new Date(sDate).getDate()} ${stage.start_time?.slice(0, 5)}開演` : '';
    const venueStr = productionData?.venue_name || '劇場';
    const videoStr = productionData?.venue_video_url ? `\n🎬 会場への道順動画はこちら：\n${productionData.venue_video_url}` : '';
    const mypageStr = firstRes?.mypage_token ? `\n\n🐾 チケット確認・マイページ：\n${window.location.origin}/mypage?token=${firstRes.mypage_token}` : '';

    if (type === 'thanks') {
      return `${nameStr}

この度は『${prodTitle}』のご予約をいただき、誠にありがとうございます。

【ご予約内容】
・日時：${dateTimeStr || 'ご予約日程'}
・券種：${tk.name} × ${firstRes.count || 1}枚
・会場：${venueStr}${mypageStr}

当日は受付にてお名前をお知らせください。
劇場でお会いできることを心より楽しみにしております！🐾

── office Knight 制作部`;
    }

    if (type === 'remind') {
      return `${nameStr}

いよいよ明日は『${prodTitle}』の開演日です！

【ご来場のご案内】
・開演日時：${dateTimeStr || 'ご予約日程'}
・会場：${venueStr}${videoStr}${mypageStr}

道中お気をつけてお越しくださいませ。
皆様のご来場を心よりお待ちしております！🐾

── office Knight 制作部`;
    }

    return '';
  };

  const openMessageModal = (target) => {
    setMessageTarget(target);
    setSendDone(false);
    setSelectedChannel(target === 'broadcast' ? 'mypage' : 'line');
    setTemplateType('thanks');
    setMessageTitle(target === 'broadcast' ? '【重要なお知らせ】office Knight公演事務局より' : 'ご予約ありがとうございます');
    setMessageBody(generateTemplateText('thanks', target));
  };

  const handleTemplateChange = (type) => {
    setTemplateType(type);
    if (type !== 'custom') {
      setMessageBody(generateTemplateText(type, messageTarget));
      if (type === 'remind') setMessageTitle('【前日リマインド】明日のご来場に関するご案内');
      if (type === 'thanks') setMessageTitle('【予約完了】ご予約ありがとうございます');
    }
  };

  // 🚀 メッセージ送信・配信実行
  const handleSendMessageSubmit = async () => {
    if (!messageBody.trim()) {
      alert('メッセージ本文を入力してください');
      return;
    }

    // LINE共有（個別のみ）
    if (selectedChannel === 'line' && messageTarget !== 'broadcast') {
      const shareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(messageBody)}`;
      window.open(shareUrl, '_blank');
      setSendDone(true);
      setTimeout(() => { setMessageTarget(null); setSendDone(false); }, 1500);
      return;
    }

    // メール送信（個別メーラー起動）
    if (selectedChannel === 'email' && messageTarget !== 'broadcast') {
      const email = messageTarget.customer_email || '';
      if (!email) {
        alert('このお客様はメールアドレスが登録されていません');
        return;
      }
      const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(messageTitle)}&body=${encodeURIComponent(messageBody)}`;
      window.location.href = mailtoUrl;
      setSendDone(true);
      setTimeout(() => { setMessageTarget(null); setSendDone(false); }, 1500);
      return;
    }

    // マイページ通知・一斉送信（DB書き込み）
    setIsSending(true);
    try {
      const targets = messageTarget === 'broadcast' ? filteredReservations : [messageTarget];
      const validTokens = targets.filter(r => r.mypage_token);

      if (validTokens.length === 0) {
        throw new Error('送信対象のマイページトークンが見つかりません');
      }

      // customer_notifications テーブルへ登録
      const notifRows = validTokens.map(r => ({
        mypage_token: r.mypage_token,
        title: messageTitle || '劇団からのお知らせ',
        body: messageBody.replace(/\{予約者名\}/g, getCustomerDisplayName(r)),
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { error: notifErr } = await supabase.from('customer_notifications').insert(notifRows);
      if (notifErr) throw notifErr;

      // 一斉送信ログ保存
      if (messageTarget === 'broadcast') {
        await supabase.from('broadcast_logs').insert([{
          production_id: productionId,
          target: selectedStageId === 'all' ? 'all' : selectedStageId,
          title: messageTitle,
          message: messageBody,
          created_at: new Date().toISOString()
        }]);
      }

      setSendDone(true);
      setTimeout(() => {
        setMessageTarget(null);
        setSendDone(false);
      }, 1600);
    } catch (err) {
      alert('送信に失敗しました: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // フィルター処理
  const filteredReservations = reservations.filter(r => {
    if (r.payment_status === 'CANCELLED' || r.payment_status === 'REFUNDED') return false;
    if (selectedStageId !== 'all' && r.stage_id !== selectedStageId) return false;
    
    const castName = extractCastInfo(r);
    if (selectedCast !== 'all') {
      const targetCast = casts.find(c => c.id === selectedCast)?.name || selectedCast;
      if (r.cast_id !== selectedCast && castName !== targetCast) return false;
    }

    if (selectedTicket !== 'all' && r.ticket_type_id !== selectedTicket && r.ticket_name !== selectedTicket) return false;
    if (selectedCheckin === 'checked' && !r.checked_in) return false;
    if (selectedCheckin === 'unchecked' && r.checked_in) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const displayName = getCustomerDisplayName(r).toLowerCase();
      const email = (r.customer_email || r.email || '').toLowerCase();
      const phone = (r.customer_phone || r.phone || '');
      const memo = (r.memo || r.notes || '').toLowerCase();
      if (!displayName.includes(q) && !email.includes(q) && !phone.includes(q) && !memo.includes(q)) return false;
    }
    return true;
  });

  const totalSeats = stages.reduce((sum, s) => sum + (s.capacity || 80), 0);
  const totalReserved = reservations
    .filter(r => r.payment_status !== 'CANCELLED' && r.payment_status !== 'REFUNDED')
    .reduce((sum, r) => sum + (r.count || r.ticket_count || 1), 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '12px 10px 80px 10px', boxSizing: 'border-box' }}>
      <style>{`
        .compact-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(201,121,31,0.15);
          background-color: #ffffff;
          cursor: pointer;
          transition: background-color 0.1s ease;
        }
        .compact-row:active {
          background-color: #fcf8ee;
        }
        .compact-row:last-child {
          border-bottom: none;
        }

        .btn-channel {
          flex: 1;
          padding: 10px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          border: 2px solid ${COLORS.border};
          background-color: #fff;
          transition: all 0.15s ease;
        }
        .btn-channel.active {
          border-color: ${COLORS.gold};
          background-color: ${COLORS.goldSoft};
          color: ${COLORS.text};
        }

        .tmpl-tab {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          border: 1.5px solid ${COLORS.border};
          background-color: #fff;
          color: ${COLORS.muted};
        }
        .tmpl-tab.active {
          background-color: ${COLORS.gold};
          color: #fff;
          border-color: ${COLORS.gold};
        }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '13px', cursor: 'pointer', padding: '4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} /> ホームへ
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => openMessageModal('broadcast')}
              style={{ padding: '6px 12px', borderRadius: '8px', border: `1.5px solid ${COLORS.gold}`, backgroundColor: COLORS.goldSoft, color: COLORS.gold, fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Send size={13} /> 📢 一括配信 ({filteredReservations.length}件)
            </button>

            <button onClick={onOpenTablet} style={{ padding: '6px 12px', borderRadius: '8px', border: `1.5px solid ${COLORS.gold}`, backgroundColor: '#fff', color: COLORS.gold, fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tablet size={14} /> 受付
            </button>

            <button onClick={fetchData} style={{ padding: '6px 8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', fontSize: '12px', cursor: 'pointer' }}>
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* 総動員数サマリー */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800 }}>
            総動員数 <span style={{ color: COLORS.gold, fontSize: '22px', fontWeight: 900 }}>{totalReserved}</span> / {totalSeats}人
          </div>
          <div style={{ fontSize: '12px', color: COLORS.muted }}>
            表示中: <strong>{filteredReservations.length}</strong> 件
          </div>
        </div>

        {/* 日程カード一覧（横スクロール） */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '12px', WebkitOverflowScrolling: 'touch' }}>
          <div
            onClick={() => setSelectedStageId('all')}
            style={{ flexShrink: 0, minWidth: '85px', padding: '8px 10px', borderRadius: '10px', backgroundColor: selectedStageId === 'all' ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${selectedStageId === 'all' ? COLORS.gold : COLORS.border}`, cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ fontWeight: 800, fontSize: '12px' }}>全日程</div>
            <div style={{ fontSize: '11px', color: COLORS.muted }}>{totalReserved}人</div>
          </div>

          {stages.map(stage => {
            const sDate = stage.performance_date || stage.stage_date;
            const stageReserved = reservations
              .filter(r => r.stage_id === stage.id && r.payment_status !== 'CANCELLED' && r.payment_status !== 'REFUNDED')
              .reduce((sum, r) => sum + (r.count || r.ticket_count || 1), 0);
            const isSelected = selectedStageId === stage.id;
            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                style={{ flexShrink: 0, minWidth: '95px', padding: '8px 10px', borderRadius: '10px', backgroundColor: isSelected ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${isSelected ? COLORS.gold : COLORS.border}`, cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontWeight: 800, fontSize: '12px' }}>
                  {sDate ? `${new Date(sDate).getMonth() + 1}/${new Date(sDate).getDate()}` : ''} {stage.start_time?.slice(0, 5)}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>
                  {stageReserved} / {stage.capacity || 80}
                </div>
              </div>
            );
          })}
        </div>

        {/* 検索 ＆ 絞り込みバー */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
          <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
            <Search size={14} color={COLORS.muted} style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="お名前・連絡先・メモで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>

          <select value={selectedCast} onChange={(e) => setSelectedCast(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '12px' }}>
            <option value="all">担当（全員）</option>
            {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={selectedCheckin} onChange={(e) => setSelectedCheckin(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '12px' }}>
            <option value="all">来場（全て）</option>
            <option value="checked">来場済み</option>
            <option value="unchecked">未チェック</option>
          </select>
        </div>

        {/* 📋 1行コンパクト・予約一覧リスト */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1.5px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(43,36,56,0.04)' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>データを読み込み中...</div>
          ) : filteredReservations.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>予約データがありません</div>
          ) : (
            filteredReservations.map(res => {
              const displayName = getCustomerDisplayName(res);
              const ticketName = res.ticket_types?.name || res.ticket_name || '一般';
              const ticketCount = res.count || 1;
              const castName = extractCastInfo(res);
              const isPaid = res.payment_status === 'PAID' || res.is_paid === true;
              const seatInfo = extractSeatInfo(res.memo);

              return (
                <div key={res.id} onClick={() => openDetailModal(res)} className="compact-row">
                  
                  {/* 左側: 名前・座席 */}
                  <div style={{ flex: '1 1 35%', minWidth: 0, paddingRight: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {displayName}
                    </div>
                    {seatInfo ? (
                      <div style={{ fontSize: '10px', color: COLORS.gold, fontWeight: 800, marginTop: '1px' }}>
                        💺 {seatInfo}
                      </div>
                    ) : (
                      <div style={{ fontSize: '10px', color: COLORS.muted, marginTop: '1px' }}>
                        #{res.id.slice(0, 6)}
                      </div>
                    )}
                  </div>

                  {/* 中央: 枚数・扱いキャスト */}
                  <div style={{ flex: '1 1 35%', minWidth: 0, paddingRight: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.text }}>
                      {ticketName} × <strong>{ticketCount}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                      <span style={{ backgroundColor: castName === '劇団扱い' ? '#f1f5f9' : '#eef2ff', color: castName === '劇団扱い' ? '#475569' : '#4f46e5', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {castName}
                      </span>
                      {isPaid ? (
                        <span style={{ color: COLORS.success, fontSize: '10px', fontWeight: 800 }}>済</span>
                      ) : (
                        <span style={{ color: COLORS.danger, fontSize: '10px', fontWeight: 800 }}>未</span>
                      )}
                    </div>
                  </div>

                  {/* 右側: 来場チェックボタン ＆ 詳細アイコン */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={(e) => handleToggleCheckin(res, e)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: `1.5px solid ${res.checked_in ? COLORS.success : COLORS.border}`,
                        backgroundColor: res.checked_in ? '#ecfdf5' : '#fff',
                        color: res.checked_in ? COLORS.success : COLORS.muted,
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <Check size={13} /> {res.checked_in ? '来場' : '未'}
                    </button>
                    <ChevronRight size={16} color={COLORS.muted} />
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 🔍 詳細確認・編集・返金モーダル */}
      {selectedDetailRes && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '14px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '20px', maxHeight: '90vh', overflowY: 'auto', border: `2px solid ${COLORS.border}` }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={18} color={COLORS.gold} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: COLORS.text }}>
                  {isEditing ? '予約情報の編集' : '予約詳細'}
                </h3>
              </div>
              <button onClick={() => setSelectedDetailRes(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            {isEditing ? (
              /* 🛠️ 編集フォーム */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: COLORS.gold, marginBottom: '2px' }}>お名前</label>
                  <input
                    type="text"
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: COLORS.gold, marginBottom: '2px' }}>枚数</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.count}
                      onChange={(e) => setEditForm({ ...editForm, count: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: COLORS.gold, marginBottom: '2px' }}>精算状況</label>
                    <select
                      value={editForm.payment_status}
                      onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                    >
                      <option value="UNPAID">未精算（当日）</option>
                      <option value="PAID">精算済（PAID）</option>
                      <option value="PENDING">振込待ち</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: COLORS.gold, marginBottom: '2px' }}>電話番号</label>
                  <input
                    type="text"
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: COLORS.gold, marginBottom: '2px' }}>メール</label>
                  <input
                    type="email"
                    value={editForm.customer_email}
                    onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: COLORS.gold, marginBottom: '2px' }}>備考・メモ</label>
                  <textarea
                    rows={4}
                    value={editForm.memo}
                    onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, background: '#fff', cursor: 'pointer', fontWeight: 700 }}>キャンセル</button>
                  <button onClick={handleSaveEdit} style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 900, cursor: 'pointer' }}>保存する</button>
                </div>
              </div>
            ) : (
              /* 📄 詳細表示 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ backgroundColor: COLORS.surfaceAlt, padding: '12px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: COLORS.text, marginBottom: '4px' }}>
                    {getCustomerDisplayName(selectedDetailRes)}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.muted }}>
                    予約番号: #{selectedDetailRes.id}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: '#fff', border: `1px solid ${COLORS.border}`, padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: COLORS.muted }}>券種・枚数</div>
                    <div style={{ fontSize: '14px', fontWeight: 800 }}>
                      {selectedDetailRes.ticket_types?.name || '一般'} × {selectedDetailRes.count || 1}枚
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fff', border: `1px solid ${COLORS.border}`, padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: COLORS.muted }}>精算状況</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: (selectedDetailRes.payment_status === 'PAID') ? COLORS.success : COLORS.danger }}>
                      {selectedDetailRes.payment_status === 'PAID' ? 'クレジット決済済' : selectedDetailRes.payment_method === 'BANK_TRANSFER' ? '銀行振込案内中' : '当日劇場精算'}
                    </div>
                  </div>
                </div>

                {extractSeatInfo(selectedDetailRes.memo) && (
                  <div style={{ backgroundColor: '#fffdf0', border: `1.5px solid ${COLORS.gold}`, padding: '10px 12px', borderRadius: '10px', color: COLORS.gold, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Armchair size={16} /> 指定座席: {extractSeatInfo(selectedDetailRes.memo)}
                  </div>
                )}

                <div style={{ backgroundColor: '#fff', border: `1px solid ${COLORS.border}`, padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                  <div>📞 電話: {selectedDetailRes.customer_phone || '未設定'}</div>
                  <div>✉️ メール: {selectedDetailRes.customer_email || '未設定'}</div>
                  <div>🎭 扱い: {extractCastInfo(selectedDetailRes)}</div>
                </div>

                {selectedDetailRes.memo && (
                  <div style={{ backgroundColor: '#fcfcfc', border: `1px solid ${COLORS.border}`, padding: '10px', borderRadius: '10px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                    <strong>📝 備考・メモ:</strong><br />
                    {selectedDetailRes.memo}
                  </div>
                )}

                {/* ボタン群（連絡・編集・返金） */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  <button
                    onClick={() => {
                      const res = selectedDetailRes;
                      setSelectedDetailRes(null);
                      openMessageModal(res);
                    }}
                    style={{ padding: '10px', borderRadius: '10px', border: `1.5px solid ${COLORS.gold}`, backgroundColor: COLORS.goldSoft, color: COLORS.gold, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Send size={14} /> 連絡する
                  </button>

                  <button
                    onClick={() => setIsEditing(true)}
                    style={{ padding: '10px', borderRadius: '10px', border: `1.5px solid ${COLORS.border}`, backgroundColor: '#fff', color: COLORS.text, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Edit3 size={14} /> 編集
                  </button>

                  <button
                    onClick={handleAdminRefundAndCancel}
                    disabled={isProcessingRefund}
                    style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.danger, color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', opacity: isProcessingRefund ? 0.7 : 1 }}
                  >
                    <Trash2 size={14} /> 取消
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 💌 メッセージ送信・一括配信モーダル */}
      {messageTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '14px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#fff', borderRadius: '24px', padding: '22px', border: `2px solid ${COLORS.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: COLORS.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color={COLORS.gold} />
                {messageTarget === 'broadcast' 
                  ? `予約者への一括配信（対象: ${filteredReservations.length}件）` 
                  : `${getCustomerDisplayName(messageTarget)} 様へメッセージ`}
              </h3>
              <button onClick={() => setMessageTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            {sendDone ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: COLORS.success }}>
                <Check size={48} style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 900, fontSize: '16px' }}>送信処理が完了しました！</div>
              </div>
            ) : (
              <>
                {/* チャンネル選択 */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: COLORS.gold, display: 'block', marginBottom: '6px' }}>
                    1. 送信方法を選択
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {messageTarget !== 'broadcast' && (
                      <button type="button" onClick={() => setSelectedChannel('line')} className={`btn-channel ${selectedChannel === 'line' ? 'active' : ''}`}>
                        <span style={{ fontSize: '16px' }}>🟢</span>
                        <span>LINE送信</span>
                      </button>
                    )}
                    <button type="button" onClick={() => setSelectedChannel('mypage')} className={`btn-channel ${selectedChannel === 'mypage' ? 'active' : ''}`}>
                      <span style={{ fontSize: '16px' }}>💌</span>
                      <span>マイページ通知</span>
                    </button>
                    {messageTarget !== 'broadcast' && (
                      <button type="button" onClick={() => setSelectedChannel('email')} className={`btn-channel ${selectedChannel === 'email' ? 'active' : ''}`}>
                        <span style={{ fontSize: '16px' }}>✉️</span>
                        <span>メール送信</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* テンプレート選択 */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: COLORS.gold, display: 'block', marginBottom: '6px' }}>
                    2. テンプレートを選ぶ（自動差し込み）
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => handleTemplateChange('thanks')} className={`tmpl-tab ${templateType === 'thanks' ? 'active' : ''}`}>💌 予約お礼</button>
                    <button type="button" onClick={() => handleTemplateChange('remind')} className={`tmpl-tab ${templateType === 'remind' ? 'active' : ''}`}>⏰ 前日リマインド（道順動画付）</button>
                    <button type="button" onClick={() => handleTemplateChange('custom')} className={`tmpl-tab ${templateType === 'custom' ? 'active' : ''}`}>✏️ 自由作成</button>
                  </div>
                </div>

                {/* 件名（マイページ・メールの場合） */}
                {selectedChannel !== 'line' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: COLORS.gold, display: 'block', marginBottom: '4px' }}>
                      件名（タイトル）
                    </label>
                    <input
                      type="text"
                      value={messageTitle}
                      onChange={(e) => setMessageTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '13px' }}
                    />
                  </div>
                )}

                {/* 本文 */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: COLORS.gold, display: 'block', marginBottom: '4px' }}>
                    メッセージ本文
                  </label>
                  <textarea
                    rows={8}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1.5px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '12px', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <button
                  onClick={handleSendMessageSubmit}
                  disabled={isSending}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 900, cursor: isSending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }}
                >
                  {selectedChannel === 'line' ? (
                    <><Share2 size={16} /> LINEを開いて送信する</>
                  ) : (
                    <><Send size={16} /> {isSending ? '送信中...' : messageTarget === 'broadcast' ? '一括配信を実行する' : 'メッセージを届ける'}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}