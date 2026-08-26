import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Plus, Edit2, Trash2, X, Ticket, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

export default function AdminTicketSettings({ productionId, org, onBack }) {
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);

  // フォーム入力ステート
  const [name, setName] = useState('');
  const [price, setPrice] = useState('3000');
  const [isDonation, setIsDonation] = useState(false);
  const [description, setDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      if (!productionId) return;

      const { data, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('production_id', productionId)
        .order('price', { ascending: true });

      if (error) throw error;
      if (data) setTicketTypes(data);
    } catch (err) {
      console.error('Fetch ticket types error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [productionId]);

  const handleOpenAdd = () => {
    setEditingTicket(null);
    setName('');
    setPrice('3000');
    setIsDonation(false);
    setDescription('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tk) => {
    setEditingTicket(tk);
    setName(tk.name || '');
    setPrice(tk.price ? String(tk.price) : '0');
    setIsDonation(tk.is_donation || false);
    setDescription(tk.description || '');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('券種名を入力してください。');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    // DBに確実に存在する基本カラムのみ送信
    const payload = {
      production_id: productionId,
      name: name.trim(),
      price: isDonation ? 0 : (parseInt(price, 10) || 0),
      is_donation: isDonation,
      description: description.trim() || null,
    };

    try {
      if (editingTicket) {
        const { error } = await supabase
          .from('ticket_types')
          .update(payload)
          .eq('id', editingTicket.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticket_types')
          .insert([payload]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchTickets();
    } catch (err) {
      console.error('Save ticket type error:', err);
      setErrorMessage('券種の保存に失敗しました: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('この券種を削除してよろしいですか？')) {
      try {
        const { error } = await supabase
          .from('ticket_types')
          .delete()
          .eq('id', id);

        if (error) throw error;
        fetchTickets();
      } catch (err) {
        alert('削除に失敗しました: ' + err.message);
      }
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
          padding: 18px;
          margin-bottom: 12px;
          box-shadow: 0 2px 4px rgba(33,26,44,0.05);
        }

        .text-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 14px;
          font-family: ${FONTS.body};
          box-sizing: border-box;
        }
        .text-input:focus {
          outline: none;
          border-color: ${COLORS.gold};
        }

        .btn-gold {
          padding: 12px 20px;
          background-color: ${COLORS.gold};
          color: #ffffff;
          border: none;
          border-radius: ${RADIUS.sm};
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: ${FONTS.body};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-gold:hover { filter: brightness(1.08); }

        .btn-outline {
          padding: 8px 12px;
          background-color: ${COLORS.surface};
          color: ${COLORS.gold};
          border: 1px solid ${COLORS.border};
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .btn-outline:hover { background-color: ${COLORS.surfaceAlt}; }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* ヘッダー */}
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

        {/* 新規追加ボタン */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', margin: 0, fontFamily: FONTS.display, fontWeight: 700 }}>販売券種リスト</h2>
            <span style={{ fontSize: '12px', color: COLORS.muted }}>登録中: {ticketTypes.length} 件</span>
          </div>
          <button onClick={handleOpenAdd} className="btn-gold">
            <Plus size={16} /> 券種を追加する
          </button>
        </div>

        {/* 券種リスト */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: COLORS.muted }}>データを読み込み中...</div>
        ) : ticketTypes.length === 0 ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '36px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>
            まだ券種が登録されていません。<br />上の「券種を追加する」ボタンから前売り券や当日券を登録してください。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ticketTypes.map(tk => (
              <div key={tk.id} className="form-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: COLORS.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gold, border: `1px solid ${COLORS.border}` }}>
                    <Ticket size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: COLORS.text }}>{tk.name}</span>
                      {tk.is_donation && (
                        <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(201,121,31,0.15)', color: COLORS.gold, padding: '2px 6px', borderRadius: '4px' }}>
                          カンパ制
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold, marginTop: '2px' }}>
                      {tk.is_donation ? 'お客様任意金額（下限500円〜）' : `¥${tk.price?.toLocaleString()}`}
                    </div>
                    {tk.description && (
                      <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>{tk.description}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleOpenEdit(tk)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '6px' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(tk.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.danger, padding: '6px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 追加・編集モーダル */}
      {isModalOpen && (
        <div onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: '24px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: COLORS.text, fontFamily: FONTS.display, fontWeight: 700, fontSize: '18px' }}>
                {editingTicket ? '券種の編集' : '新しい券種の追加'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                  券種名（例: 前売り、一般、U-25割引、当日券など）
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 前売り"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                  価格（円）
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  disabled={isDonation}
                  value={isDonation ? '0' : price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="text-input"
                  style={{ backgroundColor: isDonation ? COLORS.surfaceAlt : COLORS.surface }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="donationCheck"
                  checked={isDonation}
                  onChange={(e) => setIsDonation(e.target.checked)}
                  style={{ accentColor: COLORS.gold, width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="donationCheck" style={{ fontSize: '13px', color: COLORS.text, cursor: 'pointer', fontWeight: 700 }}>
                  カンパ制（お客様が金額を自由に指定）にする
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                  説明・備考（任意）
                </label>
                <input
                  type="text"
                  placeholder="例: 25歳以下対象（当日要証明書）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-input"
                />
              </div>

              {errorMessage && (
                <div style={{ padding: '10px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} /> {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline" style={{ flex: 1, padding: '12px' }}>
                  キャンセル
                </button>
                <button type="submit" disabled={saving} className="btn-gold" style={{ flex: 2 }}>
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