import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Zap, Calendar, X, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient'; // ⭐ Supabaseクライアントをインポート

const INITIAL_STAGES = [
  { id: '1', dateTime: '2026-08-01T15:00', teamTag: 'Aチーム', capacity: 80, reservedCount: 45, status: 'open' },
  { id: '2', dateTime: '2026-08-01T19:00', teamTag: 'Bチーム', capacity: 80, reservedCount: 80, status: 'sold_out' },
  { id: '3', dateTime: '2026-08-02T13:00', teamTag: 'Bチーム', capacity: 80, reservedCount: 20, status: 'open' },
  { id: '4', dateTime: '2026-08-02T17:00', teamTag: 'Aチーム', capacity: 80, reservedCount: 0, status: 'before' },
];

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
  success: '#1f9a56',
  danger: '#e85a45',
};

export default function AdminStageSettings({ productionId, onBack }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [newDateTime, setNewDateTime] = useState('2026-08-03T14:00');
  const [newTeamTag, setNewTeamTag] = useState('Aチーム');
  const [newCapacity, setNewCapacity] = useState(80);

  const [bulkCapacity, setBulkCapacity] = useState(80);

  // 1. Supabaseからステージ一覧を取得
  const fetchStages = async () => {
    setLoading(true);
    let query = supabase.from('stages').select('*').order('date_time', { ascending: true });

    if (productionId) {
      query = query.eq('production_id', productionId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const formatted = data.map(item => ({
        id: item.id,
        dateTime: item.date_time || '2026-08-01T15:00',
        teamTag: item.team_tag || '',
        capacity: item.capacity || 80,
        reservedCount: item.reserved_count || 0,
        status: item.status || 'open',
      }));
      setStages(formatted);
    } else {
      setStages(INITIAL_STAGES);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStages();
  }, [productionId]);

  // DBへキャパ数を更新 (UPDATE)
  const updateStageCapacity = async (id, nextCap) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, capacity: nextCap } : s));
    await supabase.from('stages').update({ capacity: nextCap }).eq('id', id);
  };

  // 1席ずつの調整
  const handleCapacityChange = (id, delta) => {
    const target = stages.find(s => s.id === id);
    if (!target) return;
    const nextCap = Math.max(0, target.capacity + delta);
    updateStageCapacity(id, nextCap);
  };

  // 直接入力でのキャパ変更
  const handleCapacityDirectInput = (id, value) => {
    const val = Math.max(0, Number(value));
    updateStageCapacity(id, val);
  };

  // ステータス変更 (UPDATE)
  const handleStatusChange = async (id, newStatus) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    await supabase.from('stages').update({ status: newStatus }).eq('id', id);
  };

  // ステージ追加 (INSERT)
  const handleAddStage = async () => {
    const payload = {
      production_id: productionId,
      date_time: newDateTime,
      team_tag: newTeamTag,
      capacity: Number(newCapacity),
      status: 'before',
    };

    const { error } = await supabase.from('stages').insert([payload]);

    if (error) {
      alert('ステージ追加に失敗しました: ' + error.message);
    } else {
      fetchStages();
      setIsAddModalOpen(false);
    }
  };

  // キャパ一括変更
  const handleApplyBulkCapacity = async () => {
    const targetCap = Number(bulkCapacity);
    setStages(prev => prev.map(s => ({ ...s, capacity: targetCap })));

    if (productionId) {
      await supabase.from('stages').update({ capacity: targetCap }).eq('production_id', productionId);
    }
    setIsBulkModalOpen(false);
  };

  const formatDateTime = (isoStr) => {
    const d = new Date(isoStr);
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const day = dayNames[d.getDay()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}月${date}日(${day}) ${hours}:${minutes}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .form-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 14px;
          box-shadow: 0 2px 4px rgba(43, 36, 56, 0.04);
        }

        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: ${COLORS.gold};
          margin-bottom: 6px;
        }

        .text-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 15px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          box-sizing: border-box;
        }
        .text-input:focus { outline: none; border-color: ${COLORS.gold}; }

        .btn-gold {
          width: 100%;
          padding: 14px;
          background-color: ${COLORS.gold};
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          transition: filter 0.15s ease;
          box-shadow: 0 2px 6px rgba(201, 121, 31, 0.25);
        }
        .btn-gold:hover { filter: brightness(1.08); }

        .btn-outline {
          padding: 10px 14px;
          background-color: ${COLORS.surface};
          color: ${COLORS.gold};
          border: 1px solid ${COLORS.border};
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s ease;
        }
        .btn-outline:hover { background-color: ${COLORS.surfaceAlt}; }

        .step-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background-color: ${COLORS.surface};
          color: ${COLORS.gold};
          border: 1px solid ${COLORS.border};
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.1s ease;
        }
        .step-btn:hover { background-color: ${COLORS.surfaceAlt}; }
        .step-btn:active { transform: scale(0.95); }

        .cap-input {
          width: 60px;
          text-align: center;
          padding: 6px 4px;
          border-radius: 8px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 15px;
          font-weight: 700;
          font-family: 'Zen Kaku Gothic New', sans-serif;
        }
      `}</style>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* ヘッダーナビゲーション */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button 
            onClick={onBack} 
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: "'Shippori Mincho', serif", color: COLORS.text, fontWeight: 700 }}>
            日程・座席（キャパ設定）
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* ショートカット */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setIsBulkModalOpen(true)} className="btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
            <Zap size={15} /> キャパを一括変更
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-gold" style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Plus size={16} /> ステージを追加
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '20px', color: COLORS.muted }}>データを読み込み中...</div>}

        {/* ステージカード一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stages.map(stage => {
            const isFull = stage.reservedCount >= stage.capacity;

            return (
              <div key={stage.id} className="form-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: "'Shippori Mincho', serif", color: COLORS.text, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} color={COLORS.gold} /> {formatDateTime(stage.dateTime)}
                    </span>
                    {stage.teamTag && (
                      <span style={{ marginLeft: '10px', fontSize: '11px', backgroundColor: COLORS.surfaceAlt, color: COLORS.gold, padding: '3px 8px', borderRadius: '4px', border: `1px solid ${COLORS.border}`, fontWeight: 700 }}>
                        {stage.teamTag}
                      </span>
                    )}
                  </div>

                  <select
                    value={stage.status}
                    onChange={(e) => handleStatusChange(stage.id, e.target.value)}
                    style={{
                      backgroundColor: stage.status === 'open' ? 'rgba(31,154,86,0.1)' : stage.status === 'sold_out' ? 'rgba(232,90,69,0.1)' : COLORS.surfaceAlt,
                      color: stage.status === 'open' ? COLORS.success : stage.status === 'sold_out' ? COLORS.danger : COLORS.muted,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: "'Zen Kaku Gothic New', sans-serif"
                    }}
                  >
                    <option value="before">受付前</option>
                    <option value="open">販売中</option>
                    <option value="sold_out">完売</option>
                    <option value="closed">終了</option>
                  </select>
                </div>

                {/* キャパ調整エリア */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surfaceAlt, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>
                  <div>
                    <div style={{ fontSize: '11px', color: COLORS.muted }}>現在の予約状況</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: isFull ? COLORS.danger : COLORS.success, fontFamily: "'Shippori Mincho', serif" }}>
                      予約 {stage.reservedCount} 件
                      {isFull && <span style={{ fontSize: '11px', marginLeft: '6px', color: COLORS.danger }}>(満席)</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: COLORS.muted, fontWeight: 700 }}>定員:</span>
                    <button onClick={() => handleCapacityChange(stage.id, -1)} className="step-btn">
                      −
                    </button>

                    <input 
                      type="number" 
                      value={stage.capacity} 
                      onChange={(e) => handleCapacityDirectInput(stage.id, e.target.value)}
                      className="cap-input"
                    />
                    <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: 700 }}>席</span>

                    <button onClick={() => handleCapacityChange(stage.id, 1)} className="step-btn">
                      ＋
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 追加モーダル */}
      {isAddModalOpen && (
        <div 
          onClick={() => setIsAddModalOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', backgroundColor: COLORS.surface, borderRadius: '20px', padding: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: COLORS.text, fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>ステージ（公演回）の追加</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'rgba(201,121,31,0.1)', border: 'none', color: COLORS.muted, width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">開演日時</label>
                <input 
                  type="datetime-local" 
                  value={newDateTime} 
                  onChange={(e) => setNewDateTime(e.target.value)}
                  className="text-input"
                />
              </div>

              <div>
                <label className="input-label">担当チーム（タグ）</label>
                <input 
                  type="text" 
                  value={newTeamTag} 
                  onChange={(e) => setNewTeamTag(e.target.value)}
                  placeholder="例: Aチーム, シングルキャスト"
                  className="text-input"
                />
              </div>

              <div>
                <label className="input-label">初期キャパ数 (席)</label>
                <input 
                  type="number" 
                  value={newCapacity} 
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="text-input"
                />
              </div>

              <button onClick={handleAddStage} className="btn-gold" style={{ marginTop: '8px' }}>
                ステージを追加する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* キャパ一括変更モーダル */}
      {isBulkModalOpen && (
        <div 
          onClick={() => setIsBulkModalOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', backgroundColor: COLORS.surface, borderRadius: '20px', padding: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: COLORS.text, fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>全ステージのキャパ一括変更</h3>
            <p style={{ fontSize: '12px', color: COLORS.muted, margin: '0 0 16px 0', lineHeight: '1.5' }}>登録されている全ステージの席数を一括で指定した数値に書き換えます。</p>

            <input 
              type="number" 
              value={bulkCapacity} 
              onChange={(e) => setBulkCapacity(e.target.value)}
              className="text-input"
              style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsBulkModalOpen(false)} className="btn-outline" style={{ flex: 1, justifyContent: 'center' }}>キャンセル</button>
              <button onClick={handleApplyBulkCapacity} className="btn-gold" style={{ flex: 1 }}>一括適用</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}