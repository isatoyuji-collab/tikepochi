// src/AdminProductionInfo.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, Save, MapPin, FileText, CheckCircle2, AlertCircle, Link2, Copy, Check, Share2, ExternalLink, Video } from 'lucide-react';
import { COLORS, FONTS, RADIUS } from './theme';

// 関西主要小劇場・ホール会場名プリセット
const VENUE_PRESETS = [
  "布施PEベース",
  "ウイングフィールド",
  "in→dependent theatre 1st",
  "in→dependent theatre 2nd",
  "扇町ミュージアムキューブ",
  "大阪市立芸術創造館",
  "一心寺シアター倶楽",
  "ABCホール",
  "HEP HALL",
  "近鉄アート館",
  "世界館",
  "表現者工房",
  "SPACE9",
  "STAGE+PLUS",
  "BAR舞台袖",
  "楽屋A",
  "アカルスタジオ",
  "シアターOM",
  "難波サザンシアター",
  "Soap opera classics",
  "中津vi-code",
  "聖天通劇場",
  "イロリムラ・プチホール",
  "アトリエS-pace",
  "Black Boxx（劇団そとばこまちアトリエ）",
  "船場ユシュット座（NGRアトリエ）",
  "神戸三宮シアター・エートー",
  "新開地アートひろば（旧・神戸アートビレッジセンター）",
  "兵庫県立尼崎青少年創造劇場 ピッコロシアター",
  "伊丹AI・HALL",
  "Art Theater dB KOBE",
  "Theatre E9 KYOTO",
  "京都芸術センター",
  "京都芸術劇場・春秋座",
  "京都芸術劇場・studio21",
  "ロームシアター京都（メインホール / サウスホール / ノースホール）",
  "京都府立府民ホールアルティ",
  "アトリエアンダースロー",
  "アートコミュニティスペースKAIKA",
  "UrBANGUILD",
  "梅田芸術劇場 / シアター・ドラマシティ",
  "梅田芸術劇場 / メインホール",
  "サンケイホールブリーゼ",
  "森ノ宮ピロティホール",
  "SkyシアターMBS",
  "フェスティバルホール",
  "ドーンセンター",
  "ナレッジシアター",
  "ソフィア堺",
  "吹田メイシアター",
  "八尾市文化会館プリズムホール・小ホール",
  "ACT cafe（旧・commom cafe）",
  "ART COMPLEX 1928",
  "AiiA 2.5 Theater Kobe",
  "A＆Hホール",
  "Free Studio KONPIRA -金毘羅-",
  "LOXODONTA BLACK（OVAL THEATER）",
  "Live ＆ Cafe Bar PLACEBO",
  "MOVE FACTORY STUDIO",
  "SPACE LFAN",
  "T-6（テシス） / 音太小屋",
  "TEMPO HARBOR THEATER",
  "Theatre Cafe 信天翁",
  "epok",
  "kYOTO ART THEATRE URU（シアターウル）",
  "opencafe ロック亭 恵美須町",
  "studio seedbox",
  "えさか芸術文化館ピエロハーバー",
  "くさのね劇場",
  "アトカフェ HAKONIWA gallery",
  "イカロスの森",
  "オルタナキッチンOooze",
  "クリエイティブセンター大阪（C.C.O.）",
  "ク・ビレ邸",
  "シアターカフェNyan",
  "シアターセブン BOX1",
  "スタジオガリバー",
  "スペースコラリオン（旧・Cafe Slow Osaka）",
  "ビックワンミニシアター",
  "京都大学吉田寮食堂",
  "京都大学西部講堂",
  "京都舞踏館",
  "兵庫県立芸術文化センター",
  "協創カフェ natura",
  "扇町公園",
  "未知座小劇場",
  "東山青少年活動センター（創造活動室）",
  "枚方公園青少年センター",
  "石炭倉庫(大阪市港区波除6-5-18)",
  "諏訪山異人館",
  "魅殺陣屋",
  "黒門カルチャーファクトリー"
];

export default function AdminProductionInfo({ productionId, org, onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // 公演情報ステート
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueVideoUrl, setVenueVideoUrl] = useState('');

  // 劇団公式予約URL (/r/公演ID)
  const publicReservationUrl = `${window.location.origin}/r/${productionId || ''}`;

  useEffect(() => {
    async function fetchProduction() {
      setLoading(true);
      try {
        if (!productionId) return;

        const { data, error } = await supabase
          .from('productions')
          .select('*')
          .eq('id', productionId)
          .single();

        if (error) throw error;
        if (data) {
          setTitle(data.title || '');
          setSubtitle(data.subtitle || '');
          setVenueName(data.venue_name || '');
          setVenueAddress(data.venue_address || '');
          setVenueVideoUrl(data.venue_video_url || '');
        }
      } catch (err) {
        console.error('Fetch production info error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduction();
  }, [productionId]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicReservationUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleShareLine = () => {
    const text = encodeURIComponent(`【${title || '公演'}】予約フォームはこちら\n${publicReservationUrl}`);
    window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('公演タイトルは必須項目です。');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSavedSuccess(false);

    try {
      const { error } = await supabase
        .from('productions')
        .update({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          venue_name: venueName.trim() || null,
          venue_address: venueAddress.trim() || null,
          venue_video_url: venueVideoUrl.trim() || null,
        })
        .eq('id', productionId);

      if (error) throw error;

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setErrorMessage('保存に失敗しました: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.text, fontFamily: FONTS.body }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: FONTS.body, padding: '24px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('${FONTS.importUrl}');

        .form-card {
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: ${RADIUS.md};
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 6px rgba(33,26,44,0.05);
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
          padding: 10px 14px;
          background-color: ${COLORS.surface};
          color: ${COLORS.gold};
          border: 1px solid ${COLORS.border};
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
        }
        .btn-outline:hover { background-color: ${COLORS.surfaceAlt}; }
      `}</style>

      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: '14px', cursor: 'pointer', padding: '4px 8px 4px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={16} /> ホームへ戻る
          </button>
          <h1 style={{ fontSize: '18px', margin: 0, flex: 1, textAlign: 'center', fontFamily: FONTS.display, color: COLORS.text, fontWeight: 700 }}>
            公演基本情報・会場設定
          </h1>
          <div style={{ width: '80px' }} />
        </div>

        {/* 🎟️ 劇団公式 予約URLカード */}
        <div style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '20px', marginBottom: '20px', boxShadow: '0 2px 6px rgba(33,26,44,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gold, fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
            <Link2 size={18} /> 劇団公式・共通予約URL（チラシ・SNS告知用）
          </div>
          <p style={{ fontSize: '12px', color: COLORS.muted, margin: '0 0 12px 0', lineHeight: '1.5' }}>
            劇団公式SNSやチラシのQRコードにはこちらのURLをご使用ください。（扱いキャストなし／お客様が画面で選べる共通窓口です）
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={publicReservationUrl}
              className="text-input"
              style={{ flex: 1, minWidth: '240px', backgroundColor: COLORS.surfaceAlt, fontSize: '13px', fontFamily: 'monospace' }}
            />
            <button onClick={handleCopyUrl} className="btn-gold" style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
              {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
              {copiedUrl ? 'コピー完了' : 'URLコピー'}
            </button>
            <button onClick={handleShareLine} className="btn-line">
              <Share2 size={16} /> LINE共有
            </button>
            <a href={publicReservationUrl} target="_blank" rel="noreferrer" className="btn-outline">
              <ExternalLink size={15} /> ページを開く
            </a>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 公演タイトル・企画名 */}
          <div className="form-card">
            <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> 公演タイトル・企画名
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  公演タイトル（必須）
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: office Knightプロデュース公演 vol.3&vol.3.5 『爆弾よりもハードです』"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  サブタイトル・企画名（任意）
                </label>
                <input
                  type="text"
                  placeholder="例: 秋の大笑会-ダイエンカイ-"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="text-input"
                />
              </div>
            </div>
          </div>

          {/* 上演会場設定 */}
          <div className="form-card">
            <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> 上演会場情報
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  会場名（候補から選択または直接入力）
                </label>
                <input
                  type="text"
                  list="venue-options"
                  placeholder="例: 布施PEベース（入力すると候補が表示されます）"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="text-input"
                />
                <datalist id="venue-options">
                  {VENUE_PRESETS.map((v, i) => (
                    <option key={i} value={v} />
                  ))}
                </datalist>
                <span style={{ fontSize: '11px', color: COLORS.muted, marginTop: '4px', display: 'block' }}>
                  ※関西主要小劇場・ホール（90会場以上）の候補から選べます。候補にない会場名も直接入力可能です。
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  会場住所・アクセス（任意）
                </label>
                <input
                  type="text"
                  placeholder="例: 大阪府東大阪市足代..."
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="text-input"
                />
              </div>

              {/* 🎬 会場までの道のり動画URL */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: COLORS.gold, marginBottom: '4px' }}>
                  <Video size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  会場アクセス・道のり動画URL（任意 / YouTubeなど）
                </label>
                <input
                  type="url"
                  placeholder="例: https://www.youtube.com/watch?v=xxxx または https://youtu.be/xxxx"
                  value={venueVideoUrl}
                  onChange={(e) => setVenueVideoUrl(e.target.value)}
                  className="text-input"
                />
                <span style={{ fontSize: '11px', color: COLORS.muted, marginTop: '4px', display: 'block' }}>
                  ※登録すると、お客様マイページに「🎬 道順動画」ボタンが自動表示され、アプリ内で動画をポップアップ再生できます。
                </span>
              </div>
            </div>
          </div>

          {savedSuccess && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(31,154,86,0.1)', color: COLORS.success, borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <CheckCircle2 size={16} /> 公演情報を正常に保存しました！
            </div>
          )}

          {errorMessage && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(232,90,69,0.1)', color: COLORS.danger, borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} /> {errorMessage}
            </div>
          )}

          {/* 保存ボタン */}
          <button
            type="submit"
            disabled={saving}
            className="btn-gold"
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
          >
            <Save size={16} /> {saving ? '保存中...' : '公演基本情報を保存する'}
          </button>

        </form>

      </div>
    </div>
  );
}