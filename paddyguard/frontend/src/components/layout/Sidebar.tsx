import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home, Mic, Leaf, Bug, Clock, CheckSquare, BarChart2, Users, UserCheck, LogOut, Wheat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { clearLeafAuth, getLeafAuth } from '@/lib/leafApi'
import type { AppRole } from './ProtectedRoute'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  allow: AppRole[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'මුල් පිටුව | Home', icon: Home, allow: ['FARMER'] },
  { to: '/voice', label: 'හඬ විනිශ්චය | Voice', icon: Mic, allow: ['FARMER'] },
  { to: '/leaf', label: 'Analyze Leaf', icon: Leaf, allow: ['FARMER', 'EXPERT', 'SUPER_ADMIN'] },
  { to: '/pest', label: 'කෘමි | Pest', icon: Bug, allow: ['FARMER'] },
  { to: '/history', label: 'History', icon: Clock, allow: ['FARMER', 'EXPERT', 'SUPER_ADMIN'] },
  { to: '/expert-review', label: 'Expert Review', icon: CheckSquare, allow: ['EXPERT', 'SUPER_ADMIN'] },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2, allow: ['SUPER_ADMIN'] },
  { to: '/expert-management', label: 'Experts', icon: Users, allow: ['SUPER_ADMIN'] },
  { to: '/admin/users', label: 'Users', icon: UserCheck, allow: ['SUPER_ADMIN'] },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const farmerAuthed = useAuthStore((s) => s.isAuthenticated)
  const farmerUser = useAuthStore((s) => s.user)
  const farmerLogout = useAuthStore((s) => s.logout)
  const leafAuth = getLeafAuth()

  const roles: AppRole[] = []
  if (farmerAuthed) roles.push('FARMER')
  if (leafAuth?.role === 'EXPERT') roles.push('EXPERT')
  if (leafAuth?.role === 'SUPER_ADMIN') roles.push('SUPER_ADMIN')

  const items = NAV_ITEMS.filter((item) => item.allow.some((r) => roles.includes(r)))
  const displayName = farmerUser?.full_name || farmerUser?.email || leafAuth?.name || leafAuth?.username || 'User'
  const displayRole = leafAuth?.role || (farmerAuthed ? 'FARMER' : '')

  function handleLogout() {
    clearLeafAuth()
    farmerLogout()
    navigate('/login')
  }

  const content = (
    <div className="flex h-full w-[260px] flex-col bg-forest text-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-light">
          <Wheat className="h-5 w-5 text-amber" />
        </div>
        <span className="text-lg font-bold">PaddyGuard AI</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
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
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-sm font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-white/60">{displayRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">{content}</div>

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
              className="absolute inset-y-0 left-0"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
