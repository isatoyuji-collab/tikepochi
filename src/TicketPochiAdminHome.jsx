import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Plus, ChevronRight, X } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
};

export default function TicketPochiAdminHome({ onNavigate, user, org }) {
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
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProductions(data);
      if (data.length > 0 && !selectedProdId) {
        setSelectedProdId(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProductions();
  }, [org]);

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

  const currentProd = productions.find(p => p.id === selectedProdId);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        公演データを読み込み中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .menu-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 12px;
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

        .prod-tab {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }
        .prod-tab.active {
          background-color: ${COLORS.gold};
          color: #ffffff;
          border-color: ${COLORS.gold};
        }

        .btn-add {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px dashed ${COLORS.gold};
          background-color: transparent;
          color: ${COLORS.gold};
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-add:hover { background-color: #fff6e8; }

        .modal-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 14px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          box-sizing: border-box;
          margin-top: 6px;
          margin-bottom: 16px;
        }
        .modal-input:focus { outline: none; border-color: ${COLORS.gold}; }
      `}</style>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* ヘッダー・劇団名 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: COLORS.gold, fontWeight: 700, letterSpacing: '0.05em' }}>
            {org?.name || '劇団ポータル'}
          </div>
          <h1 style={{ margin: '4px 0 0 0', fontFamily: "'Shippori Mincho', serif", fontSize: '24px', fontWeight: 700 }}>
            {currentProd ? currentProd.title : '登録済みの公演はありません'}
          </h1>
          {currentProd?.subtitle && (
            <div style={{ fontSize: '14px', color: COLORS.muted, marginTop: '4px' }}>
              {currentProd.subtitle}
            </div>
          )}
        </div>

        {/* 公演タブ切り替え & 新規作成ボタン */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px', alignItems: 'center' }}>
          {productions.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProdId(p.id)}
              className={`prod-tab ${selectedProdId === p.id ? 'active' : ''}`}
            >
              {p.title}
            </button>
          ))}
          <button type="button" onClick={() => setShowModal(true)} className="btn-add">
            <Plus size={15} /> 新規公演を追加
          </button>
        </div>

        {/* 公演がまだ1つもない場合の表示 */}
        {productions.length === 0 ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: "'Shippori Mincho', serif", color: COLORS.gold }}>まだ公演が登録されていません</h3>
            <p style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '20px' }}>
              「新規公演を追加」ボタンを押して、最初の公演を作成してください。
            </p>
            <button type="button" onClick={() => setShowModal(true)} className="btn-add" style={{ margin: '0 auto', padding: '12px 24px', fontSize: '14px', backgroundColor: COLORS.gold, color: '#fff', borderStyle: 'solid' }}>
              <Plus size={18} /> 最初の公演をつくる
            </button>
          </div>
        ) : (
          /* 公演が存在する場合の機能メニュー */
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px' }}>予約・当日運用</div>
            <div className="menu-card" onClick={() => onNavigate('reservations', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>予約一覧・動員状況</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>予約データの閲覧・編集・お礼メール</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>

            <div className="menu-card" onClick={() => onNavigate('tablet', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>当日受付</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>50音検索・チェックイン・精算</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>

            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, margin: '20px 0 8px 0' }}>公演の準備</div>
            <div className="menu-card" onClick={() => onNavigate('info', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>公演基本情報</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>公演名・煽り文・会場設定</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>

            <div className="menu-card" onClick={() => onNavigate('tickets', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>券種設定</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>券種・金額・セット割</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>

            <div className="menu-card" onClick={() => onNavigate('dates', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>日程・キャパ設定</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>ステージ日時・席数上限</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>

            <div className="menu-card" onClick={() => onNavigate('seats', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>指定席・会場マップ設定</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>座席配置図・ゾーン分け</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>

            <div className="menu-card" onClick={() => onNavigate('staff', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>キャスト・スタッフ管理</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>メンバー登録・個人予約URL発行</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>

            <div className="menu-card" onClick={() => onNavigate('payments', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>決済連携設定</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>Stripe / PayPay / 銀行振込</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>

            <div className="menu-card" onClick={() => onNavigate('messages', selectedProdId)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>メール・LINE通知設定</div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>自動返信・一斉送信文言</div>
              </div>
              <ChevronRight size={18} color={COLORS.muted} />
            </div>
          </div>
        )}

      </div>

      {/* 🎪 新規公演作成専用モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: COLORS.surface, borderRadius: '18px', padding: '28px', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 16px 0', fontFamily: "'Shippori Mincho', serif", fontSize: '20px', color: COLORS.text }}>
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