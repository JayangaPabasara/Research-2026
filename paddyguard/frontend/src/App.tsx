import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { scheduleWeatherChecks } from '@/lib/weatherNotification'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import StaffLogin from '@/pages/StaffLogin'
import Home from '@/pages/Home'
import VoiceDiagnosis from '@/pages/VoiceDiagnosis'
import LeafDisease from '@/pages/LeafDisease'
import PestDetection from '@/pages/PestDetection'
import History from '@/pages/History'
import ExpertReview from '@/pages/ExpertReview'
import AdminDashboard from '@/pages/AdminDashboard'
import ExpertManagement from '@/pages/ExpertManagement'
import AdminUsers from '@/pages/AdminUsers'

function Protected({ allow, children }: { allow: Array<'FARMER' | 'EXPERT' | 'SUPER_ADMIN'>; children: React.ReactNode }) {
  return (
    <ProtectedRoute allow={allow}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  useEffect(() => {
    if (isAuthenticated) {
      scheduleWeatherChecks()
    }
  }, [isAuthenticated])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/staff-login" element={<StaffLogin />} />

      <Route path="/" element={<Protected allow={['FARMER']}><Home /></Protected>} />
      <Route path="/voice" element={<Protected allow={['FARMER']}><VoiceDiagnosis /></Protected>} />
      <Route path="/leaf" element={<Protected allow={['FARMER', 'EXPERT', 'SUPER_ADMIN']}><LeafDisease /></Protected>} />
      <Route path="/pest" element={<Protected allow={['FARMER']}><PestDetection /></Protected>} />
      <Route path="/history" element={<Protected allow={['FARMER', 'EXPERT', 'SUPER_ADMIN']}><History /></Protected>} />

      <Route path="/expert-review" element={<Protected allow={['EXPERT', 'SUPER_ADMIN']}><ExpertReview /></Protected>} />

      <Route path="/dashboard" element={<Protected allow={['SUPER_ADMIN']}><AdminDashboard /></Protected>} />
      <Route path="/expert-management" element={<Protected allow={['SUPER_ADMIN']}><ExpertManagement /></Protected>} />
      <Route path="/admin/users" element={<Protected allow={['SUPER_ADMIN']}><AdminUsers /></Protected>} />
    </Routes>
  )
}
