import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, ChevronDown, ChevronUp, MapPin, Copy, Check } from 'lucide-react';
import { supabase } from './supabaseClient'; // ⭐ Supabaseクライアントをインポート

const INITIAL_VENUES = [
  { id: 1, name: '近鉄アート館', address: '大阪府大阪市阿倍野区阿倍野筋1-1-43' },
  { id: 2, name: 'HEP HALL', address: '大阪府大阪市北区角田町5-15' },
  { id: 3, name: '扇町ミュージアムキューブ', address: '大阪府大阪市北区南扇町6-26' },
  { id: 4, name: '布施PEベース', address: '大阪府東大阪市足代新町4-12' },
];

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
  success: '#1f9a56',
};

export default function AdminProductionInfo({ productionId, onBack }) {
  const [currentProdId, setCurrentProdId] = useState(productionId);
  const [title, setTitle] = useState('');
  const [mainTitle, setMainTitle] = useState('');
  const [teamTags, setTeamTags] = useState(['Aチーム', 'Bチーム']);
  const [newTagInput, setNewTagInput] = useState('');

  const [venues, setVenues] = useState(INITIAL_VENUES);
  const [venueInput, setVenueInput] = useState('');
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [isEditingVenue, setIsEditingVenue] = useState(false);

  const [formUrl, setFormUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Supabaseから現在の公演情報を取得
  useEffect(() => {
    async function fetchProduction() {
      setLoading(true);
      
      let query = supabase.from('productions').select('*');
      if (currentProdId) {
        query = query.eq('id', currentProdId);
      } else {
        query = query.order('created_at', { ascending: true }).limit(1);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const prod = data[0];
        setCurrentProdId(prod.id);
        setTitle(prod.title || '');
        setMainTitle(prod.subtitle || '');
        setVenueInput(prod.venue_name || '');
        setFormUrl(`${window.location.origin}/r/${prod.id}`);
      } else {
        // DBに未登録の場合の初期表示データ
        setTitle('office Knight 第12回本公演「タイトル」');
        setMainTitle('熱き想いが交差する、小劇場サスペンスの最高峰。');
        setVenueInput('布施PEベース');
      }
      setLoading(false);
    }

    fetchProduction();
  }, [currentProdId]);

  // 2. Supabaseへの保存処理（UPDATE または INSERT）
  const handleSave = async () => {
    if (!title.trim()) {
      alert('公演名を入力してください。');
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      subtitle: mainTitle.trim(),
      venue_name: venueInput.trim(),
    };

    let result;
    if (currentProdId) {
      // 既存の公演を更新
      result = await supabase
        .from('productions')
        .update(payload)
        .eq('id', currentProdId);
    } else {
      // 新規公演を作成
      result = await supabase
        .from('productions')
        .insert([payload])
        .select();

      if (result.data && result.data[0]) {
        setCurrentProdId(result.data[0].id);
      }
    }

    setSaving(false);

    if (result.error) {
      alert('保存に失敗しました: ' + result.error.message);
    } else {
      alert('公演基本情報をSupabaseに保存しました！');
    }
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !teamTags.includes(newTagInput.trim())) {
      setTeamTags([...teamTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setTeamTags(teamTags.filter(t => t !== tag));
  };

  const handleSelectVenue = (venue) => {
    setVenueInput(venue.name);
    setShowVenueDropdown(false);
    setIsEditingVenue(false);
  };

  const handleSaveVenue = () => {
    if (!venueInput.trim()) return;
    const existing = venues.find(v => v.name === venueInput.trim());
    if (!existing) {
      const newVenue = { id: Date.now(), name: venueInput.trim(), address: '' };
      setVenues([...venues, newVenue]);
    }
    setIsEditingVenue(false);
    setShowVenueDropdown(false);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        データを読み込み中...
      </div>
    );
  }

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
          margin-bottom: 8px;
        }

        .text-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 15px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }
        .text-input:focus {
          outline: none;
          border-color: ${COLORS.gold};
        }

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
          transition: filter 0.15s ease, transform 0.1s ease;
          box-shadow: 0 2px 6px rgba(201, 121, 31, 0.25);
        }
        .btn-gold:hover { filter: brightness(1.08); }
        .btn-gold:active { transform: scale(0.98); }
        .btn-gold:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-outline {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          color: ${COLORS.gold};
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-outline:hover { background-color: ${COLORS.surfaceAlt}; }

        .tag-chip {
          background-color: ${COLORS.surfaceAlt};
          color: ${COLORS.gold};
          border: 1px solid ${COLORS.border};
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
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
            公演基本情報
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* 基本情報入力カード */}
        <div className="form-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="input-label">公演名（必須）</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="text-input"
            />
          </div>

          <div>
            <label className="input-label" style={{ color: COLORS.text }}>メインタイトル・キャッチコピー（任意）</label>
            <textarea 
              value={mainTitle} 
              onChange={(e) => setMainTitle(e.target.value)}
              rows={2}
              className="text-input"
              style={{ lineHeight: '1.5' }}
            />
          </div>

          <div>
            <label className="input-label" style={{ color: COLORS.text }}>チームタグ（Wキャスト・班設定）</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {teamTags.map(tag => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={newTagInput} 
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="例: Cチーム, シングルキャスト"
                className="text-input"
                style={{ flex: 1 }}
              />
              <button onClick={handleAddTag} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> 追加
              </button>
            </div>
          </div>
        </div>

        {/* 詳細設定（アコーディオン） */}
        <div className="form-card" style={{ padding: 0, overflow: 'hidden' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{ width: '100%', padding: '18px 20px', backgroundColor: COLORS.surface, color: COLORS.text, border: 'none', textAlign: 'left', fontSize: '15px', fontWeight: 700, fontFamily: "'Shippori Mincho', serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚙️ 詳細設定（会場・専用予約URL）
            </span>
            {showDetails ? <ChevronUp size={18} color={COLORS.gold} /> : <ChevronDown size={18} color={COLORS.gold} />}
          </button>

          {showDetails && (
            <div style={{ padding: '20px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: '18px', backgroundColor: COLORS.surfaceAlt }}>
              <div style={{ position: 'relative' }}>
                <label className="input-label">会場名（オートコンプリート選択）</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={venueInput} 
                    onChange={(e) => {
                      setVenueInput(e.target.value);
                      setShowVenueDropdown(true);
                      setIsEditingVenue(true);
                    }}
                    onFocus={() => setShowVenueDropdown(true)}
                    placeholder="会場名を入力または選択..."
                    className="text-input"
                    style={{ flex: 1 }}
                  />
                  {isEditingVenue && (
                    <button onClick={handleSaveVenue} className="btn-outline">確定</button>
                  )}
                </div>

                {showVenueDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px', marginTop: '4px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '160px', overflowY: 'auto' }}>
                    {venues
                      .filter(v => v.name.includes(venueInput))
                      .map(venue => (
                        <div 
                          key={venue.id}
                          onClick={() => handleSelectVenue(venue)}
                          style={{ padding: '12px 14px', fontSize: '14px', color: COLORS.text, cursor: 'pointer', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <MapPin size={14} color={COLORS.gold} />
                          {venue.name}
                        </div>
                      ))}
                    {venueInput && !venues.some(v => v.name === venueInput) && (
                      <div 
                        onClick={handleSaveVenue}
                        style={{ padding: '12px 14px', fontSize: '13px', color: COLORS.gold, cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ＋ 「{venueInput}」を新規会場として登録
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="input-label">専用予約フォームURL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={formUrl || '公演保存後にURLが生成されます'} 
                    className="text-input"
                    style={{ flex: 1, backgroundColor: COLORS.surface, color: COLORS.muted, fontSize: '13px' }}
                  />
                  <button onClick={handleCopyUrl} disabled={!formUrl} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {copied ? <Check size={14} color={COLORS.success} /> : <Copy size={14} />}
                    {copied ? '完了' : 'コピー'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <button onClick={handleSave} disabled={saving} className="btn-gold">
          {saving ? 'Supabaseへ保存中...' : '変更を保存する'}
        </button>

      </div>
    </div>
  );
}