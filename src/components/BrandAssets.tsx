import React from 'react';

export const TestoHomeLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; showWordmark?: boolean }> = ({
  size = 'md',
  showWordmark = true,
}) => {
  const iconDims = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDims} shrink-0`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="th-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#312E81" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#th-logo-grad)" />
        <path
          d="M24 10L11 20.5V36C11 37.1046 11.8954 38 13 38H35C36.1046 38 37 37.1046 37 36V20.5L24 10Z"
          stroke="white"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M24 17.5C24 17.5 18.5 23.6 18.5 27.6C18.5 30.6376 20.9624 33.1 24 33.1C27.0376 33.1 29.5 30.6376 29.5 27.6C29.5 23.6 24 17.5 24 17.5Z"
          fill="#CCFBF1"
        />
        <path d="M24 24.8V29.8M21.5 27.3H26.5" stroke="#312E81" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
      {showWordmark && (
        <span className={`${textSize} font-bold tracking-tight text-slate-900 dark:text-white font-display`}>
          Testo <span className="text-teal-700 dark:text-teal-400">Home</span>
        </span>
      )}
    </span>
  );
};

export const HomeCollectionIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-teal-800 p-6 text-white ${className}`}
  >
    <svg
      viewBox="0 0 360 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full max-h-52 mx-auto"
      role="img"
      aria-label="Home blood sample collection kit and sealed diagnostic vials illustration"
    >
      <defs>
        <linearGradient id="card-glow" x1="0" y1="0" x2="360" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect x="12" y="14" width="336" height="192" rx="20" fill="url(#card-glow)" stroke="white" strokeOpacity="0.14" />
      {/* Home roof silhouette */}
      <path
        d="M64 108L180 34L296 108V184H64V108Z"
        fill="#0F172A"
        fillOpacity="0.28"
        stroke="#99F6E4"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Insulated medical kit */}
      <rect x="108" y="96" width="144" height="72" rx="14" fill="#F8FAFC" />
      <rect x="108" y="96" width="144" height="22" rx="10" fill="#0F766E" />
      <rect x="160" y="84" width="40" height="14" rx="7" stroke="#CCFBF1" strokeWidth="3" />
      {/* Sealed diagnostic vials */}
      <rect x="132" y="128" width="14" height="30" rx="4" fill="#E0E7FF" stroke="#4338CA" strokeWidth="1.5" />
      <rect x="132" y="126" width="14" height="6" rx="2" fill="#4338CA" />
      <rect x="158" y="128" width="14" height="30" rx="4" fill="#CCFBF1" stroke="#0F766E" strokeWidth="1.5" />
      <rect x="158" y="126" width="14" height="6" rx="2" fill="#0F766E" />
      <rect x="184" y="128" width="14" height="30" rx="4" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1.5" />
      <rect x="184" y="126" width="14" height="6" rx="2" fill="#DC2626" />
      {/* Shield check */}
      <circle cx="222" cy="144" r="14" fill="#0F766E" />
      <path d="M216 144L220 148L228 140" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);
