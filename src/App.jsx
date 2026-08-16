import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AdminTicketSettings from './AdminTicketSettings';
import AdminStageSettings from './AdminStageSettings';
import AdminStaffSettings from './AdminStaffSettings';
import AdminReservations from './AdminReservations';
import TabletReception from './TabletReception';
import { Ticket, Calendar, Users, List, Tablet, LogOut, ChevronRight } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
};

export default function App() {
  const [session, setSession] = useState(null);
  const [productions, setProductions] = useState([]);
  const [currentProduction, setCurrentProduction] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProductions();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProductions();
      else {
        setProductions([]);
        setCurrentProduction(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProductions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('productions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      setProductions(data);
      if (!currentProduction) {
        setCurrentProduction(data[0]);
      }
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert('ログインエラー: ' + error.message);
    else alert('ログイン用リンクをメールに送信しました！');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView('home');
  };

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '400px', backgroundColor: COLORS.surface, borderRadius: '20px', padding: '32px', border: `1px solid ${COLORS.border}`, boxShadow: '0 8px 24px rgba(43,36,56,0.06)', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '24px', color: COLORS.gold, margin: '0 0 8px 0' }}>チケポチ 管理ポータル</h1>
          <p style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '24px' }}>登録メールアドレスでログイン</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email"
              name="email"
              required
              placeholder="officeknight06@gmail.com"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '14px', boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              ログインリンクを送信
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 子画面のレンダリング（フッターの重なりを排除）
  if (currentView === 'tickets' && currentProduction) {
    return <AdminTicketSettings productionId={currentProduction.id} org={{ name: currentProduction.title }} onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'stages' && currentProduction) {
    return <AdminStageSettings productionId={currentProduction.id} onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'staff' && currentProduction) {
    return <AdminStaffSettings productionId={currentProduction.id} onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'reservations' && currentProduction) {
    return <AdminReservations productionId={currentProduction.id} onBack={() => setCurrentView('home')} onOpenTablet={() => setCurrentView('tablet')} />;
  }

  if (currentView === 'tablet' && currentProduction) {
    return <TabletReception productionId={currentProduction.id} onBack={() => setCurrentView('home')} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '22px', margin: '0 0 4px 0', color: COLORS.gold, fontWeight: 700 }}>
              チケポチ 管理ポータル
            </h1>
            <div style={{ fontSize: '12px', color: COLORS.muted }}>公演・予約一元管理システム</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: COLORS.muted, cursor: 'pointer' }}
          >
            <LogOut size={14} /> ログアウト
          </button>
        </div>

        {/* 公演セレクター */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(43,36,56,0.04)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '8px' }}>選択中の公演</div>
          <select
            value={currentProduction?.id || ''}
            onChange={(e) => {
              const sel = productions.find(p => p.id === e.target.value);
              if (sel) setCurrentProduction(sel);
            }}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '15px', fontWeight: 'bold' }}
          >
            {productions.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {/* 管理メニュー一覧 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div onClick={() => setCurrentView('tickets')} style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fff6e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gold }}>
                <Ticket size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>券種・予約フォーム</div>
                <div style={{ fontSize: '12px', color: COLORS.muted }}>価格・セット券・販売設定</div>
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.muted} />
          </div>

          <div onClick={() => setCurrentView('stages')} style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fff6e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gold }}>
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>日程・座席キャパ</div>
                <div style={{ fontSize: '12px', color: COLORS.muted }}>開演時間・チーム区分</div>
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.muted} />
          </div>

          <div onClick={() => setCurrentView('staff')} style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fff6e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gold }}>
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>キャスト・スタッフ</div>
                <div style={{ fontSize: '12px', color: COLORS.muted }}>扱いURL発行・権限設定</div>
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.muted} />
          </div>

          <div onClick={() => setCurrentView('reservations')} style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fff6e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gold }}>
                <List size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>予約者一覧・動員</div>
                <div style={{ fontSize: '12px', color: COLORS.muted }}>予約状況・精算チェック</div>
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.muted} />
          </div>

          <div onClick={() => setCurrentView('tablet')} style={{ backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <Tablet size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>当日受付タブレット</div>
                <div style={{ fontSize: '12px', color: COLORS.muted }}>50音検索・ワンタップ来場チェックイン</div>
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.muted} />
          </div>
        </div>

      </div>

      {/* フッター（ホーム画面のみ最下部に表示） */}
      <div style={{ maxWidth: '800px', width: '100%', margin: '40px auto 0 auto', textAlign: 'center', fontSize: '12px', color: COLORS.muted }}>
        ログインアカウント: {session.user?.email}
      </div>
    </div>
  );
}