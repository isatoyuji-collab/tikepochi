import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Sparkles, Check, RefreshCw, Shield, Video, Eye, RotateCcw, Tag } from 'lucide-react';
import { supabase } from './supabaseClient'; // ⭐ Supabaseクライアントをインポート

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
  indigo: '#5457d6',
  sSeat: '#e69f00',
  aSeat: '#0072b2'
};

// 布施PEベースの仕込み図面（PDF）に忠実な客席配置データ
const INITIAL_PE_BASE_MAP = () => {
  return {
    'A': [
      { id: 'A-1', row: 'A', num: 1, status: 's_seat' },
      { id: 'A-2', row: 'A', num: 2, status: 's_seat' },
      { id: 'A-3', row: 'A', num: 3, status: 's_seat' },
      { id: 'A-4', row: 'A', num: 4, status: 's_seat' },
      { id: 'A-5', row: 'A', num: 5, status: 's_seat' },
      { id: 'A-6', row: 'A', num: 6, status: 's_seat' },
    ],
    'B': [
      { id: 'B-1', row: 'B', num: 1, status: 's_seat' },
      { id: 'B-2', row: 'B', num: 2, status: 's_seat' },
      { id: 'B-3', row: 'B', num: 3, status: 'equipment' },
      { id: 'B-4', row: 'B', num: 4, status: 's_seat' },
      { id: 'B-5', row: 'B', num: 5, status: 's_seat' },
      { id: 'B-6', row: 'B', num: 6, status: 's_seat' },
      { id: 'B-7', row: 'B', num: 7, status: 's_seat' },
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
      { id: 'E-1', row: 'E', num: 1, status: 'a_seat' },
      { id: 'E-2', row: 'E', num: 2, status: 'a_seat' },
      { id: 'E-3', row: 'E', num: 3, status: 'equipment' },
      { id: 'E-4', row: 'E', num: 4, status: 'a_seat' },
      { id: 'E-5', row: 'E', num: 5, status: 'a_seat' },
      { id: 'E-6', row: 'E', num: 6, status: 'a_seat' },
      { id: 'E-7', row: 'E', num: 7, status: 'a_seat' },
    ],
    'F': [
      { id: 'F-1', row: 'F', num: 1, status: 'a_seat' },
      { id: 'F-2', row: 'F', num: 2, status: 'a_seat' },
      { id: 'F-3', row: 'F', num: 3, status: 'equipment' },
      { id: 'F-4', row: 'F', num: 4, status: 'a_seat' },
      { id: 'F-5', row: 'F', num: 5, status: 'a_seat' },
      { id: 'F-6', row: 'F', num: 6, status: 'a_seat' },
      { id: 'F-7', row: 'F', num: 7, status: 'a_seat' },
    ],
    'G': [
      { id: 'G-1', row: 'G', num: 1, status: 'reserved_staff' },
      { id: 'G-2', row: 'G', num: 2, status: 'reserved_staff' },
      { id: 'G-3', row: 'G', num: 3, status: 'a_seat' },
      { id: 'G-4', row: 'G', num: 4, status: 'equipment' },
      { id: 'G-5', row: 'G', num: 5, status: 'a_seat' },
      { id: 'G-6', row: 'G', num: 6, status: 'a_seat' },
      { id: 'G-7', row: 'G', num: 7, status: 'a_seat' },
    ],
  };
};

export default function AdminSeatSettings({ productionId, onBack }) {
  const [seatMode, setSeatMode] = useState('movie_style');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState('オフィスナイト_布施PEベース客席(案).pdf');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 座席マップデータ
  const [seatMap, setSeatMap] = useState(INITIAL_PE_BASE_MAP());
  // 編集ツール: 'available' | 's_seat' | 'a_seat' | 'reserved_staff' | 'equipment'
  const [activeTool, setActiveTool] = useState('s_seat');
  const [showCustomerPreview, setShowCustomerPreview] = useState(false);

  // 1. Supabaseから座席マップ設定を取得
  const fetchSeatMap = async () => {
    setLoading(true);
    let query = supabase.from('seat_maps').select('*');

    if (productionId) {
      query = query.eq('production_id', productionId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const record = data[0];
      if (record.seat_data) setSeatMap(record.seat_data);
      if (record.seat_mode) setSeatMode(record.seat_mode);
      if (record.file_name) setUploadedFileName(record.file_name);
    } else {
      setSeatMap(INITIAL_PE_BASE_MAP());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSeatMap();
  }, [productionId]);

  // 2. Supabaseへ座席マップを保存 (UPSERT)
  const handleSaveSeatMap = async (newMap, newMode = seatMode) => {
    setSaving(true);
    const payload = {
      production_id: productionId,
      seat_data: newMap,
      seat_mode: newMode,
      file_name: uploadedFileName,
    };

    const { error } = await supabase
      .from('seat_maps')
      .upsert([payload], { onConflict: 'production_id' });

    setSaving(false);
    if (error) {
      console.error('座席マップの保存に失敗しました:', error.message);
    }
  };

  // 全席リセット機能
  const handleResetAllAvailable = () => {
    if (window.confirm('すべてのエリア指定・キープ設定を解除して、全席通常（一般）に戻しますか？')) {
      const newMap = { ...seatMap };
      Object.keys(newMap).forEach(row => {
        newMap[row] = newMap[row].map(seat => ({ ...seat, status: 'available' }));
      });
      setSeatMap(newMap);
      handleSaveSeatMap(newMap);
    }
  };

  // AI再解析シミュレーション
  const handleSimulateAIAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const defaultMap = INITIAL_PE_BASE_MAP();
      setSeatMap(defaultMap);
      setIsAnalyzing(false);
      setIsAnalyzed(true);
      handleSaveSeatMap(defaultMap);
    }, 1200);
  };

  // 座席タップ時のステータス切り替え
  const handleSeatClick = (row, index) => {
    if (showCustomerPreview) return;

    setSeatMap(prev => {
      const newMap = { ...prev };
      const currentStatus = newMap[row][index].status;
      newMap[row][index].status = currentStatus === activeTool ? 'available' : activeTool;
      handleSaveSeatMap(newMap);
      return { ...newMap };
    });
  };

  const handleModeChange = (mode) => {
    setSeatMode(mode);
    handleSaveSeatMap(seatMap, mode);
  };

  const getSeatStyle = (status) => {
    switch (status) {
      case 'available':
        return { bg: COLORS.surface, border: COLORS.border, color: COLORS.text, label: '通常/自由席' };
      case 's_seat':
        return { bg: 'rgba(230,159,0,0.2)', border: COLORS.sSeat, color: '#996300', label: '👑 S席エリア' };
      case 'a_seat':
        return { bg: 'rgba(0,114,178,0.15)', border: COLORS.aSeat, color: COLORS.aSeat, label: '🎟️ A席エリア' };
      case 'reserved_staff':
        return { bg: 'rgba(232,90,69,0.15)', border: COLORS.danger, color: COLORS.danger, label: '関係者留め' };
      case 'equipment':
        return { bg: 'rgba(84,87,214,0.15)', border: COLORS.indigo, color: COLORS.indigo, label: '機材卓・手すり' };
      default:
        return { bg: COLORS.surface, border: COLORS.border, color: COLORS.text, label: '' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .form-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 4px rgba(43, 36, 56, 0.04);
        }

        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: ${COLORS.gold};
          margin-bottom: 8px;
        }

        .mode-option {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.15s ease;
        }
        .mode-option.active {
          border-color: ${COLORS.gold};
          background-color: ${COLORS.surfaceAlt};
        }

        .btn-gold {
          padding: 12px 20px;
          background-color: ${COLORS.gold};
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: filter 0.15s ease;
        }
        .btn-gold:hover { filter: brightness(1.08); }

        .seat-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s ease;
          border: 1px solid;
        }
        .seat-btn:hover { transform: scale(1.08); }

        .tool-btn {
          padding: 7px 11px;
          border-radius: 8px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .tool-btn.active {
          border-color: ${COLORS.gold};
          background-color: ${COLORS.gold};
          color: #ffffff;
        }
      `}</style>

      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button 
            onClick={onBack} 
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: "'Shippori Mincho', serif", color: COLORS.text, fontWeight: 700 }}>
            指定席・会場マップ設定
          </h1>
          <div style={{ width: '80px', textAlign: 'right', fontSize: '12px', color: COLORS.muted }}>
            {saving ? '保存中...' : '自動保存済'}
          </div>
        </div>

        {/* STEP 1: 運用モードの選択 */}
        <div className="form-card">
          <label className="input-label">STEP 1: 指定席の運用モードを選択</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            
            <div 
              className={`mode-option ${seatMode === 'movie_style' ? 'active' : ''}`}
              onClick={() => handleModeChange('movie_style')}
            >
              <input type="radio" checked={seatMode === 'movie_style'} readOnly style={{ accentColor: COLORS.gold }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: COLORS.text }}>🎬 映画館風（お客様が座席選択）</div>
                <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>指定席オプション購入者がフォーム上で自由にお席ポチポチ選択</div>
              </div>
            </div>

            <div 
              className={`mode-option ${seatMode === 'zone_style' ? 'active' : ''}`}
              onClick={() => handleModeChange('zone_style')}
            >
              <input type="radio" checked={seatMode === 'zone_style'} readOnly style={{ accentColor: COLORS.gold }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: COLORS.text }}>👑 エリア別指定席（S席 / A席など）</div>
                <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>S席・A席などのゾーン塗り分け管理モード</div>
              </div>
            </div>

            <div 
              className={`mode-option ${seatMode === 'auto_assign' ? 'active' : ''}`}
              onClick={() => handleModeChange('auto_assign')}
            >
              <input type="radio" checked={seatMode === 'auto_assign'} readOnly style={{ accentColor: COLORS.gold }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: COLORS.text }}>🤖 主催者おまかせ（AI自動配席）</div>
                <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>購入後に主催者・AIが中央見やすい席から自動配置</div>
              </div>
            </div>

          </div>
        </div>

        {/* STEP 2: PDF図面アプローダー */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label className="input-label" style={{ margin: 0 }}>STEP 2: 劇場の仕込み図・座席表PDFを取り込み</label>
            <span style={{ fontSize: '11px', color: COLORS.gold, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Sparkles size={13} /> 布施PEベース仕込み図認識
            </span>
          </div>

          <div style={{ border: `2px dashed ${COLORS.border}`, borderRadius: '12px', padding: '18px', textAlign: 'center', backgroundColor: COLORS.surfaceAlt }}>
            <Upload size={26} color={COLORS.gold} style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text, marginBottom: '2px' }}>
              仕込み図PDFをドラッグ＆ドロップで即座にグリッド化
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
              <button onClick={handleSimulateAIAnalysis} className="btn-gold" disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> 図面を解析中...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> 図面PDFを再解析する
                  </>
                )}
              </button>
            </div>

            {uploadedFileName && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: COLORS.gold, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Check size={14} color={COLORS.success} /> 解析済みデータ: {uploadedFileName}
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: 座席マップ ＆ エリア・キープ設定 */}
        {isAnalyzed && (
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <label className="input-label" style={{ margin: 0 }}>
                  STEP 3: 座席エリア塗り分け ＆ キープ席設定
                  {showCustomerPreview ? <span style={{ color: COLORS.danger, marginLeft: '8px' }}>[お客様プレビュー中]</span> : <span style={{ color: COLORS.success, marginLeft: '8px' }}>[編集モード]</span>}
                </label>
                <div style={{ fontSize: '12px', color: COLORS.muted }}>
                  {showCustomerPreview 
                    ? 'お客様予約フォームでの見え方です。「編集モードへ戻る」で変更が再開できます。'
                    : 'ツールの選択 ➔ 席をタップして「S席」「A席」「関係者留め」「機材卓」をサクサク塗り分け！'}
                </div>
              </div>

              <button 
                onClick={() => setShowCustomerPreview(!showCustomerPreview)} 
                className="btn-gold"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <Eye size={14} /> {showCustomerPreview ? '編集モードへ戻る' : 'お客様予約画面を体験'}
              </button>
            </div>

            {/* ツールバー */}
            {!showCustomerPreview && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px', padding: '10px', backgroundColor: COLORS.surfaceAlt, borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>
                <button 
                  className={`tool-btn ${activeTool === 's_seat' ? 'active' : ''}`}
                  onClick={() => setActiveTool('s_seat')}
                >
                  <Tag size={13} color={COLORS.sSeat} /> S席エリアに指定
                </button>
                <button 
                  className={`tool-btn ${activeTool === 'a_seat' ? 'active' : ''}`}
                  onClick={() => setActiveTool('a_seat')}
                >
                  <Tag size={13} color={COLORS.aSeat} /> A席エリアに指定
                </button>
                <button 
                  className={`tool-btn ${activeTool === 'available' ? 'active' : ''}`}
                  onClick={() => setActiveTool('available')}
                >
                  <Check size={13} /> 通常/自由席（クリア）
                </button>
                <button 
                  className={`tool-btn ${activeTool === 'reserved_staff' ? 'active' : ''}`}
                  onClick={() => setActiveTool('reserved_staff')}
                >
                  <Shield size={13} /> 関係者留め
                </button>
                <button 
                  className={`tool-btn ${activeTool === 'equipment' ? 'active' : ''}`}
                  onClick={() => setActiveTool('equipment')}
                >
                  <Video size={13} /> 機材卓・手すり
                </button>
                <button 
                  onClick={handleResetAllAvailable} 
                  className="tool-btn" 
                  style={{ marginLeft: 'auto' }}
                  title="全席を初期に戻す"
                >
                  <RotateCcw size={13} /> 一括クリア
                </button>
              </div>
            )}

            {/* 舞台 (STAGE) 表示 */}
            <div style={{ width: '85%', margin: '0 auto 20px auto', padding: '8px', backgroundColor: COLORS.gold, color: '#ffffff', textAlign: 'center', fontWeight: 700, borderRadius: '6px', fontSize: '13px', letterSpacing: '2px' }}>
              舞台 (STAGE) / 鏡幕側
            </div>

            {/* 客席グリッド */}
            <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '480px', alignItems: 'center' }}>
                {Object.keys(seatMap).map(row => (
                  <div key={row} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '20px', fontWeight: '700', fontSize: '13px', color: COLORS.gold, textAlign: 'center' }}>{row}</span>
                    
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {seatMap[row].map((seat, idx) => {
                        const style = getSeatStyle(seat.status);
                        
                        if (showCustomerPreview) {
                          const isSelectable = seat.status !== 'reserved_staff' && seat.status !== 'equipment';
                          return (
                            <button
                              key={seat.id}
                              disabled={!isSelectable}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                border: `1px solid ${isSelectable ? style.border : '#e0e0e0'}`,
                                backgroundColor: isSelectable ? style.bg : '#f2f0f5',
                                color: isSelectable ? style.color : COLORS.muted,
                                cursor: isSelectable ? 'pointer' : 'not-allowed'
                              }}
                              title={isSelectable ? `${row}-${seat.num} (${style.label}) 席を選択` : `${row}-${seat.num} は選択できません`}
                            >
                              {isSelectable ? seat.num : '✕'}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(row, idx)}
                            className="seat-btn"
                            style={{ backgroundColor: style.bg, borderColor: style.border, color: style.color }}
                            title={`${row}-${seat.num} (現在: ${style.label}) ➔ タップで変更`}
                          >
                            {seat.status === 's_seat' ? 'S' : seat.status === 'a_seat' ? 'A' : seat.status === 'reserved_staff' ? '留' : seat.status === 'equipment' ? '卓' : seat.num}
                          </button>
                        );
                      })}
                    </div>

                    <span style={{ width: '20px', fontWeight: '700', fontSize: '13px', color: COLORS.gold, textAlign: 'center' }}>{row}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 凡例 */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(230,159,0,0.2)', border: `1px solid ${COLORS.sSeat}` }} /> 👑 S席エリア
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(0,114,178,0.15)', border: `1px solid ${COLORS.aSeat}` }} /> 🎟️ A席エリア
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }} /> 通常/自由席
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(232,90,69,0.2)', border: `1px solid ${COLORS.danger}` }} /> 関係者留め
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(84,87,214,0.2)', border: `1px solid ${COLORS.indigo}` }} /> 機材卓・手すり
              </span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}