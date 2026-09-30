/**
 * Simgeler satir ici SVG.
 *
 * Neden paket degil: panelin tamami 20 kadar simge kullaniyor ve hepsi ayni
 * cizgi kalinliginda. Bir simge paketi bunun icin binlerce yol tasirdi; ayrica
 * arayuz kutuphanesi kendi simgesini dayatmiyor, istedigimizi veriyoruz.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}>
      {children}
    </svg>
  );
}

export const IconGrid = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
    <circle cx="9" cy="7" r="3.2" />
    <path d="M22 20v-1.5a4 4 0 0 0-3-3.87" />
    <path d="M16 3.7a4 4 0 0 1 0 6.6" />
  </Icon>
);

export const IconBolt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="3" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </Icon>
);

export const IconHistory = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </Icon>
);

export const IconTag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11.5V4.5a1.5 1.5 0 0 1 1.5-1.5h7l9 9-8.5 8.5z" />
    <circle cx="7.8" cy="7.8" r="1.4" />
  </Icon>
);

export const IconSupport = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="m5 5 4.4 4.4M19 5l-4.4 4.4M5 19l4.4-4.4M19 19l-4.4-4.4" />
  </Icon>
);

export const IconCar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 16.5h15M5 16.5V19a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-2.5M21.5 16.5V19a1 1 0 0 1-1 1H20a1 1 0 0 1-1-1v-2.5" />
    <path d="M3 16.5v-4l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 7.5l2 5v4z" />
    <path d="M6.5 13h2M15.5 13h2" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2v.17a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-2.93-1.16l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 14.5H4.4a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 5.65 7.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 11.5 3.6V3.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 2.87 1.2l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.54 1.03h.17a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.58 1.03z" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Icon>
);

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" />
    <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5" />
  </Icon>
);

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m14.5 5-7 7 7 7" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9.5 5 7 7-7 7" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 9 7 7 7-7" />
  </Icon>
);

export const IconCollapse = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5 3 12l5 7M16 5l5 7-5 7" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
    <path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" />
  </Icon>
);

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" />
    <path d="M10 16.5 14.5 12 10 7.5M14.5 12H3.5" />
  </Icon>
);

export const IconStation = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="3" width="11" height="18" rx="2" />
    <path d="M7.5 8h4M15 9h2.5a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 1.5 1.5" />
    <path d="m10.2 12-1.6 3h2.4l-1.2 3" />
  </Icon>
);
