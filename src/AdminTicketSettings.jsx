import React, { useState } from 'react';
import { ArrowLeft, Plus, CreditCard, Ticket, X, Trash2, Layers } from 'lucide-react';
import { COLORS, FONTS, RADIUS, SHADOW } from './theme';

const INITIAL_TICKETS = [
  {
    id: 1,
    name: '一般前売り',
    price: 3500,
    startDate: '2026-07-01T10:00',
    endDate: '2026-07-31T23:59',
    paymentType: 'both',
    isMultiStageDiscount: false,
    setGroup: 'none',
    maxCount: 4,
    note: ''
  },
  {
    id: 2,
    name: 'U-25割引（要証明書）',
    price: 2500,
    startDate: '2026-07-01T10:00',
    endDate: '2026-07-31T23:59',
    paymentType: 'cash_only',
    isMultiStageDiscount: false,
    setGroup: 'none',
    maxCount: 2,
    note: '当日受付にて身分証明書をご提示ください'
  },
  {
    id: 3,
    name: '2公演共通セットチケット',
    price: 6000,
    startDate: '2026-07-01T10:00',
    endDate: '2026-07-31T23:59',
    paymentType: 'both',
    isMultiStageDiscount: false,
    setGroup: 'group_summer_fest',
    maxCount: 2,
    note: '別公演「夏の演劇祭」との共通セット券です'
  }
];

export default function AdminTicketSettings({ onBack }) {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [editingTicket, setEditingTicket] = useState(null);

  const [stripeDeadlineType, setStripeDeadlineType] = useState('day_before');
  const [stripeDeadlineHours, setStripeDeadlineHours] = useState(12);

  const handleOpenEdit = (ticket) => {
    if (ticket) {
      setEditingTicket({ ...ticket });
    } else {
      setEditingTicket({
        id: Date.now(),
        name: '',
        price: 3000,
        startDate: '2026-07-01T10:00',
        endDate: '2026-07-31T23:59',
        paymentType: 'both',
        isMultiStageDiscount: false,
        setGroup: 'none',
        maxCount: 4,
        note: ''
      });
    }
  };

  const handleSave = () => {
    if (!editingTicket.name.trim()) {
      alert('券種名を入力してください');
      return;
    }
    setTickets(prev => {
      const exists = prev.find(t => t.id === editingTicket.id);
      if (exists) {
        return prev.map(t => t.id === editingTicket.id ? editingTicket : t);
      }
      return [...prev, editingTicket];
    });
    setEditingTicket(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('この券種を削除してもよろしいですか？')) {
      setTickets(prev => prev.filter(t => t.id !== id));
      setEditingTicket(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: FONTS.body, padding: '24px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('${FONTS.importUrl}');

        .form-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: ${RADIUS.md};
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: ${SHADOW.card};
        }

        .ticket-item-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: ${RADIUS.sm};
          padding: 16px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .ticket-item-card:hover {
          background-color: ${COLORS.surfaceAlt};
          border-color: ${COLORS.gold};
          transform: translateY(-2px);
          box-shadow: ${SHADOW.cardHover};
        }

        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: ${COLORS.gold};
          margin-bottom: 6px;
        }

        .text-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: ${RADIUS.sm};
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 15px;
          font-family: ${FONTS.body};
          box-sizing: border-box;
        }
        .text-input:focus { outline: none; border-color: ${COLORS.gold}; }

        .btn-gold {
          width: 100%;
          padding: 14px;
          background-color: ${COLORS.gold};
          color: #ffffff;
          border: none;
          border-radius: ${RADIUS.sm};
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: ${FONTS.body};
          transition: filter 0.15s ease;
          box-shadow: 0 2px 6px rgba(184,100,26,0.28);
        }
        .btn-gold:hover { filter: brightness(1.08); }

        .btn-add-ticket {
          width: 100%;
          padding: 14px;
          background-color: ${COLORS.surfaceAlt};
          color: ${COLORS.gold};
          border: 1px dashed ${COLORS.gold};
          border-radius: ${RADIUS.md};
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s ease;
        }
        .btn-add-ticket:hover { background-color: #f0e4cf; }

        .badge {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }
      `}</style>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: FONTS.display, color: COLORS.text, fontWeight: 700 }}>
            予約フォーム・券種設定
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        <div className="form-card">
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: COLORS.gold, fontFamily: FONTS.display, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} /> 事前決済（Stripe）受付締め切り
          </h3>
          <p style={{ fontSize: '12px', color: COLORS.muted, margin: '0 0 14px 0', lineHeight: '1.5' }}>
            決済の反映タイムラグや当日の混乱を防ぐため、指定タイミングで自動的に「当日現地精算のみ」へ切り替えます。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
              <input
                type="radio"
                name="deadline"
                checked={stripeDeadlineType === 'day_before'}
                onChange={() => setStripeDeadlineType('day_before')}
                style={{ accentColor: COLORS.gold }}
              />
              観劇日の前日 23:59 まで（推薦）
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
              <input
                type="radio"
                name="deadline"
                checked={stripeDeadlineType === 'hours_before'}
                onChange={() => setStripeDeadlineType('hours_before')}
                style={{ accentColor: COLORS.gold }}
              />
              各回の開演
              <select
                value={stripeDeadlineHours}
                onChange={(e) => setStripeDeadlineHours(Number(e.target.value))}
                disabled={stripeDeadlineType !== 'hours_before'}
                style={{ backgroundColor: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '4px 8px', fontFamily: FONTS.body }}
              >
                <option value={2}>2時間前</option>
                <option value={3}>3時間前</option>
                <option value={6}>6時間前</option>
                <option value={12}>12時間前</option>
                <option value={24}>24時間前</option>
              </select>
              まで受付
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', margin: 0, fontFamily: FONTS.display, fontWeight: 700 }}>販売券種リスト</h2>
            <span style={{ fontSize: '12px', color: COLORS.muted }}>{tickets.length}件登録中</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => handleOpenEdit(ticket)}
                className="ticket-item-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '16px', color: COLORS.text, fontFamily: FONTS.display }}>
                    <Ticket size={16} style={{ marginRight: 6, verticalAlign: '-3px', color: COLORS.gold }} />
                    {ticket.name}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: COLORS.gold, fontFamily: FONTS.display }}>
                    ¥{ticket.price.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px', marginBottom: '10px' }}>
                  {ticket.paymentType === 'both' && (
                    <span className="badge" style={{ backgroundColor: COLORS.surfaceAlt, color: COLORS.gold, border: `1px solid ${COLORS.border}` }}>現金 / 事前決済OK</span>
                  )}
                  {ticket.paymentType === 'cash_only' && (
                    <span className="badge" style={{ backgroundColor: 'rgba(84,87,214,0.1)', color: COLORS.indigo }}>当日現金のみ</span>
                  )}
                  {ticket.paymentType === 'stripe_only' && (
                    <span className="badge" style={{ backgroundColor: 'rgba(31,154,86,0.1)', color: COLORS.success }}>事前決済のみ</span>
                  )}

                  {ticket.isMultiStageDiscount && (
                    <span className="badge" style={{ backgroundColor: 'rgba(184,100,26,0.15)', color: COLORS.gold }}>同公演はしご割</span>
                  )}

                  {ticket.setGroup && ticket.setGroup !== 'none' && (
                    <span className="badge" style={{ backgroundColor: 'rgba(84,87,214,0.15)', color: COLORS.indigo, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <Layers size={10} /> 他公演セット連携中
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: COLORS.muted, display: 'flex', justifyContent: 'space-between' }}>
                  <span>上限: {ticket.maxCount}枚 / 1予約</span>
                  <span style={{ color: COLORS.gold, fontWeight: 700 }}>編集する ›</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => handleOpenEdit(null)} className="btn-add-ticket">
            <Plus size={18} /> 新しい券種を追加する
          </button>
        </div>

      </div>

      {editingTicket && (
        <div
          onClick={() => setEditingTicket(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10,9,20,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '85vh',
              overflowY: 'auto',
              backgroundColor: COLORS.surface,
              borderRadius: RADIUS.lg,
              padding: '24px',
              border: `1px solid ${COLORS.border}`,
              boxShadow: SHADOW.modal
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: COLORS.text, fontFamily: FONTS.display, fontWeight: 700 }}>
                {tickets.some(t => t.id === editingTicket.id) ? '券種の編集' : '新規券種の作成'}
              </h3>
              <button onClick={() => setEditingTicket(null)} style={{ background: 'rgba(184,100,26,0.1)', border: 'none', color: COLORS.muted, width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">券種名（必須）</label>
                <input
                  type="text"
                  value={editingTicket.name}
                  onChange={(e) => setEditingTicket({ ...editingTicket, name: e.target.value })}
                  placeholder="例：一般前売り、他公演セット券 など"
                  className="text-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 2 }}>
                  <label className="input-label">金額 (円)</label>
                  <input
                    type="number"
                    value={editingTicket.price}
                    onChange={(e) => setEditingTicket({ ...editingTicket, price: Number(e.target.value) })}
                    className="text-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">最大枚数</label>
                  <input
                    type="number"
                    value={editingTicket.maxCount}
                    onChange={(e) => setEditingTicket({ ...editingTicket, maxCount: Number(e.target.value) })}
                    className="text-input"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">利用可能な支払い方法</label>
                <select
                  value={editingTicket.paymentType}
                  onChange={(e) => setEditingTicket({ ...editingTicket, paymentType: e.target.value })}
                  className="text-input"
                >
                  <option value="both">当日現金 ＆ 事前決済（両方OK）</option>
                  <option value="cash_only">当日現金のみ</option>
                  <option value="stripe_only">事前決済のみ（クレカ等）</option>
                </select>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}` }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: COLORS.text, fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={editingTicket.isMultiStageDiscount}
                    onChange={(e) => setEditingTicket({ ...editingTicket, isMultiStageDiscount: e.target.checked })}
                    style={{ accentColor: COLORS.gold }}
                  />
                  同一公演の2ステージ以上選択で適用（はしご割）
                </label>
              </div>

              <div>
                <label className="input-label" style={{ color: COLORS.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={14} color={COLORS.gold} /> 他公演とのセット割り連携設定
                </label>
                <select
                  value={editingTicket.setGroup}
                  onChange={(e) => setEditingTicket({ ...editingTicket, setGroup: e.target.value })}
                  className="text-input"
                >
                  <option value="none">連携なし（単独公演チケット）</option>
                  <option value="group_summer_fest">【セットグループ】2026夏の演劇祭（別公演とのセット券）</option>
                  <option value="group_joint_ticket">【セットグループ】劇団合同スペシャルチケット</option>
                </select>
                <p style={{ fontSize: '11px', color: COLORS.muted, margin: '4px 0 0 0' }}>
                  ※他公演とのセット券を選ぶと、予約時に相手方の公演日（ステージ）も自動で選択・発券される動線になります。
                </p>
              </div>

              <div>
                <label className="input-label" style={{ color: COLORS.text }}>注意書き・備考（任意）</label>
                <textarea
                  value={editingTicket.note}
                  onChange={(e) => setEditingTicket({ ...editingTicket, note: e.target.value })}
                  placeholder="例：要学生証提示、開演5分前までに受付要"
                  rows={2}
                  className="text-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                {tickets.some(t => t.id === editingTicket.id) && (
                  <button
                    onClick={() => handleDelete(editingTicket.id)}
                    style={{ flex: 1, padding: '14px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, border: 'none', borderRadius: RADIUS.sm, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Trash2 size={16} /> 削除
                  </button>
                )}
                <button onClick={handleSave} className="btn-gold" style={{ flex: 2 }}>
                  保存する
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}