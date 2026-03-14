"use client"

import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { getMyAppointmentsFromSearch, type AppointmentSearchItem } from '@/lib/mhrs-api'

function parseDate(value: string): Date {
  return new Date(value)
}

function normalizeStatus(status: string): string {
  const value = (status || '').toLowerCase()
  if (value.endsWith('active')) return 'active'
  if (value.endsWith('cancelled')) return 'cancelled'
  if (value.endsWith('completed')) return 'completed'
  return value
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseDate(value))
}

function mapStatus(status: string): string {
  const normalized = normalizeStatus(status)
  if (normalized === 'active') return 'Aktif'
  if (normalized === 'cancelled') return 'Iptal'
  if (normalized === 'completed') return 'Tamamlandi'
  return status
}

export function AppointmentsPanel() {
  const [appointments, setAppointments] = useState<AppointmentSearchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function load() {
      const accessToken = localStorage.getItem('mhrs_access_token')
      if (!accessToken) {
        setLoading(false)
        setAppointments([])
        return
      }

      setLoading(true)
      setErrorText('')
      try {
        const data = await getMyAppointmentsFromSearch(accessToken)
        setAppointments(data)
      } catch (error) {
        setErrorText((error as Error).message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const { activeAppointments, pastAppointments } = useMemo(() => {
    const active = appointments.filter((item) => normalizeStatus(item.status) === 'active')
    const past = appointments.filter((item) => normalizeStatus(item.status) !== 'active')
    return { activeAppointments: active, pastAppointments: past }
  }, [appointments])

  const noSession = typeof window !== 'undefined' && !localStorage.getItem('mhrs_access_token')

  return (
    <div className="bg-card rounded-lg border border-border">
      <Tabs defaultValue="randevularim">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start p-0 h-auto">
          <TabsTrigger
            value="randevularim"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm"
          >
            Randevularim
          </TabsTrigger>
          <TabsTrigger
            value="gecmis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm"
          >
            Gecmis Randevularim
          </TabsTrigger>
        </TabsList>

        <TabsContent value="randevularim" className="p-8">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Randevular yukleniyor...</p>
          ) : noSession ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Randevularinizi gormek icin giris yapin.
            </p>
          ) : activeAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="size-16 bg-muted rounded-lg flex items-center justify-center mb-4">
                <CalendarCheck className="size-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium text-base">Aktif Randevunuz Yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAppointments.map((appointment) => (
                <div
                  key={appointment.appointment_uid}
                  className="rounded-lg border border-border bg-background p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{appointment.doctor_full_name}</p>
                    <p className="text-xs text-muted-foreground">{appointment.hospital_name} - {appointment.clinic_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(appointment.appointment_date)}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
                    {mapStatus(appointment.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gecmis" className="p-8">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Randevular yukleniyor...</p>
          ) : noSession ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Gecmis randevularinizi gormek icin giris yapin.
            </p>
          ) : pastAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="size-16 bg-muted rounded-lg flex items-center justify-center mb-4">
                <CalendarCheck className="size-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium text-base">Gecmis Randevunuz Yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastAppointments.map((appointment) => (
                <div
                  key={appointment.appointment_uid}
                  className="rounded-lg border border-border bg-background p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{appointment.doctor_full_name}</p>
                    <p className="text-xs text-muted-foreground">{appointment.hospital_name} - {appointment.clinic_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(appointment.appointment_date)}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {mapStatus(appointment.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {errorText && (
        <div className="px-8 pb-4">
          <p className="text-sm text-destructive">{errorText}</p>
        </div>
      )}

      <div className="border-t border-border">
        <Button variant="ghost" className="w-full text-muted-foreground text-sm py-3 h-auto rounded-none">
          Tumunu Goster
        </Button>
      </div>
    </div>
  )
}
