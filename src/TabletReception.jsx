import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Search, Check, Users, RefreshCw, X, Eye } from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

const KANA_GRID = [
  ['ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'],
  ['イ', 'キ', 'シ', 'チ', 'ニ', 'ヒ', 'ミ', '', 'リ', ''],
  ['ウ', 'ク', 'ス', 'ツ', 'ヌ', 'フ', 'ム', 'ユ', 'ル', 'ン'],
  ['エ', 'ケ', 'セ', 'テ', 'ネ', 'ヘ', 'メ', '', 'レ', ''],
  ['オ', 'コ', 'ソ', 'ト', 'ノ', 'ホ', 'モ', 'ヨ', 'ロ', '']
];

export default function TabletReception({ productionId, onBackToAdmin, onBack }) {
  const [stages, setStages] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKana, setSelectedKana] = useState('');
  const [detailItem, setDetailItem] = useState(null);

  const handleBack = onBackToAdmin || onBack || (() => window.history.back());

  const fetchData = async () => {
    setLoading(true);
    if (!productionId) {
      setLoading(false);
      return;
    }

    try {
      // 1. ステージ取得
      const { data: stagesData } = await supabase
        .from('stages')
        .select('*')
        .eq('production_id', productionId)
        .order('performance_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (stagesData && stagesData.length > 0) {
        setStages(stagesData);
        if (!selectedStageId) {
          setSelectedStageId(stagesData[0].id);
        }
      }

      // 2. 券種取得
      const { data: ticketsData } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('production_id', productionId);
      if (ticketsData) setTicketTypes(ticketsData);

      // 3. 予約名簿取得
      const { data: resData } = await supabase
        .from('reservations')
        .select('*')
        .eq('production_id', productionId)
        .order('customer_name', { ascending: true });

      if (resData) setReservations(resData);
    } catch (err) {
      console.warn('Data fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productionId]);

  const handleToggleCheckin = async (resItem) => {
    const nextStatus = !resItem.is_checked_in;
    setReservations(prev => prev.map(r => r.id === resItem.id ? { ...r, is_checked_in: nextStatus } : r));
    if (detailItem && detailItem.id === resItem.id) {
      setDetailItem({ ...detailItem, is_checked_in: nextStatus });
    }

    try {
      await supabase
        .from('reservations')
        .update({ is_checked_in: nextStatus })
        .eq('id', resItem.id);
    } catch (e) {
      alert('来場ステータスの更新に失敗しました');
    }
  };

  const getTicketInfo = (ticketId) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    return ticket || { name: '一般', price: 0 };
  };

  const currentStageReservations = reservations.filter(r => r.stage_id === selectedStageId);

  const filteredList = currentStageReservations.filter(r => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.customer_name?.toLowerCase().includes(q);
      const matchPhone = r.customer_phone?.includes(q);
      const matchStaff = r.staff_name?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchStaff) return false;
    }

    if (selectedKana) {
      const firstChar = r.customer_name?.charAt(0) || '';
      const kanaMap = {
        'ア': 'あいうえおアイウエオ',
        'カ': 'かきくけこがぎぐげごカキクケコガギグゲゴ',
        'サ': 'さしすせそざじずぜぞサシスセソザジズゼゾ',
        'タ': 'たちつてとだぢづでどタチツテトダヂヅデド',
        'ナ': 'なにぬねのナニヌネノ',
        'ハ': 'はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ',
        'マ': 'まみむめもマミムメモ',
        'ヤ': 'やゆよヤユヨ',
        'ラ': 'らりるれろラリルレロ',
        'ワ': 'わをんワヲン',
      };
      if (kanaMap[selectedKana] && !kanaMap[selectedKana].includes(firstChar)) {
        return false;
      }
    }

    return true;
  });

  const checkedCount = currentStageReservations.filter(r => r.is_checked_in).reduce((sum, r) => sum + (r.count || 1), 0);
  const totalStageReserved = currentStageReservations.reduce((sum, r) => sum + (r.count || 1), 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '16px', boxSizing: 'border-box' }}>
      <style>{`
        .kana-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 4px;
        }
        @media (max-width: 480px) {
          .kana-grid {
            gap: 2px;
          }
          .kana-btn {
            padding: 8px 0 !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* 上部ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={handleBack}
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '15px', cursor: 'pointer', padding: '6px 8px 6px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={18} /> ホームへ戻る
          </button>
          <button onClick={fetchData} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <RefreshCw size={14} /> 最新に更新
          </button>
        </div>

        {/* ステージ選択セレクター */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
          {stages.length === 0 ? (
            <div style={{ fontSize: '13px', color: COLORS.muted, padding: '8px 0' }}>ステージが登録されていません</div>
          ) : (
            stages.map(s => {
              const isSel = s.id === selectedStageId;
              const dateStr = s.performance_date ? `${new Date(s.performance_date).getMonth() + 1}/${new Date(s.performance_date).getDate()}` : '';
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStageId(s.id); setSelectedKana(''); }}
                  style={{
                    minWidth: '120px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: `2px solid ${isSel ? COLORS.gold : COLORS.border}`,
                    backgroundColor: isSel ? '#fff6e8' : COLORS.surface,
                    color: COLORS.text,
                    fontWeight: isSel ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'center',
                    flex: '0 0 auto'
                  }}
                >
                  <div style={{ fontSize: '14px' }}>{dateStr} {s.start_time?.slice(0, 5)}開演</div>
                  {s.team_name && <div style={{ fontSize: '11px', color: COLORS.gold }}>{s.team_name}</div>}
                </button>
              );
            })
          )}
        </div>

        {/* 検索バー */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color={COLORS.muted} style={{ position: 'absolute', left: '12px', top: '14px' }} />
            <input
              type="text"
              placeholder="お名前・電話番号・扱いで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ padding: '0 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, cursor: 'pointer' }}>
              クリア
            </button>
          )}
        </div>

        {/* 50音キーボード（タブレット最適化・スマホ自動調整） */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: '14px', border: `1px solid ${COLORS.border}`, padding: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>頭文字で探す</span>
            {selectedKana && (
              <button onClick={() => setSelectedKana('')} style={{ fontSize: '11px', color: COLORS.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                絞り込み解除（全員表示）
              </button>
            )}
          </div>
          <div className="kana-grid">
            {KANA_GRID.map((row, rIdx) => (
              <React.Fragment key={rIdx}>
                {row.map((char, cIdx) => (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    disabled={!char}
                    onClick={() => setSelectedKana(selectedKana === char ? '' : char)}
                    className="kana-btn"
                    style={{
                      padding: '10px 0',
                      borderRadius: '8px',
                      border: char ? `1px solid ${selectedKana === char ? COLORS.gold : COLORS.border}` : 'none',
                      backgroundColor: selectedKana === char ? COLORS.gold : char ? COLORS.surfaceAlt : 'transparent',
                      color: selectedKana === char ? '#fff' : COLORS.text,
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: char ? 'pointer' : 'default',
                    }}
                  >
                    {char}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 来場状況バー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>
            予約一覧 ({filteredList.length}件)
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.gold }}>
            来場: {checkedCount} / {totalStageReserved}人
          </div>
        </div>

        {/* 予約リスト */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.muted }}>データを読み込み中...</div>
        ) : filteredList.length === 0 ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
            <Users size={32} color={COLORS.gold} style={{ marginBottom: '8px' }} />
            <h3 style={{ margin: '0 0 4px 0', color: COLORS.gold }}>該当する予約はありません</h3>
            <p style={{ fontSize: '12px', color: COLORS.muted }}>新しい予約が入るとここに表示されます。</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredList.map(res => {
              const tk = getTicketInfo(res.ticket_type_id);
              const count = res.count || 1;
              const subtotal = (tk.price * count) + (res.donation_amount || 0);

              return (
                <div
                  key={res.id}
                  style={{
                    backgroundColor: res.is_checked_in ? '#f0fdf4' : COLORS.surface,
                    border: `1.5px solid ${res.is_checked_in ? '#86efac' : COLORS.border}`,
                    borderRadius: '14px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(43, 36, 56, 0.04)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 800, fontSize: '16px' }}>{res.customer_name} 様</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, backgroundColor: COLORS.surfaceAlt, padding: '1px 6px', borderRadius: '4px' }}>
                        {count}枚
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 700 }}>
                        {res.staff_name ? `扱い: ${res.staff_name}` : '劇団扱い'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: COLORS.muted }}>
                      {tk.name} · ¥{subtotal.toLocaleString()}
                    </div>
                    {res.memo && (
                      <div style={{ fontSize: '11px', color: '#e85a45', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📝 {res.memo}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setDetailItem(res)}
                      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '8px', cursor: 'pointer', color: COLORS.muted }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleCheckin(res)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: res.is_checked_in ? '#10b981' : COLORS.gold,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {res.is_checked_in ? <><Check size={16} /> 来場済</> : '受付する'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 詳細モーダル */}
      {detailItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: COLORS.surface, borderRadius: '18px', padding: '24px', border: `1px solid ${COLORS.border}`, position: 'relative' }}>
            <button onClick={() => setDetailItem(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontFamily: "'Shippori Mincho', serif" }}>予約詳細</h3>

            <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', lineHeight: '1.6' }}>
              <div><strong>お客様名:</strong> {detailItem.customer_name} 様</div>
              <div><strong>電話番号:</strong> {detailItem.customer_phone || '未登録'}</div>
              <div><strong>メール:</strong> {detailItem.customer_email || '未登録'}</div>
              <div><strong>券種・枚数:</strong> {getTicketInfo(detailItem.ticket_type_id).name} × {detailItem.count}枚</div>
              <div><strong>合計予定額:</strong> ¥{((getTicketInfo(detailItem.ticket_type_id).price * detailItem.count) + (detailItem.donation_amount || 0)).toLocaleString()}</div>
              <div><strong>担当扱い:</strong> {detailItem.staff_name || '劇団扱い'}</div>
              {detailItem.memo && <div><strong>備考・オプション:</strong> {detailItem.memo}</div>}
            </div>

            <button
              onClick={() => handleToggleCheckin(detailItem)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: detailItem.is_checked_in ? '#e85a45' : '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}
            >
              {detailItem.is_checked_in ? '来場を取り消す' : '来場済みにする'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}