import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Building2, Users, Calendar, Ticket, MapPin, 
  Settings, Mail, Tablet, Plus, ExternalLink, ChevronRight, Sparkles, Check
} from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

export default function TicketPochiAdminHome({ onNavigate, user, org, activeProdId }) {
  const [productions, setProductions] = useState([]);
  const [currentProdIndex, setCurrentProdIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProds() {
      setLoading(true);
      try {
        if (!org?.id) return;

        const { data, error } = await supabase
          .from('productions')
          .select('*')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          // A公演（あなたとコンビ）を先頭、B公演（爆弾）を2番目に並び替え
          const sorted = [...data].sort((a, b) => {
            if (a.title?.includes('あなたとコンビ')) return -1;
            if (b.title?.includes('あなたとコンビ')) return 1;
            return 0;
          });
          setProductions(sorted);

          if (activeProdId) {
            const idx = sorted.findIndex(p => p.id === activeProdId);
            if (idx >= 0) setCurrentProdIndex(idx);
          }
        }
      } catch (e) {
        console.error('Fetch prods error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProds();
  }, [org, activeProdId]);

  const currentProd = productions[currentProdIndex] || null;
  const isA = currentProd?.title?.includes('あなたとコンビ');
  const themeColor = isA ? COLORS.gold : '#4338ca';
  const themeBg = isA ? '#fffbeb' : '#eef2ff';
  const themeBorder = isA ? 'rgba(201,121,31,0.3)' : 'rgba(67,56,202,0.3)';

  const handleSwitchProd = (idx) => {
    setCurrentProdIndex(idx);
  };

  const navTo = (view) => {
    if (currentProd) {
      onNavigate(view, currentProd.id);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.body }}>
        劇団データを読み込み中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: FONTS.body, padding: '16px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('${FONTS.importUrl}');
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .menu-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: ${RADIUS.md};
          padding: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .menu-card:active {
          transform: scale(0.98);
        }
      `}</style>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* 劇団タイトル */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: COLORS.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Building2 size={13} /> {org?.name || '劇団'} 管理ポータル
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0 0', fontFamily: FONTS.display }}>
            office Knight 総合管理
          </h1>
        </div>

        {/* 🎭 スマホ対応・視認性の高い公演切替タブ */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {productions.map((prod, idx) => {
            const isThisA = prod.title?.includes('あなたとコンビ');
            const isSelected = idx === currentProdIndex;
            const tagColor = isThisA ? COLORS.gold : '#4338ca';
            const cardBg = isSelected ? (isThisA ? '#fffbeb' : '#eef2ff') : COLORS.surface;
            const borderCol = isSelected ? (isThisA ? COLORS.gold : '#4338ca') : COLORS.border;

            return (
              <button
                key={prod.id}
                onClick={() => handleSwitchProd(idx)}
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: `2px solid ${borderCol}`,
                  backgroundColor: cardBg,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', backgroundColor: tagColor, padding: '2px 8px', borderRadius: '4px' }}>
                  {isThisA ? 'A公演' : 'B公演'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? tagColor : COLORS.text, lineHeight: '1.3' }}>
                  {isThisA ? 'あなたとコンビ、に' : '爆弾よりもハードです'}
                </span>
              </button>
            );
          })}
        </div>

        {/* 現在選択中の公演情報バナー */}
        {currentProd && (
          <div style={{ backgroundColor: themeBg, border: `1px solid ${themeBorder}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: themeColor }}>現在編集・管理中の公演</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: COLORS.text, marginTop: '2px' }}>{currentProd.title}</div>
              <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} color={themeColor} /> 会場: {currentProd.venue_name || '未設定'}
              </div>
            </div>
            <button
              onClick={() => window.open(`/r/${currentProd.id}`, '_blank')}
              style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${themeBorder}`, backgroundColor: '#ffffff', color: themeColor, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ExternalLink size={13} /> 予約フォーム確認
            </button>
          </div>
        )}

        {/* メニューカード一覧 */}
        <div className="menu-grid">
          <div className="menu-card" onClick={() => navTo('reservations')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>予約者名簿 ＆ 動員集計</div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>予約状況・キャスト別動員数</div>
              </div>
            </div>
            <ChevronRight size={16} color={COLORS.muted} />
          </div>

          <div className="menu-card" onClick={() => navTo('tablet')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(31,154,86,0.1)', color: COLORS.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tablet size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>当日受付システム</div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>50音検索・チェックイン・当日精算</div>
              </div>
            </div>
            <ChevronRight size={16} color={COLORS.muted} />
          </div>

          <div className="menu-card" onClick={() => navTo('staff')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>キャスト・扱いURL管理</div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>専用予約URL発行・全27名共有</div>
              </div>
            </div>
            <ChevronRight size={16} color={COLORS.muted} />
          </div>

          <div className="menu-card" onClick={() => navTo('tickets')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ticket size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>券種 ＆ オプション設定</div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>前売り・学割・指定席・カンパ</div>
              </div>
            </div>
            <ChevronRight size={16} color={COLORS.muted} />
          </div>

          <div className="menu-card" onClick={() => navTo('dates')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>日程・ステージ設定</div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>開演時間・席数キャパシティ</div>
              </div>
            </div>
            <ChevronRight size={16} color={COLORS.muted} />
          </div>

          <div className="menu-card" onClick={() => navTo('info')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>公演基本情報 ＆ 会場設定</div>
                <div style={{ fontSize: '11px', color: COLORS.muted }}>タイトル・会場サジェスト選択</div>
              </div>
            </div>
            <ChevronRight size={16} color={COLORS.muted} />
          </div>
        </div>

      </div>
    </div>
  );
}