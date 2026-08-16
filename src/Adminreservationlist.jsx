import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Tablet, Printer, Search, Check, Users } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
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
    const { data: resData } = await supabase
      .from('reservations')
      .select(`
        *,
        stages (stage_date, start_time, team_name),
        ticket_types (name, price),
        cast_staff (name)
      `)
      .eq('production_id', productionId)
      .order('created_at', { ascending: false });

    if (resData) setReservations(resData);
    setLoading(false);
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

  // フィルター処理
  const filteredReservations = reservations.filter(r => {
    if (selectedStageId !== 'all' && r.stage_id !== selectedStageId) return false;
    if (selectedCast !== 'all' && r.cast_id !== selectedCast) return false;
    if (selectedTicket !== 'all' && r.ticket_type_id !== selectedTicket) return false;
    if (selectedCheckin === 'checked' && !r.checked_in) return false;
    if (selectedCheckin === 'unchecked' && r.checked_in) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.customer_name?.toLowerCase().includes(q);
      const emailMatch = r.customer_email?.toLowerCase().includes(q);
      const phoneMatch = r.customer_phone?.includes(q);
      if (!nameMatch && !emailMatch && !phoneMatch) return false;
    }
    return true;
  });

  const totalSeats = stages.reduce((sum, s) => sum + (s.capacity || 80), 0);
  const totalReserved = reservations.reduce((sum, r) => sum + (r.count || 1), 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onOpenTablet} style={{ padding: '8px 16px', borderRadius: '10px', border: `1px solid ${COLORS.gold}`, backgroundColor: '#fff', color: COLORS.gold, fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tablet size={16} /> 当日受付タブレットを開く
            </button>
            <button onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', color: COLORS.text, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> 印刷
            </button>
          </div>
        </div>

        {/* 総動員数サマリー */}
        <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          総動員数 <span style={{ color: COLORS.gold, fontSize: '24px' }}>{totalReserved}</span> / {totalSeats}人
        </div>

        {/* 日程カード一覧 */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
          <div
            onClick={() => setSelectedStageId('all')}
            style={{ minWidth: '120px', padding: '12px 16px', borderRadius: '12px', backgroundColor: selectedStageId === 'all' ? '#fff6e8' : COLORS.surface, border: `1px solid ${selectedStageId === 'all' ? COLORS.gold : COLORS.border}`, cursor: 'pointer' }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>全日程</div>
            <div style={{ fontSize: '12px', color: COLORS.muted }}>{totalReserved} / {totalSeats}</div>
          </div>

          {stages.map(stage => {
            const stageReserved = reservations.filter(r => r.stage_id === stage.id).reduce((sum, r) => sum + (r.count || 1), 0);
            const isSelected = selectedStageId === stage.id;
            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                style={{ minWidth: '120px', padding: '12px 16px', borderRadius: '12px', backgroundColor: isSelected ? '#fff6e8' : COLORS.surface, border: `1px solid ${isSelected ? COLORS.gold : COLORS.border}`, cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                  {stage.stage_date ? `${new Date(stage.stage_date).getMonth() + 1}/${new Date(stage.stage_date).getDate()}` : ''} {stage.start_time?.slice(0, 5)}
                </div>
                <div style={{ fontSize: '12px', color: COLORS.muted }}>
                  {stageReserved} / {stage.capacity || 80}
                </div>
              </div>
            );
          })}
        </div>

        {/* フィルターバー */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color={COLORS.muted} style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              placeholder="お名前・連絡先で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <select value={selectedCast} onChange={(e) => setSelectedCast(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '13px' }}>
            <option value="all">担当キャスト（全員）</option>
            {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={selectedTicket} onChange={(e) => setSelectedTicket(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '13px' }}>
            <option value="all">券種（全て）</option>
            {ticketTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select value={selectedCheckin} onChange={(e) => setSelectedCheckin(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '13px' }}>
            <option value="all">来場チェック（全て）</option>
            <option value="checked">来場済み</option>
            <option value="unchecked">未チェック</option>
          </select>
        </div>

        {/* 予約一覧テーブル */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 2px 4px rgba(43, 36, 56, 0.04)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: COLORS.muted }}>データを読み込み中...</div>
          ) : filteredReservations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.muted }}>
              <Users size={32} color={COLORS.gold} style={{ marginBottom: '8px' }} />
              <div>予約データはまだありません</div>
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
                {filteredReservations.map(res => (
                  <tr key={res.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>{res.customer_name}</td>
                    <td style={{ padding: '14px 16px', color: COLORS.muted, fontSize: '12px' }}>
                      {res.customer_phone}<br />{res.customer_email}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {res.ticket_types?.name || '一般'} × {res.count || 1}枚
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {res.cast_staff?.name ? (
                        <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 700, fontSize: '11px' }}>
                          {res.cast_staff.name}
                        </span>
                      ) : '劇団扱い'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ color: res.payment_status === 'paid' ? '#10b981' : '#e85a45', fontWeight: 700 }}>
                        {res.payment_status === 'paid' ? '精算済' : `未精算 ¥${Number(res.total_price || 0).toLocaleString()}`}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleCheckin(res)}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${res.checked_in ? '#10b981' : COLORS.border}`, backgroundColor: res.checked_in ? '#10b981' : '#fff', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {res.checked_in && <Check size={16} />}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', color: COLORS.muted, fontSize: '12px' }}>
                      {res.stages ? `${new Date(res.stages.stage_date).getMonth() + 1}/${new Date(res.stages.stage_date).getDate()} ${res.stages.start_time?.slice(0, 5)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}