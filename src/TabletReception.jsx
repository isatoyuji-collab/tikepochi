// src/TabletReception.jsx (TIKEPOCHI側)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ArrowLeft, Search, Check, Users, RefreshCw, X, Eye, 
  Gift, Armchair, HeartHandshake, UserCheck, AlertCircle 
} from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

const KANA_GRID = [
  ['ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'],
  ['イ', 'キ', 'シ', 'チ', 'ニ', 'ヒ', 'ミ', '', 'リ', ''],
  ['ウ', 'ク', 'ス', 'ツ', 'ヌ', 'フ', 'ム', 'ユ', 'ル', 'ン'],
  ['エ', 'ケ', 'セ', 'テ', 'ネ', 'ヘ', 'メ', '', 'レ', ''],
  ['オ', 'コ', 'ソ', 'ト', 'ノ', 'ホ', 'モ', 'ヨ', 'ロ', '']
];

const CHAR_MAP = {
  'ア': 'あア', 'イ': 'いイ', 'ウ': 'うゔウヴ', 'エ': 'えエ', 'オ': 'おオ',
  'カ': 'かカがガ', 'キ': 'きキぎギ', 'ク': 'くクぐグ', 'ケ': 'けケげゲ', 'コ': 'こコごゴ',
  'サ': 'さサざザ', 'シ': 'しシじジ', 'ス': 'すスずズ', 'セ': 'せセぜゼ', 'ソ': 'そソぞゾ',
  'タ': 'たタだダ', 'チ': 'ちチぢヂ', 'ツ': 'つツづヅ', 'テ': 'てテでデ', 'ト': 'とトどド',
  'ナ': 'なナ', 'ニ': 'にニ', 'ヌ': 'ぬヌ', 'ネ': 'ねネ', 'ノ': 'のノ',
  'ハ': 'はハばバぱパ', 'ヒ': 'ひヒびビぴピ', 'フ': 'ふフぶブぷプ', 'ヘ': 'へヘべベぺペ', 'ホ': 'ほホぼボぽポ',
  'マ': 'まマ', 'ミ': 'みミ', 'ム': 'むム', 'メ': 'めメ', 'モ': 'もモ',
  'ヤ': 'やヤ', 'ユ': 'ゆユ', 'ヨ': 'よヨ',
  'ラ': 'らラ', 'リ': 'りリ', 'ル': 'るル', 'レ': 'れレ', 'ロ': 'ろロ',
  'ワ': 'わワ', 'ン': 'んン'
};

export default function TabletReception({ productionId, onBackToAdmin, onBack }) {
  const [stages, setStages] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [castList, setCastList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKana, setSelectedKana] = useState('');
  
  // モーダル用ステート
  const [activeRes, setActiveRes] = useState(null);
  const [receivedCash, setReceivedCash] = useState('');
  const [giftTargetCast, setGiftTargetCast] = useState('');
  const [hasGift, setHasGift] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

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
        .order('start_time', { ascending: true });

      if (stagesData && stagesData.length > 0) {
        const sortedStages = stagesData.sort((a, b) => {
          const dateA = a.stage_date || a.performance_date || '';
          const dateB = b.stage_date || b.performance_date || '';
          return dateA.localeCompare(dateB) || (a.start_time || '').localeCompare(b.start_time || '');
        });
        setStages(sortedStages);
      }

      // 2. 券種取得
      const { data: ticketsData } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('production_id', productionId);
      if (ticketsData) setTicketTypes(ticketsData);

      // 3. キャスト一覧取得（差し入れプルダウン用）
      const { data: castsData } = await supabase
        .from('cast_staff')
        .select('*')
        .eq('production_id', productionId)
        .order('name', { ascending: true });
      if (castsData) setCastList(castsData);

      // 4. 予約名簿取得
      const stageIds = (stagesData || []).map(s => s.id);
      let query = supabase.from('reservations').select('*');

      if (stageIds.length > 0) {
        query = query.or(`production_id.eq.${productionId},stage_id.in.(${stageIds.join(',')})`);
      } else {
        query = query.eq('production_id', productionId);
      }

      const { data: resData, error: resError } = await query.order('created_at', { ascending: false });

      if (!resError && resData) {
        setReservations(resData);
      } else {
        const { data: fallback } = await supabase.from('reservations').select('*');
        if (fallback) setReservations(fallback);
      }
    } catch (err) {
      console.warn('Data fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productionId]);

  // 券種・価格計算
  const getTicketInfo = (ticketId) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    return ticket || { name: '一般', price: 0 };
  };

  const calculateTotal = (res) => {
    if (!res) return 0;
    if (res.total_price && res.total_price > 0) return res.total_price;
    const tk = getTicketInfo(res.ticket_type_id);
    const count = res.count || 1;
    return (tk.price * count) + (res.donation_amount || 0);
  };

  // ふりがな取得（安全抽出）
  const getKana = (res) => {
    if (!res) return '';
    if (res.customer_name_kana) return res.customer_name_kana;
    if (res.kana) return res.kana;
    if (res.memo?.includes('【かな】:')) {
      return res.memo.split('【かな】:')[1]?.split('\n')[0]?.trim() || '';
    }
    return '';
  };

  // モーダルを開く
  const handleOpenModal = (res) => {
    setActiveRes(res);
    setReceivedCash('');
    const currentStaff = res.staff_name || res.cast_name || (res.memo?.includes('【扱い】:') ? res.memo.split('【扱い】:')[1]?.split('\n')[0]?.trim() : '');
    const initialTarget = res.gift_target_cast || currentStaff || '劇団全体・カンパニー宛';
    setGiftTargetCast(initialTarget);
    setHasGift(Boolean(res.has_gift || res.gift_target_cast));
  };

  // 精算完了トグル
  const handleTogglePayment = async () => {
    if (!activeRes) return;
    setSavingAction(true);
    const currentPaid = activeRes.payment_status === 'paid' || activeRes.is_paid === true;
    const nextStatus = currentPaid ? 'unpaid' : 'paid';

    try {
      await supabase
        .from('reservations')
        .update({ payment_status: nextStatus, is_paid: !currentPaid })
        .eq('id', activeRes.id);

      const updated = { ...activeRes, payment_status: nextStatus, is_paid: !currentPaid };
      setActiveRes(updated);
      setReservations(prev => prev.map(r => r.id === activeRes.id ? updated : r));
    } catch (e) {
      alert('精算ステータスの更新に失敗しました: ' + e.message);
    } finally {
      setSavingAction(false);
    }
  };

  // チェックイン人数更新（分割チェックイン対応）
  const handleUpdateCheckinCount = async (newCount) => {
    if (!activeRes) return;
    const totalCount = activeRes.count || 1;
    const validCount = Math.max(0, Math.min(totalCount, newCount));
    const isAllChecked = validCount >= totalCount;

    setSavingAction(true);
    try {
      await supabase
        .from('reservations')
        .update({ 
          checked_in_count: validCount, 
          checked_in: isAllChecked, 
          is_checked_in: isAllChecked 
        })
        .eq('id', activeRes.id);

      const updated = { 
        ...activeRes, 
        checked_in_count: validCount, 
        checked_in: isAllChecked, 
        is_checked_in: isAllChecked 
      };
      setActiveRes(updated);
      setReservations(prev => prev.map(r => r.id === activeRes.id ? updated : r));
    } catch (e) {
      alert('来場人数の更新に失敗しました: ' + e.message);
    } finally {
      setSavingAction(false);
    }
  };

  // 🎁 差し入れの即時自動保存＆チェックイン後なら自動クローズ
  const handleAutoSaveGift = async (nextHasGift, nextTargetCast) => {
    if (!activeRes) return;
    setHasGift(nextHasGift);
    setGiftTargetCast(nextTargetCast);

    const count = activeRes.count || 1;
    const checkedCount = activeRes.checked_in_count !== undefined && activeRes.checked_in_count !== null 
      ? Number(activeRes.checked_in_count) 
      : (activeRes.checked_in || activeRes.is_checked_in ? count : 0);
    const isFullyChecked = checkedCount >= count;

    try {
      const giftPayload = {
        has_gift: nextHasGift,
        gift_target_cast: nextHasGift ? nextTargetCast : null,
      };

      await supabase
        .from('reservations')
        .update(giftPayload)
        .eq('id', activeRes.id);

      const updated = { ...activeRes, ...giftPayload };
      setActiveRes(updated);
      setReservations(prev => prev.map(r => r.id === activeRes.id ? updated : r));

      // 🎯 チェックイン完了後に差し入れを登録した場合は、0.35秒後に自動でモーダルを閉じる
      if (isFullyChecked && nextHasGift) {
        setTimeout(() => {
          setActiveRes(null);
        }, 350);
      }
    } catch (e) {
      console.error('Gift auto save error:', e);
    }
  };

  // フィルター
  const currentStageReservations = selectedStageId === 'all'
    ? reservations
    : reservations.filter(r => r.stage_id === selectedStageId);

  const filteredList = currentStageReservations.filter(r => {
    const name = r.customer_name || r.name || '';
    const kana = getKana(r);
    const phone = r.customer_phone || r.phone || '';
    const memo = r.memo || '';
    const staff = r.staff_name || r.cast_name || '';

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = name.toLowerCase().includes(q);
      const matchKana = kana.toLowerCase().includes(q);
      const matchPhone = phone.includes(q);
      const matchMemo = memo.toLowerCase().includes(q);
      const matchStaff = staff.toLowerCase().includes(q);
      if (!matchName && !matchKana && !matchPhone && !matchMemo && !matchStaff) return false;
    }

    if (selectedKana) {
      const allowedChars = CHAR_MAP[selectedKana] || selectedKana;
      const firstKana = kana.trim().charAt(0);
      let match = allowedChars.includes(firstKana);

      if (!match) {
        const firstName = name.trim().charAt(0);
        match = allowedChars.includes(firstName);
      }

      if (!match) return false;
    }

    return true;
  });

  const checkedTotalPeople = currentStageReservations.reduce((sum, r) => {
    if (r.checked_in_count !== undefined && r.checked_in_count !== null) {
      return sum + Number(r.checked_in_count);
    }
    return sum + (r.checked_in || r.is_checked_in ? (r.count || 1) : 0);
  }, 0);

  const totalStagePeople = currentStageReservations.reduce((sum, r) => sum + (r.count || 1), 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '16px', boxSizing: 'border-box' }}>
      <style>{`
        .kana-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
        @media (max-width: 480px) {
          .kana-grid { gap: 2px; }
          .kana-btn { padding: 8px 0 !important; font-size: 11px !important; }
        }
        .quick-amt-btn {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surfaceAlt};
          color: ${COLORS.text};
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .quick-amt-btn:hover { background-color: #fce8cc; border-color: ${COLORS.gold}; }
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
          <button
            onClick={() => { setSelectedStageId('all'); setSelectedKana(''); }}
            style={{
              minWidth: '100px',
              padding: '10px 14px',
              borderRadius: '12px',
              border: `2px solid ${selectedStageId === 'all' ? COLORS.gold : COLORS.border}`,
              backgroundColor: selectedStageId === 'all' ? '#fff6e8' : COLORS.surface,
              color: COLORS.text,
              fontWeight: selectedStageId === 'all' ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'center',
              flex: '0 0 auto'
            }}
          >
            <div style={{ fontSize: '14px' }}>全日程・全回</div>
            <div style={{ fontSize: '11px', color: COLORS.muted }}>{reservations.length}件</div>
          </button>

          {stages.map(s => {
            const isSel = s.id === selectedStageId;
            const d = s.stage_date || s.performance_date;
            const dateStr = d ? `${new Date(d).getMonth() + 1}/${new Date(d).getDate()}` : '日程未設定';
            const countForStage = reservations.filter(r => r.stage_id === s.id).length;

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
                <div style={{ fontSize: '11px', color: COLORS.gold }}>{s.team_name || `${countForStage}件`}</div>
              </button>
            );
          })}
        </div>

        {/* 検索バー */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color={COLORS.muted} style={{ position: 'absolute', left: '12px', top: '14px' }} />
            <input
              type="text"
              placeholder="お名前・ふりがな・電話番号・扱いで検索..."
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

        {/* 50音キーボード */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: '14px', border: `1px solid ${COLORS.border}`, padding: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>頭文字で探す（50音）</span>
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
            来場総数: {checkedTotalPeople} / {totalStagePeople}人
          </div>
        </div>

        {/* 予約リスト一覧 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.muted }}>データを読み込み中...</div>
        ) : filteredList.length === 0 ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
            <Users size={32} color={COLORS.gold} style={{ marginBottom: '8px' }} />
            <h3 style={{ margin: '0 0 4px 0', color: COLORS.gold }}>該当する予約はありません</h3>
            <p style={{ fontSize: '12px', color: COLORS.muted }}>（全予約数: {reservations.length}件）</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredList.map(res => {
              const count = res.count || 1;
              const checkedCount = res.checked_in_count !== undefined && res.checked_in_count !== null 
                ? Number(res.checked_in_count) 
                : (res.checked_in || res.is_checked_in ? count : 0);
              const isFullyChecked = checkedCount >= count;
              const isPartiallyChecked = checkedCount > 0 && !isFullyChecked;
              const isPaid = res.payment_status === 'paid' || res.is_paid === true;

              const name = res.customer_name || res.name || 'お名前なし';
              const kana = getKana(res);
              const tk = getTicketInfo(res.ticket_type_id);
              const totalAmt = calculateTotal(res);
              const staff = res.staff_name || res.cast_name || (res.memo?.includes('【扱い】:') ? res.memo.split('【扱い】:')[1]?.split('\n')[0]?.trim() : '劇団扱い');
              const hasSeatOption = res.seat_number || res.memo?.includes('指定席') || res.memo?.includes('最前列');
              const hasGiftMark = res.has_gift || res.gift_target_cast;

              return (
                <div
                  key={res.id}
                  onClick={() => handleOpenModal(res)}
                  style={{
                    backgroundColor: isFullyChecked ? '#f0fdf4' : (isPartiallyChecked ? '#fefce8' : COLORS.surface),
                    border: `1.5px solid ${isFullyChecked ? '#86efac' : (isPartiallyChecked ? '#fde047' : COLORS.border)}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(43, 36, 56, 0.04)',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '17px', color: COLORS.text }}>{name} 様</span>
                      {kana && <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.gold }}>（{kana}）</span>}
                      
                      <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.gold, backgroundColor: COLORS.surfaceAlt, padding: '2px 8px', borderRadius: '4px' }}>
                        {count}枚
                      </span>

                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 700 }}>
                        {staff}
                      </span>

                      {/* 💺 指定席ハイライトバッジ */}
                      {hasSeatOption && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #fde68a' }}>
                          <Armchair size={12} /> {res.seat_number ? `指定席 ${res.seat_number}` : '指定席オプション'}
                        </span>
                      )}

                      {/* 🎁 差し入れバッジ */}
                      {hasGiftMark && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fdf2f8', color: '#be185d', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #fbcfe8' }}>
                          <Gift size={12} /> 差し入れ預かり済（{res.gift_target_cast || '劇団'}）
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span>{tk.name}</span>
                      <span>·</span>
                      <span style={{ fontWeight: 700, color: isPaid ? '#10b981' : '#e85a45' }}>
                        {isPaid ? '精算済' : `未精算 ¥${totalAmt.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* 右側：来場ステータス表示 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      backgroundColor: isFullyChecked ? '#10b981' : (isPartiallyChecked ? '#eab308' : COLORS.surfaceAlt),
                      color: isFullyChecked || isPartiallyChecked ? '#fff' : COLORS.text,
                      fontWeight: 800,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}>
                      {isFullyChecked ? <><Check size={16} /> 来場完了</> : isPartiallyChecked ? <><UserCheck size={16} /> {checkedCount}/{count}人来場</> : '未受付'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 🎯 受付・精算・チェックイン統括モーダル */}
      {activeRes && (() => {
        const count = activeRes.count || 1;
        const checkedCount = activeRes.checked_in_count !== undefined && activeRes.checked_in_count !== null 
          ? Number(activeRes.checked_in_count) 
          : (activeRes.checked_in || activeRes.is_checked_in ? count : 0);
        const isFullyChecked = checkedCount >= count;
        const isPaid = activeRes.payment_status === 'paid' || activeRes.is_paid === true;
        const totalAmt = calculateTotal(activeRes);
        const name = activeRes.customer_name || activeRes.name || 'お名前なし';
        const kana = getKana(activeRes);
        const tk = getTicketInfo(activeRes.ticket_type_id);
        const staff = activeRes.staff_name || activeRes.cast_name || (activeRes.memo?.includes('【扱い】:') ? activeRes.memo.split('【扱い】:')[1]?.split('\n')[0]?.trim() : '劇団扱い');
        const hasSeatOption = activeRes.seat_number || activeRes.memo?.includes('指定席') || activeRes.memo?.includes('最前列');
        const changeAmt = receivedCash ? (Number(receivedCash) - totalAmt) : null;

        return (
          <div onClick={() => setActiveRes(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', boxSizing: 'border-box' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: COLORS.surface, borderRadius: '20px', padding: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', position: 'relative' }}>
              
              {/* モーダル閉じるボタン */}
              <button onClick={() => setActiveRes(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
                <X size={22} />
              </button>

              {/* 1. お客様ヘッダー（ふりがなを大きく明記） */}
              <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: COLORS.gold, fontWeight: 800, marginBottom: '2px' }}>
                  {kana ? `【ふりがな】 ${kana}` : 'ご予約受付'}
                </div>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 900, color: COLORS.text }}>
                  {name} <span style={{ fontSize: '16px', fontWeight: 500 }}>様</span>
                </h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, backgroundColor: COLORS.surfaceAlt, color: COLORS.gold, padding: '3px 8px', borderRadius: '6px' }}>
                    {tk.name} × {count}枚
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, backgroundColor: '#eef2ff', color: '#4f46e5', padding: '3px 8px', borderRadius: '6px' }}>
                    扱い: {staff}
                  </span>
                </div>
              </div>

              {/* 2. 💺 VIP・特別案内枠（指定席・カンパ） */}
              {(hasSeatOption || activeRes.donation_amount > 0) && (
                <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⭐ 特別対応・ご案内
                  </div>
                  {hasSeatOption && (
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Armchair size={18} /> お席案内: {activeRes.seat_number ? `【${activeRes.seat_number}】` : '最前列指定席'}
                    </div>
                  )}
                  {activeRes.donation_amount > 0 && (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#b45309', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HeartHandshake size={15} /> 応援カンパ: ¥{activeRes.donation_amount.toLocaleString()}（感謝のお声がけをお願いします）
                    </div>
                  )}
                </div>
              )}

              {/* 3. 💴 お会計・お釣り計算エリア */}
              <div style={{ backgroundColor: isPaid ? '#f0fdf4' : COLORS.surfaceAlt, border: `1.5px solid ${isPaid ? '#86efac' : COLORS.border}`, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: isPaid ? '#15803d' : COLORS.text }}>
                    {isPaid ? '✅ 精算完了（受領済）' : '⚠️ お支払い（未精算）'}
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: isPaid ? '#15803d' : COLORS.gold }}>
                    ¥{totalAmt.toLocaleString()}
                  </div>
                </div>

                {/* 未精算時のお釣りクイック計算 */}
                {!isPaid && (
                  <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.muted, marginBottom: '6px' }}>
                      お預かり金額（クイック計算）
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <button type="button" onClick={() => setReceivedCash(String(totalAmt))} className="quick-amt-btn">
                        ちょうど (¥{totalAmt.toLocaleString()})
                      </button>
                      <button type="button" onClick={() => setReceivedCash('5000')} className="quick-amt-btn">
                        ¥5,000
                      </button>
                      <button type="button" onClick={() => setReceivedCash('10000')} className="quick-amt-btn">
                        ¥10,000
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="お預かり金額を入力..."
                        value={receivedCash}
                        onChange={(e) => setReceivedCash(e.target.value)}
                        style={{ width: '140px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', fontWeight: 700 }}
                      />
                      {changeAmt !== null && (
                        <div style={{ fontSize: '15px', fontWeight: 900, color: changeAmt >= 0 ? '#10b981' : COLORS.danger }}>
                          {changeAmt >= 0 ? `お釣り: ¥${changeAmt.toLocaleString()}` : `不足: ¥${Math.abs(changeAmt).toLocaleString()}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 精算完了・取消トグルボタン */}
                <button
                  type="button"
                  disabled={savingAction}
                  onClick={handleTogglePayment}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isPaid ? '#fee2e2' : '#10b981',
                    color: isPaid ? '#dc2626' : '#ffffff',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {isPaid ? '精算を取り消す（未払いに戻す）' : '💴 現金を受領して「精算完了」にする'}
                </button>
              </div>

              {/* 4. 🎟️ チェックイン（入場）エリア */}
              <div style={{ backgroundColor: COLORS.surface, border: `1.5px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>
                    入場チェックイン状態
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: isFullyChecked ? '#10b981' : COLORS.gold }}>
                    {checkedCount} / {count} 人 来場済
                  </span>
                </div>

                {!isPaid && (
                  <div style={{ fontSize: '12px', color: COLORS.danger, fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> 精算が完了するまでチェックインはロックされています
                  </div>
                )}

                {/* 複数人の場合の個別人数ステッパー */}
                {count > 1 && isPaid && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '10px', padding: '8px', backgroundColor: COLORS.surfaceAlt, borderRadius: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>来場人数の個別調整:</span>
                    <button
                      type="button"
                      disabled={checkedCount <= 0 || savingAction}
                      onClick={() => handleUpdateCheckinCount(checkedCount - 1)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: 900 }}>{checkedCount} 人</span>
                    <button
                      type="button"
                      disabled={checkedCount >= count || savingAction}
                      onClick={() => handleUpdateCheckinCount(checkedCount + 1)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!isPaid || savingAction}
                  onClick={() => handleUpdateCheckinCount(isFullyChecked ? 0 : count)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: !isPaid ? '#e2e8f0' : (isFullyChecked ? '#64748b' : COLORS.gold),
                    color: !isPaid ? '#94a3b8' : '#ffffff',
                    fontWeight: 800,
                    fontSize: '15px',
                    cursor: !isPaid ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: isPaid && !isFullyChecked ? '0 4px 12px rgba(201,121,31,0.25)' : 'none'
                  }}
                >
                  {isFullyChecked ? '入場を取り消す（未受付に戻す）' : `🎟️ 全員分チェックイン（${count}名 入場）`}
                </button>
              </div>

              {/* 5. 🎁 差し入れ預かり（文字入力なし・プルダウン選択＆自動保存＆自動クローズ） */}
              <div style={{ backgroundColor: '#fdf2f8', border: '1.5px solid #fbcfe8', borderRadius: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 800, color: '#be185d', marginBottom: '6px' }}>
                  <input
                    type="checkbox"
                    checked={hasGift}
                    onChange={(e) => handleAutoSaveGift(e.target.checked, giftTargetCast)}
                    style={{ width: '18px', height: '18px', accentColor: '#be185d', cursor: 'pointer' }}
                  />
                  <Gift size={17} /> 差し入れを預かる（キャストへ自動連携）
                </label>

                {hasGift && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#be185d' }}>
                      宛先キャストを選択（自動保存されます）
                    </div>
                    <select
                      value={giftTargetCast}
                      onChange={(e) => handleAutoSaveGift(true, e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fbcfe8', backgroundColor: '#fff', fontSize: '14px', fontWeight: 700, color: COLORS.text }}
                    >
                      <option value="劇団全体・カンパニー宛">🌟 劇団全体・カンパニー宛</option>
                      {castList.map(c => (
                        <option key={c.id} value={c.name}>👤 {c.name}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ 選択と同時に役者アプリへ連携保存されました
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}