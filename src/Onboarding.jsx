import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Building2, Sparkles, ArrowRight } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
};

export default function Onboarding({ user, onComplete }) {
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setLoading(true);

    // 1. 劇団（organization）を作成
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([{ name: orgName.trim() }])
      .select()
      .single();

    if (orgError) {
      alert('劇団の作成に失敗しました: ' + orgError.message);
      setLoading(false);
      return;
    }

    // 2. 作成したユーザーを 'owner' 権限で紐付け
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: org.id,
        user_id: user.id,
        role: 'owner'
      }]);

    setLoading(false);

    if (memberError) {
      alert('権限の付与に失敗しました: ' + memberError.message);
    } else {
      onComplete(org);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '18px', padding: '32px', boxShadow: '0 10px 30px rgba(43,36,56,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: COLORS.gold, fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
            <Sparkles size={16} /> 初期セットアップ
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Shippori Mincho', serif", fontSize: '22px', fontWeight: 700 }}>
            劇団・プロデュースユニット名の登録
          </h1>
          <p style={{ fontSize: '12px', color: COLORS.muted, marginTop: '8px', lineHeight: '1.5' }}>
            管理する劇団名を入力してください。<br />※劇団名や管理者権限は、後から設定画面で自由に変更・譲渡できます。
          </p>
        </div>

        <form onSubmit={handleCreateOrg}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Building2 size={18} color={COLORS.gold} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              required
              placeholder="例: 劇団オフィスナイト"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', backgroundColor: COLORS.gold, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? '登録中...' : <>ダッシュボードへ進む <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}