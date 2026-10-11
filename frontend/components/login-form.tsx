'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackendError, login, signup } from '@/lib/api'

type AuthMode = 'login' | 'signup'

function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [githubSelected, setGithubSelected] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLoading(true)
    setError('')

    try {
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      if (mode === 'signup') {
        await signup(email, password)
      } else {
        await login(email, password)
      }
      router.push('/')
    } catch (submitError) {
      if (submitError instanceof BackendError) setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[270px] text-zinc-900">
      <div className="mb-4 flex flex-col items-center gap-1 text-center">
        <h1 className="text-base font-semibold">{mode === 'signup' ? 'Create your account' : 'Login to your account'}</h1>
        <p className="text-[10px] text-zinc-500">{mode === 'signup' ? 'Enter your email below to create your account' : 'Enter your email below to login to your account'}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-[10px] font-medium">Email</label>
          <input id="email" name="email" type="text" inputMode="email" autoComplete="email" placeholder="m@example.com" className="h-8 rounded-[9px] border border-zinc-200 bg-white px-2.5 text-[10px] outline-none transition-shadow placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-500/30" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[10px] font-medium">Password</label>
            {mode === 'login' && <button type="button" onClick={() => setError('')} className="text-[10px] font-medium text-sky-600 hover:underline">Forgot your password?</button>}
          </div>
          <input id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="••••••••" className="h-8 rounded-[9px] border border-zinc-200 bg-white px-2.5 text-[10px] outline-none transition-shadow placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-500/30" />
        </div>

        {error && <p role="alert" className="text-[10px] text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="h-7 w-full rounded-lg bg-gradient-to-b from-[#3182f6] to-[#1765ed] text-[10px] font-medium text-white shadow-sm hover:from-[#2675ec] hover:to-[#125bdd]">{loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Login'}</Button>
      </form>

      <p className="mt-3 text-center text-[10px] text-zinc-500">
        {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
        <Link href={mode === 'signup' ? '/login' : '/signup'} className="font-semibold text-zinc-900 hover:underline">
          {mode === 'signup' ? 'Log in' : 'Sign up'}
        </Link>
      </p>
    </div>
  )
}

export function LoginForm() {
  return <AuthForm mode="login" />
}

export function SignupForm() {
  return <AuthForm mode="signup" />
}

export default LoginForm
