import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import TicketPochiAdminHome from './TicketPochiAdminHome';
import AdminProductionInfo from './AdminProductionInfo';
import AdminStaffSettings from './AdminStaffSettings';
import AdminReservationList from './Adminreservationlist';
import AdminTicketSettings from './AdminTicketSettings';
import AdminStageSettings from './AdminStageSettings';
import AdminSeatSettings from './AdminSeatSettings';
import AdminPaymentSettings from './AdminPaymentSettings';
import AdminMessageSettings from './AdminMessageSettings';
import TabletReception from './TabletReception';
import { LogOut } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('home');
  const [selectedProductionId, setSelectedProductionId] = useState(null);

  useEffect(() => {
    // ログイン状態の確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // ログイン状態のリアルタイム監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (view, productionId = null) => {
    if (productionId) setSelectedProductionId(productionId);
    setCurrentView(view);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView('home');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#faf5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#2b2438' }}>
        読み込み中...
      </div>
    );
  }

  // 未ログインの場合はログイン画面を表示
  if (!session) {
    return <Login onLoginSuccess={() => setCurrentView('home')} />;
  }

  // ログイン済みの場合の画面表示
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <TicketPochiAdminHome onNavigate={handleNavigate} user={session.user} />;
      case 'info':
        return <AdminProductionInfo productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
      case 'staff':
        return <AdminStaffSettings productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
      case 'reservations':
        return <AdminReservationList productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
      case 'tickets':
        return <AdminTicketSettings productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
      case 'dates':
        return <AdminStageSettings productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
      case 'seats':
        return <AdminSeatSettings productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
      case 'payments':
        return <AdminPaymentSettings productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
      case 'messages':
        return <AdminMessageSettings productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
      case 'tablet':
        return <TabletReception productionId={selectedProductionId} onBackToAdmin={() => handleNavigate('home')} />;
      default:
        return (
          <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h2>「{currentView}」画面は準備中です</h2>
            <button onClick={() => handleNavigate('home')} style={{ padding: '10px 20px', cursor: 'pointer', marginTop: '20px' }}>
              ホームへ戻る
            </button>
          </div>
        );
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* ログインユーザー情報・ログアウトバー */}
      <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999, backgroundColor: '#ffffff', border: '1px solid rgba(201,121,31,0.22)', padding: '8px 14px', borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
        <span style={{ color: '#8a8398' }}>{session.user.email}</span>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#e85a45', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', padding: 0 }}>
          <LogOut size={14} /> ログアウト
        </button>
      </div>

      {renderView()}
    </div>
  );
}