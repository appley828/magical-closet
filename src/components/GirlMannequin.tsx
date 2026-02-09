/**
 * 小女孩人形模特兒 SVG
 */

interface GirlMannequinProps {
  className?: string;
}

export default function GirlMannequin({ className = '' }: GirlMannequinProps) {
  return (
    <svg
      viewBox="0 0 200 400"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 頭部 */}
      <ellipse cx="100" cy="40" rx="28" ry="32" fill="#FFE4D6" stroke="#E8C4B8" strokeWidth="2" />

      {/* 頭髮 */}
      <path
        d="M72 35 Q70 15 85 10 Q100 5 115 10 Q130 15 128 35"
        fill="#4A3728"
        stroke="#3D2E22"
        strokeWidth="1"
      />
      <path
        d="M72 35 Q65 45 68 70 Q70 85 75 90"
        fill="#4A3728"
        stroke="#3D2E22"
        strokeWidth="1"
      />
      <path
        d="M128 35 Q135 45 132 70 Q130 85 125 90"
        fill="#4A3728"
        stroke="#3D2E22"
        strokeWidth="1"
      />

      {/* 馬尾辮 */}
      <ellipse cx="100" cy="8" rx="12" ry="6" fill="#4A3728" />
      <path
        d="M95 8 Q90 -10 100 -15 Q110 -10 105 8"
        fill="#4A3728"
        stroke="#3D2E22"
        strokeWidth="1"
      />

      {/* 臉部特徵 */}
      <ellipse cx="88" cy="38" rx="4" ry="3" fill="#3D2E22" /> {/* 左眼 */}
      <ellipse cx="112" cy="38" rx="4" ry="3" fill="#3D2E22" /> {/* 右眼 */}
      <path d="M95 52 Q100 56 105 52" stroke="#E8A090" strokeWidth="2" fill="none" strokeLinecap="round" /> {/* 微笑 */}
      <ellipse cx="78" cy="45" rx="5" ry="3" fill="#FFB6C1" opacity="0.5" /> {/* 左腮紅 */}
      <ellipse cx="122" cy="45" rx="5" ry="3" fill="#FFB6C1" opacity="0.5" /> {/* 右腮紅 */}

      {/* 脖子 */}
      <rect x="92" y="70" width="16" height="15" fill="#FFE4D6" stroke="#E8C4B8" strokeWidth="1" />

      {/* 身體/軀幹 - 衣服區域 */}
      <path
        d="M70 85 L60 95 L55 140 L60 180 L75 185 L80 180 L80 185 L120 185 L120 180 L125 185 L140 180 L145 140 L140 95 L130 85 Z"
        fill="#F5F5F5"
        stroke="#E0E0E0"
        strokeWidth="2"
        strokeDasharray="5,5"
      />

      {/* 左手臂 */}
      <path
        d="M60 95 L45 120 L40 160 L45 165 L50 160 L55 125 L60 105"
        fill="#FFE4D6"
        stroke="#E8C4B8"
        strokeWidth="2"
      />

      {/* 右手臂 */}
      <path
        d="M140 95 L155 120 L160 160 L155 165 L150 160 L145 125 L140 105"
        fill="#FFE4D6"
        stroke="#E8C4B8"
        strokeWidth="2"
      />

      {/* 左手 */}
      <ellipse cx="42" cy="165" rx="8" ry="10" fill="#FFE4D6" stroke="#E8C4B8" strokeWidth="1" />

      {/* 右手 */}
      <ellipse cx="158" cy="165" rx="8" ry="10" fill="#FFE4D6" stroke="#E8C4B8" strokeWidth="1" />

      {/* 下身/裙子區域 */}
      <path
        d="M75 185 L65 280 L80 285 L100 280 L120 285 L135 280 L125 185 Z"
        fill="#F5F5F5"
        stroke="#E0E0E0"
        strokeWidth="2"
        strokeDasharray="5,5"
      />

      {/* 左腿 */}
      <path
        d="M75 280 L70 340 L65 380 L75 385 L85 380 L85 340 L85 285"
        fill="#FFE4D6"
        stroke="#E8C4B8"
        strokeWidth="2"
      />

      {/* 右腿 */}
      <path
        d="M125 280 L130 340 L135 380 L125 385 L115 380 L115 340 L115 285"
        fill="#FFE4D6"
        stroke="#E8C4B8"
        strokeWidth="2"
      />

      {/* 左腳 */}
      <ellipse cx="70" cy="388" rx="12" ry="6" fill="#FFE4D6" stroke="#E8C4B8" strokeWidth="1" />

      {/* 右腳 */}
      <ellipse cx="130" cy="388" rx="12" ry="6" fill="#FFE4D6" stroke="#E8C4B8" strokeWidth="1" />

      {/* 衣服放置提示區域標籤 */}
      <text x="100" y="135" textAnchor="middle" fontSize="10" fill="#BDBDBD">上衣</text>
      <text x="100" y="235" textAnchor="middle" fontSize="10" fill="#BDBDBD">下身</text>
    </svg>
  );
}
