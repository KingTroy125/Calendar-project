import { Zap } from 'lucide-react'

import { LoginForm } from '@/components/login-form'

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-white lg:flex-row">
      <section className="flex min-h-screen flex-1 flex-col px-7 py-7">
        <header className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-sky-100 text-sky-600" aria-hidden="true">
            <Zap className="size-3.5" />
          </span>
          <span className="text-xs font-semibold text-zinc-800">Calendar</span>
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <LoginForm />
        </div>
      </section>

      <aside aria-label="Decorative panel" className="hidden min-h-screen flex-1 bg-[#f0f0f0] lg:block" />
    </main>
  )
}
