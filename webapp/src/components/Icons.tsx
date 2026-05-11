// Lucide-style SVG icons (24x24 viewBox, currentColor stroke)

type Props = React.SVGProps<SVGSVGElement>;

const base: Props = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Mic = (p: Props) => (<svg {...base} {...p}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>);

export const Sparkles = (p: Props) => (<svg {...base} {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" /><path d="M19 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" /></svg>);

export const Flame = (p: Props) => (<svg {...base} {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>);

export const ExternalLink = (p: Props) => (<svg {...base} {...p}><path d="M15 3h6v6" /><path d="M10 14L21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>);

export const Stop = (p: Props) => (<svg {...base} {...p}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>);

export const Loader = (p: Props) => (<svg {...base} {...p} className={`animate-spin ${p.className ?? ""}`}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>);

export const Globe = (p: Props) => (<svg {...base} {...p}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>);

export const Volume = (p: Props) => (<svg {...base} {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>);

export const Languages = (p: Props) => (<svg {...base} {...p}><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></svg>);

export const Home = (p: Props) => (<svg {...base} {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>);

export const User = (p: Props) => (<svg {...base} {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);

export const Hammer = (p: Props) => (<svg {...base} {...p}><path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9" /><path d="m17.64 15 3.86-3.86a2 2 0 0 0 0-2.83l-4.24-4.24a2 2 0 0 0-2.83 0L10.57 8" /><path d="m21 8-1-1" /><path d="m11 13-1-1" /></svg>);

export const Mail = (p: Props) => (<svg {...base} {...p}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-10 5L2 7" /></svg>);

export const LogOut = (p: Props) => (<svg {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>);

export const ArrowRight = (p: Props) => (<svg {...base} {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>);

export const Play = (p: Props) => (<svg {...base} {...p}><polygon points="6 3 20 12 6 21 6 3" /></svg>);

export const Check = (p: Props) => (<svg {...base} {...p}><polyline points="20 6 9 17 4 12" /></svg>);

export const Zap = (p: Props) => (<svg {...base} {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>);

export const Trophy = (p: Props) => (<svg {...base} {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);

export const History = (p: Props) => (<svg {...base} {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>);

export const Menu = (p: Props) => (<svg {...base} {...p}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>);

export const X = (p: Props) => (<svg {...base} {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
