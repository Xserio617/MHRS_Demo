"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDoctorAppointments, getMyDoctorProfile, type AppointmentItem } from '@/lib/mhrs-api'

function toDate(value: string): Date {
  return new Date(value)
}

function formatDateTimeTr(value: string): string {
  const date = toDate(value)
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function mapStatusLabel(status: string): string {
  if (status === 'active') return 'Aktif'
  if (status === 'cancelled') return 'İptal'
  if (status === 'completed') return 'Tamamlandı'
  return status
}

export default function DoctorPage() {
  const router = useRouter()
  const [doctorName, setDoctorName] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])

  async function loadDoctorAppointments() {
    const accessToken = localStorage.getItem('mhrs_access_token')
    if (!accessToken) {
      setErrorText('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }

    setLoading(true)
    setErrorText('')
    try {
      const [response, profile] = await Promise.all([
        getDoctorAppointments(accessToken),
        getMyDoctorProfile(accessToken),
      ])
      setAppointments(response)
      setDoctorName(`${profile.first_name} ${profile.last_name}`.trim())
      localStorage.setItem('mhrs_doctor_name', `${profile.first_name} ${profile.last_name}`.trim())
    } catch (error) {
      setErrorText((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const role = localStorage.getItem('mhrs_role')
    if (role !== 'doctor') {
      router.replace('/admin')
      return
    }

    setDoctorName(localStorage.getItem('mhrs_doctor_name') ?? '')
    setAuthorized(true)
    void loadDoctorAppointments()
  }, [router])

  function handleLogout() {
    localStorage.removeItem('mhrs_access_token')
    localStorage.removeItem('mhrs_refresh_token')
    localStorage.removeItem('mhrs_role')
    localStorage.removeItem('mhrs_email')
    localStorage.removeItem('mhrs_doctor_name')
    router.push('/admin')
  }

  if (!authorized) {
    return <main className="min-h-screen bg-background p-6" />
  }

  const now = new Date()
  const sortedAppointments = [...appointments].sort(
    (left, right) => toDate(left.appointment_date).getTime() - toDate(right.appointment_date).getTime()
  )

  const upcomingAppointments = sortedAppointments.filter(
    (item) => item.status === 'active' && toDate(item.appointment_date) >= now
  )
  const pastAppointments = sortedAppointments.filter(
    (item) => item.status !== 'active' || toDate(item.appointment_date) < now
  )

  const summary = {
    activeCount: appointments.filter((item) => item.status === 'active').length,
    cancelledCount: appointments.filter((item) => item.status === 'cancelled').length,
    completedCount: appointments.filter((item) => item.status === 'completed').length,
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="border border-border rounded-xl bg-card p-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Doktor Paneli</h1>
            <p className="text-sm text-muted-foreground mt-2">Hoş geldiniz {doctorName || 'Doktor'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void loadDoctorAppointments()} disabled={loading}>
              <RefreshCw className="size-4" />
              Yenile
            </Button>
            <Button variant="outline" onClick={handleLogout}>Çıkış Yap</Button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-border rounded-xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Aktif</p>
            <p className="text-2xl font-bold mt-1">{summary.activeCount}</p>
          </div>
          <div className="border border-border rounded-xl bg-card p-4">
            <p className="text-xs text-muted-foreground">İptal</p>
            <p className="text-2xl font-bold mt-1">{summary.cancelledCount}</p>
          </div>
          <div className="border border-border rounded-xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Tamamlanan</p>
            <p className="text-2xl font-bold mt-1">{summary.completedCount}</p>
          </div>
        </section>

        <section className="border border-border rounded-xl bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Yaklaşan Randevular</h2>
            <CalendarDays className="size-5 text-muted-foreground" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Randevular yükleniyor...</p>
          ) : upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Yaklaşan aktif randevu bulunmuyor.</p>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.uid} className="border border-border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatDateTimeTr(appointment.appointment_date)}</p>
                    <p className="text-xs text-muted-foreground">UID: {appointment.uid}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
                    {mapStatusLabel(appointment.status)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {errorText && <p className="text-sm text-destructive mt-3">{errorText}</p>}
        </section>

        <section className="border border-border rounded-xl bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Geçmiş / Diğer Randevular</h2>
          {pastAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kayıt bulunmuyor.</p>
          ) : (
            <div className="space-y-2">
              {pastAppointments.map((appointment) => (
                <div key={appointment.uid} className="border border-border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatDateTimeTr(appointment.appointment_date)}</p>
                    <p className="text-xs text-muted-foreground">UID: {appointment.uid}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {mapStatusLabel(appointment.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
