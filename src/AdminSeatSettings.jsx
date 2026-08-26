import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Check, Plus, Minus, Trash2, Shield, Video, RotateCcw, Tag, Sparkles, Calendar } from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

// 布施PEベース 65席構成（A〜H列）
const INITIAL_65_SEATS_MAP = () => {
  return {
    'A': Array.from({ length: 8 }, (_, i) => ({ id: `A-${i+1}`, row: 'A', num: i + 1, status: 'front_row' })),
    'B': Array.from({ length: 8 }, (_, i) => ({ id: `B-${i+1}`, row: 'B', num: i + 1, status: i === 2 ? 'equipment' : 'reserved' })),
    'C': Array.from({ length: 8 }, (_, i) => ({ id: `C-${i+1}`, row: 'C', num: i + 1, status: i === 2 ? 'equipment' : 'available' })),
    'D': Array.from({ length: 9 }, (_, i) => ({ id: `D-${i+1}`, row: 'D', num: i + 1, status: i === 2 ? 'equipment' : 'available' })),
    'E': Array.from({ length: 9 }, (_, i) => ({ id: `E-${i+1}`, row: 'E', num: i + 1, status: i === 2 ? 'equipment' : 'available' })),
    'F': Array.from({ length: 9 }, (_, i) => ({ id: `F-${i+1}`, row: 'F', num: i + 1, status: i === 2 ? 'equipment' : 'available' })),
    'G': Array.from({ length: 8 }, (_, i) => ({ id: `G-${i+1}`, row: 'G', num: i + 1, status: i < 2 ? 'reserved_staff' : 'available' })),
    'H': Array.from({ length: 6 }, (_, i) => ({ id: `H-${i+1}`, row: 'H', num: i + 1, status: 'available' })),
  };
};

export default function AdminSeatSettings({ productionId, org, onBack }) {
  const [stages, setStages] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState('master');
  const [seatMap, setSeatMap] = useState(INITIAL_65_SEATS_MAP());
  const [reservations, setReservations] = useState([]);

  // 編集ツール: 'front_row' | 'reserved' | 'available' | 'reserved_staff' | 'equipment'
  const [activeTool, setActiveTool] = useState('front_row');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!productionId) return;

      const { data: stageData } = await supabase
        .from('stages')
        .select('*')
        .eq('production_id', productionId)
        .order('performance_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (stageData) setStages(stageData);

      const { data: mapData } = await supabase
        .from('seat_maps')
        .select('*')
        .eq('production_id', productionId)
        .maybeSingle();

      if (mapData && mapData.seat_data) {
        setSeatMap(mapData.seat_data);
      } else {
        setSeatMap(INITIAL_65_SEATS_MAP());
      }

      const { data: resData } = await supabase
        .from('reservations')
        .select('id, stage_id, customer_name, count, memo')
        .eq('production_id', productionId);

      if (resData) setReservations(resData);
    } catch (e) {
      console.error('Fetch seat data error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productionId]);

  const handleSaveSeatMap = async (newMap) => {
    setSaving(true);
    try {
      const payload = {
        production_id: productionId,
        seat_data: newMap,
      };

      const { error } = await supabase
        .from('seat_maps')
        .upsert(payload, { onConflict: 'production_id' });

      if (error) throw error;
    } catch (e) {
      console.error('Save seat map error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSeatClick = (row, index) => {
    if (selectedStageId !== 'master') {
      alert('開演回別表示中は閲覧専用です。「基本マップ設定」を選択して変更してください。');
      return;
    }

    setSeatMap(prev => {
      const newMap = { ...prev };
      const currentStatus = newMap[row][index].status;
      newMap[row][index].status = currentStatus === activeTool ? 'available' : activeTool;
      handleSaveSeatMap(newMap);
      return { ...newMap };
    });
  };

  // 席の追加（末尾に1席プラス）
  const handleAddSeatToRow = (row) => {
    setSeatMap(prev => {
      const newMap = { ...prev };
      const currentSeats = newMap[row] || [];
      const newNum = currentSeats.length + 1;
      newMap[row] = [...currentSeats, { id: `${row}-${newNum}`, row: row, num: newNum, status: 'available' }];
      handleSaveSeatMap(newMap);
      return { ...newMap };
    });
  };

  // 席の削除（末尾の1席マイナス）
  const handleRemoveSeatFromRow = (row) => {
    setSeatMap(prev => {
      const newMap = { ...prev };
      if (!newMap[row] || newMap[row].length === 0) return prev;
      newMap[row] = newMap[row].slice(0, -1);
      handleSaveSeatMap(newMap);
      return { ...newMap };
    });
  };

  // 新しい行（列）を追加（例: I列）
  const handleAddRow = () => {
    const existingRows = Object.keys(seatMap);
    const lastRowChar = existingRows[existingRows.length - 1] || '@';
    const nextRowChar = String.fromCharCode(lastRowChar.charCodeAt(0) + 1);

    if (nextRowChar > 'Z') {
      alert('これ以上行を追加できません');
      return;
    }

    setSeatMap(prev => {
      const newMap = { ...prev };
      newMap[nextRowChar] = Array.from({ length: 8 }, (_, i) => ({
        id: `${nextRowChar}-${i + 1}`,
        row: nextRowChar,
        num: i + 1,
        status: 'available'
      }));
      handleSaveSeatMap(newMap);
      return { ...newMap };
    });
  };

  // 最後の行を削除
  const handleRemoveLastRow = () => {
    const existingRows = Object.keys(seatMap);
    if (existingRows.length <= 1) {
      alert('これ以上行を削除できません');
      return;
    }
    const lastRowChar = existingRows[existingRows.length - 1];

    if (confirm(`${lastRowChar}列を削除してよろしいですか？`)) {
      setSeatMap(prev => {
        const newMap = { ...prev };
        delete newMap[lastRowChar];
        handleSaveSeatMap(newMap);
        return { ...newMap };
      });
    }
  };

  // 65席初期配置にリセット
  const handleResetTo65 = () => {
    if (confirm('布施PEベース標準の65席マップにリセットしますか？')) {
      const defaultMap = INITIAL_65_SEATS_MAP();
      setSeatMap(defaultMap);
      handleSaveSeatMap(defaultMap);
    }
  };

  const getSeatStyle = (status) => {
    switch (status) {
      case 'front_row':
        return { bg: '#fef3c7', border: COLORS.gold, color: '#b45309', label: '👑 最前列指定 (+500円)', short: '最' };
      case 'reserved':
        return { bg: '#e0e7ff', border: COLORS.indigo, color: COLORS.indigo, label: '🎟️ 一般指定席', short: '指' };
      case 'available':
        return { bg: COLORS.surface, border: COLORS.border, color: COLORS.text, label: '通常 / 自由席', short: '' };
      case 'reserved_staff':
        return { bg: '#fee2e2', border: COLORS.danger, color: COLORS.danger, label: '関係者留め席', short: '留' };
      case 'equipment':
        return { bg: '#f3f4f6', border: '#9ca3af', color: '#4b5563', label: '機材卓・手すり', short: '卓' };
      default:
        return { bg: COLORS.surface, border: COLORS.border, color: COLORS.text, label: '', short: '' };
    }
  };

  // 集計
  let frontRowCount = 0;
  let reservedCount = 0;
  let availableCount = 0;
  let staffKeepCount = 0;
  let equipmentCount = 0;

  Object.values(seatMap).forEach(rowList => {
    rowList.forEach(s => {
      if (s.status === 'front_row') frontRowCount++;
      else if (s.status === 'reserved') reservedCount++;
      else if (s.status === 'available') availableCount++;
      else if (s.status === 'reserved_staff') staffKeepCount++;
      else if (s.status === 'equipment') equipmentCount++;
    });
  });

  const totalCapacity = frontRowCount + reservedCount + availableCount + staffKeepCount;
  const totalSalesSeats = frontRowCount + reservedCount + availableCount;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: FONTS.body, padding: '20px 16px 60px 16px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('${FONTS.importUrl}');

        .tool-btn {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1.5px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .tool-btn.active {
          border-color: ${COLORS.gold};
          background-color: #fff6e8;
          color: ${COLORS.gold};
          box-shadow: 0 2px 6px rgba(201,121,31,0.15);
        }

        .seat-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1.5px solid;
          transition: transform 0.1s ease;
          user-select: none;
        }
        .seat-box:active { transform: scale(0.95); }

        .btn-row-action {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: ${COLORS.muted};
        }
        .btn-row-action:hover {
          border-color: ${COLORS.gold};
          color: ${COLORS.gold};
        }

        @media (max-width: 480px) {
          .seat-box {
            width: 30px;
            height: 30px;
            font-size: 10px;
          }
        }
      `}</style>

      <div style={{ maxWidth: '880px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '14px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, fontFamily: FONTS.display, fontWeight: 700 }}>
            指定席・会場マップ設定
          </h1>
          <div style={{ fontSize: '12px', color: COLORS.gold, fontWeight: 700 }}>
            {saving ? '保存中...' : '自動保存済'}
          </div>
        </div>

        {/* ステージ切り替え */}
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color={COLORS.gold} />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>表示・編集対象:</span>
          </div>

          <select
            value={selectedStageId}
            onChange={(e) => setSelectedStageId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${COLORS.gold}`, fontSize: '13px', fontWeight: 700, backgroundColor: '#fffdf9', color: COLORS.text }}
          >
            <option value="master">⚙️ 基本マップ設定（全ステージ共通マスタ）</option>
            {stages.map(st => (
              <option key={st.id} value={st.id}>
                📅 {st.performance_date} {st.start_time?.slice(0, 5)}開演 {st.team_name ? `(${st.team_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 座席数・留め数サマリー */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: COLORS.muted }}>総座席（キャパ）</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: COLORS.text }}>{totalCapacity} 席</div>
          </div>
          <div style={{ backgroundColor: '#fffbeb', border: `1px solid ${COLORS.gold}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>最前列指定 (+500円)</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: COLORS.gold }}>{frontRowCount} 席</div>
          </div>
          <div style={{ backgroundColor: '#eef2ff', border: `1px solid ${COLORS.indigo}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: COLORS.indigo, fontWeight: 700 }}>指定席</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: COLORS.indigo }}>{reservedCount} 席</div>
          </div>
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: COLORS.muted }}>自由席</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: COLORS.text }}>{availableCount} 席</div>
          </div>
          <div style={{ backgroundColor: '#fee2e2', border: `1px solid ${COLORS.danger}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: COLORS.danger, fontWeight: 700 }}>関係者留め</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: COLORS.danger }}>{staffKeepCount} 席</div>
          </div>
        </div>

        {/* 塗り分けツールバー */}
        {selectedStageId === 'master' && (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} /> ツールを選択して席をタップすると塗り分けできます
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={`tool-btn ${activeTool === 'front_row' ? 'active' : ''}`}
                onClick={() => setActiveTool('front_row')}
              >
                <Tag size={13} color={COLORS.gold} /> 👑 最前列 (+500円)
              </button>
              <button
                className={`tool-btn ${activeTool === 'reserved' ? 'active' : ''}`}
                onClick={() => setActiveTool('reserved')}
              >
                <Tag size={13} color={COLORS.indigo} /> 🎟️ 指定席
              </button>
              <button
                className={`tool-btn ${activeTool === 'available' ? 'active' : ''}`}
                onClick={() => setActiveTool('available')}
              >
                <Check size={13} /> 自由席
              </button>
              <button
                className={`tool-btn ${activeTool === 'reserved_staff' ? 'active' : ''}`}
                onClick={() => setActiveTool('reserved_staff')}
              >
                <Shield size={13} color={COLORS.danger} /> 関係者留め
              </button>
              <button
                className={`tool-btn ${activeTool === 'equipment' ? 'active' : ''}`}
                onClick={() => setActiveTool('equipment')}
              >
                <Video size={13} color="#4b5563" /> 機材卓
              </button>

              <button
                onClick={handleResetTo65}
                className="tool-btn"
                style={{ marginLeft: 'auto', color: COLORS.gold }}
                title="布施PEベース65席にリセット"
              >
                <RotateCcw size={13} /> 65席に初期化
              </button>
            </div>
          </div>
        )}

        {/* 客席グリッド描画エリア */}
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '20px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          
          {/* 舞台 (STAGE) */}
          <div style={{ width: '80%', margin: '0 auto 20px auto', padding: '8px', backgroundColor: COLORS.gold, color: '#ffffff', textAlign: 'center', fontWeight: 800, borderRadius: '6px', fontSize: '13px', letterSpacing: '2px' }}>
            舞台 (STAGE)
          </div>

          {/* 各列の座席並び */}
          <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '420px', alignItems: 'center' }}>
              {Object.keys(seatMap).map(row => (
                <div key={row} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  
                  {/* 左側の席数操作（＋／−） */}
                  {selectedStageId === 'master' && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button onClick={() => handleRemoveSeatFromRow(row)} className="btn-row-action" title="末尾の1席を削除">
                        <Minus size={11} />
                      </button>
                    </div>
                  )}

                  <span style={{ width: '18px', fontWeight: 800, fontSize: '13px', color: COLORS.gold, textAlign: 'center' }}>
                    {row}
                  </span>

                  {/* 席ボタン一覧 */}
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {seatMap[row].map((seat, idx) => {
                      const style = getSeatStyle(seat.status);

                      return (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(row, idx)}
                          className="seat-box"
                          style={{
                            backgroundColor: style.bg,
                            borderColor: style.border,
                            color: style.color,
                          }}
                          title={`${row}-${seat.num} (${style.label})`}
                        >
                          <span style={{ fontSize: '10px', opacity: 0.8 }}>{seat.num}</span>
                          {style.short && <span style={{ fontSize: '9px', fontWeight: 900 }}>{style.short}</span>}
                        </button>
                      );
                    })}
                  </div>

                  <span style={{ width: '18px', fontWeight: 800, fontSize: '13px', color: COLORS.gold, textAlign: 'center' }}>
                    {row}
                  </span>

                  {/* 右側の席追加（＋） */}
                  {selectedStageId === 'master' && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button onClick={() => handleAddSeatToRow(row)} className="btn-row-action" title="この行に1席追加">
                        <Plus size={11} />
                      </button>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>

          {/* 行（列）自体の追加・削除ボタン */}
          {selectedStageId === 'master' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '14px', borderTop: `1px dashed ${COLORS.border}`, paddingTop: '12px' }}>
              <button
                onClick={handleAddRow}
                style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${COLORS.gold}`, backgroundColor: '#fff6e8', color: COLORS.gold, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} /> 行を追加（後ろに1列増やす）
              </button>
              <button
                onClick={handleRemoveLastRow}
                style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface, color: COLORS.danger, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={13} /> 最後の行を削除
              </button>
            </div>
          )}

          {/* 凡例 */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#fef3c7', border: `1px solid ${COLORS.gold}` }} /> 👑 最前列指定
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#e0e7ff', border: `1px solid ${COLORS.indigo}` }} /> 🎟️ 指定席
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }} /> 自由席
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#fee2e2', border: `1px solid ${COLORS.danger}` }} /> 関係者留め
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f3f4f6', border: '1px solid #9ca3af' }} /> 機材卓
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}