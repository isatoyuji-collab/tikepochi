import React, { useState } from 'react';
import TicketPochiAdminHome from './TicketPochiAdminHome';
import AdminProductionInfo from './AdminProductionInfo';
import AdminStaffSettings from './AdminStaffSettings';
import AdminReservationList from './Adminreservationlist';
import AdminTicketSettings from './AdminTicketSettings';
import AdminStageSettings from './AdminStageSettings';
import AdminSeatSettings from './AdminSeatSettings';
import AdminPaymentSettings from './AdminPaymentSettings';
import AdminMessageSettings from './AdminMessageSettings'; // ⭐ メール・LINE通知をインポート
import TabletReception from './TabletReception';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedProductionId, setSelectedProductionId] = useState(null);

  const handleNavigate = (view, productionId = null) => {
    if (productionId) setSelectedProductionId(productionId);
    setCurrentView(view);
  };

  switch (currentView) {
    case 'home':
      return <TicketPochiAdminHome onNavigate={handleNavigate} />;
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
    case 'messages': // ⭐ メール・LINE通知
      return <AdminMessageSettings productionId={selectedProductionId} onBack={() => handleNavigate('home')} />;
    case 'tablet':
      return <TabletReception onBackToAdmin={() => handleNavigate('home')} />;
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
}