// office Knight「チケポチ」管理者画面 共通テーマ
// 色・フォントを変えたいときはここだけ直せば全画面に反映される。
// 各ページはこのファイルから COLORS / FONTS を import して使う。

export const COLORS = {
  // 基調（暖色クリーム）
  bg: '#f5ecd9',
  surface: '#ffffff',
  surfaceAlt: '#f2e4c8',
  border: 'rgba(184,100,26,0.32)',

  // ゴールド（管理者画面のブランドカラー）
  gold: '#b8641a',
  goldDeep: '#8f4b0d',

  // テキスト
  text: '#211a2c',
  muted: '#6d6578',

  // 状態色
  success: '#1f9a56',
  danger: '#e85a45',
  indigo: '#5457d6',

  // 動員ゲージ（緞帳モチーフ）
  curtain1: '#8f4b0d',
  curtain2: '#b8641a',
  curtain3: '#d68a3c',
};

// 公演ごとの識別色。office Knight 公演アプリ（お客様向け）側の色分けと揃えてある。
export const PRODUCTION_ACCENTS = {
  a: '#e0793f', // A公演＝オレンジ
  b: '#4b4f9e', // B公演＝インディゴ
};

export const FONTS = {
  display: "'Shippori Mincho', serif", // 見出し・金額など「見せる数字」用
  body: "'Zen Kaku Gothic New', sans-serif", // 本文・ボタン・フォーム用
  importUrl:
    'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
};

export const RADIUS = {
  sm: '10px',
  md: '14px',
  lg: '18px',
  pill: '999px',
};

export const SHADOW = {
  card: '0 2px 6px rgba(33,26,44,0.06)',
  cardHover: '0 6px 16px rgba(184,100,26,0.14)',
  modal: '0 20px 50px rgba(0,0,0,0.25)',
};