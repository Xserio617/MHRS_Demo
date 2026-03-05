"use client"

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe, listHospitals, listUsers, login, register, type Hospital, type UserListItem } from '@/lib/mhrs-api'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Feedback = {
  type: 'success' | 'error'
  text: string
} | null

export default function AuthorizedLoginPage() {
  const router = useRouter()

  const [hospitals, setHospitals] = useState<Hospital[]>([])

  const [candidateEmail, setCandidateEmail] = useState('')
  const [candidatePassword, setCandidatePassword] = useState('')
  const [candidateHospitalId, setCandidateHospitalId] = useState('')

  const [doctorEmail, setDoctorEmail] = useState('')
  const [doctorPassword, setDoctorPassword] = useState('')

  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    async function loadHospitals() {
      try {
        const hospitalData = await listHospitals()
        setHospitals(hospitalData)
      } catch {
        // no-op
      }
    }

    void loadHospitals()
  }, [])

  async function resolveCurrentUser(accessToken: string, email: string): Promise<UserListItem> {
    try {
      return await getMe(accessToken)
    } catch (error) {
      const message = (error as Error).message.toLowerCase()
      if (!message.includes('not found') && !message.includes('http_404')) {
        throw error
      }

      const users = await listUsers()
      const matched = users.find((user) => user.email.toLowerCase() === email.toLowerCase())
      if (!matched) {
        throw new Error('Kullanici bilgisi bulunamadi.')
      }
      return matched
    }
  }

  async function handleDoctorRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      await register({
        email: candidateEmail,
        password: candidatePassword,
        wants_doctor_role: true,
        preferred_hospital_id: Number(candidateHospitalId),
      })

      setCandidateEmail('')
      setCandidatePassword('')
      setCandidateHospitalId('')
      setFeedback({
        type: 'success',
        text: 'Doktor adayi basvurunuz alindi. Yetkili onayi sonrasi doktor girisi yapabilirsiniz.',
      })
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDoctorLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      const tokenResponse = await login(doctorEmail, doctorPassword)
      const matched = await resolveCurrentUser(tokenResponse.access_token, doctorEmail)

      if (!matched?.is_doctor) {
        throw new Error('Bu hesap doktor rolunde degil veya henuz onaylanmadi.')
      }

      localStorage.setItem('mhrs_access_token', tokenResponse.access_token)
      localStorage.setItem('mhrs_refresh_token', tokenResponse.refresh_token)
      localStorage.setItem('mhrs_role', 'doctor')
      localStorage.setItem('mhrs_email', matched.email)

      router.push('/doctor')
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      const tokenResponse = await login(adminEmail, adminPassword)
      const matched = await resolveCurrentUser(tokenResponse.access_token, adminEmail)

      if (!matched?.is_admin) {
        throw new Error('Bu hesap admin yetkisine sahip degil.')
      }

      localStorage.setItem('mhrs_access_token', tokenResponse.access_token)
      localStorage.setItem('mhrs_refresh_token', tokenResponse.refresh_token)
      localStorage.setItem('mhrs_role', 'admin')
      localStorage.setItem('mhrs_email', matched.email)

      router.push('/admin/panel')
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="border border-border rounded-xl bg-card p-5">
          <h1 className="text-2xl font-bold">Yetkili Giris Sayfasi</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Doktor adayi kaydi olusturabilir, doktor veya admin olarak giris yapabilirsiniz.
          </p>
          {feedback && (
            <p className={`mt-4 text-sm ${feedback.type === 'success' ? 'text-primary' : 'text-destructive'}`}>
              {feedback.text}
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="border border-border rounded-xl bg-card p-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold mb-2">Doktor Olarak Kaydolun</h2>
              <form onSubmit={handleDoctorRegister} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">E-posta</label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(event) => setCandidateEmail(event.target.value)}
                    required
                    className="w-full border border-border rounded-md h-10 px-3 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sifre</label>
                  <input
                    type="password"
                    value={candidatePassword}
                    onChange={(event) => setCandidatePassword(event.target.value)}
                    required
                    minLength={6}
                    className="w-full border border-border rounded-md h-10 px-3 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tercih Edilen Hastane</label>
                  <Select value={candidateHospitalId} onValueChange={setCandidateHospitalId}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Hastane seciniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={String(hospital.id)}>{hospital.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={loading || !candidateHospitalId}>
                  {loading ? 'Kaydediliyor...' : 'Doktor Basvurusu Olustur'}
                </Button>
              </form>
            </div>

            <div className="pt-2 border-t border-border">
              <h3 className="text-base font-semibold mb-2">Doktor Olarak Giris Yap</h3>
              <form onSubmit={handleDoctorLogin} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">E-posta</label>
                  <input
                    type="email"
                    value={doctorEmail}
                    onChange={(event) => setDoctorEmail(event.target.value)}
                    required
                    className="w-full border border-border rounded-md h-10 px-3 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sifre</label>
                  <input
                    type="password"
                    value={doctorPassword}
                    onChange={(event) => setDoctorPassword(event.target.value)}
                    required
                    className="w-full border border-border rounded-md h-10 px-3 bg-background"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Giris yapiliyor...' : 'Doktor Girisi'}
                </Button>
              </form>
            </div>
          </section>

          <section className="border border-border rounded-xl bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Admin Olarak Giris Yap</h2>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">E-posta</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  required
                  className="w-full border border-border rounded-md h-10 px-3 bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sifre</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  required
                  className="w-full border border-border rounded-md h-10 px-3 bg-background"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Giris yapiliyor...' : 'Admin Girisi'}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
