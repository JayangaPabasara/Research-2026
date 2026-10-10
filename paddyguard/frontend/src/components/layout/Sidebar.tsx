import { uiText } from '@/i18n/text'
import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/community/Common'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Home,
  Mic,
  Leaf,
  Bug,
  MessageCircle,
  Clock,
  CheckSquare,
  BarChart2,
  Users,
  UserCheck,
  LogOut,
  Wheat,
  ShieldCheck,
  ChevronLeft,
  UserRound,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import { usePestAuthStore } from '@/store/pestAuthStore'

import {
  clearLeafAuth,
  getLeafAuth,
} from '@/lib/leafApi'

import type { AppRole } from './ProtectedRoute'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  allow: AppRole[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/profile', label: 'profile', icon: UserRound, allow: ['FARMER'] },
  { to: '/feedback', label: 'feedback', icon: MessageCircle, allow: ['FARMER'] },
  { to: '/', label: 'මුල් පිටුව | Home', icon: Home, allow: ['FARMER'] },
  { to: '/voice', label: 'හඬ විනිශ්චය | Voice', icon: Mic, allow: ['FARMER'] },
  { to: '/leaf', label: 'කොළ රෝග | Leaf', icon: Leaf, allow: ['FARMER', 'EXPERT', 'SUPER_ADMIN'] },
  { to: '/pest', label: 'කෘමි | Pest', icon: Bug, allow: ['FARMER'] },
  {
    to: '/chat',
    label: 'ප්‍රතිකාර | Treatment',
    icon: MessageCircle,
    allow: ['FARMER'],
  },
  { to: '/history', label: 'ඉතිහාසය | History', icon: Clock, allow: ['FARMER', 'EXPERT', 'SUPER_ADMIN'] },
  { to: '/expert-review', label: 'Expert Review', icon: CheckSquare, allow: ['EXPERT', 'SUPER_ADMIN'] },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2, allow: ['SUPER_ADMIN'] },
  { to: '/expert-management', label: 'Experts', icon: Users, allow: ['SUPER_ADMIN'] },
  { to: '/admin/users', label: 'Users', icon: UserCheck, allow: ['SUPER_ADMIN'] },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const mobilePanel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const panel = mobilePanel.current
    panel?.querySelector<HTMLElement>('button, a')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !panel) return
      const elements = Array.from(panel.querySelectorAll<HTMLElement>('a, button, input, select, [tabindex="0"]')).filter(el => !el.hasAttribute('disabled') && el.getClientRects().length)
      const first = elements[0], last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [open, onClose])
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('paddyguard_sidebar_collapsed') === 'true')
  const primaryRole = useAuthStore(s => s.user?.role)
  const verified = useAuthStore(s => s.identityVerified)
  const routeKeys: Record<string, string> = { '/': 'home', '/voice': 'voice', '/leaf': 'leaf', '/pest': 'pest', '/chat': 'treatment', '/history': 'history', '/profile': 'profile', '/feedback': 'feedback' }
  const navigate = useNavigate()

  const farmerAuthed = useAuthStore(
    (state) => state.isAuthenticated,
  )

  const farmerUser = useAuthStore(
    (state) => state.user,
  )

  const farmerLogout = useAuthStore(
    (state) => state.logout,
  )

  const pestAdminAuthed = usePestAuthStore(
    (state) => state.isAuthenticated,
  )

  const pestAdminUser = usePestAuthStore(
    (state) => state.user,
  )

  const pestAdminLogout = usePestAuthStore(
    (state) => state.logout,
  )

  /*
   * IMPORTANT:
   * leafAuth is NOT changed.
   */
  const leafAuth = getLeafAuth()

  const roles: AppRole[] = []

  if (farmerAuthed && primaryRole === 'FARMER') {
    roles.push('FARMER')
  }

  if (leafAuth?.role === 'EXPERT') {
    roles.push('EXPERT')
  }

  if (leafAuth?.role === 'SUPER_ADMIN') {
    roles.push('SUPER_ADMIN')
  }

  const items = NAV_ITEMS.filter((item) =>
    item.allow.some((role) =>
      roles.includes(role),
    ),
  )

  const displayName =
    pestAdminAuthed
      ? pestAdminUser?.username || 'Pest Admin'
      : farmerUser?.full_name ||
        farmerUser?.email ||
        leafAuth?.name ||
        leafAuth?.username ||
        'User'

  const displayRole =
    pestAdminAuthed
      ? 'PEST ADMIN'
      : leafAuth?.role ||
        (farmerAuthed ? primaryRole : '')

  function handleLogout() {
    /*
     * Pest Admin logout ONLY logs out Pest Admin.
     * It does NOT touch farmerAuth or leafAuth.
     */
    if (pestAdminAuthed) {
      pestAdminLogout()
      navigate('/pest-admin-login')
      onClose()
      return
    }

    /*
     * Existing logout behaviour remains unchanged.
     */
    clearLeafAuth()
    farmerLogout()
    navigate('/login')
    onClose()
  }

  const content = (
    <div className={`pg-sidebar relative flex h-full flex-col bg-forest text-white ${collapsed ? 'pg-sidebar-collapsed' : ''}`}>
      <button aria-label={t(collapsed ? 'expand' : 'collapse')} aria-expanded={!collapsed} onClick={() => { setCollapsed(!collapsed); localStorage.setItem('paddyguard_sidebar_collapsed', String(!collapsed)) }} className="absolute -right-3 top-6 z-10 hidden rounded-full border border-white/20 bg-forest p-1.5 text-white lg:block"><ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} /></button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-light">
          <Wheat className="h-5 w-5 text-amber" />
        </div>

        <span className="pg-sidebar-label text-lg font-bold">
          PaddyGuard AI
        </span>
        <button onClick={onClose} aria-label={t('close')} className="ml-auto rounded-lg p-2 lg:hidden"><X className="h-5 w-5" /></button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">

        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={t(routeKeys[item.to] || item.label)}
            aria-label={t(routeKeys[item.to] || item.label)}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors font-sinhala ${
                isActive
                  ? 'border-amber bg-amber/10 text-amber'
                  : 'border-transparent text-white/80 hover:bg-white/5'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="pg-sidebar-label">
              {t(routeKeys[item.to] || item.label)}
            </span>
          </NavLink>
        ))}
        {verified && primaryRole === 'SYSTEM_ADMIN' && <NavLink to="/system-admin" title={t('systemAdmin')} aria-label={t('systemAdmin')} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 ${isActive ? 'bg-amber/10 text-amber' : 'text-white/80'}`}><ShieldCheck className="h-5 w-5 shrink-0" /><span className="pg-sidebar-label">{t('systemAdmin')}</span></NavLink>}

        {/* ========================= */}
        {/* Pest Admin Navigation      */}
        {/* ========================= */}

        {pestAdminAuthed && (
          <div className="mt-4 border-t border-white/10 pt-4">

            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {uiText("Pest Administration")}</p>

            <NavLink
              to="/pest-admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-transparent text-white/80 hover:bg-white/5'
                }`
              }
            >
              <ShieldCheck className="h-5 w-5 shrink-0" />

              <span className="pg-sidebar-label truncate">
                {uiText("Pest Model Admin")}</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 px-4 py-4">

        <div className="mb-3 flex items-center gap-3">

          <NavLink to={primaryRole === 'SYSTEM_ADMIN' ? '/system-admin' : '/profile'} aria-label={t("profile")} title={t("profile")}>
          {farmerAuthed && !pestAdminAuthed ? <Avatar className="h-9 w-9" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-sm font-bold text-white">
            {displayName
              .charAt(0)
              .toUpperCase()}
          </div>}
          </NavLink>

          <div className="pg-sidebar-label min-w-0">
            <p className="truncate text-sm font-semibold">
              {displayName}
            </p>

            <p className="truncate text-xs text-white/60">
              {displayRole}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title={t('logout')}
          aria-label={t('logout')}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          <span className="pg-sidebar-label">{t('logout')}</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">
        {content}
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">

            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.div
              ref={mobilePanel}
              role="dialog"
              aria-modal="true"
              aria-label={t('menu')}
              className="absolute inset-y-0 left-0"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{
                duration: reducedMotion ? 0 : 0.25,
                ease: 'easeOut',
              }}
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
