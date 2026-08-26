import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, ChevronRight, X, Users, Tablet, Settings, 
  Ticket, Calendar, Grid, UserCheck, CreditCard, Mail, MapPin, Building2, ExternalLink
} from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

export default function TicketPochiAdminHome({ onNavigate, user, org, activeProdId }) {
  const [productions, setProductions] = useState([]);
  const [selectedProdId, setSelectedProdId] = useState(null);
  const [loading, setLoading] = useState(true);

  // モーダル用state
  const [showModal, setShowModal] = useState(false);
  const [crown, setCrown] = useState(''); 
  const [title, setTitle] = useState(''); 
  const [subtitle, setSubtitle] = useState(''); 
  const [creating, setCreating] = useState(false);

  const fetchProductions = async () => {
    setLoading(true);
    if (!org?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('productions')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // A公演（あなたとコンビ）を先頭、B公演（爆弾）を2番目に整列
      const sorted = [...data].sort((a, b) => {
        if (a.title?.includes('あなたとコンビ')) return -1;
        if (b.title?.includes('あなたとコンビ')) return 1;
        return 0;
      });
      setProductions(sorted);

      if (activeProdId && sorted.some(p => p.id === activeProdId)) {
        setSelectedProdId(activeProdId);
      } else if (sorted.length > 0 && !selectedProdId) {
        setSelectedProdId(sorted[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProductions();
  }, [org, activeProdId]);

  // 新規公演作成実行
  const handleCreateNewProduction = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    const fullTitle = crown.trim() ? `${crown.trim()} 『${title.trim()}』` : title.trim();

    const { data, error } = await supabase
      .from('productions')
      .insert([{
        title: fullTitle,
        subtitle: subtitle.trim(),
        organization_id: org.id
      }])
      .select()
      .single();

    setCreating(false);

    if (error) {
      alert('公演の作成に失敗しました: ' + error.message);
    } else {
      setShowModal(false);
      setCrown('');
      setTitle('');
      setSubtitle('');
      fetchProductions();
      if (data) setSelectedProdId(data.id);
    }
  };

  const currentProd = productions.find(p => p.id === selectedProdId) || productions[0];
  const isA = currentProd?.title?.includes('あなたとコンビ');
  const themeColor = isA ? COLORS.gold : '#4338ca';
  const themeBg = isA ? '#fffbeb' : '#eef2ff';
  const themeBorder = isA ? 'rgba(201,121,31,0.3)' : 'rgba(67,56,202,0.3)';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.body }}>
        公演データを読み込み中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: FONTS.body, padding: '20px 16px 60px 16px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('${FONTS.importUrl}');

        /* 横2列グリッド（スマホでは縦1列に自動切替） */
        .menu-grid-2col {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (max-width: 680px) {
          .menu-grid-2col {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }

        .menu-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          padding: 16px 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.15s ease;
          box-shadow: 0 2px 4px rgba(43, 36, 56, 0.04);
        }
        .menu-card:hover {
          background-color: #fff6e8;
          border-color: ${COLORS.gold};
          transform: translateY(-1px);
        }
        .menu-card:active {
          transform: scale(0.99);
        }

        .modal-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 14px;
          font-family: ${FONTS.body};
          box-sizing: border-box;
          margin-top: 6px;
          margin-bottom: 16px;
        }
        .modal-input:focus { outline: none; border-color: ${COLORS.gold}; }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        
        {/* ヘッダー・劇団名 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: COLORS.gold, fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Building2 size={13} /> {org?.name || '劇団ポータル'}
          </div>
          <h1 style={{ margin: '4px 0 0 0', fontFamily: FONTS.display, fontSize: '22px', fontWeight: 700 }}>
            {currentProd ? currentProd.title : '登録済みの公演はありません'}
          </h1>
          {currentProd?.subtitle && (
            <div style={{ fontSize: '13px', color: COLORS.muted, marginTop: '2px' }}>
              {currentProd.subtitle}
            </div>
          )}
        </div>

        {/* 🎭 公演切替タブ & 新規作成ボタン */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', alignItems: 'center' }}>
          {productions.map((p) => {
            const isThisA = p.title?.includes('あなたとコンビ');
            const isSelected = selectedProdId === p.id;
            const tagCol = isThisA ? COLORS.gold : '#4338ca';

            return (
              <button
                key={p.id}
                onClick={() => setSelectedProdId(p.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: `2px solid ${isSelected ? tagCol : COLORS.border}`,
                  backgroundColor: isSelected ? (isThisA ? '#fffbeb' : '#eef2ff') : COLORS.surface,
                  color: isSelected ? tagCol : COLORS.text,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '10px', color: '#fff', backgroundColor: tagCol, padding: '1px 6px', borderRadius: '10px' }}>
                  {isThisA ? 'A公演' : 'B公演'}
                </span>
                <span>{p.title}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              border: `1px dashed ${COLORS.gold}`,
              backgroundColor: 'transparent',
              color: COLORS.gold,
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <Plus size={15} /> 新規公演を追加
          </button>
        </div>

        {/* 公演情報・予約フォーム確認バナー */}
        {currentProd && (
          <div style={{ backgroundColor: themeBg, border: `1px solid ${themeBorder}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: themeColor }}>現在選択中の公演</div>
              <div style={{ fontSize: '13px', color: COLORS.muted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} color={themeColor} /> 会場: {currentProd.venue_name || '未設定'}
              </div>
            </div>
            <button
              onClick={() => window.open(`/r/${currentProd.id}`, '_blank')}
              style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${themeBorder}`, backgroundColor: '#ffffff', color: themeColor, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ExternalLink size={13} /> お客様用予約フォームを開く
            </button>
          </div>
        )}

        {/* 公演がまだない場合 */}
        {productions.length === 0 ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: FONTS.display, color: COLORS.gold }}>まだ公演が登録されていません</h3>
            <p style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '20px' }}>
              「新規公演を追加」ボタンを押して、最初の公演を作成してください。
            </p>
            <button type="button" onClick={() => setShowModal(true)} style={{ margin: '0 auto', padding: '12px 24px', fontSize: '14px', backgroundColor: COLORS.gold, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={18} /> 最初の公演をつくる
            </button>
          </div>
        ) : (
          /* 全9種類の管理機能カード（横2列グリッド） */
          <div>
            {/* ① 予約・当日運用 */}
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.gold, marginBottom: '10px', letterSpacing: '0.05em' }}>
              🎟️ 予約・当日運用
            </div>

            <div className="menu-grid-2col" style={{ marginBottom: '24px' }}>
              <div className="menu-card" onClick={() => onNavigate('reservations', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>予約一覧・動員状況</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>予約一覧・動員数・メール</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>

              <div className="menu-card" onClick={() => onNavigate('tablet', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(31,154,86,0.1)', color: COLORS.success, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Tablet size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>当日受付</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>50音検索・チェックイン・精算</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>
            </div>

            {/* ② 公演の準備・各種設定 */}
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.gold, marginBottom: '10px', letterSpacing: '0.05em' }}>
              ⚙️ 公演の準備・各種設定
            </div>

            <div className="menu-grid-2col">
              <div className="menu-card" onClick={() => onNavigate('info', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Settings size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>公演基本情報</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>公演名・煽り文・会場設定</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>

              <div className="menu-card" onClick={() => onNavigate('tickets', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ticket size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>券種 ＆ オプション設定</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>前売り・学割・指定席・カンパ</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>

              <div className="menu-card" onClick={() => onNavigate('dates', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>日程・キャパ設定</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>ステージ日時・席数上限</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>

              <div className="menu-card" onClick={() => onNavigate('seats', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Grid size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>指定席・会場マップ設定</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>座席配置図・ゾーン分け</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>

              <div className="menu-card" onClick={() => onNavigate('staff', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>キャスト・スタッフ管理</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>メンバー登録・個人予約URL発行</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>

              <div className="menu-card" onClick={() => onNavigate('payments', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>決済連携設定</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>Stripe / PayPay / 銀行振込</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>

              <div className="menu-card" onClick={() => onNavigate('messages', selectedProdId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: themeBg, color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>メール・LINE通知設定</div>
                    <div style={{ fontSize: '11px', color: COLORS.muted, marginTop: '2px' }}>自動返信・一斉送信文言</div>
                  </div>
                </div>
                <ChevronRight size={16} color={COLORS.muted} />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 新規公演作成専用モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: COLORS.surface, borderRadius: '18px', padding: '28px', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 16px 0', fontFamily: FONTS.display, fontSize: '20px', color: COLORS.text }}>
              新規公演の追加
            </h2>

            <form onSubmit={handleCreateNewProduction}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>
                ① 冠名・シリーズ名（任意）
              </label>
              <input
                type="text"
                placeholder="例: officeKnightプロデュース公演vol.3＆vol.3.5"
                value={crown}
                onChange={(e) => setCrown(e.target.value)}
                className="modal-input"
              />

              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>
                ② メインタイトル（必須）
              </label>
              <input
                type="text"
                required
                placeholder="例: あなたとコンビ、に"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="modal-input"
              />

              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>
                ③ サブタイトル・煽り文言（任意）
              </label>
              <input
                type="text"
                placeholder="例: 秋の大笑会-ダイエンカイ-"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="modal-input"
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, background: 'none', fontWeight: 700, cursor: 'pointer', color: COLORS.muted }}>
                  キャンセル
                </button>
                <button type="submit" disabled={creating} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {creating ? '作成中...' : 'この公演を作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}