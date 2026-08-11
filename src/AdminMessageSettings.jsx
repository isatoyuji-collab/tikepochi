import React, { useState } from 'react';
import { ArrowLeft, Mail, MessageSquare, Send, Plus, Save, Trash2, Users, CheckCircle } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
  success: '#1f9a56',
  danger: '#e85a45',
  indigo: '#5457d6'
};

export default function AdminMessageSettings({ onBack }) {
  const [notificationEmail, setNotificationEmail] = useState('info@office-knight.com');
  const [mode, setMode] = useState('auto'); // 'auto' (自動送信) | 'broadcast' (一斉送信)

  // 1. 自動通知テンプレート（自由に追加・削除可能）
  const [autoTemplates, setAutoTemplates] = useState([
    {
      id: 'completion',
      title: '予約完了時',
      content: `{予約者名} 様\n\noffice Knight 第12回本公演のご予約、誠にありがとうございます。\n以下の内容で承りました。\n\n■ご予約内容\n日時：{公演日時}\n枚数：{チケット枚数}\n合計金額：{合計金額}\n\n当日は受付にてお名前をお知らせください。`,
      isRemind: false
    },
    {
      id: 'remind',
      title: '前日リマインド',
      content: `{予約者名} 様\n\nいよいよ明日、観劇日となりました！\nご来場を心よりお待ちしております。\n\n■ご予約内容\n日時：{公演日時}\n会場：{会場名}`,
      isRemind: true,
      enabled: true
    },
    {
      id: 'cancel',
      title: 'キャンセル時',
      content: `{予約者名} 様\n\nご予約のキャンセル手続きが完了いたしました。\nまたのご利用を心よりお待ちしております。`,
      isRemind: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('completion');

  // 2. 自由な一斉送信用のstate
  const [broadcastTarget, setBroadcastTarget] = useState('all'); // 'all' | '2026-08-01_1500' | 'unpaid'
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // 現在選択中の自動テンプレート
  const currentTemplate = autoTemplates.find(t => t.id === activeTabId) || autoTemplates[0];

  // 自動テンプレートの更新
  const handleUpdateTemplateContent = (text) => {
    setAutoTemplates(prev => prev.map(t => t.id === activeTabId ? { ...t, content: text } : t));
  };

  // 自動テンプレートの追加
  const handleAddCustomTemplate = () => {
    const title = prompt('新しい自動通知のタイトルを入力してください（例: 公演3日前案内、終演後お礼 など）');
    if (title && title.trim()) {
      const newId = `custom_${Date.now()}`;
      const newTemp = {
        id: newId,
        title: title.trim(),
        content: `{予約者名} 様\n\nお世話になっております。`,
        isRemind: false
      };
      setAutoTemplates([...autoTemplates, newTemp]);
      setActiveTabId(newId);
    }
  };

  // 自動テンプレートの削除
  const handleDeleteTemplate = (id) => {
    if (autoTemplates.length <= 1) {
      alert('最低1つのテンプレートが必要です');
      return;
    }
    if (window.confirm('この通知設定を削除してもよろしいですか？')) {
      const nextList = autoTemplates.filter(t => t.id !== id);
      setAutoTemplates(nextList);
      setActiveTabId(nextList[0].id);
    }
  };

  // 変数タグ挿入（自動通知用）
  const handleInsertTagAuto = (tag) => {
    handleUpdateTemplateContent(currentTemplate.content + ` ${tag} `);
  };

  // 変数タグ挿入（一斉送信用）
  const handleInsertTagBroadcast = (tag) => {
    setBroadcastMessage(prev => prev + ` ${tag} `);
  };

  // 一斉送信実行処理
  const handleSendBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert('件名と本文の両方を入力してください');
      return;
    }
    if (window.confirm('選択したお客様全員へメッセージを一斉送信します。よろしいですか？')) {
      setBroadcastSent(true);
      setTimeout(() => {
        setBroadcastSent(false);
        setBroadcastTitle('');
        setBroadcastMessage('');
        alert('一斉送信が完了しました！');
      }, 1500);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", padding: '24px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .form-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(43, 36, 56, 0.04);
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
          border-radius: 10px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 14px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          box-sizing: border-box;
        }
        .text-input:focus { outline: none; border-color: ${COLORS.gold}; }

        .btn-gold {
          width: 100%;
          padding: 14px;
          background-color: ${COLORS.gold};
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          transition: filter 0.15s ease;
          box-shadow: 0 2px 6px rgba(201, 121, 31, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-gold:hover { filter: brightness(1.08); }

        .mode-btn {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.muted};
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .mode-btn.active {
          background-color: ${COLORS.gold};
          color: #ffffff;
          border-color: ${COLORS.gold};
          box-shadow: 0 2px 6px rgba(201, 121, 31, 0.2);
        }

        .tab-btn {
          padding: 10px 14px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: ${COLORS.muted};
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          white-space: nowrap;
        }
        .tab-btn.active {
          border-bottom-color: ${COLORS.gold};
          color: ${COLORS.gold};
        }

        .tag-chip-btn {
          background-color: ${COLORS.surfaceAlt};
          color: ${COLORS.gold};
          border: 1px solid ${COLORS.border};
          border-radius: 16px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .tag-chip-btn:hover { background-color: #f0e4cf; }
      `}</style>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* ヘッダーナビゲーション */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button 
            onClick={onBack} 
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: "'Shippori Mincho', serif", color: COLORS.text, fontWeight: 700 }}>
            メール・LINE通知設定
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* モード切替（①自動送信設定 ⇄ ②自由な一斉送信） */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setMode('auto')} 
            className={`mode-btn ${mode === 'auto' ? 'active' : ''}`}
          >
            <MessageSquare size={16} /> 自動通知のカスタマイズ
          </button>
          <button 
            onClick={() => setMode('broadcast')} 
            className={`mode-btn ${mode === 'broadcast' ? 'active' : ''}`}
          >
            <Send size={16} /> 自由なメッセージ一斉送信
          </button>
        </div>

        {/* 制作通知用メールアドレス（共通設定） */}
        <div className="form-card">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: COLORS.gold, fontFamily: "'Shippori Mincho', serif", display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Mail size={18} /> 制作通知用メールアドレス
          </h3>
          <p style={{ fontSize: '12px', color: COLORS.muted, margin: '0 0 10px 0' }}>
            お客様から新規予約が入った際、通知メールを受け取る劇団側の宛先です。
          </p>
          <input 
            type="email" 
            value={notificationEmail} 
            onChange={(e) => setNotificationEmail(e.target.value)}
            className="text-input"
          />
        </div>

        {/* 【モード①】自動送信の編集 */}
        {mode === 'auto' && (
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: COLORS.gold, fontFamily: "'Shippori Mincho', serif", fontWeight: 700 }}>
                🤖 自動通知テンプレート一覧
              </h3>
              <button 
                onClick={handleAddCustomTemplate}
                style={{ backgroundColor: COLORS.surfaceAlt, color: COLORS.gold, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> 新しい通知を追加
              </button>
            </div>

            {/* タブ切り替え（横スクロール対応） */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}`, marginBottom: '18px', overflowX: 'auto' }}>
              {autoTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTabId(t.id)}
                  className={`tab-btn ${activeTabId === t.id ? 'active' : ''}`}
                >
                  {t.title}
                </button>
              ))}
            </div>

            {/* 前日リマインドなどのトグル */}
            {currentTemplate.isRemind && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surfaceAlt, padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', border: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: 700 }}>この自動リマインド通知を有効にする</span>
                <input 
                  type="checkbox" 
                  checked={currentTemplate.enabled} 
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAutoTemplates(prev => prev.map(t => t.id === activeTabId ? { ...t, enabled: val } : t));
                  }}
                  style={{ accentColor: COLORS.gold, transform: 'scale(1.2)', cursor: 'pointer' }}
                />
              </div>
            )}

            {/* 変数タグ挿入 */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: COLORS.muted, marginBottom: '6px', fontWeight: 700 }}>タップで本文に挿入：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['{予約者名}', '{公演日時}', '{チケット枚数}', '{合計金額}', '{会場名}'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleInsertTagAuto(tag)}
                    className="tag-chip-btn"
                  >
                    <Plus size={12} /> {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 本文入力エリア */}
            <textarea
              value={currentTemplate.content}
              onChange={(e) => handleUpdateTemplateContent(e.target.value)}
              rows={9}
              className="text-input"
              style={{ lineHeight: '1.6', fontFamily: 'monospace', fontSize: '13px', marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              {!['completion', 'remind', 'cancel'].includes(currentTemplate.id) && (
                <button 
                  onClick={() => handleDeleteTemplate(currentTemplate.id)}
                  style={{ padding: '14px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={() => alert('通知設定を保存しました')} className="btn-gold" style={{ flex: 1 }}>
                <Save size={16} /> 設定を保存する
              </button>
            </div>

          </div>
        )}

        {/* 【モード②】自由な一斉送信 */}
        {mode === 'broadcast' && (
          <div className="form-card">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: COLORS.gold, fontFamily: "'Shippori Mincho', serif", display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <Send size={18} /> 予約者への自由一斉送信（メール/LINE）
            </h3>
            <p style={{ fontSize: '12px', color: COLORS.muted, margin: '0 0 16px 0', lineHeight: '1.5' }}>
              公演直前のお知らせ（開場時間変更や悪天候案内）、終演後のお礼メールなどを一括送信できます。
            </p>

            {/* 送信対象の絞り込み */}
            <div style={{ marginBottom: '16px' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={14} /> 送信対象エリアの選択
              </label>
              <select 
                value={broadcastTarget} 
                onChange={(e) => setBroadcastTarget(e.target.value)}
                className="text-input"
              >
                <option value="all">【全員】すべての予約者（全ステージ）</option>
                <option value="2026-08-01_1500">8月1日(土) 15:00 の回 の予約者のみ</option>
                <option value="2026-08-01_1900">8月1日(土) 19:00 の回 の予約者のみ</option>
                <option value="unpaid">事前決済未完了のお客様のみ</option>
              </select>
            </div>

            {/* 件名 */}
            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">メッセージ件名（タイトル）</label>
              <input 
                type="text" 
                value={broadcastTitle} 
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="例: 【重要】本日8/1公演の開場時間変更のお知らせ"
                className="text-input"
              />
            </div>

            {/* 変数挿入タグ */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: COLORS.muted, marginBottom: '6px', fontWeight: 700 }}>タップで本文に挿入：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['{予約者名}', '{公演日時}', '{会場名}'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleInsertTagBroadcast(tag)}
                    className="tag-chip-btn"
                  >
                    <Plus size={12} /> {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 本文 */}
            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">本文メッセージ</label>
              <textarea 
                value={broadcastMessage} 
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder={`{予約者名} 様\n\n【重要なお知らせ】\n本日の公演に関しまして...`}
                rows={8}
                className="text-input"
                style={{ lineHeight: '1.6', fontFamily: 'monospace' }}
              />
            </div>

            {/* 送信ボタン */}
            <button 
              onClick={handleSendBroadcast} 
              disabled={broadcastSent}
              className="btn-gold" 
              style={{ backgroundColor: broadcastSent ? COLORS.success : COLORS.gold }}
            >
              {broadcastSent ? (
                <> <CheckCircle size={18} /> 送信中... </>
              ) : (
                <> <Send size={18} /> 対象のお客様へ一斉送信する </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}