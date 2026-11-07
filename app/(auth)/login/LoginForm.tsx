'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

interface LoginFormProps {
  redirectTo?: string
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push(redirectTo ?? '/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="label">
          Email professionnel
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          aria-describedby={error ? 'login-error' : undefined}
          className="input h-11"
          placeholder="agent@otoclic.ma"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            aria-describedby={error ? 'login-error' : undefined}
            className="input h-11 pr-11"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          id="login-error"
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary h-11 w-full"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connexion…
          </>
        ) : (
          'Se connecter'
        )}
      </button>
    </form>
  )
}
