"use client"

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getMe, getMyDoctorProfile, login, register, verifyEmail } from '@/lib/mhrs-api'
import { Button } from '@/components/ui/button'

type Mode = 'login' | 'register'

type Feedback = {
  type: 'success' | 'error'
  text: string
} | null

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = useMemo<Mode>(() => {
    const tab = searchParams.get('tab')
    return tab === 'register' ? 'register' : 'login'
  }, [searchParams])
  const verifyToken = searchParams.get('verify_token')

  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (!verifyToken) {
      return
    }

    let cancelled = false

    async function runVerification() {
      setLoading(true)
      setFeedback(null)
      try {
        const result = await verifyEmail(verifyToken)
        if (!cancelled) {
          setFeedback({ type: 'success', text: result.message })
          setMode('login')
          router.replace('/auth?tab=login')
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback({ type: 'error', text: (error as Error).message })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    runVerification()

    return () => {
      cancelled = true
    }
  }, [router, verifyToken])

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      await register({ email, password })
      setFeedback({ type: 'success', text: 'Kayıt başarılı. Şimdi giriş yapabilirsiniz.' })
      setMode('login')
      setPassword('')
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      const tokenResponse = await login(email, password)
      const me = await getMe(tokenResponse.access_token)

      localStorage.setItem('mhrs_access_token', tokenResponse.access_token)
      localStorage.setItem('mhrs_refresh_token', tokenResponse.refresh_token)
      localStorage.setItem('mhrs_email', me.email)

      if (me.is_admin) {
        localStorage.setItem('mhrs_role', 'admin')
        router.push('/admin/panel')
        return
      }

      if (me.is_doctor) {
        localStorage.setItem('mhrs_role', 'doctor')
        try {
          const doctorProfile = await getMyDoctorProfile(tokenResponse.access_token)
          localStorage.setItem(
            'mhrs_doctor_name',
            `${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
          )
        } catch {
          localStorage.removeItem('mhrs_doctor_name')
        }
        router.push('/doctor')
        return
      }

      localStorage.setItem('mhrs_role', 'user')
      localStorage.removeItem('mhrs_doctor_name')
      router.push('/')
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto border border-border rounded-xl bg-card p-6 space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">MHRS Hesap</h1>
          <p className="text-sm text-muted-foreground">
            Hasta, doktor veya admin olarak giriş yapabilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`h-10 rounded-md border text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            Giris
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`h-10 rounded-md border text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            Kayit Ol
          </button>
        </div>

        <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full border border-border rounded-md h-10 px-3 bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sifre</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full border border-border rounded-md h-10 px-3 bg-background"
            />
          </div>

          <Button type="submit" disabled={loading || !email || !password}>
            {loading
              ? mode === 'register'
                ? 'Kaydediliyor...'
                : 'Giris yapiliyor...'
              : mode === 'register'
                ? 'Kayit Ol'
                : 'Giris Yap'}
          </Button>
        </form>

        {feedback && (
          <p className={`text-sm ${feedback.type === 'success' ? 'text-primary' : 'text-destructive'}`}>
            {feedback.text}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Doktor aday basvurusu veya admin paneline gecis icin{' '}
          <Link href="/admin" className="underline underline-offset-2">
            yetkili giris sayfasi
          </Link>{' '}
          kullanilir.
        </p>
      </div>
    </main>
  )
}
