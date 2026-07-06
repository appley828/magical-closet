/**
 * 服裝店人台（dress form）SVG：黑色軀幹＋金屬立桿＋圓底座
 */

interface DressFormMannequinProps {
  className?: string;
}

export default function DressFormMannequin({ className = '' }: DressFormMannequinProps) {
  return (
    <svg
      viewBox="0 0 200 600"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="dressform-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a3a3f" />
          <stop offset="45%" stopColor="#17171a" />
          <stop offset="100%" stopColor="#2a2a2e" />
        </linearGradient>
        <linearGradient id="dressform-pole" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="50%" stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <linearGradient id="dressform-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>

      {/* 頸口 */}
      <path
        d="M88 26 L112 26 L110 44 L90 44 Z"
        fill="#17171a"
      />
      <ellipse cx="100" cy="26" rx="12" ry="4" fill="#3a3a3f" />

      {/* 軀幹：寬平肩、收腰、臀部外擴，下緣收圓 */}
      <path
        d="M87 44
           C 74 45 60 48 46 56
           C 41 60 40 66 42 74
           C 46 96 50 112 52 130
           C 54 158 64 172 66 195
           C 68 222 54 244 52 268
           C 50 294 62 310 82 315
           C 90 317 110 317 118 315
           C 138 310 150 294 148 268
           C 146 244 132 222 134 195
           C 136 172 146 158 148 130
           C 150 112 154 96 158 74
           C 160 66 159 60 154 56
           C 140 48 126 45 113 44
           Z"
        fill="url(#dressform-body)"
      />
      {/* 中央車縫線 */}
      <path d="M100 44 L100 314" stroke="#4b5563" strokeWidth="0.8" opacity="0.5" />
      {/* 側光澤 */}
      <path
        d="M62 84 C 58 116 60 156 68 190"
        stroke="#6b7280"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* 立桿 */}
      <rect x="96.5" y="318" width="7" height="238" rx="3" fill="url(#dressform-pole)" />
      {/* 高度調整旋鈕 */}
      <circle cx="100" cy="430" r="6" fill="#9ca3af" stroke="#6b7280" strokeWidth="1.5" />

      {/* 底座 */}
      <ellipse cx="100" cy="562" rx="58" ry="13" fill="url(#dressform-base)" />
      <ellipse cx="100" cy="558" rx="58" ry="13" fill="#e5e7eb" />
      <ellipse cx="100" cy="558" rx="20" ry="4.5" fill="#9ca3af" />
    </svg>
  );
}
