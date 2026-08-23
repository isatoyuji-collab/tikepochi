import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, UserPlus, Trash2, X, Copy, Check, Edit2, Shield, Tag, Link2, Sparkles, FileText, Share2 } from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

export default function AdminStaffSettings({ productionId, org, onBack }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productions, setProductions] = useState([]);

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
  const [staffTeam, setStaffTeam] = useState('共通・両公演');
  const [hasPersonalUrl, setHasPersonalUrl] = useState(true);

  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // 劇団に紐づく全公演のキャストを一括取得
  const fetchStaffAndProductions = async () => {
    setLoading(true);
    try {
      if (!org?.id) {
        setLoading(false);
        return;
      }

      // 1. 劇団の全公演を取得
      const { data: prods } = await supabase
        .from('productions')
        .select('id, title')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: true });

      if (prods && prods.length > 0) {
        setProductions(prods);
        const prodIds = prods.map(p => p.id);

        // 2. 劇団内の全公演に属するキャストを取得
        const { data: allStaff, error } = await supabase
          .from('cast_staff')
          .select('*')
          .in('production_id', prodIds)
          .order('created_at', { ascending: true });

        if (!error && allStaff) {
          // キャスト名の重複を排除（同一人物が複数公演に存在しても1名として管理）
          const uniqueList = [];
          const seenNames = new Set();
          allStaff.forEach(m => {
            if (!seenNames.has(m.name)) {
              seenNames.add(m.name);
              uniqueList.push(m);
            }
          });
          setStaffList(uniqueList);
        }
      }
    } catch (e) {
      console.error('Fetch staff error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAndProductions();
  }, [productionId, org]);

  const handleCopyInviteUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleShareLine = (text, url) => {
    const shareText = encodeURIComponent(`${text}\n${url}`);
    window.open(`https://line.me/R/msg/text/?${shareText}`, '_blank');
  };

  // テキスト解析
  const handleRunAiAnalysis = () => {
    if (!aiInputText.trim()) {
      alert('解析するテキストを入力してください。');
      return;
    }

    setIsAiAnalyzing(true);
    const lines = aiInputText.split('\n').map(l => l.trim()).filter(Boolean);
    const results = [];
    let currentTeam = '共通・両公演';
    let currentType = 'cast';

    lines.forEach((line, index) => {
      if (line.includes('あなたとコンビ') || line.includes('A公演') || line.includes('Aチーム')) {
        currentTeam = 'A公演（あなたとコンビ、に）';
        currentType = 'cast';
        return;
      }
      if (line.includes('爆弾') || line.includes('B公演') || line.includes('Bチーム')) {
        currentTeam = 'B公演（爆弾よりもハードです）';
        currentType = 'cast';
        return;
      }
      if (line.includes('スタッフ') || line.includes('音響') || line.includes('照明') || line.includes('制作')) {
        currentType = 'staff';
        currentTeam = '共通・スタッフ';
      }

      let cleanName = line;
      if (line.includes('：') || line.includes(':')) {
        const parts = line.split(/[:：]/);
        if (parts[1] && parts[1].trim()) cleanName = parts[1].trim();
      }

      cleanName = cleanName.replace(/^[・\-\*◆●]\s*/, '').replace(/\(.*\)|（.*）/, '').trim();

      if (cleanName && cleanName.length <= 20) {
        results.push({
          tempId: Date.now() + index,
          name: cleanName,
          memberType: currentType,
          teamTag: currentTeam,
          hasPersonalUrl: true
        });
      }
    });

    if (results.length === 0) {
      alert('テキストからお名前を抽出できませんでした。フォーマットを確認してください。');
      setIsAiAnalyzing(false);
      return;
    }

    setAiParsedResults(results);
    setIsAiAnalyzing(false);
  };

  const handleUpdateParsedItem = (tempId, field, value) => {
    setAiParsedResults(prev => prev.map(item => item.tempId === tempId ? { ...item, [field]: value } : item));
  };

  const handleRemoveParsedItem = (tempId) => {
    setAiParsedResults(prev => prev.filter(item => item.tempId !== tempId));
  };

  // AI解析結果の一括保存
  const handleConfirmAiImport = async () => {
    if (!aiParsedResults || aiParsedResults.length === 0) return;

    const targetProdId = productionId || (productions[0]?.id);
    const newRecords = aiParsedResults.map(item => {
      const pUrl = item.hasPersonalUrl ? `${window.location.origin}/r/${targetProdId}?staff=${encodeURIComponent(item.name)}` : '';
      return {
        production_id: targetProdId,
        name: item.name,
        role: 'member',
        member_type: item.memberType,
        team_tag: item.teamTag,
        has_personal_url: item.hasPersonalUrl,
        cast_slug: item.name,
        personal_url: pUrl
      };
    });

    const { error } = await supabase.from('cast_staff').insert(newRecords);

    if (error) {
      alert('一括保存に失敗しました: ' + error.message);
    } else {
      setIsAiModalOpen(false);
      setAiParsedResults(null);
      setAiInputText('');
      fetchStaffAndProductions();
    }
  };

  // URL一括再生成
  const handleGenerateAllUrls = async () => {
    const targetProdId = productionId || (productions[0]?.id);
    let count = 0;
    for (const member of staffList) {
      if (member.has_personal_url) {
        const pUrl = `${window.location.origin}/r/${targetProdId}?staff=${encodeURIComponent(member.name)}`;
        await supabase.from('cast_staff').update({ cast_slug: member.name, personal_url: pUrl }).eq('id', member.id);
        count++;
      }
    }
    fetchStaffAndProductions();
    alert(`${count}件の専用予約URLを更新しました！`);
  };

  const handleCopyUrl = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllUrlsText = () => {
    const list = staffList.filter(m => m.has_personal_url && m.personal_url);
    if (list.length === 0) {
      alert('コピー対象の個別URLがありません。');
      return;
    }
    const text = list.map(m => `${m.name} 扱い専用予約URL:\n${m.personal_url}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleOpenInviteModal = () => {
    setEditingMember(null);
    setStaffName('');
    setStaffRole('member');
    setMemberType('cast');
    setStaffTeam('共通・両公演');
    setHasPersonalUrl(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member) => {
    setEditingMember(member);
    setStaffName(member.name);
    setStaffRole(member.role || 'member');
    setMemberType(member.member_type || 'cast');
    setStaffTeam(member.team_tag || '共通・両公演');
    setHasPersonalUrl(member.has_personal_url !== false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!staffName.trim()) {
      alert('お名前を入力してください');
      return;
    }

    const targetProdId = productionId || (productions[0]?.id);
    const pUrl = hasPersonalUrl ? `${window.location.origin}/r/${targetProdId}?staff=${encodeURIComponent(staffName.trim())}` : '';

    if (editingMember) {
      await supabase.from('cast_staff').update({
        name: staffName.trim(),
        role: staffRole,
        member_type: memberType,
        team_tag: staffTeam,
        has_personal_url: hasPersonalUrl,
        cast_slug: staffName.trim(),
        personal_url: pUrl
      }).eq('id', editingMember.id);
    } else {
      await supabase.from('cast_staff').insert([{
        production_id: targetProdId,
        name: staffName.trim(),
        role: staffRole,
        member_type: memberType,
        team_tag: staffTeam,
        has_personal_url: hasPersonalUrl,
        cast_slug: staffName.trim(),
        personal_url: pUrl
      }]);
    }

    setIsModalOpen(false);
    fetchStaffAndProductions();
  };

  const handleDeleteMember = async (id) => {
    if (confirm('このメンバーを削除してよろしいですか？')) {
      await supabase.from('cast_staff').delete().eq('id', id);
      fetchStaffAndProductions();
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

        .btn-line {
          padding: 10px 16px;
          background-color: #06C755;
          color: #ffffff;
          border: none;
          border-radius: ${RADIUS.sm};
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .btn-line:hover { filter: brightness(1.08); }

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
            キャスト・スタッフ ＆ 扱い予約URL管理
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* 共同管理者招待 */}
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gold, fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
            <UserPlus size={18} /> 共同管理者・制作スタッフの招待
          </div>
          <p style={{ fontSize: '12px', color: COLORS.muted, margin: '0 0 14px 0', lineHeight: '1.5' }}>
            同じ劇団の管理画面（予約状況の確認・受付運用など）を共有したいスタッフに、以下の招待URLを送ってください。
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="text-input"
              style={{ flex: 1, minWidth: '240px', backgroundColor: COLORS.surfaceAlt, fontSize: '13px' }}
            />
            <button onClick={handleCopyInviteUrl} className="btn-gold" style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
              {copiedInvite ? <Check size={16} /> : <Copy size={16} />}
              {copiedInvite ? 'コピー完了' : 'URLコピー'}
            </button>
            <button onClick={() => handleShareLine(`【${org?.name || '劇団'}】管理メンバー招待URL`, inviteUrl)} className="btn-line">
              <Share2 size={16} /> LINEで共有
            </button>
          </div>
        </div>

        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button onClick={() => setIsAiModalOpen(true)} className="btn-gold" style={{ flex: 1, minWidth: '220px' }}>
            <Sparkles size={16} /> AIでキャスト/スタッフを一括抽出
          </button>

          <button onClick={handleOpenInviteModal} className="btn-outline" style={{ padding: '12px 16px' }}>
            <UserPlus size={16} /> 手動で追加
          </button>

          <button onClick={handleGenerateAllUrls} className="btn-outline" style={{ padding: '12px 16px' }}>
            <Link2 size={16} /> URLを一括再生成
          </button>

          <button onClick={handleCopyAllUrlsText} className="btn-outline" style={{ padding: '12px 16px' }}>
            {copiedAll ? <Check size={16} color={COLORS.success} /> : <FileText size={16} />}
            {copiedAll ? '完了' : '全URLコピー'}
          </button>
        </div>

        {/* メンバー一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '16px', margin: 0, fontFamily: FONTS.display, fontWeight: 700 }}>劇団キャスト・スタッフ一覧（全演目共通）</h2>
            <span style={{ fontSize: '12px', color: COLORS.muted }}>全 {staffList.length} 名</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: COLORS.muted }}>データを読み込み中...</div>
          ) : staffList.length === 0 ? (
            <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '30px', textAlign: 'center', color: COLORS.muted, fontSize: '13px' }}>
              まだキャスト・スタッフが登録されていません。
            </div>
          ) : (
            staffList.map(member => (
              <div key={member.id} className="form-card" style={{ marginBottom: 0 }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: COLORS.text, fontFamily: FONTS.display }}>
                      {member.name}
                    </span>

                    <span className="badge" style={{ backgroundColor: member.member_type === 'cast' ? 'rgba(184,100,26,0.15)' : 'rgba(84,87,214,0.15)', color: member.member_type === 'cast' ? COLORS.gold : COLORS.indigo }}>
                      {member.member_type === 'cast' ? '役者' : 'スタッフ'}
                    </span>

                    {member.role === 'admin' && (
                      <span className="badge" style={{ backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, border: '1px solid rgba(232,90,69,0.2)' }}>
                        <Shield size={11} /> 管理者
                      </span>
                    )}

                    {member.team_tag && (
                      <span className="badge" style={{ backgroundColor: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}>
                        <Tag size={10} color={COLORS.gold} /> {member.team_tag}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleOpenEditModal(member)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '4px' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteMember(member.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.danger, padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {member.has_personal_url ? (
                  <div style={{ padding: '10px 12px', backgroundColor: COLORS.surfaceAlt, borderRadius: '10px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ fontSize: '11px', color: COLORS.gold, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <Link2 size={12} /> {member.name} 扱い専用予約URL
                      </div>
                      {member.personal_url ? (
                        <div style={{ fontSize: '12px', color: COLORS.text, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                          {member.personal_url}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: COLORS.muted, fontStyle: 'italic' }}>専用URL未発行</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {member.personal_url ? (
                        <>
                          <button onClick={() => handleCopyUrl(member.id, member.personal_url)} className="btn-outline">
                            {copiedId === member.id ? <Check size={14} color={COLORS.success} /> : <Copy size={14} />}
                            {copiedId === member.id ? '完了' : 'コピー'}
                          </button>
                          <button onClick={() => handleShareLine(`${member.name} 扱い予約URL`, member.personal_url)} className="btn-line" style={{ padding: '6px 10px', fontSize: '12px' }}>
                            <Share2 size={14} /> LINE送信
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: COLORS.muted }}>※扱い窓口なし</div>
                )}

              </div>
            ))
          )}
        </div>

      </div>

      {/* AIモーダル */}
      {isAiModalOpen && (
        <div onClick={() => setIsAiModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,9,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '650px', maxHeight: '88vh', overflowY: 'auto', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: '24px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: COLORS.text, fontFamily: FONTS.display, fontWeight: 700, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={18} color={COLORS.gold} /> キャスト・スタッフ一括登録
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {!aiParsedResults ? (
              <div>
                <p style={{ fontSize: '12px', color: COLORS.muted, marginTop: 0 }}>キャスト・スタッフの文面を貼り付けてください。自動でお名前と所属公演を抽出します。</p>
                <textarea
                  rows={6}
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  placeholder={`【テキスト貼り付け例】\nA公演（あなたとコンビ、に）\nよしひろ 葵\n坂本 竜馬\n\nB公演（爆弾よりもハードです）\nベル\nたーりー\n\nスタッフ\n音響：佐藤\n照明：田中`}
                  className="text-input"
                  style={{ marginBottom: '16px', lineHeight: '1.5' }}
                />
                <button onClick={handleRunAiAnalysis} className="btn-gold" style={{ width: '100%' }} disabled={isAiAnalyzing}>
                  {isAiAnalyzing ? '解析中...' : 'テキストからリストを生成'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '350px', overflowY: 'auto' }}>
                  {aiParsedResults.map(item => (
                    <div key={item.tempId} style={{ padding: '12px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', backgroundColor: COLORS.surfaceAlt, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="text" value={item.name} onChange={(e) => handleUpdateParsedItem(item.tempId, 'name', e.target.value)} className="text-input" style={{ flex: 2, minWidth: '120px' }} />
                      <select value={item.memberType} onChange={(e) => handleUpdateParsedItem(item.tempId, 'memberType', e.target.value)} className="text-input" style={{ flex: 1, minWidth: '90px' }}>
                        <option value="cast">役者</option>
                        <option value="staff">スタッフ</option>
                      </select>
                      <select value={item.teamTag} onChange={(e) => handleUpdateParsedItem(item.tempId, 'teamTag', e.target.value)} className="text-input" style={{ flex: 1.5, minWidth: '130px' }}>
                        <option value="共通・両公演">共通・両公演</option>
                        <option value="A公演（あなたとコンビ、に）">A公演（あなたとコンビ、に）</option>
                        <option value="B公演（爆弾よりもハードです）">B公演（爆弾よりもハードです）</option>
                        <option value="共通・スタッフ">共通・スタッフ</option>
                      </select>
                      <button onClick={() => handleRemoveParsedItem(item.tempId)} style={{ background: 'none', border: 'none', color: COLORS.danger, cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setAiParsedResults(null)} className="btn-outline" style={{ flex: 1 }}>やり直す</button>
                  <button onClick={handleConfirmAiImport} className="btn-gold" style={{ flex: 2 }}>一括登録を確定する</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 手動追加・編集モーダル */}
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
                <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>お名前</label>
                <input type="text" value={staffName} onChange={(e) => setStaffName(e.target.value)} className="text-input" placeholder="例: 岸根 勇人" />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>分類</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <label style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${memberType === 'cast' ? COLORS.gold : COLORS.border}`, backgroundColor: memberType === 'cast' ? COLORS.surfaceAlt : COLORS.surface, cursor: 'pointer', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                    <input type="radio" checked={memberType === 'cast'} onChange={() => setMemberType('cast')} style={{ accentColor: COLORS.gold }} /> 役者
                  </label>
                  <label style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${memberType === 'staff' ? COLORS.gold : COLORS.border}`, backgroundColor: memberType === 'staff' ? COLORS.surfaceAlt : COLORS.surface, cursor: 'pointer', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                    <input type="radio" checked={memberType === 'staff'} onChange={() => setMemberType('staff')} style={{ accentColor: COLORS.gold }} /> スタッフ
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.gold }}>所属公演・班設定</label>
                <select value={staffTeam} onChange={(e) => setStaffTeam(e.target.value)} className="text-input" style={{ marginTop: '4px' }}>
                  <option value="共通・両公演">共通・両公演</option>
                  <option value="A公演（あなたとコンビ、に）">A公演（あなたとコンビ、に）</option>
                  <option value="B公演（爆弾よりもハードです）">B公演（爆弾よりもハードです）</option>
                  <option value="共通・スタッフ">共通・スタッフ</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="hasPersonalUrlCheck"
                  checked={hasPersonalUrl}
                  onChange={(e) => setHasPersonalUrl(e.target.checked)}
                  style={{ accentColor: COLORS.gold, width: '16px', height: '16px' }}
                />
                <label htmlFor="hasPersonalUrlCheck" style={{ fontSize: '13px', color: COLORS.text, cursor: 'pointer' }}>
                  このメンバー専用の予約URLを発行する
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