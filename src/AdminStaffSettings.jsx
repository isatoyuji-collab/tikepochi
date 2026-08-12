import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, UserPlus, Trash2, X, Copy, Check, Edit2, Shield, Tag, Link2, Sparkles, FileText, Users } from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

const PRODUCTION_TEAMS = ['Aチーム', 'Bチーム', 'シングルキャスト', 'スタッフ・共通'];

const INITIAL_STAFF = [
  {
    id: 1,
    name: '岸根 勇人',
    role: 'admin',
    memberType: 'cast',
    teamTag: 'シングルキャスト',
    ticketVisibility: 'all_stages',
    hasPersonalUrl: true,
    linkToNextProduction: true,
    castSlug: 'kishine',
    personalUrl: 'https://tikepochi.com/p/office-knight-12/reserve?cast=kishine',
    status: 'active',
    authType: 'LINE'
  },
  {
    id: 2,
    name: '受付 太郎',
    role: 'member',
    memberType: 'staff',
    teamTag: 'スタッフ・共通',
    ticketVisibility: 'all_stages',
    hasPersonalUrl: true,
    linkToNextProduction: true,
    castSlug: 'uketsuke_taro',
    personalUrl: 'https://tikepochi.com/p/office-knight-12/reserve?cast=uketsuke_taro',
    status: 'active',
    authType: 'MagicLink'
  },
];

export default function AdminStaffSettings({ productionId, org, onBack }) {
  const [staffList, setStaffList] = useState(INITIAL_STAFF);

  // 共同管理者招待リンク用state
  const [copiedInvite, setCopiedInvite] = useState(false);
  const inviteUrl = `${window.location.origin}?invite_org_id=${org?.id || ''}`;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiParsedResults, setAiParsedResults] = useState(null);

  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('member');
  const [memberType, setMemberType] = useState('cast');
  const [staffTeam, setStaffTeam] = useState('Aチーム');
  const [ticketVisibility, setTicketVisibility] = useState('assigned_only');
  const [hasPersonalUrl, setHasPersonalUrl] = useState(true);
  const [linkToNextProduction, setLinkToNextProduction] = useState(false);

  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // 招待URLコピー処理
  const handleCopyInviteUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleRunAiAnalysis = () => {
    setIsAiAnalyzing(true);
    setTimeout(() => {
      const extracted = [
        { tempId: 101, name: 'ヒロイン 花子', memberType: 'cast', teamTag: 'Aチーム', hasPersonalUrl: true },
        { tempId: 102, name: 'ゲスト 坂本', memberType: 'cast', teamTag: 'Bチーム', hasPersonalUrl: true },
        { tempId: 103, name: '佐藤 音響', memberType: 'staff', teamTag: 'スタッフ・共通', hasPersonalUrl: false },
        { tempId: 104, name: '田中 制作', memberType: 'staff', teamTag: 'スタッフ・共通', hasPersonalUrl: true },
      ];
      setAiParsedResults(extracted);
      setIsAiAnalyzing(false);
    }, 1200);
  };

  const handleUpdateParsedItem = (tempId, field, value) => {
    setAiParsedResults(prev => prev.map(item => item.tempId === tempId ? { ...item, [field]: value } : item));
  };

  const handleRemoveParsedItem = (tempId) => {
    setAiParsedResults(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleConfirmAiImport = () => {
    if (!aiParsedResults || aiParsedResults.length === 0) return;

    const newMembers = aiParsedResults.map(item => {
      const dummySlug = item.name.replace(/\s+/g, '').toLowerCase() || `cast${Date.now()}`;
      return {
        id: Date.now() + Math.random(),
        name: item.name,
        role: 'member',
        memberType: item.memberType,
        teamTag: item.teamTag,
        ticketVisibility: 'all_stages',
        hasPersonalUrl: item.hasPersonalUrl,
        linkToNextProduction: false,
        castSlug: dummySlug,
        personalUrl: item.hasPersonalUrl ? `https://tikepochi.com/p/office-knight-12/reserve?cast=${encodeURIComponent(dummySlug)}` : '',
        status: 'invited',
        authType: 'Pending'
      };
    });

    setStaffList([...staffList, ...newMembers]);
    setIsAiModalOpen(false);
    setAiParsedResults(null);
    setAiInputText('');
    alert(`${newMembers.length} 名のメンバーを一括登録しました！`);
  };

  const handleGenerateAllUrls = () => {
    let generatedCount = 0;
    const updated = staffList.map(member => {
      if (member.hasPersonalUrl && !member.personalUrl) {
        generatedCount++;
        const dummySlug = member.name.replace(/\s+/g, '').toLowerCase() || `member${member.id}`;
        return {
          ...member,
          castSlug: dummySlug,
          personalUrl: `https://tikepochi.com/p/office-knight-12/reserve?cast=${encodeURIComponent(dummySlug)}`
        };
      }
      return member;
    });

    setStaffList(updated);
    if (generatedCount > 0) {
      alert(`新規で ${generatedCount} 名の専用予約URLを発行しました！\n（※既存の発行済みURLは保持されています）`);
    } else {
      alert('対象全員の専用予約URLはすでに発行済みです。');
    }
  };

  const handleGenerateSingleUrl = (id) => {
    setStaffList(prev => prev.map(m => {
      if (m.id === id) {
        const dummySlug = m.name.replace(/\s+/g, '').toLowerCase() || `member${m.id}`;
        return {
          ...m,
          hasPersonalUrl: true,
          castSlug: dummySlug,
          personalUrl: `https://tikepochi.com/p/office-knight-12/reserve?cast=${encodeURIComponent(dummySlug)}`
        };
      }
      return m;
    }));
  };

  const handleCopyUrl = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllUrlsText = () => {
    const list = staffList.filter(m => m.hasPersonalUrl && m.personalUrl);
    if (list.length === 0) {
      alert('コピー対象の個別URLがありません。まずはURLを発行してください。');
      return;
    }
    const text = list.map(m => `${m.name} 扱い専用予約URL:\n${m.personalUrl}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleOpenInviteModal = () => {
    setEditingMember(null);
    setStaffName('');
    setStaffRole('member');
    setMemberType('cast');
    setStaffTeam(PRODUCTION_TEAMS[0]);
    setTicketVisibility('assigned_only');
    setHasPersonalUrl(true);
    setLinkToNextProduction(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member) => {
    setEditingMember(member);
    setStaffName(member.name);
    setStaffRole(member.role);
    setMemberType(member.memberType || 'cast');
    setStaffTeam(member.teamTag || PRODUCTION_TEAMS[0]);
    setTicketVisibility(member.ticketVisibility || 'assigned_only');
    setHasPersonalUrl(member.hasPersonalUrl !== false);
    setLinkToNextProduction(member.linkToNextProduction || false);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!staffName.trim()) {
      alert('お名前を入力してください');
      return;
    }
    const payload = {
      name: staffName.trim(),
      role: staffRole,
      memberType: memberType,
      teamTag: staffTeam,
      ticketVisibility: ticketVisibility,
      hasPersonalUrl: hasPersonalUrl,
      linkToNextProduction: linkToNextProduction
    };

    if (editingMember) {
      setStaffList(prev => prev.map(m => {
        if (m.id === editingMember.id) {
          const dummySlug = m.castSlug || staffName.trim().replace(/\s+/g, '').toLowerCase();
          return {
            ...m,
            ...payload,
            personalUrl: hasPersonalUrl ? (m.personalUrl || `https://tikepochi.com/p/office-knight-12/reserve?cast=${encodeURIComponent(dummySlug)}`) : ''
          };
        }
        return m;
      }));
    } else {
      const dummySlug = staffName.trim().replace(/\s+/g, '').toLowerCase();
      const newMember = {
        id: Date.now(),
        ...payload,
        castSlug: dummySlug,
        personalUrl: hasPersonalUrl ? `https://tikepochi.com/p/office-knight-12/reserve?cast=${encodeURIComponent(dummySlug)}` : '',
        status: 'invited',
        authType: 'Pending'
      };
      setStaffList([...staffList, newMember]);
    }
    setIsModalOpen(false);
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

        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: ${COLORS.gold};
          margin-bottom: 6px;
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
          transition: filter 0.15s ease;
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

        .badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
      `}</style>

      <div style={{ maxWidth: '850px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: FONTS.display, color: COLORS.text, fontWeight: 700 }}>
            キャスト・スタッフ権限 ＆ 個別URL管理
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* 🎪 追加：共同管理者・スタッフ招待用カード */}
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gold, fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
            <UserPlus size={18} /> 共同管理者・制作スタッフの招待
          </div>
          <p style={{ fontSize: '12px', color: COLORS.muted, margin: '0 0 14px 0', lineHeight: '1.5' }}>
            同じ劇団の管理画面（予約状況の確認・受付運用など）を共有したいスタッフに、以下の招待URLを送ってください。
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="text-input"
              style={{ flex: 1, backgroundColor: COLORS.surfaceAlt, fontSize: '13px' }}
            />
            <button onClick={handleCopyInviteUrl} className="btn-gold" style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
              {copiedInvite ? <Check size={16} /> : <Copy size={16} />}
              {copiedInvite ? 'コピー完了' : '招待URLをコピー'}
            </button>
          </div>
        </div>

        {/* ボタン群 */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button onClick={() => setIsAiModalOpen(true)} className="btn-gold" style={{ flex: 1, minWidth: '220px' }}>
            <Sparkles size={16} /> AIでキャスト/スタッフを一括抽出
          </button>

          <button onClick={handleOpenInviteModal} className="btn-outline" style={{ padding: '12px 16px' }}>
            <UserPlus size={16} /> 手動で追加
          </button>

          <button onClick={handleGenerateAllUrls} className="btn-outline" style={{ padding: '12px 16px' }} title="未発行のメンバーだけに専用URLを一括割り当て">
            <Link2 size={16} /> URLを一括生成
          </button>

          <button onClick={handleCopyAllUrlsText} className="btn-outline" style={{ padding: '12px 16px' }} title="一覧テキストをコピー">
            {copiedAll ? <Check size={16} color={COLORS.success} /> : <FileText size={16} />}
            {copiedAll ? '完了' : '全URLコピー'}
          </button>
        </div>

        {/* メンバー一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '16px', margin: 0, fontFamily: FONTS.display, fontWeight: 700 }}>キャスト・スタッフ一覧 ＆ 扱い予約URL</h2>
            <span style={{ fontSize: '12px', color: COLORS.muted }}>全 {staffList.length} 名</span>
          </div>

          {staffList.map(member => (
            <div key={member.id} className="form-card" style={{ marginBottom: 0 }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '16px', color: COLORS.text, fontFamily: FONTS.display }}>
                    {member.name}
                  </span>

                  <span className="badge" style={{ backgroundColor: member.memberType === 'cast' ? 'rgba(184,100,26,0.15)' : 'rgba(84,87,214,0.15)', color: member.memberType === 'cast' ? COLORS.gold : COLORS.indigo }}>
                    {member.memberType === 'cast' ? '役者' : 'スタッフ'}
                  </span>

                  {member.role === 'admin' && (
                    <span className="badge" style={{ backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, border: '1px solid rgba(232,90,69,0.2)' }}>
                      <Shield size={11} /> 管理者
                    </span>
                  )}

                  {member.teamTag && (
                    <span className="badge" style={{ backgroundColor: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}>
                      <Tag size={10} color={COLORS.gold} /> {member.teamTag}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleOpenEditModal(member)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '4px' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => setStaffList(staffList.filter(s => s.id !== member.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.danger, padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {member.hasPersonalUrl ? (
                <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '10px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontSize: '11px', color: COLORS.gold, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <Link2 size={12} /> {member.name} 扱い専用予約URL
                    </div>
                    {member.personalUrl ? (
                      <div style={{ fontSize: '12px', color: COLORS.text, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {member.personalUrl}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: COLORS.muted, fontStyle: 'italic' }}>専用URL未発行</div>
                    )}
                  </div>

                  <div>
                    {member.personalUrl ? (
                      <button onClick={() => handleCopyUrl(member.id, member.personalUrl)} className="btn-outline">
                        {copiedId === member.id ? <Check size={14} color={COLORS.success} /> : <Copy size={14} />}
                        {copiedId === member.id ? '完了' : 'URLコピー'}
                      </button>
                    ) : (
                      <button onClick={() => handleGenerateSingleUrl(member.id)} className="btn-gold" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        <Sparkles size={14} /> 個別発行
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: COLORS.muted }}>※扱い窓口なし（設定から変更可能）</div>
              )}

            </div>
          ))}
        </div>

      </div>

      {isAiModalOpen && (
        <div onClick={() => setIsAiModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '650px', maxHeight: '88vh', overflowY: 'auto', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: '24px', border: `1px solid ${COLORS.border}` }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: COLORS.text, fontFamily: FONTS.display, fontWeight: 700, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={18} color={COLORS.gold} /> AIキャスト・スタッフ一括登録
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {!aiParsedResults && (
              <div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginBottom: '12px' }}>
                  LINEグループノートのキャスティングメモや、フライヤーのテキストをそのまま貼り付けてください。AIが「名前」「分類」「チーム」を抽出します。
                </div>

                <textarea
                  rows={6}
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  placeholder={`【テキスト貼り付け例】\nAチーム：\nヒロイン 花子\nゲスト 坂本\n\nスタッフ：\n音響：佐藤 音響\n制作：田中 制作`}
                  className="text-input"
                  style={{ marginBottom: '16px', lineHeight: '1.5' }}
                />

                <button onClick={handleRunAiAnalysis} className="btn-gold" style={{ width: '100%' }} disabled={isAiAnalyzing}>
                  {isAiAnalyzing ? 'AIがリストを解析・抽出中...' : 'テキストを解析してプレビュー生成'}
                </button>
              </div>
            )}

            {aiParsedResults && (
              <div>
                <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '10px', marginBottom: '16px', fontSize: '12px', color: COLORS.text }}>
                  <strong>登録前の確認・編集:</strong><br />
                  AIが抽出した結果です。名前や分類の変更、および<strong>「専用URL要・不要」のチェックを自由に切り替えてから一括登録</strong>できます。
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '350px', overflowY: 'auto' }}>
                  {aiParsedResults.map(item => (
                    <div key={item.tempId} style={{ padding: '12px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', backgroundColor: COLORS.surface, display: 'flex', flexDirection: 'column', gap: '8px' }}>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateParsedItem(item.tempId, 'name', e.target.value)}
                          className="text-input"
                          style={{ flex: 1, fontWeight: 'bold' }}
                        />

                        <select
                          value={item.memberType}
                          onChange={(e) => handleUpdateParsedItem(item.tempId, 'memberType', e.target.value)}
                          className="text-input"
                          style={{ width: '110px' }}
                        >
                          <option value="cast">役者</option>
                          <option value="staff">スタッフ</option>
                        </select>

                        <select
                          value={item.teamTag}
                          onChange={(e) => handleUpdateParsedItem(item.tempId, 'teamTag', e.target.value)}
                          className="text-input"
                          style={{ width: '130px' }}
                        >
                          {PRODUCTION_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <button onClick={() => handleRemoveParsedItem(item.tempId)} style={{ background: 'none', border: 'none', color: COLORS.danger, cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.gold, fontWeight: 700 }}>
                          <input
                            type="checkbox"
                            checked={item.hasPersonalUrl}
                            onChange={(e) => handleUpdateParsedItem(item.tempId, 'hasPersonalUrl', e.target.checked)}
                            style={{ accentColor: COLORS.gold }}
                          />
                          この人に専用予約URL（動員バック窓口）を発行する
                        </label>
                      </div>

                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setAiParsedResults(null)} className="btn-outline" style={{ flex: 1 }}>
                    やり直す
                  </button>
                  <button onClick={handleConfirmAiImport} className="btn-gold" style={{ flex: 2 }}>
                    この内容で一括登録を確定する
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {isModalOpen && (
        <div onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: '24px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: COLORS.text, fontFamily: FONTS.display, fontWeight: 700, fontSize: '18px' }}>
                {editingMember ? 'メンバー編集' : '新規メンバー追加'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">お名前</label>
                <input type="text" value={staffName} onChange={(e) => setStaffName(e.target.value)} className="text-input" />
              </div>

              <div>
                <label className="input-label">分類</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${memberType === 'cast' ? COLORS.gold : COLORS.border}`, backgroundColor: memberType === 'cast' ? COLORS.surfaceAlt : COLORS.surface, cursor: 'pointer', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                    <input type="radio" checked={memberType === 'cast'} onChange={() => setMemberType('cast')} style={{ accentColor: COLORS.gold }} /> 役者
                  </label>
                  <label style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${memberType === 'staff' ? COLORS.gold : COLORS.border}`, backgroundColor: memberType === 'staff' ? COLORS.surfaceAlt : COLORS.surface, cursor: 'pointer', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                    <input type="radio" checked={memberType === 'staff'} onChange={() => setMemberType('staff')} style={{ accentColor: COLORS.gold }} /> スタッフ
                  </label>
                </div>
              </div>

              <div style={{ padding: '8px 10px', backgroundColor: COLORS.surfaceAlt, borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', color: COLORS.text }}>
                  <input type="checkbox" checked={hasPersonalUrl} onChange={(e) => setHasPersonalUrl(e.target.checked)} style={{ accentColor: COLORS.gold }} />
                  このメンバー専用の扱い予約URLを発行する
                </label>
              </div>

              <button onClick={handleSave} className="btn-gold" style={{ marginTop: '8px' }}>保存する</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}