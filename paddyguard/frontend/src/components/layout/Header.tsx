import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, ChevronDown, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { clearLeafAuth, getLeafAuth } from '@/lib/leafApi'

const TITLES: Record<string, string> = {
  '/': 'මුල් පිටුව | Home',
  '/voice': 'හඬ රෝග නිර්ණය | Voice Diagnosis',
  '/leaf': 'කොළ රෝග හඳුනාගැනීම | Leaf Disease',
  '/pest': 'කෘමි හඳුනාගැනීම | Pest Detection',
  '/history': 'ඉතිහාසය | History',
  '/expert-review': 'Expert Review',
  '/dashboard': 'Admin Dashboard',
  '/expert-management': 'Expert Management',
  '/admin/users': 'User Management',
}

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const farmerUser = useAuthStore((s) => s.user)
  const farmerLogout = useAuthStore((s) => s.logout)
  const leafAuth = getLeafAuth()

  const displayEmail = farmerUser?.email || leafAuth?.username || ''
  const displayRole = leafAuth?.role || (farmerUser ? 'FARMER' : '')
  const title = TITLES[location.pathname] || 'PaddyGuard AI'

  function handleLogout() {
    clearLeafAuth()
    farmerLogout()
    navigate('/login')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-beige bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-forest hover:bg-beige lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate font-sinhala text-base font-bold text-forest md:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="rounded-full p-2 text-forest-muted hover:bg-beige">
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-beige"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber text-sm font-bold text-white">
              {displayEmail.charAt(0).toUpperCase() || 'U'}
            </div>
            <ChevronDown className="h-4 w-4 text-forest-muted" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl bg-white p-2 shadow-lg">
                <div className="border-b border-beige px-3 py-2">
                  <p className="truncate text-sm font-semibold text-forest">{displayEmail}</p>
                  <p className="text-xs text-forest-muted">{displayRole}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-soft hover:bg-red-soft/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
