import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Check, Plus, Minus, Trash2, Shield, Video, RotateCcw, Tag, Sparkles, Calendar, User, Eye } from 'lucide-react';
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
  const [actualProdId, setActualProdId] = useState(productionId);
  const [stages, setStages] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState('master');
  const [seatMap, setSeatMap] = useState(INITIAL_65_SEATS_MAP());
  const [reservations, setReservations] = useState([]);
  const [selectedSeatInfo, setSelectedSeatInfo] = useState(null);

  // 編集ツール: 'front_row' | 'reserved' | 'available' | 'reserved_staff' | 'equipment'
  const [activeTool, setActiveTool] = useState('front_row');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!productionId) return;

      // 1. 公演情報の特定（短縮ID対応）
      let targetProdId = productionId;
      if (productionId.length !== 36) {
        const { data: prodData } = await supabase
          .from('productions')
          .select('id')
          .like('id', `${productionId}%`)
          .limit(1)
          .maybeSingle();
        if (prodData) targetProdId = prodData.id;
      }
      setActualProdId(targetProdId);

      // 2. ステージ一覧取得（performance_date / stage_date両対応）
      const { data: stageData, error: stageErr } = await supabase
        .from('stages')
        .select('*')
        .eq('production_id', targetProdId)
        .order('performance_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!stageErr && stageData) {
        setStages(stageData);
      }

      // 3. マスタ座席表取得
      const { data: mapData } = await supabase
        .from('seat_maps')
        .select('*')
        .eq('production_id', targetProdId)
        .maybeSingle();

      if (mapData && mapData.seat_data) {
        setSeatMap(mapData.seat_data);
      } else {
        setSeatMap(INITIAL_65_SEATS_MAP());
      }

      // 4. 予約データ取得
      const { data: resData } = await supabase
        .from('reservations')
        .select('id, stage_id, customer_name, count, memo, staff_name, ticket_types(name)')
        .eq('production_id', targetProdId);

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
        production_id: actualProdId || productionId,
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

  // 選択中ステージの予約リスト
  const currentStageRes = reservations.filter(r => r.stage_id === selectedStageId);
  const totalReservedSeats = currentStageRes.reduce((sum, r) => sum + (r.count || 1), 0);

  // 座席クリック時の処理（マスタ編集 or 予約者情報確認）
  const handleSeatClick = (row, index, seatAssignedRes = null) => {
    if (selectedStageId !== 'master') {
      if (seatAssignedRes) {
        setSelectedSeatInfo(seatAssignedRes);
      }
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

  // 席の追加・削除
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

  const handleRemoveSeatFromRow = (row) => {
    setSeatMap(prev => {
      const newMap = { ...prev };
      if (!newMap[row] || newMap[row].length === 0) return prev;
      newMap[row] = newMap[row].slice(0, -1);
      handleSaveSeatMap(newMap);
      return { ...newMap };
    });
  };

  const handleAddRow = () => {
    const existingRows = Object.keys(seatMap);
    const lastRowChar = existingRows[existingRows.length - 1] || '@';
    const nextRowChar = String.fromCharCode(lastRowChar.charCodeAt(0) + 1);

    if (nextRowChar > 'Z') return;

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

  const handleRemoveLastRow = () => {
    const existingRows = Object.keys(seatMap);
    if (existingRows.length <= 1) return;
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
        return { bg: '#e0e7ff', border: COLORS.indigo, color: COLORS.indigo, label: '🎟️ 指定席', short: '指' };
      case 'available':
        return { bg: COLORS.surface, border: COLORS.border, color: COLORS.text, label: '自由席', short: '' };
      case 'reserved_staff':
        return { bg: '#fee2e2', border: COLORS.danger, color: COLORS.danger, label: '関係者留め', short: '留' };
      case 'equipment':
        return { bg: '#f3f4f6', border: '#9ca3af', color: '#4b5563', label: '機材卓', short: '卓' };
      default:
        return { bg: COLORS.surface, border: COLORS.border, color: COLORS.text, label: '', short: '' };
    }
  };

  // 集計
  let frontRowCount = 0;
  let reservedCount = 0;
  let availableCount = 0;
  let staffKeepCount = 0;

  Object.values(seatMap).forEach(rowList => {
    rowList.forEach(s => {
      if (s.status === 'front_row') frontRowCount++;
      else if (s.status === 'reserved') reservedCount++;
      else if (s.status === 'available') availableCount++;
      else if (s.status === 'reserved_staff') staffKeepCount++;
    });
  });

  const totalCapacity = frontRowCount + reservedCount + availableCount + staffKeepCount;
  const remainingSeats = totalCapacity - totalReservedSeats;

  // 予約を座席順に疑似割り当て（個別ステージ表示時）
  let resIndexCounter = 0;
  const flatReservations = [];
  currentStageRes.forEach(r => {
    for (let c = 0; c < (r.count || 1); c++) {
      flatReservations.push(r);
    }
  });

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

        {/* ステージ切り替えセレクター */}
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color={COLORS.gold} />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>表示・編集対象:</span>
          </div>

          <select
            value={selectedStageId}
            onChange={(e) => {
              setSelectedStageId(e.target.value);
              setSelectedSeatInfo(null);
            }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${COLORS.gold}`, fontSize: '13px', fontWeight: 700, backgroundColor: '#fffdf9', color: COLORS.text, minWidth: '260px' }}
          >
            <option value="master">⚙️ 基本マップ設定（全ステージ共通マスタ）</option>
            {stages.map(st => {
              const dStr = st.performance_date || st.stage_date || '日程未設定';
              return (
                <option key={st.id} value={st.id}>
                  📅 {dStr} {st.start_time?.slice(0, 5)}開演 {st.team_name ? `(${st.team_name})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* サマリーカード */}
        {selectedStageId === 'master' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: COLORS.muted }}>総座席数</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.text }}>{totalCapacity} 席</div>
            </div>
            <div style={{ backgroundColor: '#fffbeb', border: `1px solid ${COLORS.gold}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>最前列 (+500円)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.gold }}>{frontRowCount} 席</div>
            </div>
            <div style={{ backgroundColor: '#eef2ff', border: `1px solid ${COLORS.indigo}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: COLORS.indigo, fontWeight: 700 }}>指定席</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.indigo }}>{reservedCount} 席</div>
            </div>
            <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: COLORS.muted }}>自由席</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.text }}>{availableCount} 席</div>
            </div>
            <div style={{ backgroundColor: '#fee2e2', border: `1px solid ${COLORS.danger}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: COLORS.danger, fontWeight: 700 }}>関係者留め</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.danger }}>{staffKeepCount} 席</div>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#eef2ff', border: `1.5px solid ${COLORS.indigo}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.indigo, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Eye size={14} /> このステージの配席・予約状況
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.text, marginTop: '2px' }}>
                予約済み: <span style={{ color: COLORS.danger }}>{totalReservedSeats} 席</span> / 残席: <span style={{ color: COLORS.success }}>{Math.max(0, remainingSeats)} 席</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedStageId('master')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${COLORS.indigo}`, backgroundColor: '#ffffff', color: COLORS.indigo, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              マスタ編集に戻る
            </button>
          </div>
        )}

        {/* 塗り分けツールバー（マスタ時のみ） */}
        {selectedStageId === 'master' && (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} /> ツールを選択して席をタップすると塗り分けできます
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className={`tool-btn ${activeTool === 'front_row' ? 'active' : ''}`} onClick={() => setActiveTool('front_row')}>
                <Tag size={13} color={COLORS.gold} /> 👑 最前列 (+500円)
              </button>
              <button className={`tool-btn ${activeTool === 'reserved' ? 'active' : ''}`} onClick={() => setActiveTool('reserved')}>
                <Tag size={13} color={COLORS.indigo} /> 🎟️ 指定席
              </button>
              <button className={`tool-btn ${activeTool === 'available' ? 'active' : ''}`} onClick={() => setActiveTool('available')}>
                <Check size={13} /> 自由席
              </button>
              <button className={`tool-btn ${activeTool === 'reserved_staff' ? 'active' : ''}`} onClick={() => setActiveTool('reserved_staff')}>
                <Shield size={13} color={COLORS.danger} /> 関係者留め
              </button>
              <button className={`tool-btn ${activeTool === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTool('equipment')}>
                <Video size={13} color="#4b5563" /> 機材卓
              </button>
              <button onClick={handleResetTo65} className="tool-btn" style={{ marginLeft: 'auto', color: COLORS.gold }}>
                <RotateCcw size={13} /> 65席に初期化
              </button>
            </div>
          </div>
        )}

        {/* 🎭 客席マップ描画エリア */}
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
                  
                  {/* 左側の席数操作（マスタ時のみ） */}
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

                      // ステージ日時表示時: 予約が入っているか判定
                      let isOccupied = false;
                      let assignedRes = null;
                      if (selectedStageId !== 'master' && seat.status !== 'equipment' && seat.status !== 'reserved_staff') {
                        if (resIndexCounter < flatReservations.length) {
                          isOccupied = true;
                          assignedRes = flatReservations[resIndexCounter];
                          resIndexCounter++;
                        }
                      }

                      return (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(row, idx, assignedRes)}
                          className="seat-box"
                          style={{
                            backgroundColor: isOccupied ? 'rgba(232,90,69,0.15)' : style.bg,
                            borderColor: isOccupied ? COLORS.danger : style.border,
                            color: isOccupied ? COLORS.danger : style.color,
                          }}
                          title={isOccupied ? `${row}-${seat.num}: ${assignedRes?.customer_name} 様 (${assignedRes?.ticket_types?.name || '予約済'})` : `${row}-${seat.num} (${style.label})`}
                        >
                          <span style={{ fontSize: '10px', opacity: 0.8 }}>{seat.num}</span>
                          <span style={{ fontSize: '9px', fontWeight: 900 }}>
                            {isOccupied ? '済' : style.short}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <span style={{ width: '18px', fontWeight: 800, fontSize: '13px', color: COLORS.gold, textAlign: 'center' }}>
                    {row}
                  </span>

                  {/* 右側の席追加（マスタ時のみ） */}
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

          {/* 行（列）の増減（マスタ時のみ） */}
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
            {selectedStageId !== 'master' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(232,90,69,0.2)', border: `1px solid ${COLORS.danger}` }} /> 🔴 予約済み（済）
              </span>
            )}
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