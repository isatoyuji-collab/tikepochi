// src/AdminReservations.jsx (TIKEPOCHI側)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ArrowLeft, Tablet, Printer, Search, Check, Users, RefreshCw, 
  Phone, Mail, FileText, Calendar, DollarSign, UserCheck, Armchair
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
  const [loading, setLoading] = useState(true);

  // フィルター用
  const [selectedStageId, setSelectedStageId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCast, setSelectedCast] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState('all');
  const [selectedCheckin, setSelectedCheckin] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    if (!productionId) {
      setLoading(false);
      return;
    }

    try {
      // 1. 日程・ステージ取得
      const { data: stagesData } = await supabase
        .from('stages')
        .select('*')
        .eq('production_id', productionId)
        .order('stage_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (stagesData) setStages(stagesData);

      // 2. キャスト一覧取得
      const { data: castsData } = await supabase
        .from('cast_staff')
        .select('*')
        .eq('production_id', productionId);
      if (castsData) setCasts(castsData);

      // 3. 券種一覧取得
      const { data: ticketsData } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('production_id', productionId);
      if (ticketsData) setTicketTypes(ticketsData);

      // 4. 予約一覧取得
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
        console.error('Reservation query error, falling back to simple select:', resError);
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

  // 来場トグル
  const handleToggleCheckin = async (resItem) => {
    const nextStatus = !resItem.checked_in;
    await supabase.from('reservations').update({ checked_in: nextStatus }).eq('id', resItem.id);
    setReservations(reservations.map(r => r.id === resItem.id ? { ...r, checked_in: nextStatus } : r));
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
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '16px 12px 60px 12px', boxSizing: 'border-box' }}>
      <style>{`
        /* レスポンシブ切り替えスタイル */
        .desktop-table { display: block; }
        .mobile-cards { display: none; }

        @media (max-width: 768px) {
          .desktop-table { display: none; }
          .mobile-cards { display: flex; flex-direction: column; gap: 12px; }
          .filter-grid { grid-template-columns: 1fr 1fr !important; }
          .search-box { grid-column: 1 / -1; }
        }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '13px', cursor: 'pointer', padding: '4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={16} /> ホームへ戻る
            </button>
            <button onClick={fetchData} style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', color: COLORS.text, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={13} /> 再読込
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={onOpenTablet} style={{ flex: 1, minWidth: '160px', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid ${COLORS.gold}`, backgroundColor: '#fff', color: COLORS.gold, fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Tablet size={16} /> 当日受付タブレット
            </button>
            <button onClick={() => window.print()} style={{ padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', color: COLORS.text, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Printer size={15} /> 印刷
            </button>
          </div>
        </div>

        {/* 総動員数サマリー */}
        <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            総動員数 <span style={{ color: COLORS.gold, fontSize: '24px', fontWeight: 900 }}>{totalReserved}</span> / {totalSeats}人
          </div>
          <div style={{ fontSize: '12px', color: COLORS.muted, fontWeight: 'normal' }}>
            表示中: {filteredReservations.length}件
          </div>
        </div>

        {/* 日程カード一覧（横スクロール） */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', WebkitOverflowScrolling: 'touch' }}>
          <div
            onClick={() => setSelectedStageId('all')}
            style={{ flexShrink: 0, minWidth: '100px', padding: '10px 12px', borderRadius: '12px', backgroundColor: selectedStageId === 'all' ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${selectedStageId === 'all' ? COLORS.gold : COLORS.border}`, cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '2px' }}>全日程</div>
            <div style={{ fontSize: '11px', color: COLORS.muted }}>{totalReserved} / {totalSeats}</div>
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
                style={{ flexShrink: 0, minWidth: '105px', padding: '10px 12px', borderRadius: '12px', backgroundColor: isSelected ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${isSelected ? COLORS.gold : COLORS.border}`, cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '2px' }}>
                  {sDate ? `${new Date(sDate).getMonth() + 1}/${new Date(sDate).getDate()}` : ''} {stage.start_time?.slice(0, 5)}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>
                  {stageReserved} / {stage.capacity || 80}
                </div>
              </div>
            );
          })}
        </div>

        {/* フィルターバー */}
        <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          <div className="search-box" style={{ position: 'relative' }}>
            <Search size={15} color={COLORS.muted} style={{ position: 'absolute', left: '10px', top: '12px' }} />
            <input
              type="text"
              placeholder="名前・連絡先・メモで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 32px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <select value={selectedCast} onChange={(e) => setSelectedCast(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '13px' }}>
            <option value="all">担当（全員）</option>
            {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={selectedTicket} onChange={(e) => setSelectedTicket(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '13px' }}>
            <option value="all">券種（全て）</option>
            {ticketTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select value={selectedCheckin} onChange={(e) => setSelectedCheckin(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '13px' }}>
            <option value="all">来場（全て）</option>
            <option value="checked">来場済み</option>
            <option value="unchecked">未チェック</option>
          </select>
        </div>

        {/* 📱 スマホ用カード一覧レイアウト */}
        <div className="mobile-cards">
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: COLORS.muted }}>データを読み込み中...</div>
          ) : filteredReservations.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: COLORS.muted, backgroundColor: COLORS.surface, borderRadius: '16px' }}>
              予約データが見つかりません
            </div>
          ) : (
            filteredReservations.map(res => {
              const displayName = getCustomerDisplayName(res);
              const phone = res.customer_phone || res.phone || '';
              const email = res.customer_email || res.email || '';
              const ticketName = res.ticket_types?.name || res.ticket_name || res.ticket_type || '一般';
              const ticketCount = res.count || res.ticket_count || 1;
              const castName = extractCastInfo(res);
              const isPaid = res.payment_status === 'PAID' || res.payment_status === 'paid' || res.is_paid === true;
              const seatInfo = extractSeatInfo(res.memo);
              const sDate = res.stages?.performance_date || res.stages?.stage_date;

              return (
                <div key={res.id} style={{ backgroundColor: COLORS.surface, borderRadius: '16px', padding: '14px 16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.text }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>
                        #{res.id.slice(0, 6)}
                      </div>
                    </div>

                    {/* 来場ボタントグル */}
                    <button
                      onClick={() => handleToggleCheckin(res)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: `1.5px solid ${res.checked_in ? COLORS.success : COLORS.border}`,
                        backgroundColor: res.checked_in ? '#ecfdf5' : '#fff',
                        color: res.checked_in ? COLORS.success : COLORS.muted,
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={14} /> {res.checked_in ? '来場済' : '未来場'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', backgroundColor: COLORS.surfaceAlt, padding: '10px 12px', borderRadius: '12px', marginBottom: '8px' }}>
                    <div>
                      <span style={{ color: COLORS.muted, fontSize: '11px' }}>公演日時:</span><br />
                      <strong>{sDate ? `${new Date(sDate).getMonth() + 1}/${new Date(sDate).getDate()} ${res.stages?.start_time?.slice(0, 5)}` : '-'}</strong>
                    </div>
                    <div>
                      <span style={{ color: COLORS.muted, fontSize: '11px' }}>券種・枚数:</span><br />
                      <strong>{ticketName} × {ticketCount}枚</strong>
                    </div>
                    <div>
                      <span style={{ color: COLORS.muted, fontSize: '11px' }}>扱い:</span><br />
                      <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: castName === '劇団扱い' ? '#e2e8f0' : '#e0e7ff', color: castName === '劇団扱い' ? '#334155' : '#3730a3', fontWeight: 700, fontSize: '11px' }}>
                        {castName}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: COLORS.muted, fontSize: '11px' }}>精算状況:</span><br />
                      <span style={{ color: isPaid ? COLORS.success : COLORS.danger, fontWeight: 800 }}>
                        {isPaid ? 'クレジット決済済' : res.payment_method === 'BANK_TRANSFER' ? '振込未確認' : '当日精算'}
                      </span>
                    </div>
                  </div>

                  {seatInfo && (
                    <div style={{ fontSize: '12px', color: COLORS.gold, fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Armchair size={13} /> 指定座席: {seatInfo}
                    </div>
                  )}

                  {(phone || email) && (
                    <div style={{ fontSize: '11px', color: COLORS.muted, display: 'flex', flexDirection: 'column', gap: '2px', borderTop: `1px dashed ${COLORS.border}`, paddingTop: '6px', marginTop: '6px' }}>
                      {phone && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={11} /> {phone}</div>}
                      {email && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={11} /> {email}</div>}
                    </div>
                  )}

                  {res.memo && (
                    <div style={{ fontSize: '11px', color: COLORS.text, backgroundColor: '#fff', border: `1px solid ${COLORS.border}`, padding: '6px 8px', borderRadius: '8px', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                      📝 {res.memo}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 💻 PC用一覧テーブル */}
        <div className="desktop-table" style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 2px 4px rgba(43, 36, 56, 0.04)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: COLORS.muted }}>データを読み込み中...</div>
          ) : filteredReservations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.muted }}>
              <Users size={32} color={COLORS.gold} style={{ marginBottom: '8px' }} />
              <div>予約データはまだありません（計 {reservations.length} 件）</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#fcf9f2', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.muted }}>
                  <th style={{ padding: '12px 16px' }}>お客様名</th>
                  <th style={{ padding: '12px 16px' }}>連絡先</th>
                  <th style={{ padding: '12px 16px' }}>券種・枚数</th>
                  <th style={{ padding: '12px 16px' }}>担当</th>
                  <th style={{ padding: '12px 16px' }}>精算</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>来場</th>
                  <th style={{ padding: '12px 16px' }}>回</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map(res => {
                  const displayName = getCustomerDisplayName(res);
                  const phone = res.customer_phone || res.phone || '';
                  const email = res.customer_email || res.email || '';
                  const ticketName = res.ticket_types?.name || res.ticket_name || res.ticket_type || '一般';
                  const ticketCount = res.count || res.ticket_count || 1;
                  const castName = extractCastInfo(res);
                  const isPaid = res.payment_status === 'PAID' || res.payment_status === 'paid' || res.is_paid === true;
                  const price = res.total_price || res.price || 0;
                  const sDate = res.stages?.performance_date || res.stages?.stage_date;

                  return (
                    <tr key={res.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                        {displayName}
                        {res.memo && <div style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 'normal', marginTop: '2px', whiteSpace: 'pre-wrap' }}>📝 {res.memo}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', color: COLORS.muted, fontSize: '12px' }}>
                        {phone && <div>{phone}</div>}
                        {email && <div>{email}</div>}
                        {!phone && !email && <div>-</div>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {ticketName} × {ticketCount}枚
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: castName === '劇団扱い' ? '#f1f5f9' : '#eef2ff', color: castName === '劇団扱い' ? '#475569' : '#4f46e5', fontWeight: 700, fontSize: '11px' }}>
                          {castName}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ color: isPaid ? COLORS.success : COLORS.danger, fontWeight: 700 }}>
                          {isPaid ? 'クレジット決済済' : res.payment_method === 'BANK_TRANSFER' ? '振込未確認' : `当日精算 ¥${Number(price).toLocaleString()}`}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleCheckin(res)}
                          style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${res.checked_in ? COLORS.success : COLORS.border}`, backgroundColor: res.checked_in ? COLORS.success : '#fff', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {res.checked_in && <Check size={16} />}
                        </button>
                      </td>
                      <td style={{ padding: '14px 16px', color: COLORS.muted, fontSize: '12px' }}>
                        {sDate ? `${new Date(sDate).getMonth() + 1}/${new Date(sDate).getDate()} ${res.stages?.start_time?.slice(0, 5)}` : (res.stage_name || '-')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}