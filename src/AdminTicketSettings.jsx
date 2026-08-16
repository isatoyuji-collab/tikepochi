import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Plus, Edit2, Trash2, X, Ticket } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
};

export default function AdminTicketSettings({ productionId, org, onBack }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // モーダル用
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(3000);
  const [maxPerReserve, setMaxPerReserve] = useState(4);
  const [paymentType, setPaymentType] = useState('both'); // both: 現金/事前決済OK, cash: 当日現金のみ
  const [saving, setSaving] = useState(false);

  // Supabaseから該当公演の券種を取得
  const fetchTickets = async () => {
    setLoading(true);
    if (!productionId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('production_id', productionId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTickets(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [productionId]);

  // モーダルオープン
  const handleOpenModal = (ticket = null) => {
    if (ticket) {
      setEditingTicket(ticket);
      setName(ticket.name);
      setPrice(ticket.price);
      setMaxPerReserve(ticket.max_per_reserve || 4);
      setPaymentType(ticket.payment_type || 'both');
    } else {
      setEditingTicket(null);
      setName('');
      setPrice(3000);
      setMaxPerReserve(4);
      setPaymentType('both');
    }
    setShowModal(true);
  };

  // 券種の保存
  const handleSaveTicket = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    const payload = {
      production_id: productionId,
      name: name.trim(),
      price: Number(price),
      max_per_reserve: Number(maxPerReserve),
      payment_type: paymentType
    };

    let error = null;
    if (editingTicket) {
      const res = await supabase.from('ticket_types').update(payload).eq('id', editingTicket.id);
      error = res.error;
    } else {
      const res = await supabase.from('ticket_types').insert([payload]);
      error = res.error;
    }

    setSaving(false);

    if (error) {
      alert('券種の保存に失敗しました: ' + error.message);
    } else {
      setShowModal(false);
      fetchTickets();
    }
  };

  // 削除処理
  const handleDeleteTicket = async (id) => {
    if (confirm('この券種を削除してよろしいですか？')) {
      await supabase.from('ticket_types').delete().eq('id', id);
      fetchTickets();
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .ticket-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 4px rgba(43, 36, 56, 0.04);
        }

        .btn-add {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px dashed ${COLORS.gold};
          background-color: transparent;
          color: ${COLORS.gold};
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
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
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: "'Shippori Mincho', serif", color: COLORS.text, fontWeight: 700 }}>
            予約フォーム・券種設定
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* 券種リスト */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold }}>販売券種リスト</div>
          <div style={{ fontSize: '12px', color: COLORS.muted }}>登録中: {tickets.length}件</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.muted }}>データを読み込み中...</div>
        ) : tickets.length === 0 ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center', marginBottom: '16px' }}>
            <Ticket size={32} color={COLORS.gold} style={{ marginBottom: '8px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontFamily: "'Shippori Mincho', serif", color: COLORS.gold }}>まだ券種が登録されていません</h3>
            <p style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '20px' }}>
              一般・学生・割引チケットなどの券種と金額を作成してください。
            </p>
            <button onClick={() => handleOpenModal()} className="btn-add" style={{ width: 'auto', margin: '0 auto', padding: '12px 24px', backgroundColor: COLORS.gold, color: '#fff', borderStyle: 'solid' }}>
              <Plus size={18} /> 最初の券種を追加する
            </button>
          </div>
        ) : (
          <div>
            {tickets.map(ticket => (
              <div key={ticket.id} className="ticket-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Ticket size={18} color={COLORS.gold} />
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>{ticket.name}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: ticket.payment_type === 'cash' ? '#f0f0f0' : '#fff6e8', color: ticket.payment_type === 'cash' ? COLORS.muted : COLORS.gold, fontWeight: 700 }}>
                      {ticket.payment_type === 'cash' ? '当日現金のみ' : '現金 / 事前決済OK'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.muted }}>
                    1回の予約上限: {ticket.max_per_reserve}枚
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '20px', fontWeight: 700, color: COLORS.gold }}>
                    ¥{Number(ticket.price).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleOpenModal(ticket)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '6px' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteTicket(ticket.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e85a45', padding: '6px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => handleOpenModal()} className="btn-add">
              <Plus size={16} /> 新しい券種を追加する
            </button>
          </div>
        )}

      </div>

      {/* 券種追加・編集モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: COLORS.surface, borderRadius: '18px', padding: '28px', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 16px 0', fontFamily: "'Shippori Mincho', serif", fontSize: '20px', color: COLORS.text }}>
              {editingTicket ? '券種の編集' : '新しい券種の追加'}
            </h2>

            <form onSubmit={handleSaveTicket}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>
                券種名（例: 一般前売り、U-25割引、当日券など）
              </label>
              <input
                type="text"
                required
                placeholder="例: 一般前売り"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="modal-input"
              />

              <label style={{ fontSize: '12px', fontWeight 700, color: COLORS.gold }}>
                価格（円）
              </label>
              <input
                type="number"
                required
                min="0"
                step="100"
                placeholder="3000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="modal-input"
              />

              <label style={{ fontSize: '12px', fontWeight 700, color: COLORS.gold }}>
                1回の予約につき選べる最大枚数
              </label>
              <input
                type="number"
                required
                min="1"
                max="10"
                value={maxPerReserve}
                onChange={(e) => setMaxPerReserve(e.target.value)}
                className="modal-input"
              />

              <label style={{ fontSize: '12px', fontWeight 700, color: COLORS.gold }}>
                受け付ける支払い方法
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="modal-input"
              >
                <option value="both">現金 / 事前決済OK</option>
                <option value="cash">当日現金のみ（事前決済不可）</option>
              </select>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, background: 'none', fontWeight: 700, cursor: 'pointer', color: COLORS.muted }}>
                  キャンセル
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}