import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Check, RefreshCw, Shield, Video, Eye, RotateCcw, Tag, Sparkles, Users, Calendar } from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

// 布施PEベース 基本客席グリッド（A列〜G列）
const INITIAL_PE_BASE_MAP = () => {
  return {
    'A': [
      { id: 'A-1', row: 'A', num: 1, status: 'front_row' },
      { id: 'A-2', row: 'A', num: 2, status: 'front_row' },
      { id: 'A-3', row: 'A', num: 3, status: 'front_row' },
      { id: 'A-4', row: 'A', num: 4, status: 'front_row' },
      { id: 'A-5', row: 'A', num: 5, status: 'front_row' },
      { id: 'A-6', row: 'A', num: 6, status: 'front_row' },
    ],
    'B': [
      { id: 'B-1', row: 'B', num: 1, status: 'reserved' },
      { id: 'B-2', row: 'B', num: 2, status: 'reserved' },
      { id: 'B-3', row: 'B', num: 3, status: 'equipment' },
      { id: 'B-4', row: 'B', num: 4, status: 'reserved' },
      { id: 'B-5', row: 'B', num: 5, status: 'reserved' },
      { id: 'B-6', row: 'B', num: 6, status: 'reserved' },
      { id: 'B-7', row: 'B', num: 7, status: 'reserved' },
    ],
    'C': [
      { id: 'C-1', row: 'C', num: 1, status: 'available' },
      { id: 'C-2', row: 'C', num: 2, status: 'available' },
      { id: 'C-3', row: 'C', num: 3, status: 'equipment' },
      { id: 'C-4', row: 'C', num: 4, status: 'available' },
      { id: 'C-5', row: 'C', num: 5, status: 'available' },
      { id: 'C-6', row: 'C', num: 6, status: 'available' },
      { id: 'C-7', row: 'C', num: 7, status: 'available' },
    ],
    'D': [
      { id: 'D-1', row: 'D', num: 1, status: 'available' },
      { id: 'D-2', row: 'D', num: 2, status: 'available' },
      { id: 'D-3', row: 'D', num: 3, status: 'equipment' },
      { id: 'D-4', row: 'D', num: 4, status: 'available' },
      { id: 'D-5', row: 'D', num: 5, status: 'available' },
      { id: 'D-6', row: 'D', num: 6, status: 'available' },
      { id: 'D-7', row: 'D', num: 7, status: 'available' },
    ],
    'E': [
      { id: 'E-1', row: 'E', num: 1, status: 'available' },
      { id: 'E-2', row: 'E', num: 2, status: 'available' },
      { id: 'E-3', row: 'E', num: 3, status: 'equipment' },
      { id: 'E-4', row: 'E', num: 4, status: 'available' },
      { id: 'E-5', row: 'E', num: 5, status: 'available' },
      { id: 'E-6', row: 'E', num: 6, status: 'available' },
      { id: 'E-7', row: 'E', num: 7, status: 'available' },
    ],
    'F': [
      { id: 'F-1', row: 'F', num: 1, status: 'available' },
      { id: 'F-2', row: 'F', num: 2, status: 'available' },
      { id: 'F-3', row: 'F', num: 3, status: 'equipment' },
      { id: 'F-4', row: 'F', num: 4, status: 'available' },
      { id: 'F-5', row: 'F', num: 5, status: 'available' },
      { id: 'F-6', row: 'F', num: 6, status: 'available' },
      { id: 'F-7', row: 'F', num: 7, status: 'available' },
    ],
    'G': [
      { id: 'G-1', row: 'G', num: 1, status: 'reserved_staff' },
      { id: 'G-2', row: 'G', num: 2, status: 'reserved_staff' },
      { id: 'G-3', row: 'G', num: 3, status: 'available' },
      { id: 'G-4', row: 'G', num: 4, status: 'equipment' },
      { id: 'G-5', row: 'G', num: 5, status: 'available' },
      { id: 'G-6', row: 'G', num: 6, status: 'available' },
      { id: 'G-7', row: 'G', num: 7, status: 'available' },
    ],
  };
};

export default function AdminSeatSettings({ productionId, org, onBack }) {
  const [stages, setStages] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState('master'); // 'master' または stage.id
  const [seatMap, setSeatMap] = useState(INITIAL_PE_BASE_MAP());
  const [reservations, setReservations] = useState([]);

  // 編集ツール: 'front_row' | 'reserved' | 'available' | 'reserved_staff' | 'equipment'
  const [activeTool, setActiveTool] = useState('front_row');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      if (!productionId) return;

      // 1. ステージ一覧取得
      const { data: stageData } = await supabase
        .from('stages')
        .select('*')
        .eq('production_id', productionId)
        .order('performance_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (stageData) setStages(stageData);

      // 2. マスタ座席表取得
      const { data: mapData } = await supabase
        .from('seat_maps')
        .select('*')
        .eq('production_id', productionId)
        .maybeSingle();

      if (mapData && mapData.seat_data) {
        setSeatMap(mapData.seat_data);
      } else {
        setSeatMap(INITIAL_PE_BASE_MAP());
      }

      // 3. 予約データ取得（ステージごとの埋まり状況表示用）
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

  // 座席保存 (マスタ設定)
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

  // 座席クリック時の切り替え
  const handleSeatClick = (row, index) => {
    if (selectedStageId !== 'master') {
      alert('開演回別表示中は閲覧専用です。座席設定を変更する場合は「基本マップ設定（全ステージ共通）」を選択してください。');
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

  // 全席リセット
  const handleResetAll = () => {
    if (confirm('すべての座席指定をリセットして通常（自由席）に戻しますか？')) {
      const newMap = { ...seatMap };
      Object.keys(newMap).forEach(row => {
        newMap[row] = newMap[row].map(seat => ({ ...seat, status: 'available' }));
      });
      setSeatMap(newMap);
      handleSaveSeatMap(newMap);
    }
  };

  // スタイル定義
  const getSeatStyle = (status) => {
    switch (status) {
      case 'front_row':
        return { bg: '#fef3c7', border: COLORS.gold, color: '#b45309', label: '👑 最前列指定席 (+500円)', short: '最' };
      case 'reserved':
        return { bg: '#e0e7ff', border: COLORS.indigo, color: COLORS.indigo, label: '🎟️ 指定席エリア', short: '指' };
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

  // 選択中ステージの予約情報
  const currentStageReservations = reservations.filter(r => r.stage_id === selectedStageId);
  const totalReservedCount = currentStageReservations.reduce((sum, r) => sum + (r.count || 1), 0);

  // 座席数の集計
  let frontRowCount = 0;
  let reservedCount = 0;
  let availableCount = 0;
  let blockedCount = 0;

  Object.values(seatMap).forEach(rowList => {
    rowList.forEach(s => {
      if (s.status === 'front_row') frontRowCount++;
      else if (s.status === 'reserved') reservedCount++;
      else if (s.status === 'available') availableCount++;
      else blockedCount++;
    });
  });

  const totalSeats = frontRowCount + reservedCount + availableCount;

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
          width: 38px;
          height: 38px;
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

        @media (max-width: 480px) {
          .seat-box {
            width: 32px;
            height: 32px;
            font-size: 10px;
          }
        }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

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
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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

        {/* 座席数サマリー */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: COLORS.muted }}>総有効席数</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.text }}>{totalSeats} 席</div>
          </div>
          <div style={{ backgroundColor: '#fffbeb', border: `1px solid ${COLORS.gold}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>最前列指定席</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.gold }}>{frontRowCount} 席</div>
          </div>
          <div style={{ backgroundColor: '#eef2ff', border: `1px solid ${COLORS.indigo}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: COLORS.indigo, fontWeight: 700 }}>一般指定席</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.indigo }}>{reservedCount} 席</div>
          </div>
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: COLORS.muted }}>自由席</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: COLORS.text }}>{availableCount} 席</div>
          </div>
        </div>

        {/* 塗り分けツールバー（マスタ編集時のみ有効） */}
        {selectedStageId === 'master' ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} /> 塗り分けツールを選択して、下の座席をタップしてください
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                className={`tool-btn ${activeTool === 'front_row' ? 'active' : ''}`}
                onClick={() => setActiveTool('front_row')}
              >
                <Tag size={13} color={COLORS.gold} /> 👑 最前列指定 (+500円)
              </button>
              <button
                className={`tool-btn ${activeTool === 'reserved' ? 'active' : ''}`}
                onClick={() => setActiveTool('reserved')}
              >
                <Tag size={13} color={COLORS.indigo} /> 🎟️ 一般指定席
              </button>
              <button
                className={`tool-btn ${activeTool === 'available' ? 'active' : ''}`}
                onClick={() => setActiveTool('available')}
              >
                <Check size={13} /> 通常/自由席
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
                <Video size={13} color="#4b5563" /> 機材卓・手すり
              </button>
              <button
                onClick={handleResetAll}
                className="tool-btn"
                style={{ marginLeft: 'auto', color: COLORS.danger }}
              >
                <RotateCcw size={13} /> 一括クリア
              </button>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#eef2ff', border: `1px solid ${COLORS.indigo}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.indigo }}>
              👁️ 現在この開演回の配席状況を確認中（予約数: {totalReservedCount} 名）
            </div>
            <button
              onClick={() => setSelectedStageId('master')}
              style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${COLORS.indigo}`, backgroundColor: '#fff', color: COLORS.indigo, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              基本マップ編集に戻る
            </button>
          </div>
        )}

        {/* 🎭 客席マップ描画エリア */}
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '20px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          
          {/* 舞台 (STAGE) */}
          <div style={{ width: '80%', margin: '0 auto 20px auto', padding: '8px', backgroundColor: COLORS.gold, color: '#ffffff', textAlign: 'center', fontWeight: 800, borderRadius: '6px', fontSize: '13px', letterSpacing: '2px' }}>
            舞台 (STAGE) / 鏡幕側
          </div>

          {/* 座席グリッド */}
          <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '380px', alignItems: 'center' }}>
              {Object.keys(seatMap).map(row => (
                <div key={row} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '18px', fontWeight: 800, fontSize: '13px', color: COLORS.gold, textAlign: 'center' }}>
                    {row}
                  </span>

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
                </div>
              ))}
            </div>
          </div>

          {/* 凡例 */}
          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fef3c7', border: `1px solid ${COLORS.gold}` }} /> 👑 最前列指定席 (+500円)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#e0e7ff', border: `1px solid ${COLORS.indigo}` }} /> 🎟️ 指定席
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }} /> 自由席
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fee2e2', border: `1px solid ${COLORS.danger}` }} /> 関係者留め
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f3f4f6', border: '1px solid #9ca3af' }} /> 機材卓
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}