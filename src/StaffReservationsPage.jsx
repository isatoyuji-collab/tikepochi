// src/StaffReservationsPage.jsx (TIKEPOCHI側 - 担当者個別ページ)
//
// ---------------------------------------------------------------
// 【このファイルの前提・要確認ポイント】
// 1. 担当者の識別は URL の ?staff=名前 パラメータで行う想定
//    （例: tikepochi-eta.vercel.app/staff?staff=山田太郎）
// 2. どの予約が「自分の担当分」かは reservations.memo 内の
//    「【扱い】: 名前」という文字列を解析して判定している
//    （CustomerReservationForm.jsx の保存ロジックと対応）
// 3. 「全体タブ」を見られるかどうかは cast_staff テーブルの
//    ticket_visibility カラム（'assigned_only' | 'all_stages'）
//    を見て判定する想定。実際のカラム名が違う場合は要修正
// 4. お礼メッセージは thank_you_messages テーブルに送信ログとして
//    insert するところまでを実装。実際のメール／LINE送信は
//    Supabase Edge Function等のバックエンド処理を別途接続する必要あり
// 5. 「自分の予約」タブには reservations.payment_method /
//    payment_status（CustomerReservationForm.jsx で保存）を見て
//    決済方法・支払い状況バッジを表示している。全体タブには表示しない
// ---------------------------------------------------------------

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Calendar, MapPin, Ticket, Mail, Phone, Edit3, Send,
  Users, TicketCheck, CheckSquare, Square, X, ChevronDown,
  CreditCard, Building2, Banknote
} from 'lucide-react';

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
    style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', borderRadius, flexShrink: 0, ...style }}
  />
);

const StickerBadge = ({ children, bg, color = '#fff', rotate = -3 }) => (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 900,
      color, backgroundColor: bg, padding: '4px 10px', borderRadius: '999px',
      transform: `rotate(${rotate}deg)`, boxShadow: '0 2px 0 rgba(0,0,0,0.12)', border: '2px solid rgba(255,255,255,0.6)',
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
      position: fixed; bottom: -14px; right: -10px; width: 84px; height: auto;
      opacity: 0.9; pointer-events: none; z-index: 0;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.12));
    }
    .pouchi-font { font-family: 'Zen Maru Gothic', 'Zen Kaku Gothic New', sans-serif; }
    .btn-bounce:active { transform: scale(0.96); }
    .btn-pouchi-primary {
      background: linear-gradient(180deg, #ffc94d, #ffb300);
      color: ${COLORS.pouchiDark};
      border: 2px solid #e8940a;
      box-shadow: 0 4px 0 #d9820a;
    }
    .btn-pouchi-primary:active { box-shadow: 0 1px 0 #d9820a; transform: translateY(3px); }
    .btn-pouchi-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-pouchi-blue {
      background: linear-gradient(180deg, #5b8bfa, #2f6fed);
      color: #fff;
      border: 2px solid #1e4fc4;
      box-shadow: 0 3px 0 #1e4fc4;
    }
    .btn-pouchi-blue:active { box-shadow: 0 1px 0 #1e4fc4; transform: translateY(2px); }
    .stage-filter-btn {
      padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 800;
      cursor: pointer; white-space: nowrap; transition: all 0.15s ease;
    }
    @keyframes pouchi-pop {
      0% { transform: scale(0.6); opacity: 0; }
      60% { transform: scale(1.08); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .pouchi-pop { animation: pouchi-pop 0.35s ease-out; }
  `}</style>
);

// memoから「【扱い】: 名前」を抜き出す
function parseAssignedStaff(memo) {
  if (!memo) return '';
  const match = memo.match(/【扱い】[:：]\s*([^\n]+)/);
  return match ? match[1].trim() : '';
}

// memoから「【かな】」「【選択オプション】」などの管理用タグを取り除いた、お客様向けの備考だけを抜き出す
function parseVisibleMemo(memo) {
  if (!memo) return '';
  return memo
    .replace(/【扱い】[:：][^\n]*\n?/g, '')
    .replace(/【かな】[:：][^\n]*\n?/g, '')
    .replace(/【選択オプション】[:：][^\n]*\n?/g, '')
    .replace(/【両公演セット予約】\n?/g, '')
    .trim();
}

// 決済方法・支払い状況の表示情報を組み立てる
// reservations.payment_method: 'STRIPE_CARD' | 'BANK_TRANSFER' | 'CASH'
// reservations.payment_status: 'UNPAID' | 'PENDING' | 'PAID'
function getPaymentInfo(r) {
  const method = r.payment_method || 'CASH';
  const status = r.payment_status || 'PENDING';

  const methodMap = {
    STRIPE_CARD: { icon: CreditCard, label: 'カード決済' },
    BANK_TRANSFER: { icon: Building2, label: '銀行振込' },
    CASH: { icon: Banknote, label: '当日現金' },
  };

  const statusMap = {
    PAID: { label: '支払い済み', color: '#1f9a56', bg: '#e7f7ee' },
    UNPAID: { label: '未決済', color: '#e85a45', bg: '#fdecea' },
    PENDING: { label: method === 'CASH' ? '当日精算予定' : '入金待ち', color: '#f59e0b', bg: '#fff3d1' },
  };

  const m = methodMap[method] || methodMap.CASH;
  const s = statusMap[status] || statusMap.PENDING;
  return { Icon: m.icon, methodLabel: m.label, statusLabel: s.label, statusColor: s.color, statusBg: s.bg };
}

export default function StaffReservationsPage() {
  const [staffName, setStaffName] = useState('');
  const [canViewAll, setCanViewAll] = useState(false);

  const [productions, setProductions] = useState([]);
  const [stagesMap, setStagesMap] = useState({});
  const [ticketTypesMap, setTicketTypesMap] = useState({});
  const [reservations, setReservations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'all'
  const [stageFilter, setStageFilter] = useState('all');

  const [editTarget, setEditTarget] = useState(null);
  const [editCount, setEditCount] = useState(1);
  const [editStageId, setEditStageId] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [messageTarget, setMessageTarget] = useState(null); // 単体 or 'bulk'
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const staff = urlParams.get('staff') || '';
    setStaffName(staff);
    if (staff) loadData(staff);
    else setLoading(false);
  }, []);

  const loadData = async (staff) => {
    setLoading(true);
    try {
      // 1. 自分のcast_staffレコードから閲覧権限を取得
      const { data: staffRow } = await supabase
        .from('cast_staff')
        .select('*')
        .eq('name', staff)
        .maybeSingle();
      setCanViewAll(staffRow?.ticket_visibility === 'all_stages');

      const orgId = staffRow?.organization_id;

      // 2. 同じ劇団の全公演・ステージ・券種を取得
      let prodQuery = supabase.from('productions').select('*').order('created_at', { ascending: true });
      if (orgId) prodQuery = prodQuery.eq('organization_id', orgId);
      const { data: prodList } = await prodQuery;
      const sortedProds = (prodList || []).sort((a, b) => {
        if (a.title?.includes('あなたとコンビ')) return -1;
        if (b.title?.includes('あなたとコンビ')) return 1;
        return 0;
      });
      setProductions(sortedProds);

      const prodIds = sortedProds.map(p => p.id);
      const [{ data: stageData }, { data: ticketData }, { data: resData }] = await Promise.all([
        supabase.from('stages').select('*').in('production_id', prodIds).order('start_time', { ascending: true }),
        supabase.from('ticket_types').select('*').in('production_id', prodIds),
        supabase.from('reservations').select('*').in('production_id', prodIds).order('created_at', { ascending: false }),
      ]);

      const sMap = {};
      sortedProds.forEach(p => {
        sMap[p.id] = (stageData || [])
          .filter(s => s.production_id === p.id)
          .sort((a, b) => {
            const dA = a.performance_date || a.stage_date || '';
            const dB = b.performance_date || b.stage_date || '';
            return dA.localeCompare(dB) || (a.start_time || '').localeCompare(b.start_time || '');
          });
      });
      setStagesMap(sMap);

      const tMap = {};
      sortedProds.forEach(p => {
        tMap[p.id] = (ticketData || []).filter(t => t.production_id === p.id);
      });
      setTicketTypesMap(tMap);

      setReservations(resData || []);
    } catch (e) {
      console.error('StaffReservationsPage load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // 自分の担当分だけ抽出
  const myReservations = useMemo(() => {
    if (!staffName) return [];
    return reservations.filter(r => parseAssignedStaff(r.memo).trim() === staffName.trim());
  }, [reservations, staffName]);

  // 全体タブ用（回フィルタ適用）
  const allFiltered = useMemo(() => {
    if (stageFilter === 'all') return reservations;
    return reservations.filter(r => r.stage_id === stageFilter);
  }, [reservations, stageFilter]);

  // ステージ一覧（フィルタボタン用に全公演分をフラット化）
  const allStagesFlat = useMemo(() => {
    const flat = [];
    productions.forEach(p => {
      (stagesMap[p.id] || []).forEach(s => {
        flat.push({ ...s, productionTitle: p.title, isA: p.title?.includes('あなたとコンビ') });
      });
    });
    return flat;
  }, [productions, stagesMap]);

  const dashboardStats = useMemo(() => {
    const totalCount = myReservations.reduce((sum, r) => sum + (r.count || 0), 0);
    const totalPeople = myReservations.length;
    return { totalCount, totalPeople };
  }, [myReservations]);

  const getProdAndStage = (r) => {
    const prod = productions.find(p => p.id === r.production_id) || {};
    const stage = (stagesMap[prod.id] || []).find(s => s.id === r.stage_id) || {};
    const tk = (ticketTypesMap[prod.id] || []).find(t => t.id === r.ticket_type_id) || { name: '一般', price: 0 };
    return { prod, stage, tk };
  };

  const openEditModal = (r) => {
    setEditTarget(r);
    setEditCount(r.count || 1);
    setEditStageId(r.stage_id || '');
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ count: editCount, stage_id: editStageId })
        .eq('id', editTarget.id);
      if (error) throw error;
      setEditTarget(null);
      loadData(staffName);
    } catch (e) {
      alert('変更に失敗しました: ' + e.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const DEFAULT_TEMPLATE = (r) => {
    const { prod } = getProdAndStage(r);
    return `${r.customer_name}様\n\nこの度は『${prod.title || ''}』のご予約、誠にありがとうございました！\n当日、劇場にてお待ちしております🐾\n\n──office Knight`;
  };

  const openMessageModal = (target) => {
    setMessageTarget(target);
    setSendDone(false);
    if (target === 'bulk') {
      setMessageBody('皆様\n\nこの度はご予約いただき、誠にありがとうございました！\n当日、劇場にてお待ちしております🐾\n\n──office Knight');
    } else {
      setMessageBody(DEFAULT_TEMPLATE(target));
    }
  };

  const handleSendMessage = async () => {
    setIsSending(true);
    try {
      const targets = messageTarget === 'bulk'
        ? myReservations.filter(r => selectedIds.includes(r.id))
        : [messageTarget];

      const rows = targets.map(r => ({
        reservation_id: r.id,
        channel: r.line_user_id ? 'line' : 'email',
        body: messageBody,
        sent_by: staffName,
      }));

      // 送信ログをDBに記録
      // ※実際のメール／LINE送信処理はSupabase Edge Function等で
      //   このテーブルのinsertをトリガーに動かす想定（別途実装が必要）
      const { error } = await supabase.from('thank_you_messages').insert(rows);
      if (error) throw error;

      setSendDone(true);
      setSelectedIds([]);
      setTimeout(() => {
        setMessageTarget(null);
        setSendDone(false);
      }, 1800);
    } catch (e) {
      alert('送信ログの記録に失敗しました: ' + e.message);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="pouchi-page-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <PageChrome />
        <MascotSprite src={MASCOT.checking} size={80} />
        <div className="pouchi-font" style={{ fontWeight: 900, color: COLORS.pouchiDark }}>読み込み中...</div>
      </div>
    );
  }

  if (!staffName) {
    return (
      <div className="pouchi-page-bg" style={{ minHeight: '100vh', padding: '32px 16px', boxSizing: 'border-box' }}>
        <PageChrome />
        <div style={{ maxWidth: '440px', margin: '60px auto', backgroundColor: COLORS.surface, border: `2.5px solid ${COLORS.border}`, borderRadius: '24px', padding: '28px', textAlign: 'center' }}>
          <MascotSprite src={MASCOT.ticketWait} size={80} style={{ margin: '0 auto 12px auto', display: 'block' }} />
          <h2 className="pouchi-font" style={{ fontSize: '16px', fontWeight: 900, color: COLORS.pouchiDark }}>担当者URLが見つからないワン</h2>
          <p style={{ fontSize: '13px', color: COLORS.muted, marginTop: '8px' }}>個別に発行されたURLからアクセスしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pouchi-page-bg" style={{ minHeight: '100vh', color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '20px 14px 60px 14px', boxSizing: 'border-box', position: 'relative' }}>
      <PageChrome />
      <img src={MASCOT.bigdog} alt="" className="pouchi-corner-peek" />

      <div style={{ maxWidth: '620px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '20px', border: `2.5px solid ${COLORS.border}` }}>
          <MascotSprite src={MASCOT.iconApp} size={48} borderRadius="14px" />
          <div>
            <div className="pouchi-font" style={{ fontSize: '17px', fontWeight: 900, color: COLORS.yellowDeep }}>
              {staffName}さんの予約管理
            </div>
            <div style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 700 }}>チケット、ポチッとしよ！🐾</div>
          </div>
        </div>

        {/* タブ切り替え */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('mine')}
            className="btn-bounce"
            style={{
              flex: 1, padding: '10px', borderRadius: '999px', fontWeight: 900, fontSize: '13px', cursor: 'pointer',
              border: `2px solid ${activeTab === 'mine' ? COLORS.yellowDeep : COLORS.border}`,
              backgroundColor: activeTab === 'mine' ? COLORS.yellow : '#fff',
              color: activeTab === 'mine' ? COLORS.pouchiDark : COLORS.muted,
            }}
          >
            自分の予約
          </button>
          {canViewAll && (
            <button
              onClick={() => setActiveTab('all')}
              className="btn-bounce"
              style={{
                flex: 1, padding: '10px', borderRadius: '999px', fontWeight: 900, fontSize: '13px', cursor: 'pointer',
                border: `2px solid ${activeTab === 'all' ? COLORS.blue : COLORS.border}`,
                backgroundColor: activeTab === 'all' ? COLORS.blue : '#fff',
                color: activeTab === 'all' ? '#fff' : COLORS.muted,
              }}
            >
              全体
            </button>
          )}
        </div>

        {/* ============ 自分の予約タブ ============ */}
        {activeTab === 'mine' && (
          <>
            {/* ダッシュボード */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              <div style={{ backgroundColor: '#fff', border: `2.5px solid ${COLORS.border}`, borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 0 rgba(245,158,11,0.1)' }}>
                <MascotSprite src={MASCOT.pochitto} size={44} />
                <div>
                  <div style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 700 }}>担当枚数</div>
                  <div className="pouchi-font" style={{ fontSize: '24px', fontWeight: 900, color: COLORS.yellowDeep }}>{dashboardStats.totalCount}<span style={{ fontSize: '12px' }}>枚</span></div>
                </div>
              </div>
              <div style={{ backgroundColor: '#fff', border: `2.5px solid ${COLORS.border}`, borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 0 rgba(245,158,11,0.1)' }}>
                <Users size={38} color={COLORS.blue} />
                <div>
                  <div style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 700 }}>担当人数</div>
                  <div className="pouchi-font" style={{ fontSize: '24px', fontWeight: 900, color: COLORS.blue }}>{dashboardStats.totalPeople}<span style={{ fontSize: '12px' }}>人</span></div>
                </div>
              </div>
            </div>

            {myReservations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', backgroundColor: '#fff', borderRadius: '20px', border: `2.5px solid ${COLORS.border}` }}>
                <MascotSprite src={MASCOT.ticketWait} size={72} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div className="pouchi-font" style={{ fontWeight: 800, fontSize: '13px', color: COLORS.muted }}>まだ担当の予約はありませんワン</div>
              </div>
            ) : (
              <>
                {/* 一括送信バー */}
                {selectedIds.length > 0 && (
                  <div style={{ position: 'sticky', top: '10px', zIndex: 10, backgroundColor: COLORS.pouchiDark, color: '#fff', borderRadius: '999px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>{selectedIds.length}件選択中</span>
                    <button
                      onClick={() => openMessageModal('bulk')}
                      className="btn-bounce btn-pouchi-primary"
                      style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Send size={13} /> 一括でお礼を送る
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myReservations.map(r => {
                    const { prod, stage, tk } = getProdAndStage(r);
                    const isA = prod.title?.includes('あなたとコンビ');
                    const isSelected = selectedIds.includes(r.id);
                    const stages = stagesMap[prod.id] || [];

                    return (
                      <div key={r.id} style={{ backgroundColor: '#fff', border: `2px solid ${isSelected ? COLORS.yellowDeep : COLORS.border}`, borderRadius: '20px', padding: '16px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => toggleSelect(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isSelected ? COLORS.yellowDeep : COLORS.muted }}>
                              {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                            </button>
                            <StickerBadge bg={isA ? COLORS.yellowDeep : COLORS.blue} rotate={-3}>{isA ? 'A公演' : 'B公演'}</StickerBadge>
                          </div>
                          <button
                            onClick={() => openMessageModal(r)}
                            className="btn-bounce"
                            style={{ padding: '6px 12px', borderRadius: '999px', border: `2px solid ${COLORS.yellowDeep}`, backgroundColor: COLORS.surfaceAlt, color: COLORS.yellowDeep, fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Send size={12} /> お礼
                          </button>
                        </div>

                        <div className="pouchi-font" style={{ fontSize: '15px', fontWeight: 900, color: COLORS.pouchiDark, marginBottom: '8px' }}>
                          {r.customer_name} 様
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: COLORS.text, marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} color={COLORS.yellowDeep} />
                            {stage.performance_date || stage.stage_date} {stage.start_time?.slice(0, 5)}開演
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Ticket size={14} color={COLORS.yellowDeep} />
                            {tk.name} × {r.count}枚
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.muted }}>
                            <Mail size={14} /> {r.customer_email}
                          </div>
                          {r.customer_phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.muted }}>
                              <Phone size={14} /> {r.customer_phone}
                            </div>
                          )}
                          {(() => {
                            const { Icon: PayIcon, methodLabel, statusLabel, statusColor, statusBg } = getPaymentInfo(r);
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <PayIcon size={14} color={COLORS.muted} />
                                <span>{methodLabel}</span>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: statusColor, backgroundColor: statusBg, padding: '2px 8px', borderRadius: '999px' }}>
                                  {statusLabel}
                                </span>
                              </div>
                            );
                          })()}
                          {parseVisibleMemo(r.memo) && (
                            <div style={{ fontSize: '12px', color: COLORS.muted, backgroundColor: COLORS.surfaceAlt, padding: '6px 10px', borderRadius: '10px', marginTop: '2px' }}>
                              備考：{parseVisibleMemo(r.memo)}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => openEditModal(r)}
                          className="btn-bounce"
                          style={{ padding: '8px 14px', borderRadius: '999px', border: `2px solid ${COLORS.border}`, backgroundColor: '#fff', color: COLORS.text, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit3 size={13} /> 枚数・回を変更
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ============ 全体タブ ============ */}
        {activeTab === 'all' && canViewAll && (
          <>
            {/* 回フィルタ（ボタン形式） */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
              <button
                onClick={() => setStageFilter('all')}
                className="stage-filter-btn"
                style={{
                  border: `2px solid ${stageFilter === 'all' ? COLORS.blue : COLORS.border}`,
                  backgroundColor: stageFilter === 'all' ? COLORS.blue : '#fff',
                  color: stageFilter === 'all' ? '#fff' : COLORS.muted,
                }}
              >
                すべて
              </button>
              {allStagesFlat.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStageFilter(s.id)}
                  className="stage-filter-btn"
                  style={{
                    border: `2px solid ${stageFilter === s.id ? COLORS.blue : COLORS.border}`,
                    backgroundColor: stageFilter === s.id ? COLORS.blue : '#fff',
                    color: stageFilter === s.id ? '#fff' : COLORS.muted,
                  }}
                >
                  {s.isA ? 'A' : 'B'}｜{s.performance_date || s.stage_date} {s.start_time?.slice(0, 5)}
                </button>
              ))}
            </div>

            {allFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', backgroundColor: '#fff', borderRadius: '20px', border: `2.5px solid ${COLORS.border}` }}>
                <MascotSprite src={MASCOT.ticketWait} size={64} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div className="pouchi-font" style={{ fontWeight: 800, fontSize: '13px', color: COLORS.muted }}>該当する予約はまだありませんワン</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allFiltered.map(r => {
                  const { prod, stage, tk } = getProdAndStage(r);
                  const isA = prod.title?.includes('あなたとコンビ');
                  return (
                    <div key={r.id} style={{ backgroundColor: '#fff', border: `1.5px solid ${COLORS.border}`, borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <StickerBadge bg={isA ? COLORS.yellowDeep : COLORS.blue} rotate={-2}>{isA ? 'A' : 'B'}</StickerBadge>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.pouchiDark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.customer_name} 様
                          </div>
                          <div style={{ fontSize: '11px', color: COLORS.muted }}>
                            {stage.performance_date || stage.stage_date} {stage.start_time?.slice(0, 5)} ／ {tk.name} × {r.count}枚
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 🛠️ 枚数・回 変更モーダル */}
      {editTarget && (() => {
        const { prod } = getProdAndStage(editTarget);
        const stages = stagesMap[prod.id] || [];
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#fff', borderRadius: '24px', padding: '22px', border: `2.5px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 className="pouchi-font" style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: COLORS.pouchiDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MascotSprite src={MASCOT.naruhodo} size={28} /> 枚数・回の変更
                </h3>
                <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: COLORS.yellowDeep, display: 'block', marginBottom: '4px' }}>観劇日時</label>
                  <select value={editStageId} onChange={(e) => setEditStageId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `2px solid ${COLORS.border}`, fontSize: '14px' }}>
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.performance_date || s.stage_date} {s.start_time?.slice(0, 5)}開演</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: COLORS.yellowDeep, display: 'block', marginBottom: '4px' }}>枚数</label>
                  <select value={editCount} onChange={(e) => setEditCount(parseInt(e.target.value, 10))} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `2px solid ${COLORS.border}`, fontSize: '14px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}枚</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button onClick={() => setEditTarget(null)} style={{ flex: 1, padding: '12px', borderRadius: '999px', border: `2px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontWeight: 800 }}>もどる</button>
                  <button onClick={handleSaveEdit} className="btn-bounce btn-pouchi-primary" style={{ flex: 2, padding: '12px', borderRadius: '999px', fontWeight: 900, cursor: 'pointer' }}>保存する</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 💌 お礼メッセージモーダル */}
      {messageTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fff', borderRadius: '24px', padding: '22px', border: `2.5px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 className="pouchi-font" style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: COLORS.pouchiDark }}>
                お礼メッセージ 💌
              </h3>
              <button onClick={() => setMessageTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}><X size={20} /></button>
            </div>

            {sendDone ? (
              <div className="pouchi-pop" style={{ textAlign: 'center', padding: '16px 0' }}>
                <MascotSprite src={MASCOT.waai} size={72} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div className="pouchi-font" style={{ fontWeight: 900, fontSize: '15px', color: COLORS.success }}>送信予約が完了しましたワン！</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginBottom: '8px' }}>
                  {messageTarget === 'bulk'
                    ? `選択中の${selectedIds.length}名に送信します（各自の連絡方法：メールまたはLINE）`
                    : `${messageTarget.customer_name}様に送信します（連絡方法：${messageTarget.line_user_id ? 'LINE' : 'メール'}）`}
                </div>
                <textarea
                  rows={7}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '14px', border: `2px solid ${COLORS.border}`, boxSizing: 'border-box', fontSize: '13px', lineHeight: '1.6', resize: 'vertical' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending}
                  className="btn-bounce btn-pouchi-primary"
                  style={{ width: '100%', padding: '14px', borderRadius: '999px', fontWeight: 900, cursor: isSending ? 'not-allowed' : 'pointer', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }}
                >
                  <Send size={15} /> {isSending ? '送信中...' : '送信する'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}