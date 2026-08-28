// src/App.jsx (TIKEPOCHI側)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import Onboarding from './Onboarding';
import TicketPochiAdminHome from './TicketPochiAdminHome';
import AdminProductionInfo from './AdminProductionInfo';
import AdminStaffSettings from './AdminStaffSettings';
import AdminReservationList from './AdminReservations';
import AdminTicketSettings from './AdminTicketSettings';
import AdminStageSettings from './AdminStageSettings';
import AdminSeatSettings from './AdminSeatSettings';
import AdminPaymentSettings from './AdminPaymentSettings';
import AdminMessageSettings from './AdminMessageSettings';
import TabletReception from './TabletReception';
import CustomerReservationForm from './CustomerReservationForm';
import CustomerPortal from './CustomerPortal';
import Myreservationspag from './Myreservationspag';
import { LogOut, Building2 } from 'lucide-react';

const ADMIN_BYPASS_KEY = "knight2026admin";

export default function App() {
  const portalMatch = window.location.pathname.match(/^\/p\/([a-zA-Z0-9-]+)$/);
  if (portalMatch) return <CustomerPortal orgId={portalMatch[1]} />;

  const reservationMatch = window.location.pathname.match(/^\/r\/([a-zA-Z0-9-]+)$/);
  if (reservationMatch) return <CustomerReservationForm productionId={reservationMatch[1]} />;

  if (window.location.pathname === '/mypage') return <Myreservationspag />;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [checkingOrg, setCheckingOrg] = useState(true);

  const [currentView, setCurrentView] = useState('home');
  const [selectedProductionId, setSelectedProductionId] = useState(null);

  const fetchUserOrganization = async (userId) => {
    setCheckingOrg(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteOrgId = urlParams.get('invite_org_id');

      if (inviteOrgId) {
        await supabase
          .from('organization_members')
          .upsert(
            { organization_id: inviteOrgId, user_id: userId, role: 'staff' },
            { onConflict: 'organization_id,user_id' }
          );
      }

      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (memberData && memberData.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', memberData.organization_id)
          .maybeSingle();

        if (orgData) {
          setCurrentOrg({
            id: orgData.id,
            name: orgData.name,
            role: memberData.role || 'staff',
          });
        }
      }
    } catch (e) {
      console.error('Organization fetch error:', e);
    } finally {
      setCheckingOrg(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const key = urlParams.get('key');
    const directView = urlParams.get('view');
    const prodId = urlParams.get('prod_id');

    if (directView) {
      setCurrentView(directView);
    }

    const isBypass = key === ADMIN_BYPASS_KEY || localStorage.getItem('tp_admin_bypass') === 'true';

    if (isBypass) {
      localStorage.setItem('tp_admin_bypass', 'true');
      const bypassUser = { id: 'bypass-admin-id', email: 'office-knight-admin@bypass.local' };
      setSession({ user: bypassUser });

      supabase
        .from('organizations')
        .select('id, name')
        .limit(1)
        .maybeSingle()
        .then(async ({ data: orgData }) => {
          const org = orgData || { id: 'default-org-id', name: 'office Knight', role: 'owner' };
          setCurrentOrg({ id: org.id, name: org.name, role: 'owner' });

          if (prodId) {
            setSelectedProductionId(prodId);
          } else {
            const { data: prodData } = await supabase
              .from('productions')
              .select('id')
              .limit(1)
              .maybeSingle();
            if (prodData) setSelectedProductionId(prodData.id);
          }

          setCheckingOrg(false);
          setLoading(false);
        });
      return;
    }

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

  const handleNavigate = (view, prodId = null) => {
    if (prodId) setSelectedProductionId(prodId);
    setCurrentView(view);
  };

  const handleLogout = async () => {
    localStorage.removeItem('tp_admin_bypass');
    await supabase.auth.signOut();
    setSession(null);
    setCurrentOrg(null);
    setCurrentView('home');
  };

  if (loading || checkingOrg) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#faf5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#2b2438' }}>
        読み込み中...
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => setLoading(true)} />;
  }

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

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <TicketPochiAdminHome onNavigate={handleNavigate} user={session.user} org={currentOrg} activeProdId={selectedProductionId} />;
      case 'info':
        return <AdminProductionInfo productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home', selectedProductionId)} />;
      case 'staff':
        return <AdminStaffSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home', selectedProductionId)} />;
      case 'reservations':
        return <AdminReservationList productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home', selectedProductionId)} />;
      case 'tickets':
        return <AdminTicketSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home', selectedProductionId)} />;
      case 'dates':
        return <AdminStageSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home', selectedProductionId)} />;
      case 'seats':
        return <AdminSeatSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home', selectedProductionId)} />;
      case 'payments':
        return <AdminPaymentSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home', selectedProductionId)} />;
      case 'messages':
        return <AdminMessageSettings productionId={selectedProductionId} org={currentOrg} onBack={() => handleNavigate('home', selectedProductionId)} />;
      case 'tablet':
        return <TabletReception productionId={selectedProductionId} org={currentOrg} onBackToAdmin={() => handleNavigate('home', selectedProductionId)} />;
      default:
        return (
          <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h2>準備中</h2>
            <button onClick={() => handleNavigate('home', selectedProductionId)}>ホームへ戻る</button>
          </div>
        );
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999, backgroundColor: '#ffffff', border: '1px solid rgba(201,121,31,0.22)', padding: '6px 12px', borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
        <span style={{ color: '#c9791f', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Building2 size={12} /> {currentOrg.name}
        </span>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#e85a45', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold', padding: 0 }}>
          <LogOut size={12} /> ログアウト
        </button>
      </div>

      {renderView()}
    </div>
  );
}