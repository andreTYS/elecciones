import { SVGProps } from 'react';

// Sistema de iconos SVG propio (trazo 1.8, estilo outline consistente).
// Sin dependencias externas: cada icono es un path inline.

const PATHS = {
  shield: (
    <>
      <path d="M12 2.5 20 6v6.2c0 4.9-3.4 8.3-8 9.8-4.6-1.5-8-4.9-8-9.8V6l8-3.5Z" />
      <path d="m8.8 12.2 2.2 2.2 4.4-4.8" />
    </>
  ),
  ballot: (
    <>
      <path d="M5 8.5c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2V19H5V8.5Z" />
      <path d="M22 19H2" />
      <path d="m9 11.5 2 2 4-4" />
      <path d="M9 3h6v3.5H9z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7.5h3l2-3h6l2 3h3a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 16.8v.2" />
    </>
  ),
  utensils: (
    <>
      <path d="M5 3v6a3 3 0 0 0 3 3v9" />
      <path d="M11 3v6a3 3 0 0 1-3 3" />
      <path d="M18 3c-1.5 2-2.5 4.5-2.5 7 0 1 .5 2 2.5 2v9" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
      <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M7 5.5V4M10 5.5V4M13 5.5V4" />
    </>
  ),
  bowl: (
    <>
      <path d="M4 12h16a8 8 0 0 1-16 0Z" />
      <path d="M9 8.5c0-1.5 1.5-1.5 1.5-3M13.5 8.5c0-1.5 1.5-1.5 1.5-3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V8M17 20v-9" />
    </>
  ),
  tally: (
    <>
      <path d="M9.5 4 8 20M16 4l-1.5 16" />
      <path d="M4.5 9h16M3.5 15h16" />
    </>
  ),
  inbox: (
    <>
      <path d="M5 5h14l3 8v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5l3-8Z" />
      <path d="M2 13h6l1.5 2.5h5L16 13h6" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5.5" y="4.5" width="13" height="17" rx="2" />
      <path d="M9 3h6v3.5H9z" />
      <path d="M9.5 11.5H15M9.5 15.5h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M15.5 4.7a3.5 3.5 0 0 1 0 6.6" />
      <path d="M17.5 14.3A6 6 0 0 1 21 20" />
    </>
  ),
  building: (
    <>
      <path d="M12 3 3.5 8.5h17L12 3Z" />
      <path d="M5 8.5V20h14V8.5" />
      <path d="M10 20v-5h4v5" />
      <path d="M3 20h18" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 10.5 15-5v13l-15-5v-3Z" />
      <path d="M11.5 15.7a3 3 0 1 1-5.7-1.9" />
      <path d="M21 9.5v5" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="m9.2 13.2-1.2 7.3 4-2 4 2-1.2-7.3" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4.5c4-2 6.5 1.5 10.5 0V13c-4 2-6.5-1.5-10.5 0" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15.5" r="4.5" />
      <path d="m11.5 12 8.5-8.5" />
      <path d="m16 7.5 3 3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="m16 16.5 4.5-4.5L16 7.5" />
      <path d="M20.5 12H9" />
    </>
  ),
  check: <path d="m4.5 12.5 5.5 5.5L19.5 6" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5" />
      <path d="m7 8 5-5 5 5" />
      <path d="M12 3v12.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <path d="M12 15v2" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M3 10h18" />
      <path d="M9.5 10v9.5M15.5 10v9.5" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v6a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.5 6H4.5a2.5 2.5 0 0 0 2.7 4M16.5 6h3a2.5 2.5 0 0 1-2.7 4" />
      <path d="M12 14.5V18" />
      <path d="M8.5 21h7M12 18v3" />
    </>
  ),
  send: (
    <>
      <path d="m21.5 2.5-11 11" />
      <path d="M21.5 2.5 14.5 21.5l-4-9-9-4 20-6Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 3v4h-4" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

// Titulo de pagina con icono en contenedor acentuado
export function PageTitle({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <h2 className="page-title">
      <span className="pt-icon"><Icon name={icon} size={20} /></span>
      {children}
    </h2>
  );
}
