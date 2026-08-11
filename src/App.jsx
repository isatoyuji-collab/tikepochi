import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import Onboarding from './Onboarding';
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
import { LogOut, Building2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [checkingOrg, setCheckingOrg] = useState(true);

  const [currentView, setCurrentView] = useState('home');
  const [selectedProductionId, setSelectedProductionId] = useState(null);

  // 所属劇団の取得（エラーで止まらない安全な記述）
  const fetchUserOrganization = async (userId) => {
    setCheckingOrg(true);
    try {
      // 1. まずメンバー情報を取得
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberData && memberData.organization_id) {
        // 2. 劇団名を取得
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', memberData.organization_id)
          .maybeSingle();

        if (orgData) {
          setCurrentOrg({
            id: orgData.id,
            name: orgData.name,
            role: memberData.role,
          });
        } else {
          setCurrentOrg(null);
        }
      } else {
        setCurrentOrg(null);
      }
    } catch (e) {
      console.error('Organization fetch error:', e);
      setCurrentOrg(null);
    } finally {
      setCheckingOrg(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserOrganization(session.user.id);
      } else {
        setCheckingOrg(false);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserOrganization(session.user.id);
      } else {
        setCurrentOrg(null);
        setCheckingOrg(false);
      }
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

  if (loading || checkingOrg) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#faf5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#2b2438' }}>
        読み込み中...
      </div>
    );
  }

  // 1. 未ログインの場合 ➔ ログイン画面
  if (!session) {
    return <Login onLoginSuccess={() => setLoading(true)} />;
  }

  // 2. 劇団未登録の場合 ➔ 初回オンボーディング（劇団名入力画面）
  if (!currentOrg) {
    return (
      <Onboarding
        user={session.user}
        onComplete={(org) => {
          setCurrentOrg({ id: org.id, name: org.name, role: 'owner' });
          setCurrentView('home');
        }}
      />
    );
  }

  // 3. ログイン＆劇団登録済み ➔ 管理画面
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <TicketPochiAdminHome onNavigate={handleNavigate} user={session.user} org={currentOrg} />;
      case 'info':
        return <AdminProductionInfo productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home')} />;
      case 'staff':
        return <AdminStaffSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home')} />;
      case 'reservations':
        return <AdminReservationList productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home')} />;
      case 'tickets':
        return <AdminTicketSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home')} />;
      case 'dates':
        return <AdminStageSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home')} />;
      case 'seats':
        return <AdminSeatSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home')} />;
      case 'payments':
        return <AdminPaymentSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home')} />;
      case 'messages':
        return <AdminMessageSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home')} />;
      case 'tablet':
        return <TabletReception productionId={selectedProductionId} org={currentOrg} onBackToAdmin={() => handleNavigate('home')} />;
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
      <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999, backgroundColor: '#ffffff', border: '1px solid rgba(201,121,31,0.22)', padding: '8px 14px', borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
        <span style={{ color: '#c9791f', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Building2 size={13} /> {currentOrg.name} ({currentOrg.role === 'owner' ? '所有者' : 'メンバー'})
        </span>
        <span style={{ color: '#8a8398' }}>| {session.user.email}</span>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#e85a45', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', padding: 0, marginLeft: '4px' }}>
          <LogOut size={14} /> ログアウト
        </button>
      </div>

      {renderView()}
    </div>
  );
}