import React, { useState } from 'react';
import { ArrowLeft, Smartphone, Printer, Search, X, Trash2, Check, Send } from 'lucide-react';
import TabletReception from './TabletReception'; // タブレット受付UIをインポート

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

const CASTS = ['山田 太郎', '鈴木 次郎', '田中 三郎'];
const TICKET_TYPES = ['自由席', '指定席オプション', 'セット券'];

const STAGES = [
  { id: 's1', date: '8/1', time: '15:00', capacity: 80, status: '販売中' },
  { id: 's2', date: '8/1', time: '19:00', capacity: 80, status: '販売中' },
  { id: 's3', date: '8/2', time: '15:00', capacity: 80, status: '受付前' },
];

const INITIAL_RESERVATIONS = [
  { id: 1, stageId: 's1', name: '山田 花子', tel: '090-1234-5678', email: 'hanako@example.com', ticketType: '指定席オプション', count: 2, cast: '山田 太郎', price: 8000, isPaid: false, isCheckedIn: false },
  { id: 2, stageId: 's1', name: '山本 尚子', tel: '080-9876-5432', email: 'naoko@example.com', ticketType: '自由席', count: 1, cast: '鈴木 次郎', price: 3500, isPaid: true, isCheckedIn: false },
  { id: 3, stageId: 's2', name: '佐藤 健太', tel: '070-1111-2222', email: 'kenta@example.com', ticketType: 'セット券', count: 3, cast: '田中 三郎', price: 21000, isPaid: false, isCheckedIn: false },
  { id: 4, stageId: 's2', name: '高橋 美咲', tel: '090-2222-3333', email: 'misaki@example.com', ticketType: '自由席', count: 2, cast: '山田 太郎', price: 7000, isPaid: true, isCheckedIn: true },
  { id: 5, stageId: 's3', name: '中村 一郎', tel: '080-4444-5555', email: 'ichiro@example.com', ticketType: '自由席', count: 4, cast: '鈴木 次郎', price: 14000, isPaid: false, isCheckedIn: false },
];

const statusColor = (status) => {
  if (status === '完売') return COLORS.coral;
  if (status === '終了') return COLORS.muted;
  if (status === '受付前') return COLORS.indigo;
  return COLORS.success; // 販売中
};

export default function AdminReservationList({ onBack }) {
  // 画面モード管理: 'admin' (予約一覧) | 'tablet' (当日受付タブレット)
  const [viewMode, setViewMode] = useState('admin');

  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [castFilter, setCastFilter] = useState('');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('');
  const [checkinFilter, setCheckinFilter] = useState('all'); // all | done | not
  const [selectedIds, setSelectedIds] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showThanks, setShowThanks] = useState(false);

  // 当日受付タブレット画面を表示する場合
  if (viewMode === 'tablet') {
    return <TabletReception onBackToAdmin={() => setViewMode('admin')} />;
  }

  const stageById = (id) => STAGES.find(s => s.id === id);
  const stageLabel = (id) => { const s = stageById(id); return s ? `${s.date} ${s.time}` : ''; };

  const reservedCount = (stageId) => reservations.filter(r => r.stageId === stageId).reduce((s, r) => s + r.count, 0);
  const totalReserved = reservations.reduce((s, r) => s + r.count, 0);
  const totalCapacity = STAGES.reduce((s, st) => s + st.capacity, 0);

  const filtered = reservations.filter(r =>
    (!selectedStageId || r.stageId === selectedStageId) &&
    (!searchTerm || r.name.includes(searchTerm)) &&
    (!castFilter || r.cast === castFilter) &&
    (!ticketTypeFilter || r.ticketType === ticketTypeFilter) &&
    (checkinFilter === 'all' || (checkinFilter === 'done' ? r.isCheckedIn : !r.isCheckedIn))
  );

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = (updated) => {
    setReservations(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditing(null);
  };

  const handleDelete = (id) => {
    setReservations(prev => prev.filter(r => r.id !== id));
    setConfirmDeleteId(null);
    setEditing(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');
        @media print {
          .no-print { display: none !important; }
        }
        .top-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 14px; border-radius: 9px; border: 1px solid ${COLORS.border};
          background: ${COLORS.surface}; color: ${COLORS.text}; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'Zen Kaku Gothic New', sans-serif;
        }
        .top-btn:hover { background: ${COLORS.surfaceAlt}; }
        .stage-card {
          flex: 0 0 128px; padding: 10px 12px; border-radius: 10px; cursor: pointer;
          border: 2px solid ${COLORS.border}; background: ${COLORS.surface}; transition: border-color 0.15s ease, transform 0.1s ease;
        }
        .stage-card:hover { transform: translateY(-2px); }
        .stage-card.active { border-color: ${COLORS.gold}; background: #fff6e8; }
        .filter-input, .filter-select {
          padding: 9px 12px; border-radius: 8px; border: 1px solid ${COLORS.border};
          background: ${COLORS.surface}; color: ${COLORS.text}; font-size: 13px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
        }
        .res-row {
          display: grid; grid-template-columns: 32px 1.2fr 1.3fr 1.6fr 1fr 1fr 1fr 0.8fr;
          align-items: center; gap: 10px; padding: 12px 14px;
          border-bottom: 1px solid rgba(201,121,31,0.12); cursor: pointer; font-size: 13px;
        }
        .res-row:hover { background: #fff6e8; }
        .res-row:last-child { border-bottom: none; }
        .badge {
          display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px;
        }
        .modal-input {
          width: 100%; padding: 9px 10px; border-radius: 8px; border: 1px solid ${COLORS.border};
          font-size: 14px; font-family: 'Zen Kaku Gothic New', sans-serif; box-sizing: border-box;
        }
        .modal-label { font-size: 11px; color: ${COLORS.muted}; margin-bottom: 4px; display: block; font-weight: 700; }
        .save-btn, .delete-btn, .cancel-btn {
          padding: 12px; border-radius: 10px; border: none; font-weight: 700; font-size: 14px; cursor: pointer;
          font-family: 'Zen Kaku Gothic New', sans-serif;
        }
      `}</style>

      {/* ヘッダー */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} className="top-btn"><ArrowLeft size={15} /> ホームへ戻る</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* タブレットUI切り替えボタン */}
          <button onClick={() => setViewMode('tablet')} className="top-btn" style={{ borderColor: COLORS.gold, color: COLORS.gold, fontWeight: 'bold' }}>
            <Smartphone size={15} /> 当日受付タブレットを開く
          </button>
          <button className="top-btn" onClick={() => window.print()}><Printer size={15} /> 印刷</button>
        </div>
      </div>

      {/* 全体サマリー */}
      <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '15px', marginBottom: '14px' }}>
        総動員数 <strong style={{ color: COLORS.gold, fontSize: '18px' }}>{totalReserved}</strong> / {totalCapacity}
      </div>

      {/* 回カード（全件横並び） */}
      <div className="no-print" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {STAGES.map(s => (
            <div
              key={s.id}
              className={`stage-card ${selectedStageId === s.id ? 'active' : ''}`}
              onClick={() => setSelectedStageId(selectedStageId === s.id ? null : s.id)}
            >
              <div style={{ fontFamily: "'Shippori Mincho', serif", fontWeight: 700, fontSize: '14px', marginBottom: '4px', whiteSpace: 'nowrap' }}>{s.date} {s.time}</div>
              <div style={{ fontSize: '12px', marginBottom: '6px' }}>{reservedCount(s.id)} / {s.capacity}</div>
              <span className="badge" style={{ backgroundColor: `${statusColor(s.status)}22`, color: statusColor(s.status), fontSize: '10px' }}>{s.status}</span>
            </div>
          ))}
        </div>
        {selectedStageId && (
          <button className="top-btn" style={{ marginTop: '8px' }} onClick={() => setSelectedStageId(null)}>絞り込み解除</button>
        )}
      </div>

      {/* 検索・フィルタ */}
      <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} color={COLORS.gold} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="filter-input"
            style={{ width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
            placeholder="お名前で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="filter-select" value={castFilter} onChange={(e) => setCastFilter(e.target.value)}>
          <option value="">担当キャスト（全員）</option>
          {CASTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={ticketTypeFilter} onChange={(e) => setTicketTypeFilter(e.target.value)}>
          <option value="">券種（全て）</option>
          {TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={checkinFilter} onChange={(e) => setCheckinFilter(e.target.value)}>
          <option value="all">来場チェック（全て）</option>
          <option value="done">来場済み</option>
          <option value="not">未来場</option>
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className="no-print" style={{ marginBottom: '10px' }}>
          <button className="top-btn" style={{ backgroundColor: COLORS.gold, color: '#fff', borderColor: COLORS.gold }} onClick={() => setShowThanks(true)}>
            <Send size={15} /> {selectedIds.length}件にお礼メッセージを送る
          </button>
        </div>
      )}

      {/* 予約リスト */}
      <div style={{ backgroundColor: COLORS.surface, borderRadius: '14px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        <div className="res-row" style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 700, cursor: 'default', backgroundColor: COLORS.surfaceAlt }}>
          <span></span>
          <span>お客様名</span>
          <span>連絡先</span>
          <span>券種・枚数</span>
          <span>担当</span>
          <span>精算</span>
          <span>来場</span>
          <span>回</span>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>該当する予約がありません</div>
        )}
        {filtered.map(r => (
          <div key={r.id} className="res-row" onClick={() => setEditing(r)}>
            <input type="checkbox" checked={selectedIds.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(r.id)} />
            <span style={{ fontWeight: 700 }}>{r.name}</span>
            <span style={{ color: COLORS.muted, fontSize: '12px' }}>{r.tel}<br />{r.email}</span>
            <span>{r.ticketType} × {r.count}枚</span>
            <span><span className="badge" style={{ backgroundColor: `${COLORS.indigo}1a`, color: COLORS.indigo }}>{r.cast}</span></span>
            <span style={{ color: r.isPaid ? COLORS.success : COLORS.coral, fontWeight: 700 }}>{r.isPaid ? '精算済' : `未精算 ¥${r.price.toLocaleString()}`}</span>
            <span style={{ color: r.isCheckedIn ? COLORS.success : COLORS.muted }}>{r.isCheckedIn ? <Check size={16} /> : '—'}</span>
            <span style={{ fontSize: '12px', color: COLORS.muted }}>{stageLabel(r.stageId)}</span>
          </div>
        ))}
      </div>

      {/* 編集モーダル */}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '480px', maxWidth: '92vw', maxHeight: '86vh', overflowY: 'auto', backgroundColor: COLORS.surface, borderRadius: '18px', padding: '28px', position: 'relative', border: `1px solid ${COLORS.border}` }}>
            <button onClick={() => setEditing(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(201,121,31,0.1)', border: 'none', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.muted }}>
              <X size={16} />
            </button>
            <h2 style={{ margin: '0 0 18px', fontFamily: "'Shippori Mincho', serif", fontSize: '20px' }}>予約編集</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="modal-label">お客様名</label>
                <input className="modal-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="modal-label">回</label>
                <select className="modal-input" value={editing.stageId} onChange={(e) => setEditing({ ...editing, stageId: e.target.value })}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.date} {s.time}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-label">電話番号</label>
                <input className="modal-input" value={editing.tel} onChange={(e) => setEditing({ ...editing, tel: e.target.value })} />
              </div>
              <div>
                <label className="modal-label">メールアドレス</label>
                <input className="modal-input" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div>
                <label className="modal-label">券種</label>
                <select className="modal-input" value={editing.ticketType} onChange={(e) => setEditing({ ...editing, ticketType: e.target.value })}>
                  {TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-label">枚数</label>
                <input className="modal-input" type="number" min="1" value={editing.count} onChange={(e) => setEditing({ ...editing, count: Number(e.target.value) })} />
              </div>
              <div>
                <label className="modal-label">担当キャスト</label>
                <select className="modal-input" value={editing.cast} onChange={(e) => setEditing({ ...editing, cast: e.target.value })}>
                  {CASTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-label">金額</label>
                <input className="modal-input" type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={editing.isPaid} onChange={(e) => setEditing({ ...editing, isPaid: e.target.checked })} /> 精算済み
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={editing.isCheckedIn} onChange={(e) => setEditing({ ...editing, isCheckedIn: e.target.checked })} /> 来場済み
              </label>
            </div>

            {confirmDeleteId === editing.id ? (
              <div style={{ backgroundColor: `${COLORS.coral}15`, padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', marginBottom: '10px' }}>本当に削除しますか？この操作は取り消せません。</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="delete-btn" style={{ flex: 1, backgroundColor: COLORS.coral, color: '#fff' }} onClick={() => handleDelete(editing.id)}>削除する</button>
                  <button className="cancel-btn" style={{ flex: 1, backgroundColor: '#f0ece2', color: COLORS.text }} onClick={() => setConfirmDeleteId(null)}>キャンセル</button>
                </div>
              </div>
            ) : (
              <button className="delete-btn" style={{ width: '100%', marginBottom: '14px', backgroundColor: 'transparent', border: `1px solid ${COLORS.coral}`, color: COLORS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => setConfirmDeleteId(editing.id)}>
                <Trash2 size={14} /> 削除
              </button>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="save-btn" style={{ flex: 1, backgroundColor: COLORS.gold, color: '#fff' }} onClick={() => handleSave(editing)}>保存</button>
              <button className="cancel-btn" style={{ flex: 1, backgroundColor: '#f0ece2', color: COLORS.text }} onClick={() => setEditing(null)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* お礼メッセージモーダル */}
      {showThanks && (
        <div onClick={() => setShowThanks(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '440px', maxWidth: '92vw', backgroundColor: COLORS.surface, borderRadius: '18px', padding: '26px', border: `1px solid ${COLORS.border}` }}>
            <h2 style={{ margin: '0 0 10px', fontFamily: "'Shippori Mincho', serif", fontSize: '19px' }}>お礼メッセージを送る</h2>
            <div style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '12px' }}>{selectedIds.length}名に、予約時に選ばれた連絡方法（メール／LINE）で送信します。</div>
            <textarea className="modal-input" style={{ height: '120px', resize: 'vertical', marginBottom: '16px' }} defaultValue={'本日はご来場いただきありがとうございました。またのお越しをお待ちしております。'} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="save-btn" style={{ flex: 1, backgroundColor: COLORS.gold, color: '#fff' }} onClick={() => { setShowThanks(false); setSelectedIds([]); }}>送信（ダミー）</button>
              <button className="cancel-btn" style={{ flex: 1, backgroundColor: '#f0ece2', color: COLORS.text }} onClick={() => setShowThanks(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}