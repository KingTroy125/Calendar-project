import { Calendar } from 'lucide-react'

import { SignupForm } from '@/components/login-form'

export default function Page() {
  return (
    <main className="flex min-h-svh flex-col bg-background-primary-default lg:flex-row">
      <section className="flex min-h-svh flex-1 flex-col p-6 sm:p-8 lg:p-10">
        <header className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-50 text-accent-700" aria-hidden="true">
            <Calendar className="size-[18px]" />
          </span>
          <span className="text-body-medium text-text-primary">Calendar</span>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <SignupForm />
        </div>
      </section>

      <aside aria-label="Decorative panel" className="hidden min-h-svh flex-1 bg-background-secondary-default lg:block" />
    </main>
  )
}