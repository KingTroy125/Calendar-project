'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthCard } from '@/components/application/auth/auth-card'
import { BackendError, login, signup } from '@/lib/api'

type AuthMode = 'login' | 'signup'

function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')

    try {
      const email = String(formData.get('email') ?? '')
      const password = String(formData.get('password') ?? '')
      if (mode === 'signup') {
        await signup(email, password)
      } else {
        await login(email, password)
      }
      router.push('/dashboard')
    } catch (submitError) {
      setError(submitError instanceof BackendError ? submitError.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      mode={mode === 'signup' ? 'signup' : 'signin'}
      title={mode === 'signup' ? 'Create your account' : 'Login to your account'}
      description={mode === 'signup' ? 'Enter your email below to create your account' : 'Enter your email below to login to your account'}
      centered
      framed={false}
      providers={[]}
      showName={false}
      showSigninOptions={false}
      isLoading={loading}
      errorMessage={error || undefined}
      switchHref={mode === 'signup' ? '/login' : '/signup'}
      onSubmit={handleSubmit}
    />
  )
}

export function LoginForm() {
  return <AuthForm mode="login" />
}

export function SignupForm() {
  return <AuthForm mode="signup" />
}

export default LoginForm
