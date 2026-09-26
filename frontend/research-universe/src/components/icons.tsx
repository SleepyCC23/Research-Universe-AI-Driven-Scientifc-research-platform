/** 轻量内联图标集（stroke 风格，24x24 视口，与设计稿视觉一致） */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
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
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconDashboard = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Base>
)

export const IconFileText = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Base>
)

export const IconChart = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Base>
)

export const IconPen = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Base>
)

export const IconClipboardCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 3h6v3H9zM8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <path d="m9 14 2 2 4-4" />
  </Base>
)

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v12M7 11l5 5 5-5M4 21h16" />
  </Base>
)

export const IconBell = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Base>
)

export const IconSearch = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Base>
)

export const IconSparkles = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
    <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
  </Base>
)

export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
    <circle cx="9.5" cy="7" r="3.5" />
    <path d="M21 20v-1.5a4 4 0 0 0-3-3.87M16.5 3.6a4 4 0 0 1 0 7.8" />
  </Base>
)

export const IconHistory = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  </Base>
)

export const IconLock = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Base>
)

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 13 4 4L19 7" />
  </Base>
)

export const IconCheckCircle = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Base>
)

export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Base>
)

export const IconInfo = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Base>
)

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
)

export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 5 7 7-7 7" />
  </Base>
)

export const IconArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Base>
)

export const IconUpload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </Base>
)

export const IconDatabase = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </Base>
)

export const IconTable = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9 10v10" />
  </Base>
)

export const IconTarget = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
  </Base>
)

export const IconGavel = (p: IconProps) => (
  <Base {...p}>
    <path d="m14 4 6 6-3 3-6-6z" />
    <path d="m9 9 6 6-2.5 2.5L6.5 11.5zM3 21h11" />
  </Base>
)

export const IconPackage = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 3 7.5v9L12 21l9-4.5v-9z" />
    <path d="m3 7.5 9 4.5 9-4.5M12 12v9" />
  </Base>
)

export const IconTag = (p: IconProps) => (
  <Base {...p}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z" />
    <path d="M7 7h.01" />
  </Base>
)

export const IconCredit = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M2.5 10h19M6 15h4" />
  </Base>
)

export const IconRefresh = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 6.3" />
    <path d="M20 4v7h-7" />
  </Base>
)

export const IconSettings = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z" />
  </Base>
)

export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 4l14 8-14 8z" />
  </Base>
)

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />
  </Base>
)

export const IconEye = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Base>
)

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)

export const IconInbox = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12h5l1.5 2.5h5L16 12h5" />
    <path d="M5 4h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" />
  </Base>
)

export const IconQuote = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 6c-2.8 0-5 2.2-5 5v7h7v-7H6a2 2 0 0 1 2-2zM19 6c-2.8 0-5 2.2-5 5v7h7v-7h-4a2 2 0 0 1 2-2z" />
  </Base>
)

export const IconRobot = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 4v4M9 14h.01M15 14h.01M9.5 17.5h5" />
  </Base>
)

export const IconArrowUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20V4M6 10l6-6 6 6" />
  </Base>
)

export const IconLayers = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5M3 17l9 5 9-5" />
  </Base>
)

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l8 3v6c0 5-3.4 8.3-8 9.9C7.4 20.3 4 17 4 12V6z" />
    <path d="m9 12 2 2 4-4" />
  </Base>
)

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
)

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c0-3.6 3.4-5.6 7.5-5.6s7.5 2 7.5 5.6" />
  </Base>
)

export const IconLogout = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 8 6 12l4 4M6 12h9" />
  </Base>
)

export const IconMonitor = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
    <path d="M9 20h6M12 16.5V20" />
  </Base>
)

export const IconCalendar = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4M7.5 14h2M14.5 14h2M7.5 17.5h2M14.5 17.5h2" />
  </Base>
)

export const IconTrendUp = (p: IconProps) => (
  <Base {...p}>
    <path d="m3 17 5.5-5.5 3.5 3.5L21 6" />
    <path d="M15 6h6v6" />
  </Base>
)
