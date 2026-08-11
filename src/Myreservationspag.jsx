import React, { useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';

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

const CASTS = [
  { name: '山田 太郎', ticketVisibility: 'assigned_only' },
  { name: '鈴木 次郎', ticketVisibility: 'all_stages' },
  { name: '田中 三郎', ticketVisibility: 'assigned_only' },
];

const STAGES = [
  { id: 's1', date: '8/1', time: '15:00' },
  { id: 's2', date: '8/1', time: '19:00' },
  { id: 's3', date: '8/2', time: '15:00' },
];

// groupId が同じ行はセット券の同一予約（A公演分・B公演分）
const INITIAL_RESERVATIONS = [
  { id: 1, groupId: 'g1', name: '山田 花子', stageId: 's1', ticketType: '指定席オプション', count: 2, cast: '山田 太郎', isCheckedIn: false },
  { id: 2, groupId: 'g2', name: '山本 尚子', stageId: 's1', ticketType: '自由席', count: 1, cast: '鈴木 次郎', isCheckedIn: false },
  { id: 3, groupId: 'g3', name: '高橋 美咲', stageId: 's2', ticketType: '自由席', count: 2, cast: '山田 太郎', isCheckedIn: true },
  { id: 4, groupId: 'g4', name: '中村 一郎', stageId: 's3', ticketType: '自由席', count: 4, cast: '鈴木 次郎', isCheckedIn: false },
  { id: 5, groupId: 'g5', leg: 'A公演', name: '佐藤 健太', stageId: 's2', ticketType: 'セット券', count: 3, cast: '山田 太郎', isCheckedIn: false },
  { id: 6, groupId: 'g5', leg: 'B公演', name: '佐藤 健太', stageId: 's3', ticketType: 'セット券', count: 3, cast: '田中 三郎', isCheckedIn: false },
];

export default function MyReservationsPage() {
  const [currentCast, setCurrentCast] = useState('山田 太郎'); // デモ用：ログイン中のキャストを切り替え
  const allTabVisible = CASTS.find(c => c.name === currentCast)?.ticketVisibility === 'all_stages';
  const [activeTab, setActiveTab] = useState('mine');
  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ count: 1, stageId: STAGES[0].id });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ name: '', stageId: STAGES[0].id, ticketType: '自由席', count: 1 });

  // 全体検索用
  const [allSearch, setAllSearch] = useState('');
  const [allStageFilter, setAllStageFilter] = useState('');

  const stageLabel = (id) => { const s = STAGES.find(x => x.id === id); return s ? `${s.date} ${s.time}` : ''; };
  const reservedCount = (stageId) => reservations.filter(r => r.stageId === stageId).reduce((s, r) => s + r.count, 0);

  // 自分のお客様：どこかのレグが自分の担当なら、そのグループ全体（相方のレグも含む）を表示
  const myGroupIds = new Set(
    reservations.filter(r => r.cast === currentCast).map(r => r.groupId)
  );
  const myRowsAll = reservations.filter(r => myGroupIds.has(r.groupId));
  const myRows = selectedStageId ? myRowsAll.filter(r => r.stageId === selectedStageId) : myRowsAll;
  const myAttendanceCount = reservations.filter(r => r.cast === currentCast).reduce((s, r) => s + r.count, 0);

  const rowsByStage = (rows) => {
    const map = {};
    rows.forEach(r => { (map[r.stageId] = map[r.stageId] || []).push(r); });
    return map;
  };
  const myRowsByStage = rowsByStage(myRows);

  const toggleCheckIn = (id) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, isCheckedIn: !r.isCheckedIn } : r));
  };

  const startEdit = (r) => {
    if (editingId === r.id) { setEditingId(null); return; }
    setEditingId(r.id);
    setEditDraft({ count: r.count, stageId: r.stageId });
  };

  const handleInlineSave = (id, patch) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    setEditingId(null);
  };

  const handleAddEntry = () => {
    if (!newEntry.name) return;
    const id = Math.max(0, ...reservations.map(r => r.id)) + 1;
    setReservations(prev => [...prev, {
      id, groupId: `g${id}`, name: newEntry.name, stageId: newEntry.stageId,
      ticketType: newEntry.ticketType, count: Number(newEntry.count), cast: currentCast, isCheckedIn: false,
    }]);
    setNewEntry({ name: '', stageId: STAGES[0].id, ticketType: '自由席', count: 1 });
    setShowAddForm(false);
  };

  const allFiltered = reservations.filter(r =>
    (!allSearch || r.name.includes(allSearch)) &&
    (!allStageFilter || r.stageId === allStageFilter)
  );

  const Row = ({ r, editable }) => {
    const isEditing = editingId === r.id;

    return (
      <div className="row-card">
        <div className="row-main" onClick={() => editable && startEdit(r)}>
          <div>
            <span className="row-name">{r.name}</span>
            {r.leg && <span className="leg-badge">{r.leg}</span>}
          </div>
          <span className="row-detail">{r.ticketType} × {r.count}枚</span>
          {editable && <span className="cast-badge">{r.cast}</span>}
          <button
            className={`checkin-chip ${r.isCheckedIn ? 'done' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleCheckIn(r.id); }}
          >
            {r.isCheckedIn ? <><Check size={13} /> 来場済</> : '未来場'}
          </button>
        </div>

        {isEditing && (
          <div className="row-edit" onClick={(e) => e.stopPropagation()}>
            <div>
              <label className="edit-label">枚数</label>
              <input type="number" min="1" className="edit-input" value={editDraft.count} onChange={(e) => setEditDraft({ ...editDraft, count: Number(e.target.value) })} />
            </div>
            <div>
              <label className="edit-label">回</label>
              <select className="edit-input" value={editDraft.stageId} onChange={(e) => setEditDraft({ ...editDraft, stageId: e.target.value })}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.date} {s.time}</option>)}
              </select>
            </div>
            <button className="edit-save" onClick={() => handleInlineSave(r.id, editDraft)}>保存</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '22px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .tab-btn {
          padding: 9px 18px; border-radius: 999px; border: 1px solid ${COLORS.border}; cursor: pointer;
          font-size: 13px; font-weight: 700; background: ${COLORS.surface}; color: ${COLORS.muted};
        }
        .tab-btn.active { background: ${COLORS.gold}; color: #fff; border-color: ${COLORS.gold}; }

        .row-card { border-bottom: 1px solid rgba(201,121,31,0.1); }
        .row-card:last-child { border-bottom: none; }
        .row-main {
          display: grid; grid-template-columns: 1.4fr 1.4fr 1fr 0.9fr; align-items: center; gap: 10px;
          padding: 12px 14px; cursor: pointer; font-size: 13px;
        }
        .row-main:hover { background: #fff6e8; }
        .row-name { font-weight: 700; font-size: 14px; }
        .row-detail { color: ${COLORS.text}; }
        .leg-badge {
          margin-left: 6px; font-size: 10px; color: ${COLORS.coral}; background: ${COLORS.coral}15;
          padding: 1px 7px; border-radius: 999px;
        }
        .cast-badge {
          font-size: 11px; color: ${COLORS.indigo}; background: ${COLORS.indigo}15;
          padding: 2px 8px; border-radius: 999px; justify-self: start;
        }
        .checkin-chip {
          font-size: 11px; padding: 5px 10px; border-radius: 999px; border: 1px solid ${COLORS.border};
          background: ${COLORS.surface}; color: ${COLORS.muted}; cursor: pointer;
          display: flex; align-items: center; gap: 4px; justify-self: end;
        }
        .checkin-chip.done { background: ${COLORS.success}15; color: ${COLORS.success}; border-color: transparent; }

        .row-edit {
          display: flex; align-items: flex-end; gap: 10px; padding: 10px 14px 14px; background: ${COLORS.surfaceAlt};
        }
        .edit-label { font-size: 10px; color: ${COLORS.muted}; display: block; margin-bottom: 3px; font-weight: 700; }
        .edit-input {
          padding: 7px 9px; border-radius: 7px; border: 1px solid ${COLORS.border}; font-size: 13px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
        }
        .edit-save {
          padding: 8px 14px; border-radius: 7px; border: none; background: ${COLORS.gold}; color: #fff;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }

        .add-form-input {
          padding: 9px 10px; border-radius: 8px; border: 1px solid ${COLORS.border}; font-size: 13px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
        }

        .stage-card {
          flex: 0 0 128px; padding: 10px 12px; border-radius: 10px; cursor: pointer;
          border: 2px solid ${COLORS.border}; background: ${COLORS.surface}; transition: border-color 0.15s ease, transform 0.1s ease;
        }
        .stage-card:hover { transform: translateY(-2px); }
        .stage-card.active { border-color: ${COLORS.gold}; background: #fff6e8; }

        .add-proxy-btn {
          display: flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 9px;
          border: 1px solid ${COLORS.border}; background: ${COLORS.surface}; color: ${COLORS.text};
          font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Zen Kaku Gothic New', sans-serif;
        }
        .add-proxy-btn:hover { background: ${COLORS.surfaceAlt}; }
      `}</style>

      {/* デモ用コントロール（実際は自動でログイン担当者が入る想定） */}
      <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '14px', fontSize: '12px', color: COLORS.muted, alignItems: 'center' }}>
        <span>デモ設定：</span>
        ログイン中
        <select className="add-form-input" style={{ padding: '5px 8px' }} value={currentCast} onChange={(e) => setCurrentCast(e.target.value)}>
          {CASTS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <span style={{ fontSize: '11px' }}>
          全体タブ：{allTabVisible ? '表示可' : '非公開'}（管理者が個別設定）
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>{currentCast} さんのマイページ</h1>
          <div style={{ fontSize: '13px', color: COLORS.muted }}>
            自分の動員数　<strong style={{ color: COLORS.gold, fontSize: '16px' }}>{myAttendanceCount}</strong> 人
          </div>
        </div>
        <button className="add-proxy-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={14} /> 窓口代理予約を追加
        </button>
      </div>

      {showAddForm && (
        <div style={{ backgroundColor: COLORS.surface, borderRadius: '10px', border: `1px solid ${COLORS.border}`, padding: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <input className="add-form-input" placeholder="お客様名" value={newEntry.name} onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })} />
            <select className="add-form-input" value={newEntry.stageId} onChange={(e) => setNewEntry({ ...newEntry, stageId: e.target.value })}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.date} {s.time}</option>)}
            </select>
            <select className="add-form-input" value={newEntry.ticketType} onChange={(e) => setNewEntry({ ...newEntry, ticketType: e.target.value })}>
              <option value="自由席">自由席</option>
              <option value="指定席オプション">指定席オプション</option>
              <option value="セット券">セット券</option>
            </select>
            <input className="add-form-input" type="number" min="1" style={{ width: '70px' }} value={newEntry.count} onChange={(e) => setNewEntry({ ...newEntry, count: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="edit-save" onClick={handleAddEntry}>追加する</button>
            <button className="tab-btn" onClick={() => setShowAddForm(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* ダッシュボード（回カード・全件横並び） */}
      <div className="no-print" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {STAGES.map(s => (
            <div
              key={s.id}
              className={`stage-card ${selectedStageId === s.id ? 'active' : ''}`}
              onClick={() => setSelectedStageId(selectedStageId === s.id ? null : s.id)}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', whiteSpace: 'nowrap' }}>{s.date} {s.time}</div>
              <div style={{ fontSize: '12px', color: COLORS.muted }}>{reservedCount(s.id)} 枚</div>
            </div>
          ))}
        </div>
        {selectedStageId && (
          <button className="tab-btn" style={{ marginTop: '8px' }} onClick={() => setSelectedStageId(null)}>絞り込み解除</button>
        )}
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        <button className={`tab-btn ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => setActiveTab('mine')}>自分の予約</button>
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>全体</button>
      </div>

      {activeTab === 'mine' && (
        <div>
          {(selectedStageId ? STAGES.filter(s => s.id === selectedStageId) : STAGES).map(s => {
            const rows = myRowsByStage[s.id] || [];
            return (
              <div key={s.id} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.muted, marginBottom: '6px' }}>
                  {s.date} {s.time} の回（{rows.length}件）
                </div>
                <div style={{ backgroundColor: COLORS.surface, borderRadius: '10px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                  {rows.length > 0 ? rows.map(r => <Row key={r.id} r={r} editable />) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>該当する予約はありません</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'all' && (
        !allTabVisible ? (
          <div style={{ backgroundColor: COLORS.surface, borderRadius: '10px', border: `1px solid ${COLORS.border}`, padding: '30px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>
            全体タブは非公開に設定されています（管理者の設定により、担当分のみ閲覧できます）
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={14} color={COLORS.gold} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  className="add-form-input"
                  style={{ width: '100%', paddingLeft: '30px', boxSizing: 'border-box' }}
                  placeholder="お名前で検索..."
                  value={allSearch}
                  onChange={(e) => setAllSearch(e.target.value)}
                />
              </div>
              <select className="add-form-input" value={allStageFilter} onChange={(e) => setAllStageFilter(e.target.value)}>
                <option value="">回（全て）</option>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.date} {s.time}</option>)}
              </select>
            </div>

            <div style={{ backgroundColor: COLORS.surface, borderRadius: '10px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
              {allFiltered.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>該当する予約がありません</div>
              ) : allFiltered.map(r => (
                <div key={r.id} className="row-main" style={{ gridTemplateColumns: '1.4fr 1.4fr 1fr', cursor: 'default' }}>
                  <span className="row-name">{r.name}{r.leg && <span className="leg-badge">{r.leg}</span>}</span>
                  <span className="row-detail">{r.ticketType} × {r.count}枚（{stageLabel(r.stageId)}）</span>
                  <span className={`checkin-chip ${r.isCheckedIn ? 'done' : ''}`} style={{ justifySelf: 'end', cursor: 'default' }}>
                    {r.isCheckedIn ? <><Check size={13} /> 来場済</> : '未来場'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}