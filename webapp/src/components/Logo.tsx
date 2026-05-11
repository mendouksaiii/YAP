// Yap speech-bubble logo with eyes
// Inspired by the user's reference image, recolored to brand palette.

type Props = React.SVGProps<SVGSVGElement> & {
  /** when true, eyes will occasionally blink */
  animated?: boolean;
};

export function Logo({ animated = false, className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Yap"
      {...rest}
    >
      <defs>
        <linearGradient id="yap-bubble" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffb380" />
          <stop offset="35%" stopColor="#ff8a3a" />
          <stop offset="70%" stopColor="#ff5e3a" />
          <stop offset="100%" stopColor="#cc2e1a" />
        </linearGradient>
        <linearGradient id="yap-blob" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffd9b8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ff8a3a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="yap-blob2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff5e6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff5e3a" stopOpacity="0" />
        </linearGradient>
        <filter id="yap-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
          <feOffset dx="0" dy="1.5" result="offsetblur" />
          <feFlood floodColor="#000000" floodOpacity="0.25" />
          <feComposite in2="offsetblur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Speech bubble shape with tail bottom-left */}
      <path
        d="M52 6
           C76 6 92 24 92 46
           C92 63 81 78 65 84
           L52 96
           L46 84
           C24 82 8 64 8 46
           C8 24 28 6 52 6 Z"
        fill="url(#yap-bubble)"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="round"
        filter="url(#yap-shadow)"
      />

      {/* Inner organic blobs (mimic the layered look of the reference) */}
      <path
        d="M30 35 C30 25 42 18 55 22 C50 38 42 50 32 56 C26 50 28 42 30 35 Z"
        fill="url(#yap-blob)"
      />
      <path
        d="M72 32 C82 36 86 50 80 62 C70 60 60 50 60 38 C64 33 68 31 72 32 Z"
        fill="url(#yap-blob2)"
      />

      {/* Eyes */}
      <g className={animated ? "yap-eyes" : ""}>
        <circle cx="42" cy="48" r="5" fill="#fff" />
        <circle cx="60" cy="48" r="5" fill="#fff" />
      </g>
    </svg>
  );
}
