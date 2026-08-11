import React, { useState, useEffect } from 'react';
import { Search, Eye, EyeOff, Ticket, ChevronDown, ChevronLeft, Check, X, ArrowLeft } from 'lucide-react';
import { supabase } from './supabaseClient'; // ⭐ Supabaseクライアントをインポート

const INITIAL_RESERVATIONS = [
  {
    id: '1', name: '山田 花子', kana: 'ヤマダ ハナコ', count: 2, tel: '090-1234-5678', showTime: '8月1日 15:00',
    items: [
      { name: '一般前売り', unitPrice: 3500, count: 2 },
      { name: '指定席オプション', unitPrice: 500, count: 2 },
    ],
    isPaid: false, isCheckedIn: false,
  },
  {
    id: '2', name: '山本 尚子', kana: 'ヤマモト ナオコ', count: 1, tel: '080-9876-5432', showTime: '8月1日 15:00',
    items: [
      { name: '一般前売り', unitPrice: 3500, count: 1 },
    ],
    isPaid: true, isCheckedIn: false,
  },
  {
    id: '3', name: '佐藤 健太', kana: 'サトウ ケンタ', count: 3, tel: '070-1111-2222', showTime: '8月1日 19:00',
    isSet: true,
    items: [
      { name: '一般前売り', unitPrice: 3500, count: 3 },
    ],
    nextItems: [
      { name: '一般前売り', unitPrice: 3500, count: 3 },
    ],
    paymentMode: 'together',
    isPaidCurrent: false, isPaidNext: false, isCheckedIn: false,
  },
];

const itemsTotal = (items) => items ? items.reduce((sum, i) => sum + i.unitPrice * i.count, 0) : 0;

const FIFTY_ON_GRID = [
  ['ワ', 'ラ', 'ヤ', 'マ', 'ハ', 'ナ', 'タ', 'サ', 'カ', 'ア'],
  ['ヲ', 'リ', ''  , 'ミ', 'ヒ', 'ニ', 'チ', 'シ', 'キ', 'イ'],
  ['ン', 'ル', 'ユ', 'ム', 'フ', 'ヌ', 'ツ', 'ス', 'ク', 'ウ'],
  [''  , 'レ', ''  , 'メ', 'ヘ', 'ネ', 'テ', 'セ', 'ケ', 'エ'],
  [''  , 'ロ', 'ヨ', 'モ', 'ホ', 'ノ', 'ト', 'ソ', 'コ', 'オ'],
];

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  coral: '#e85a45',
  indigo: '#5457d6',
  success: '#1f9a56',
  text: '#2b2438',
  muted: '#8a8398',
};

export default function TabletReception({ productionId, onBackToAdmin }) {
  const [screen, setScreen] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showTelId, setShowTelId] = useState(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseOtherOpen, setBrowseOtherOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Supabaseから当日の予約一覧を取得
  const fetchReservations = async () => {
    setLoading(true);
    let query = supabase.from('reservations').select('*').order('customer_name', { ascending: true });

    if (productionId) {
      query = query.eq('production_id', productionId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const formatted = data.map(item => ({
        id: item.id,
        name: item.customer_name || '',
        kana: item.customer_kana || '',
        count: item.ticket_count || 1,
        tel: item.tel || '',
        showTime: item.show_time || '8月1日 15:00',
        items: [
          { name: item.ticket_type || '一般チケット', unitPrice: item.total_price / (item.ticket_count || 1), count: item.ticket_count || 1 }
        ],
        isPaid: item.is_paid || false,
        isCheckedIn: item.is_checked_in || false,
      }));
      setReservations(formatted);
    } else {
      setReservations(INITIAL_RESERVATIONS);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, [productionId]);

  const formatTel = (tel, isRevealed) => {
    if (!tel) return '';
    const parts = tel.split('-');
    if (parts.length !== 3) return tel;
    if (!isRevealed) return `${'*'.repeat(parts[0].length)}-****-${'*'.repeat(parts[2].length)}`;
    return `${parts[0]}-****-${parts[2]}`;
  };

  // 2. 精算完了 (UPDATE)
  const handleTogglePaid = async (id) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, isPaid: true } : r));
    if (selectedUser) setSelectedUser(prev => ({ ...prev, isPaid: true }));

    await supabase.from('reservations').update({ is_paid: true }).eq('id', id);
  };

  // 3. チェックイン完了 (UPDATE)
  const handleCheckIn = async (id) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, isCheckedIn: true } : r));
    setSelectedUser(null);

    await supabase.from('reservations').update({ is_checked_in: true }).eq('id', id);
  };

  const matchesSearch = (r) => {
    if (!searchTerm) return true;
    return (r.kana && r.kana.includes(searchTerm)) || (r.name && r.name.includes(searchTerm));
  };

  const currentShowList = reservations.filter(r => r.showTime === '8月1日 15:00' && matchesSearch(r));
  const otherShowList = reservations.filter(r => r.showTime === '8月1日 19:00' && matchesSearch(r));
  const allCurrentShow = reservations.filter(r => r.showTime === '8月1日 15:00');
  const allOtherShow = reservations.filter(r => r.showTime === '8月1日 19:00');

  useEffect(() => {
    if (searchTerm && otherShowList.length > 0) setOtherOpen(true);
  }, [screen]);

  const goToList = () => setScreen('list');

  const handleKanaTap = (char) => {
    setSearchTerm(char);
    setScreen('list');
  };

  const handleBackToSearch = () => {
    setSearchTerm('');
    setOtherOpen(false);
    setBrowseOpen(false);
    setBrowseOtherOpen(false);
    setScreen('search');
  };

  const Row = ({ item }) => (
    <div
      onClick={() => setSelectedUser(item)}
      className="row-item"
      style={{ backgroundColor: item.isCheckedIn ? 'rgba(31,154,86,0.07)' : COLORS.surfaceAlt }}
    >
      <div className="row-main">
        <span className="row-name">{item.name}</span>
        <span className="row-count">{item.count}枚</span>
      </div>
      <div className="perforation" />
      <div className="row-side">
        <span className="row-tel">{formatTel(item.tel, showTelId === item.id)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setShowTelId(showTelId === item.id ? null : item.id); }}
          className="eye-btn"
          aria-label="電話番号を表示"
        >
          {showTelId === item.id ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {item.isCheckedIn && <span className="checked-tag"><Check size={11} /> 入場済</span>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .key-btn {
          aspect-ratio: 1.4 / 1;
          font-size: 18px;
          font-weight: 700;
          font-family: 'Shippori Mincho', serif;
          background: #ffffff;
          color: ${COLORS.text};
          border: 1px solid rgba(201,121,31,0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.08s ease, background 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 1px 2px rgba(43,36,56,0.06);
        }
        .key-btn:hover { background: #fff6e8; box-shadow: 0 0 0 1px ${COLORS.gold}88; }
        .key-btn:active { transform: scale(0.94); background: ${COLORS.gold}; color: #ffffff; }

        .row-item {
          position: relative; display: flex; align-items: center; padding: 14px 16px;
          cursor: pointer; border-bottom: 1px solid rgba(201,121,31,0.12); transition: background 0.15s ease;
        }
        .row-item:hover { background-color: #fff6e8 !important; }
        .row-item:last-child { border-bottom: none; }
        .row-main { flex: 0 0 40%; display: flex; align-items: baseline; gap: 8px; min-width: 0; }
        .row-name { font-family: 'Shippori Mincho', serif; font-weight: 700; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .row-count { font-size: 12px; color: ${COLORS.gold}; flex-shrink: 0; }
        .perforation {
          flex: 0 0 14px; align-self: stretch;
          background-image: linear-gradient(${COLORS.bg} 40%, transparent 0%);
          background-position: center; background-size: 2px 8px; background-repeat: repeat-y; opacity: 0.6;
        }
        .row-side { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; }
        .row-tel { font-size: 12px; color: ${COLORS.muted}; letter-spacing: 0.02em; }
        .eye-btn {
          display: flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 6px;
          background: rgba(201,121,31,0.1); border: none; color: ${COLORS.text}; cursor: pointer;
        }
        .eye-btn:hover { background: ${COLORS.gold}; color: #ffffff; }
        .checked-tag {
          position: absolute; top: -1px; right: 8px; font-size: 9px; color: ${COLORS.success};
          display: flex; align-items: center; gap: 2px;
        }

        .back-btn {
          display: flex; align-items: center; gap: 4px; background: none; border: none; color: ${COLORS.gold};
          cursor: pointer; font-size: 14px; font-weight: 700; padding: 8px 4px;
        }
        .back-btn:hover { text-decoration: underline; }

        .accordion-toggle {
          width: 100%; padding: 12px 14px; background: ${COLORS.surfaceAlt}; color: ${COLORS.text};
          border: 1px solid ${COLORS.border}; border-radius: 10px; cursor: pointer;
          font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;
        }
        .accordion-toggle:hover { background: #f0e4cf; }

        .search-submit {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          background: ${COLORS.gold}; color: #fff; border: none; border-radius: 8px;
          padding: 8px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
        }

        .pay-btn, .checkin-btn {
          flex: 1; padding: 14px; border-radius: 10px; border: none;
          font-weight: 700; font-size: 14px; cursor: pointer; transition: filter 0.15s ease;
        }
        .pay-btn:hover:not(:disabled), .checkin-btn:hover { filter: brightness(1.08); }
      `}</style>

      {/* トップヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBackToAdmin} className="back-btn" style={{ padding: 0 }}>
          <ArrowLeft size={16} /> 制作・予約一覧へ戻る
        </button>
        <span style={{ fontSize: '12px', color: COLORS.gold, fontWeight: 700 }}>
          📱 当日受付タブレットUI {loading && '(同期中...)'}
        </span>
      </div>

      {screen === 'search' && (
        <div>
          {/* 検索バー */}
          <div style={{ marginBottom: '22px', position: 'relative' }}>
            <Search size={18} color={COLORS.gold} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="お名前・フリガナで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') goToList(); }}
              style={{
                width: '100%', padding: '14px 90px 14px 46px', borderRadius: '10px',
                border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, color: COLORS.text,
                fontSize: '16px', boxSizing: 'border-box',
              }}
            />
            <button onClick={goToList} className="search-submit">検索</button>
          </div>

          {/* 50音キーボード */}
          <div style={{ backgroundColor: COLORS.surface, padding: '18px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.15em', color: COLORS.gold, marginBottom: '12px', fontWeight: 700 }}>
              頭文字で探す
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
              {FIFTY_ON_GRID.flat().map((char, index) => (
                char ? (
                  <button key={index} onClick={() => handleKanaTap(char)} className="key-btn">
                    {char}
                  </button>
                ) : <div key={index} />
              ))}
            </div>
          </div>

          {/* アコーディオン */}
          <div style={{ marginTop: '16px' }}>
            <button onClick={() => setBrowseOpen(!browseOpen)} className="accordion-toggle">
              <Ticket size={14} color={COLORS.gold} />
              予約一覧を見る
              <ChevronDown size={15} style={{ transform: browseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 'auto' }} />
            </button>

            {browseOpen && (
              <div style={{ backgroundColor: COLORS.surface, borderRadius: '14px', padding: '18px', border: `1px solid ${COLORS.border}`, marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '17px', fontWeight: 700 }}>15:00 の回</span>
                  <span style={{ fontSize: '11px', color: COLORS.muted }}>8月1日 ／ 予約 {allCurrentShow.length}件</span>
                </div>

                <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
                  {allCurrentShow.map((item) => <Row key={item.id} item={item} />)}
                </div>

                <div style={{ height: '22px' }} />

                <button onClick={() => setBrowseOtherOpen(!browseOtherOpen)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'none', border: 'none', color: COLORS.muted, fontSize: '13px', cursor: 'pointer', padding: '4px 2px',
                }}>
                  <span>19:00 の回（{allOtherShow.length}名）</span>
                  <ChevronDown size={16} style={{ transform: browseOtherOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {browseOtherOpen && (
                  <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, marginTop: '8px' }}>
                    {allOtherShow.map((item) => <Row key={item.id} item={item} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {screen === 'list' && (
        <div>
          <button onClick={handleBackToSearch} className="back-btn">
            <ChevronLeft size={16} /> 検索に戻る
          </button>

          <div style={{ backgroundColor: COLORS.surface, borderRadius: '14px', padding: '18px', border: `1px solid ${COLORS.border}`, marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '17px', fontWeight: 700 }}>15:00 の回</span>
              <span style={{ fontSize: '11px', color: COLORS.muted }}>8月1日 ／ 予約 {currentShowList.length}件</span>
            </div>

            <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
              {currentShowList.length > 0 ? (
                currentShowList.map((item) => <Row key={item.id} item={item} />)
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: COLORS.muted, fontSize: '13px', backgroundColor: COLORS.surfaceAlt }}>
                  該当者なし
                </div>
              )}
            </div>

            <div style={{ height: '22px' }} />

            <button onClick={() => setOtherOpen(!otherOpen)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', color: COLORS.muted, fontSize: '13px', cursor: 'pointer', padding: '4px 2px',
            }}>
              <span>19:00 の回（{otherShowList.length}名）</span>
              <ChevronDown size={16} style={{ transform: otherOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {otherOpen && (
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, marginTop: '8px' }}>
                {otherShowList.length > 0 ? (
                  otherShowList.map((item) => <Row key={item.id} item={item} />)
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: COLORS.muted, fontSize: '13px', backgroundColor: COLORS.surfaceAlt }}>
                    該当者なし
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 詳細・精算モーダル */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '520px', maxWidth: '92vw', backgroundColor: COLORS.surface, borderRadius: '20px', padding: '32px', position: 'relative', border: `1px solid ${COLORS.border}` }}
          >
            <button
              onClick={() => setSelectedUser(null)}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'rgba(201,121,31,0.1)', border: 'none', color: COLORS.muted, width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={17} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', paddingRight: '34px' }}>
              <h2 style={{ margin: 0, fontFamily: "'Shippori Mincho', serif", fontSize: '24px' }}>{selectedUser.name} 様</h2>
            </div>
            <div style={{ color: COLORS.muted, fontSize: '13px', marginBottom: '18px' }}>
              {selectedUser.showTime} 回
            </div>

            <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: COLORS.gold, fontWeight: 700, marginBottom: '8px' }}>内訳</div>
            <div style={{ marginBottom: '10px' }}>
              {selectedUser.items && selectedUser.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: COLORS.text, padding: '6px 0' }}>
                  <span>{it.name} × {it.count}枚</span>
                  <span style={{ color: COLORS.muted }}>{it.unitPrice.toLocaleString()} × {it.count} = {(it.unitPrice * it.count).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div style={{ borderBottom: `1px dashed ${COLORS.border}`, margin: '10px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: COLORS.muted }}>合計</span>
              <span style={{ fontSize: '26px', fontWeight: 700, color: COLORS.gold, fontFamily: "'Shippori Mincho', serif" }}>
                ¥{itemsTotal(selectedUser.items).toLocaleString()}
              </span>
            </div>

            {selectedUser.isPaid && (
              <div style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', color: COLORS.success, backgroundColor: 'rgba(31,154,86,0.1)', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>
                事前決済完了
              </div>
            )}

            <div style={{ borderBottom: `1px dashed ${COLORS.border}`, margin: '18px 0' }} />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                disabled={selectedUser.isPaid}
                onClick={() => handleTogglePaid(selectedUser.id)}
                className="pay-btn"
                style={{
                  backgroundColor: selectedUser.isPaid ? '#f0ece2' : COLORS.gold,
                  color: selectedUser.isPaid ? COLORS.muted : '#ffffff',
                  cursor: selectedUser.isPaid ? 'not-allowed' : 'pointer',
                }}
              >
                {selectedUser.isPaid ? '精算済み' : '精算する'}
              </button>

              <button
                onClick={() => handleCheckIn(selectedUser.id)}
                className="checkin-btn"
                style={{
                  backgroundColor: selectedUser.isCheckedIn ? COLORS.success : COLORS.indigo,
                  color: '#ffffff',
                }}
              >
                {selectedUser.isCheckedIn ? '入場済み' : 'チェックイン完了'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}