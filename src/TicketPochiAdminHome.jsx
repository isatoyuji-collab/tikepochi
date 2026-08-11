import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Plus, Users, Ticket, Calendar, MapPin, Mail, Settings, ChevronRight, LogOut, Building2, CreditCard } from 'lucide-react';

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

  // DBから所属劇団の公演一覧を取得
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
      if (data.length > 0) {
        setSelectedProdId(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProductions();
  }, [org]);

  // 新規公演の追加処理
  const handleCreateNewProduction = async () => {
    const title = prompt('新規公演のタイトルを入力してください（例: 第1回本公演『タイトル』）');
    if (!title || !title.trim()) return;

    const { data, error } = await supabase
      .from('productions')
      .insert([{
        title: title.trim(),
        organization_id: org.id
      }])
      .select()
      .single();

    if (error) {
      alert('公演の作成に失敗しました: ' + error.message);
    } else {
      fetchProductions();
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
          <button onClick={handleCreateNewProduction} className="btn-add">
            <Plus size={15} /> 新規公演を追加
          </button>
        </div>

        {/* 公演がまだ1つもない場合の案内案内表示 */}
        {productions.length === 0 ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: "'Shippori Mincho', serif", color: COLORS.gold }}>まだ公演が登録されていません</h3>
            <p style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '20px' }}>
              上の「＋ 新規公演を追加」ボタンを押して、最初の公演を作成してください。
            </p>
            <button onClick={handleCreateNewProduction} className="btn-add" style={{ margin: '0 auto', padding: '12px 24px', fontSize: '14px', backgroundColor: COLORS.gold, color: '#fff', borderStyle: 'solid' }}>
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
    </div>
  );
}