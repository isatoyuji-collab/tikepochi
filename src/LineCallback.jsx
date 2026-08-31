// src/LineCallback.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const MASCOT = {
  checking: '/images/mascot/pose_checking_dog.png',
  waai: '/images/mascot/pose_waai_dog.png',
  ticketWait: '/images/mascot/pose_ticket_wait_dog.png'
};

export default function LineCallback() {
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state'); // stateに mypage_token を格納して渡します
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage('LINEログインがキャンセルされました。');
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setErrorMessage('認証コードまたはトークンが見つかりません。');
        return;
      }

      try {
        // 1. LINEのアクセストークン発行APIを呼び出し
        const redirectUri = window.location.origin + '/line-callback';
        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          client_id: '2010532265',
          client_secret: '63518536542003333a7e9a04b8c68c61',
        });

        const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.id_token && !tokenData.access_token) {
          throw new Error(tokenData.error_description || 'トークン取得に失敗しました');
        }

        // 2. ユーザープロファイル（LINE User ID）を取得
        const profileRes = await fetch('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileData = await profileRes.json();
        const lineUserId = profileData.userId;

        if (!lineUserId) {
          throw new Error('LINE User IDの取得に失敗しました');
        }

        // 3. Supabaseの予約データに line_user_id を紐付け
        const { error: dbError } = await supabase
          .from('reservations')
          .update({ line_user_id: lineUserId })
          .eq('mypage_token', state);

        if (dbError) throw dbError;

        setStatus('success');

        // 1.5秒後にマイページへ自動リダイレクト
        setTimeout(() => {
          window.location.href = `/mypage?token=${encodeURIComponent(state)}`;
        }, 1500);

      } catch (err) {
        console.error('LINE callback error:', err);
        setStatus('error');
        setErrorMessage(err.message || '連携中にエラーが発生しました');
      }
    };

    handleCallback();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff8e6',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        backgroundColor: '#ffffff',
        border: '2.5px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '28px',
        padding: '32px 24px',
        textAlign: 'center',
        boxShadow: '0 10px 24px rgba(245, 158, 11, 0.1)'
      }}>
        {status === 'processing' && (
          <div>
            <img src={MASCOT.checking} alt="" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#3a2a18' }}>
              LINE IDを紐付け中ワン...
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#8c7d70' }}>
              画面を閉じずにお待ちください🐾
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <img src={MASCOT.waai} alt="" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>
              連携が完了したワン！🎉
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#8c7d70' }}>
              特典の鍵が開きました！マイページへ戻ります...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <img src={MASCOT.ticketWait} alt="" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#e11d48' }}>
              連携に失敗しました
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#8c7d70' }}>
              {errorMessage}
            </p>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: '10px 20px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#ffb300',
                color: '#3a2a18',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              もどる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}