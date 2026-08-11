import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

const COLORS = {
  bg: '#faf5ea',
  surface: '#ffffff',
  surfaceAlt: '#f7efe0',
  border: 'rgba(201,121,31,0.22)',
  gold: '#c9791f',
  text: '#2b2438',
  muted: '#8a8398',
  danger: '#e85a45',
};

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // パスワード再入力用
  const [showPassword, setShowPassword] = useState(false); // パスワード表示トグル
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    if (isSignUp) {
      // パスワードの一致チェック
      if (password !== confirmPassword) {
        setErrorMsg('パスワードと確認用パスワードが一致していません。');
        setLoading(false);
        return;
      }

      // 新規ユーザー登録
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        onLoginSuccess(data.session.user);
      } else {
        setInfoMsg('登録が完了しました！ログインしてください。');
        setIsSignUp(false);
      }
    } else {
      // ログイン
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。');
      } else if (data.session) {
        onLoginSuccess(data.session.user);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Zen Kaku Gothic New', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .auth-card {
          width: 100%;
          max-width: 420px;
          background-color: ${COLORS.surface};
          border: 1px solid ${COLORS.border};
          border-radius: 18px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(43, 36, 56, 0.08);
          box-sizing: border-box;
        }

        .input-group {
          position: relative;
          margin-bottom: 16px;
        }

        .auth-input {
          width: 100%;
          padding: 12px 42px 12px 42px;
          border-radius: 10px;
          border: 1px solid ${COLORS.border};
          background-color: ${COLORS.surface};
          color: ${COLORS.text};
          font-size: 14px;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          box-sizing: border-box;
        }
        .auth-input:focus { outline: none; border-color: ${COLORS.gold}; }

        .eye-toggle-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: ${COLORS.muted};
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
        }
        .eye-toggle-btn:hover { color: ${COLORS.gold}; }

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
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 2px 6px rgba(201, 121, 31, 0.25);
          transition: filter 0.15s ease;
        }
        .btn-gold:hover { filter: brightness(1.08); }

        .toggle-btn {
          background: none;
          border: none;
          color: ${COLORS.gold};
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 16px;
          width: 100%;
          text-align: center;
        }
        .toggle-btn:hover { text-decoration: underline; }
      `}</style>

      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: COLORS.gold, fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
            <Sparkles size={16} /> TicketPochi 劇団管理ポータル
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Shippori Mincho', serif", fontSize: '24px', fontWeight: 700 }}>
            {isSignUp ? '劇団アカウント作成' : 'ログイン'}
          </h1>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: 'rgba(232,90,69,0.1)', border: `1px solid ${COLORS.danger}`, borderRadius: '8px', color: COLORS.danger, fontSize: '13px', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: 'rgba(31,154,86,0.1)', border: '1px solid #1f9a56', borderRadius: '8px', color: '#1f9a56', fontSize: '13px', marginBottom: '16px' }}>
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div className="input-group">
            <Mail size={18} color={COLORS.gold} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email"
              required
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
            />
          </div>

          {/* パスワード入力欄（目のマークで伏せ字切替） */}
          <div className="input-group">
            <Lock size={18} color={COLORS.gold} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="パスワード（6文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
            />
            <button
              type="button"
              className="eye-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* 新規登録時のみ：パスワード確認用入力欄 */}
          {isSignUp && (
            <div className="input-group">
              <Lock size={18} color={COLORS.gold} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="パスワード（確認のためもう一度入力）"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-gold" style={{ marginTop: '8px' }}>
            {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
            {loading ? '処理中...' : isSignUp ? 'アカウントを作成する' : 'ログインする'}
          </button>
        </form>

        <button onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); setInfoMsg(''); setPassword(''); setConfirmPassword(''); }} className="toggle-btn">
          {isSignUp ? 'すでに登録済みの方はこちら（ログイン）' : '新規登録（初めての方はこちら）'}
        </button>
      </div>
    </div>
  );
}