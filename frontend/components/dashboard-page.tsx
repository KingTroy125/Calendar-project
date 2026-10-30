'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Menu } from 'lucide-react'
import { DashboardSidebar } from '@/components/application/dashboard/dashboard-sidebar'
import { Button } from '@/components/base/buttons/button'
import { IconButton } from '@/components/base/buttons/icon-button'
import { DashboardHome } from '@/components/dashboard-home'
import { BackendError, getCurrentUser, logout, type CurrentUser } from '@/lib/api'

export function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [activeSection, setActiveSection] = useState('home')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        if (requestError instanceof BackendError && requestError.status === 401) {
          router.replace('/login')
          return
        }
        setError('We could not connect to your account. Check your connection and try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const updateActiveSection = () => {
      const section = window.location.hash.slice(1) || 'home'
      setActiveSection(section)
      setMobileNavOpen(false)
      window.scrollTo(0, 0)
    }
    updateActiveSection()
    window.addEventListener('hashchange', updateActiveSection)
    return () => {
      active = false
      window.removeEventListener('hashchange', updateActiveSection)
    }
  }, [router])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logout()
      router.replace('/login')
      router.refresh()
    } catch {
      setError('Sign out failed. Please try again.')
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background-full">
        <p className="text-body-regular text-text-secondary">Loading your calendar...</p>
      </main>
    )
  }

  if (error && !user) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background-full px-6 text-center">
        <p role="alert" className="text-body-regular text-text-secondary">{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-svh bg-background-full lg:flex">
      <div className="sticky top-0 hidden h-svh shrink-0 p-3 lg:block">
        <DashboardSidebar
          selected={activeSection}
          accountEmail={user.email}
          user={user}
          onUserUpdated={setUser}
          onSignOut={handleSignOut}
          signingOut={signingOut}
          className="h-full"
        />
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-text-primary/30"
          />
          <div className="relative h-full w-[min(280px,calc(100vw-48px))]">
            <DashboardSidebar
              mobile
              flat
              fluid
              selected={activeSection}
              accountEmail={user.email}
              user={user}
              onUserUpdated={setUser}
              onSignOut={handleSignOut}
              signingOut={signingOut}
              onClose={() => setMobileNavOpen(false)}
              className="h-full"
            />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-separator-border px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-accent-600 text-text-white">
              <Calendar className="size-5" aria-hidden />
            </span>
            <span className="text-body-medium text-text-primary">Calendar</span>
          </div>
          <IconButton
            icon={Menu}
            size="small"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          />
        </header>

        <DashboardHome user={user} calendarOnly={activeSection === 'calendar'} />
      </div>
    </div>
  )
}