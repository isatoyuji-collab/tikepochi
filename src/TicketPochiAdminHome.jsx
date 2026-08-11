import React, { useState, useEffect } from 'react';
import {
  Drama, Ticket, CalendarDays, Users, Mail, Armchair,
  ChevronRight, ChevronDown, Tablet, ClipboardList, CreditCard, Plus,
} from 'lucide-react';
import { COLORS, PRODUCTION_ACCENTS, FONTS, RADIUS } from './theme';

// production ごとの識別色（office Knight 公演アプリ側の A=オレンジ／B=インディゴ と揃えてある）
const PRODUCTIONS = [
  {
    id: 'a',
    accent: PRODUCTION_ACCENTS.a,
    title: 'あなたと、コンビに',
    venue: '布施PEベース',
    dateLabel: '10/17（土）- 18（日）',
    daysUntil: 12,
    stats: { reserved: 214, goal: 400, todayCount: 18 },
  },
  {
    id: 'b',
    accent: PRODUCTION_ACCENTS.b,
    title: '形見',
    venue: 'ステージプラス天王寺',
    dateLabel: '10/31（金）- 11/1（土）',
    daysUntil: 26,
    stats: { reserved: 96, goal: 400, todayCount: 5 },
  },
];

const NAV_SECTIONS = [
  {
    label: '予約・当日運用',
    items: [
      { view: 'reservations', icon: ClipboardList, title: '予約一覧・動員状況', desc: '予約データの閲覧・編集・お礼メール' },
      { view: 'tablet', icon: Tablet, title: '当日受付', desc: '50音検索・チェックイン・精算' },
    ],
  },
  {
    label: '公演の準備',
    items: [
      { view: 'info', icon: Drama, title: '公演基本情報', desc: '公演名・煽り文・会場設定' },
      { view: 'tickets', icon: Ticket, title: '券種設定', desc: '券種・金額・セット割' },
      { view: 'dates', icon: CalendarDays, title: '日程・キャパ管理', desc: 'ステージ増設・回ごとの定員' },
      { view: 'seats', icon: Armchair, title: '指定席・会場マップ', desc: 'AI座席表解析・座席割当' },
    ],
  },
  {
    label: '人とお金',
    items: [
      { view: 'staff', icon: Users, title: 'スタッフ・キャスト', desc: 'メンバー招待・個別URL発行' },
      { view: 'messages', icon: Mail, title: 'メール・LINE通知', desc: '予約完了文言・通知先設定' },
      { view: 'payments', icon: CreditCard, title: '決済連携', desc: 'Stripe・PayPay・振込先' },
    ],
  },
];

const HERO_STORAGE_KEY = 'tp_hero_open';

export default function TicketPochiAdminHome({ onNavigate = (view) => console.log('navigate:', view) }) {
  const [productionId, setProductionId] = useState(PRODUCTIONS[0].id);
  const [heroOpen, setHeroOpen] = useState(() => {
    try {
      return localStorage.getItem(HERO_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HERO_STORAGE_KEY, String(heroOpen));
    } catch {
      // ローカルストレージが使えない環境では黙って諦める（開閉自体は動く）
    }
  }, [heroOpen]);

  const production = PRODUCTIONS.find((p) => p.id === productionId);
  const { reserved, goal, todayCount } = production.stats;
  const pct = Math.min(100, Math.round((reserved / goal) * 100));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: FONTS.body }}>
      <style>{`
        @import url('${FONTS.importUrl}');

        .tp-wrap { max-width: 1080px; margin: 0 auto; padding: 20px 16px 56px; box-sizing: border-box; }
        @media (min-width: 640px) { .tp-wrap { padding: 32px 24px 64px; } }

        .tp-header { margin-bottom: 20px; border-bottom: 1px solid ${COLORS.border}; padding-bottom: 18px; }
        .tp-eyebrow { font-size: 11px; color: ${COLORS.gold}; letter-spacing: 0.16em; font-weight: 700; }
        .tp-title { font-family: ${FONTS.display}; font-weight: 700; color: ${COLORS.text};
          font-size: clamp(24px, 5vw, 34px); margin: 6px 0 4px; line-height: 1.3; }
        .tp-meta { font-size: 13px; color: ${COLORS.muted}; }

        /* 公演切替タブ（背景色なしのヘッダー用） */
        .tp-switcher { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
        .tp-tab {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 16px; border-radius: ${RADIUS.pill}; font-size: 13px; font-weight: 700;
          cursor: pointer; border: 1.5px solid ${COLORS.border};
          background: ${COLORS.surface}; color: ${COLORS.muted};
          transition: all 0.15s ease; -webkit-tap-highlight-color: transparent;
        }
        .tp-tab:active { transform: scale(0.96); }
        .tp-tab.active { background: ${COLORS.goldDeep}; color: #fff; border-color: ${COLORS.goldDeep}; }
        .tp-tab-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .tp-tab-add {
          border-style: dashed;
          background: transparent;
          color: ${COLORS.gold};
        }
        .tp-tab-add:hover, .tp-tab-add:focus-visible { background: ${COLORS.surfaceAlt}; }

        /* 予約状況：開閉パネル */
        .tp-hero {
          background: ${COLORS.surface};
          border: 1.5px solid ${COLORS.border};
          border-radius: ${RADIUS.lg};
          margin: 18px 0 30px;
          overflow: hidden;
        }
        .tp-hero-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; cursor: pointer; gap: 12px;
          -webkit-tap-highlight-color: transparent;
        }
        .tp-hero-bar:active { background: ${COLORS.surfaceAlt}; }
        .tp-hero-bar-left { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
        .tp-hero-label { font-size: 13px; font-weight: 700; color: ${COLORS.muted}; white-space: nowrap; }
        .tp-hero-num-compact { font-family: ${FONTS.display}; font-weight: 700; font-size: 20px; color: ${COLORS.goldDeep}; }
        .tp-hero-num-compact span { font-size: 13px; font-weight: 500; color: ${COLORS.muted}; margin-left: 4px; }
        .tp-chevron { flex-shrink: 0; transition: transform 0.2s ease; color: ${COLORS.gold}; }
        .tp-chevron.open { transform: rotate(180deg); }

        .tp-hero-detail { padding: 0 20px 20px; }
        .tp-hero-row { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 4px; }
        .tp-hero-badge {
          font-size: 12px; font-weight: 700; color: #fff; background: ${COLORS.text};
          padding: 6px 12px; border-radius: ${RADIUS.pill}; white-space: nowrap;
        }
        .tp-gauge-track { height: 11px; border-radius: ${RADIUS.pill}; background: rgba(33,26,44,0.10); margin-top: 10px; overflow: hidden; }
        .tp-gauge-fill {
          height: 100%; border-radius: ${RADIUS.pill};
          background: repeating-linear-gradient(115deg,
            ${COLORS.curtain1} 0px, ${COLORS.curtain1} 10px,
            ${COLORS.curtain2} 10px, ${COLORS.curtain2} 20px,
            ${COLORS.curtain3} 20px, ${COLORS.curtain3} 30px);
          transition: width 0.4s ease;
        }
        .tp-hero-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 12px; color: ${COLORS.muted}; font-weight: 600; }
        .tp-hero-link {
          font-weight: 700; color: ${COLORS.goldDeep}; background: none; border: none;
          cursor: pointer; font-size: 12px; font-family: inherit; padding: 6px 0;
        }

        .tp-section { margin-bottom: 30px; }
        .tp-section-label {
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #fff;
          margin: 0 0 12px 2px; display: inline-block;
          background: ${COLORS.goldDeep}; padding: 4px 12px; border-radius: ${RADIUS.pill};
        }

        .tp-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 640px) { .tp-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .tp-grid { grid-template-columns: repeat(3, 1fr); } }

        .tp-card {
          background-color: ${COLORS.surface};
          border: 1.5px solid ${COLORS.border};
          border-radius: ${RADIUS.md};
          padding: 16px;
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .tp-card:hover { background-color: ${COLORS.surfaceAlt}; border-color: ${COLORS.gold}; box-shadow: 0 5px 14px rgba(184,100,26,0.14); }
        .tp-card:active { transform: scale(0.97); background-color: ${COLORS.surfaceAlt}; }

        .tp-icon-box {
          width: 42px; height: 42px; border-radius: ${RADIUS.sm}; flex-shrink: 0;
          background-color: ${COLORS.goldDeep}; color: #fff;
          display: flex; align-items: center; justify-content: center;
        }
        .tp-card-title { margin: 0; font-size: 15px; font-weight: 700; color: ${COLORS.text}; }
        .tp-card-desc { margin: 2px 0 0; font-size: 12px; color: ${COLORS.muted};
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}</style>

      <div className="tp-wrap">

        <div className="tp-header">
          <span className="tp-eyebrow">OFFICE KNIGHT</span>
          <h1 className="tp-title">{production.title}</h1>
          <div className="tp-meta">{production.venue}・{production.dateLabel}</div>

          <div className="tp-switcher">
            {PRODUCTIONS.map((p, i) => (
              <div
                key={p.id}
                className={`tp-tab ${p.id === productionId ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setProductionId(p.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setProductionId(p.id)}
              >
                <span className="tp-tab-dot" style={{ background: p.accent }} />
                {String.fromCharCode(65 + i)}公演・{p.title}
              </div>
            ))}
            <div
              className="tp-tab tp-tab-add"
              role="button"
              tabIndex={0}
              onClick={() => onNavigate('new-production')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate('new-production')}
            >
              <Plus size={14} />
              新規公演を追加
            </div>
          </div>
        </div>

        <div className="tp-hero">
          <div
            className="tp-hero-bar"
            role="button"
            tabIndex={0}
            aria-expanded={heroOpen}
            onClick={() => setHeroOpen((v) => !v)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setHeroOpen((v) => !v)}
          >
            <div className="tp-hero-bar-left">
              <span className="tp-hero-label">予約状況</span>
              <span className="tp-hero-num-compact">{reserved}<span>/ {goal}人</span></span>
            </div>
            <ChevronDown size={20} className={`tp-chevron ${heroOpen ? 'open' : ''}`} />
          </div>

          {heroOpen && (
            <div className="tp-hero-detail">
              <div className="tp-hero-row">
                <div className="tp-hero-badge">初日まで あと{production.daysUntil}日</div>
              </div>
              <div className="tp-gauge-track"><div className="tp-gauge-fill" style={{ width: `${pct}%` }} /></div>
              <div className="tp-hero-foot">
                <span>動員 {pct}%・今日の新規予約 {todayCount}件</span>
                <button className="tp-hero-link" onClick={() => onNavigate('reservations')}>
                  予約一覧を見る →
                </button>
              </div>
            </div>
          )}
        </div>

        {NAV_SECTIONS.map((section) => (
          <div className="tp-section" key={section.label}>
            <div className="tp-section-label">{section.label}</div>
            <div className="tp-grid">
              {section.items.map(({ view, icon: Icon, title, desc }) => (
                <div
                  key={view}
                  className="tp-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate(view)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate(view)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div className="tp-icon-box"><Icon size={20} /></div>
                    <div style={{ minWidth: 0 }}>
                      <h2 className="tp-card-title">{title}</h2>
                      <p className="tp-card-desc">{desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} color={COLORS.gold} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}