import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Plus, Trash2, X, Calendar, Edit2, Zap } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
};

export default function AdminStageSettings({ productionId, onBack }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  // ステージ追加・編集モーダル
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [stageDate, setStageDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [teamName, setTeamName] = useState('');
  const [capacity, setCapacity] = useState(80);
  const [status, setStatus] = useState('open');
  const [saving, setSaving] = useState(false);

  // キャパ一括変更モーダル
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCapacity, setBulkCapacity] = useState(80);

  const fetchStages = async () => {
    setLoading(true);
    if (!productionId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('production_id', productionId)
      .order('stage_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error && data) {
      setStages(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStages();
  }, [productionId]);

  const handleOpenModal = (stage = null) => {
    if (stage) {
      setEditingStage(stage);
      setStageDate(stage.stage_date);
      setStartTime(stage.start_time?.slice(0, 5) || '14:00');
      setTeamName(stage.team_name || '');
      setCapacity(stage.capacity || 80);
      setStatus(stage.status || 'open');
    } else {
      setEditingStage(null);
      setStageDate('');
      setStartTime('14:00');
      setTeamName('');
      setCapacity(80);
      setStatus('open');
    }
    setShowModal(true);
  };

  const handleSaveStage = async (e) => {
    e.preventDefault();
    if (!stageDate || !startTime) return;

    setSaving(true);
    const payload = {
      production_id: productionId,
      stage_date: stageDate,
      start_time: startTime,
      team_name: teamName.trim(),
      capacity: Number(capacity),
      status: status
    };

    let error = null;
    if (editingStage) {
      const res = await supabase.from('stages').update(payload).eq('id', editingStage.id);
      error = res.error;
    } else {
      const res = await supabase.from('stages').insert([payload]);
      error = res.error;
    }

    setSaving(false);

    if (error) {
      alert('ステージの保存に失敗しました: ' + error.message);
    } else {
      setShowModal(false);
      fetchStages();
    }
  };

  const handleUpdateCapacity = async (stageId, newCap) => {
    if (newCap < 0) return;
    await supabase.from('stages').update({ capacity: newCap }).eq('id', stageId);
    setStages(stages.map(s => s.id === stageId ? { ...s, capacity: newCap } : s));
  };

  const handleUpdateStatus = async (stageId, nextStatus) => {
    await supabase.from('stages').update({ status: nextStatus }).eq('id', stageId);
    setStages(stages.map(s => s.id === stageId ? { ...s, status: nextStatus } : s));
  };

  const handleBulkCapacity = async () => {
    if (!confirm(`全ステージの定員を ${bulkCapacity} 席に一括変更しますか？`)) return;
    setSaving(true);
    const { error } = await supabase.from('stages').update({ capacity: Number(bulkCapacity) }).eq('production_id', productionId);
    setSaving(false);
    if (error) {
      alert('一括更新に失敗しました: ' + error.message);
    } else {
      setShowBulkModal(false);
      fetchStages();
    }
  };

  const handleDeleteStage = async (id) => {
    if (confirm('このステージ（日程）を削除してよろしいですか？')) {
      await supabase.from('stages').delete().eq('id', id);
      fetchStages();
    }
  };

  const formatDisplayDate = (dStr) => {
    if (!dStr) return '';
    const date = new Date(dStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}月${date.getDate()}日(${days[date.getDay()]})`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: "'Shippori Mincho', serif", color: COLORS.text, fontWeight: 700 }}>
            日程・座席（キャパ設定）
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* アクションボタンバー */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => setShowBulkModal(true)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', color: COLORS.gold, fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Zap size={16} /> キャパを一括変更
          </button>
          <button onClick={() => handleOpenModal()} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Plus size={16} /> ＋ ステージを追加
          </button>
        </div>

        {/* ステージリスト */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.muted }}>データを読み込み中...</div>
        ) : stages.length === 0 ? (
          <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
            <Calendar size={32} color={COLORS.gold} style={{ marginBottom: '8px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontFamily: "'Shippori Mincho', serif", color: COLORS.gold }}>まだステージ（日程）が登録されていません</h3>
            <p style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '20px' }}>
              開演日時や定員（キャパ）を登録してください。
            </p>
            <button onClick={() => handleOpenModal()} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={16} /> 最初のステージを追加する
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stages.map(stage => (
              <div key={stage.id} style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '20px', boxShadow: '0 2px 4px rgba(43, 36, 56, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={18} color={COLORS.gold} />
                    <span style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '18px', fontWeight: 700 }}>
                      {formatDisplayDate(stage.stage_date)} {stage.start_time?.slice(0, 5)}
                    </span>
                    {stage.team_name && (
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#fff6e8', color: COLORS.gold, fontWeight: 700, border: `1px solid ${COLORS.border}` }}>
                        {stage.team_name}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={stage.status}
                      onChange={(e) => handleUpdateStatus(stage.id, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: stage.status === 'open' ? '#f0fdf4' : stage.status === 'soldout' ? '#fef2f2' : '#f4f4f5', color: stage.status === 'open' ? '#16a34a' : stage.status === 'soldout' ? '#dc2626' : COLORS.muted, fontWeight: 700, fontSize: '12px' }}
                    >
                      <option value="open">販売中</option>
                      <option value="soldout">完売</option>
                      <option value="draft">受付前</option>
                    </select>
                    <button onClick={() => handleOpenModal(stage)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '4px' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteStage(stage.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e85a45', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* 定員調整エリア */}
                <div style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: COLORS.muted }}>
                    定員（キャパ）
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => handleUpdateCapacity(stage.id, (stage.capacity || 80) - 5)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={stage.capacity || 80}
                      onChange={(e) => handleUpdateCapacity(stage.id, Number(e.target.value))}
                      style={{ width: '60px', padding: '6px', textAlign: 'center', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', fontWeight: 700, fontSize: '14px' }}
                    />
                    <span style={{ fontSize: '13px' }}>席</span>
                    <button
                      onClick={() => handleUpdateCapacity(stage.id, (stage.capacity || 80) + 5)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ステージ追加・編集モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: COLORS.surface, borderRadius: '18px', padding: '28px', border: `1px solid ${COLORS.border}`, position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 16px 0', fontFamily: "'Shippori Mincho', serif", fontSize: '20px' }}>
              {editingStage ? 'ステージの編集' : '新しいステージの追加'}
            </h2>

            <form onSubmit={handleSaveStage}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>開演日</label>
              <input
                type="date"
                required
                value={stageDate}
                onChange={(e) => setStageDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginTop: '4px', marginBottom: '14px', boxSizing: 'border-box' }}
              />

              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>開演時刻</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginTop: '4px', marginBottom: '14px', boxSizing: 'border-box' }}
              />

              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>区分ラベル（任意: 例 A公演, Bチーム, マチネ回）</label>
              <input
                type="text"
                placeholder="例: A公演"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginTop: '4px', marginBottom: '14px', boxSizing: 'border-box' }}
              />

              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>定員（席数）</label>
              <input
                type="number"
                min="1"
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginTop: '4px', marginBottom: '14px', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
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

      {/* キャパ一括変更モーダル */}
      {showBulkModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '400px', backgroundColor: COLORS.surface, borderRadius: '18px', padding: '28px', border: `1px solid ${COLORS.border}`, position: 'relative' }}>
            <button onClick={() => setShowBulkModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 12px 0', fontFamily: "'Shippori Mincho', serif", fontSize: '18px' }}>
              全ステージの定員を一括変更
            </h2>
            <p style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '16px' }}>
              現在登録されている全ステージの定員（キャパ）を指定した席数に統一します。
            </p>

            <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>統一する席数</label>
            <input
              type="number"
              min="1"
              value={bulkCapacity}
              onChange={(e) => setBulkCapacity(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginTop: '4px', marginBottom: '20px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowBulkModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, background: 'none', fontWeight: 700, cursor: 'pointer', color: COLORS.muted }}>
                キャンセル
              </button>
              <button type="button" onClick={handleBulkCapacity} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '更新中...' : '一括変更を実行'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}