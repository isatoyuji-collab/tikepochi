// src/AdminTicketSettings.jsx (TIKEPOCHI側)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Plus, Edit2, Trash2, X, Ticket, Sparkles, CheckCircle2, AlertCircle, Layers, HeartHandshake, Link2 } from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

export default function AdminTicketSettings({ productionId, org, onBack }) {
  const [ticketTypes, setTicketTypes] = useState([]);
  const [allProductions, setAllProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'options'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);

  // フォーム入力ステート
  const [name, setName] = useState('');
  const [price, setPrice] = useState('7000');
  const [isDonation, setIsDonation] = useState(false);
  const [isSetTicket, setIsSetTicket] = useState(false); // 🎫 セット券フラグ
  const [description, setDescription] = useState('');
  const [categoryType, setCategoryType] = useState('ticket'); // 'ticket' | 'option'

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 組織内の全公演を取得（A公演・B公演の同期用）
  const fetchOrgProductions = async () => {
    try {
      if (!org?.id) return;
      const { data } = await supabase
        .from('productions')
        .select('id, title')
        .eq('organization_id', org.id);
      if (data) setAllProductions(data);
    } catch (err) {
      console.error('Fetch productions error:', err);
    }
  };

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
    fetchOrgProductions();
    fetchTickets();
  }, [productionId, org?.id]);

  // 基本券種とオプションに分類
  const baseTickets = ticketTypes.filter(t => !t.is_donation && !t.description?.includes('【オプション】'));
  const optionTickets = ticketTypes.filter(t => t.is_donation || t.description?.includes('【オプション】'));

  const handleOpenAdd = (type = 'ticket') => {
    setEditingTicket(null);
    setCategoryType(type);
    setName(type === 'ticket' ? 'A・B両公演通しセット券' : '最前列指定席');
    setPrice(type === 'ticket' ? '7000' : '500');
    setIsDonation(false);
    setIsSetTicket(type === 'ticket');
    setDescription(type === 'ticket' ? 'A公演・B公演を両方観劇できるお得なセット券' : '');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tk) => {
    setEditingTicket(tk);
    const isOpt = tk.is_donation || tk.description?.includes('【オプション】');
    const isSet = tk.is_set_ticket || tk.description?.includes('【セット券】') || tk.name?.includes('セット');

    setCategoryType(isOpt ? 'option' : 'ticket');
    setName(tk.name || '');
    setPrice(tk.price ? String(tk.price) : '0');
    setIsDonation(tk.is_donation || false);
    setIsSetTicket(Boolean(isSet));
    setDescription(tk.description ? tk.description.replace('【オプション】', '').replace('【セット券】', '').trim() : '');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('名称を入力してください。');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    // 説明文の識別タグ成形
    let finalDesc = description.trim();
    if (categoryType === 'option' && !isDonation) {
      finalDesc = `【オプション】${finalDesc}`;
    } else if (isSetTicket) {
      finalDesc = `【セット券】${finalDesc}`;
    }

    const priceNum = isDonation ? 0 : (parseInt(price, 10) || 0);

    try {
      // 🎯 セット券の場合は全公演（A公演・B公演）に一括同期保存
      if (isSetTicket && allProductions.length > 0) {
        for (const prod of allProductions) {
          // 該当公演に同名のセット券が既にあるか確認
          const { data: existing } = await supabase
            .from('ticket_types')
            .select('id')
            .eq('production_id', prod.id)
            .eq('name', name.trim())
            .maybeSingle();

          const prodPayload = {
            production_id: prod.id,
            name: name.trim(),
            price: priceNum,
            is_donation: false,
            description: finalDesc || null,
          };

          if (existing) {
            await supabase.from('ticket_types').update(prodPayload).eq('id', existing.id);
          } else {
            await supabase.from('ticket_types').insert([prodPayload]);
          }
        }
      } else {
        // 通常券種（単一公演のみ）
        const payload = {
          production_id: productionId,
          name: name.trim(),
          price: priceNum,
          is_donation: isDonation,
          description: finalDesc || null,
        };

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
      }

      setIsModalOpen(false);
      fetchTickets();
    } catch (err) {
      console.error('Save ticket type error:', err);
      setErrorMessage('保存に失敗しました: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ticket) => {
    const isSet = ticket.description?.includes('【セット券】') || ticket.name?.includes('セット');
    const confirmMsg = isSet
      ? 'このセット券を削除すると、A公演・B公演の両方から同時に削除されます。よろしいですか？'
      : 'この項目を削除してよろしいですか？';

    if (confirm(confirmMsg)) {
      try {
        if (isSet && allProductions.length > 0) {
          // セット券は同名のものを全公演から一括削除
          for (const prod of allProductions) {
            await supabase
              .from('ticket_types')
              .delete()
              .eq('production_id', prod.id)
              .eq('name', ticket.name);
          }
        } else {
          const { error } = await supabase
            .from('ticket_types')
            .delete()
            .eq('id', ticket.id);
          if (error) throw error;
        }

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
        .text-input:focus { outline: none; border-color: ${COLORS.gold}; }

        .btn-gold {
          padding: 10px 18px;
          background-color: ${COLORS.gold};
          color: #ffffff;
          border: none;
          border-radius: ${RADIUS.sm};
          font-size: 13px;
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

        .tab-btn {
          flex: 1;
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          background: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-bottom: 3px solid transparent;
        }
        .tab-btn.active {
          color: ${COLORS.gold};
          border-bottom: 3px solid ${COLORS.gold};
          background-color: ${COLORS.surfaceAlt};
        }
      `}</style>

      <div style={{ maxWidth: '750px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: FONTS.display, color: COLORS.text, fontWeight: 700 }}>
            券種 ＆ オプション設定
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* タブ切り替え */}
        <div style={{ display: 'flex', backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
          <button
            className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <Ticket size={17} /> 基本券種 ({baseTickets.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'options' ? 'active' : ''}`}
            onClick={() => setActiveTab('options')}
          >
            <Sparkles size={17} /> 追加オプション・席種 ({optionTickets.length})
          </button>
        </div>

        {/* --- 基本券種タブ --- */}
        {activeTab === 'tickets' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>基本券種（一般・学割・セットなど）</h2>
                <span style={{ fontSize: '12px', color: COLORS.muted }}>※お客様が1枚につき必ず1つ選択する入場券</span>
              </div>
              <button onClick={() => handleOpenAdd('ticket')} className="btn-gold">
                <Plus size={16} /> 基本券種を追加
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: COLORS.muted }}>読み込み中...</div>
            ) : baseTickets.length === 0 ? (
              <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '30px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>
                基本券種が登録されていません。「一般前売り」「セットチケット」などを登録してください。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {baseTickets.map(tk => {
                  const isSet = tk.description?.includes('【セット券】') || tk.name?.includes('セット');
                  return (
                    <div key={tk.id} className="form-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: isSet ? 'rgba(201,121,31,0.12)' : COLORS.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSet ? COLORS.gold : COLORS.indigo, border: `1px solid ${COLORS.border}` }}>
                          {isSet ? <Link2 size={20} /> : <Ticket size={20} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: COLORS.text }}>{tk.name}</span>
                            {isSet && (
                              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <Link2 size={10} /> A・B両公演共通セット券
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold, marginTop: '2px' }}>
                            ¥{tk.price?.toLocaleString()}
                          </div>
                          {tk.description && <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>{tk.description.replace('【セット券】', '')}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleOpenEdit(tk)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '6px' }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(tk)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.danger, padding: '6px' }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- 追加オプションタブ --- */}
        {activeTab === 'options' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>追加オプション（指定席・カンパなど）</h2>
                <span style={{ fontSize: '12px', color: COLORS.muted }}>※基本券種に上乗せして選択できる追加メニュー</span>
              </div>
              <button onClick={() => handleOpenAdd('option')} className="btn-gold">
                <Plus size={16} /> オプションを追加
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: COLORS.muted }}>読み込み中...</div>
            ) : optionTickets.length === 0 ? (
              <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '30px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>
                オプションが登録されていません。「最前列指定席（+500円）」「応援カンパ」などを追加できます。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {optionTickets.map(tk => (
                  <div key={tk.id} className="form-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(84,87,214,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.indigo, border: `1px solid rgba(84,87,214,0.2)` }}>
                        {tk.is_donation ? <HeartHandshake size={20} color={COLORS.gold} /> : <Sparkles size={20} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: COLORS.text }}>{tk.name}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: tk.is_donation ? 'rgba(201,121,31,0.15)' : 'rgba(84,87,214,0.15)', color: tk.is_donation ? COLORS.gold : COLORS.indigo, padding: '2px 6px', borderRadius: '4px' }}>
                            {tk.is_donation ? 'カンパ制' : '追加オプション'}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold, marginTop: '2px' }}>
                          {tk.is_donation ? 'お客様任意金額（下限500円〜）' : `+¥${tk.price?.toLocaleString()}`}
                        </div>
                        {tk.description && <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>{tk.description.replace('【オプション】', '')}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleOpenEdit(tk)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '6px' }}><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(tk)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.danger, padding: '6px' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 追加・編集モーダル */}
      {isModalOpen && (
        <div onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: '24px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: COLORS.text, fontFamily: FONTS.display, fontWeight: 700, fontSize: '18px' }}>
                {editingTicket ? '設定の編集' : (categoryType === 'ticket' ? '基本券種の追加' : 'オプションの追加')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                  {categoryType === 'ticket' ? '券種名（例: 一般前売り、学割、セット券など）' : 'オプション名（例: 最前列指定席、応援カンパなど）'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={categoryType === 'ticket' ? '例: A・B両公演通しセット券' : '例: 最前列指定席'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                  {categoryType === 'ticket' ? '価格（円）' : '追加料金（円）'}
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

              {/* 🎫 基本券種の場合：セット券連動チェック */}
              {categoryType === 'ticket' && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '10px 12px', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                    <input
                      type="checkbox"
                      checked={isSetTicket}
                      onChange={(e) => setIsSetTicket(e.target.checked)}
                      style={{ accentColor: COLORS.gold, width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    🎫 A・B両公演共通のセット券にする
                  </label>
                  <p style={{ fontSize: '11px', color: '#b45309', margin: '4px 0 0 24px', lineHeight: '1.4' }}>
                    チェックを入れると、A公演・B公演の双方に自動でこの券種が登録・同期されます。
                  </p>
                </div>
              )}

              {categoryType === 'option' && (
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
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                  説明・備考（任意）
                </label>
                <input
                  type="text"
                  placeholder="例: 特典付き、または当日要学生証"
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