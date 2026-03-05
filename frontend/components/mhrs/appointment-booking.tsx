"use client"

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Star, ChevronDown, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useSearchParams } from 'next/navigation'
import { createAppointment, getDoctorBusySlots } from '@/lib/mhrs-api'

interface TimeSlot {
  time: string
}

interface HourGroup {
  hour: string
  slots: TimeSlot[]
}

function buildHourGroups(): HourGroup[] {
  const groups = new Map<string, TimeSlot[]>()
  for (let hour = 9; hour <= 16; hour += 1) {
    const hourLabel = `${String(hour).padStart(2, '0')}:00`
    const slots: TimeSlot[] = [0, 15, 30, 45].map((minute) => ({
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    }))
    groups.set(hourLabel, slots)
  }
  return Array.from(groups.entries()).map(([hour, slots]) => ({ hour, slots }))
}

function parseIsoDate(dateValue: string | null): Date | null {
  if (!dateValue) {
    return null
  }
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }
  return new Date(year, month - 1, day)
}

function combineDateAndTime(selectedDate: Date, time: string): string {
  const datePart = format(selectedDate, 'yyyy-MM-dd')
  return `${datePart}T${time}:00`
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  selectedTime: string | null
  selectedDate: Date
  doctorName: string
  clinicName: string
  hospitalName: string
  submitLoading: boolean
  submitError: string
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  selectedTime,
  selectedDate,
  doctorName,
  clinicName,
  hospitalName,
  submitLoading,
  submitError,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative bg-card rounded-lg shadow-lg w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Randevu Onayla</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-3 pr-4 text-muted-foreground font-medium w-36 align-top">Randevu Zamani</td>
                <td className="py-3 font-bold text-foreground">
                  {format(selectedDate, 'dd/MM/yyyy')} {selectedTime}
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 pr-4 text-muted-foreground font-medium align-top">Hastane</td>
                <td className="py-3 text-foreground">
                  {hospitalName}
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 pr-4 text-muted-foreground font-medium">Poliklinik Adi</td>
                <td className="py-3 font-bold text-foreground">{clinicName}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 pr-4 text-muted-foreground font-medium">Hekim</td>
                <td className="py-3 text-foreground">{doctorName}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 pr-4 text-muted-foreground font-medium">Muayene Yeri</td>
                <td className="py-3 font-bold text-foreground">{clinicName}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 pr-4 text-muted-foreground font-medium align-top">Randevu Notu</td>
                <td className="py-3">
                  <input
                    type="text"
                    placeholder="Doktorunuza not ekleyebilirsiniz."
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-muted-foreground font-medium">Randevu Sahibi</td>
                <td className="py-3 text-foreground">CEM CEDIMOGLU</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-center p-4 border-t border-border">
          <Button
            onClick={() => void onConfirm()}
            disabled={submitLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          >
            {submitLoading ? 'Onaylanıyor...' : 'Randevu Onayla'}
          </Button>
        </div>

        {submitError && (
          <p className="px-4 pb-4 text-sm text-destructive">{submitError}</p>
        )}
      </div>
    </div>
  )
}

export function AppointmentBooking() {
  const searchParams = useSearchParams()
  const today = new Date()
  const currentYear = today.getFullYear()
  const startOfCurrentYear = new Date(currentYear, 0, 1)
  const endOfCurrentYear = new Date(currentYear, 11, 31)

  const doctorId = Number(searchParams.get('doctor_id') ?? '0')
  const doctorName = searchParams.get('doctor_name') ?? 'Doktor seçilmedi'
  const clinicName = searchParams.get('clinic_name') ?? 'Belirtilmedi'
  const hospitalName = searchParams.get('hospital_name') ?? 'Belirtilmedi'

  const urlStartDate = parseIsoDate(searchParams.get('start_date'))
  const initialDate = urlStartDate && urlStartDate >= startOfCurrentYear && urlStartDate <= endOfCurrentYear
    ? urlStartDate
    : today

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate)
  const [expandedHour, setExpandedHour] = useState<string | null>('15:00')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busySlots, setBusySlots] = useState<Set<string>>(new Set())
  const [busyLoading, setBusyLoading] = useState(false)
  const [busyError, setBusyError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const hourGroups = useMemo(() => buildHourGroups(), [])

  useEffect(() => {
    async function loadBusySlots() {
      if (!doctorId) {
        setBusySlots(new Set())
        setBusyError('Doktor bilgisi bulunamadı. Lütfen tekrar doktor seçiniz.')
        return
      }

      setBusyLoading(true)
      setBusyError('')
      try {
        const response = await getDoctorBusySlots({
          doctorId,
          date: format(selectedDate, 'yyyy-MM-dd'),
        })
        setBusySlots(new Set(response.busy_slots))
      } catch (error) {
        setBusySlots(new Set())
        setBusyError((error as Error).message)
      } finally {
        setBusyLoading(false)
      }
    }

    void loadBusySlots()
  }, [doctorId, selectedDate])

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

  function isSlotAvailable(time: string) {
    if (busySlots.has(time)) {
      return false
    }
    if (!isToday) {
      return true
    }
    const [hour, minute] = time.split(':').map(Number)
    const slotDate = new Date(selectedDate)
    slotDate.setHours(hour, minute, 0, 0)
    return slotDate > today
  }

  const handleSlotClick = (time: string, available: boolean) => {
    if (!available) return
    setSubmitError('')
    setSelectedSlot(time)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!doctorId || !selectedSlot) {
      setSubmitError('Doktor veya saat bilgisi eksik.')
      return
    }

    const accessToken = localStorage.getItem('mhrs_access_token')
    if (!accessToken) {
      setSubmitError('Randevu almak için tekrar giriş yapmalısınız.')
      return
    }

    setSubmitLoading(true)
    setSubmitError('')
    try {
      await createAppointment(
        {
          doctor_id: doctorId,
          appointment_date: combineDateAndTime(selectedDate, selectedSlot),
        },
        accessToken
      )
      setShowConfirm(false)
      setSelectedSlot(null)

      const refreshed = await getDoctorBusySlots({
        doctorId,
        date: format(selectedDate, 'yyyy-MM-dd'),
      })
      setBusySlots(new Set(refreshed.busy_slots))
    } catch (error) {
      setSubmitError((error as Error).message)
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link href="/hastane" className="text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <h1 className="text-xl font-bold text-foreground">Randevu Al</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-bold text-foreground">Hekim : {doctorName}</span>
          <Star className="size-5 text-yellow-500 fill-yellow-500" />
        </div>

        <div className="mb-4 rounded-lg border border-border bg-card w-fit">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={tr}
            fromMonth={startOfCurrentYear}
            toMonth={endOfCurrentYear}
            disabled={{ before: today, after: endOfCurrentYear }}
          />
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          Seçilen tarih: <span className="font-semibold text-foreground">{format(selectedDate, 'dd/MM/yyyy')}</span>
        </div>

        <div className="mb-6">
          <span className="inline-block bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
            Muayene Yeri : {clinicName}
          </span>
        </div>

        {busyLoading && <p className="text-sm text-muted-foreground mb-4">Dolu saatler yükleniyor...</p>}
        {busyError && <p className="text-sm text-destructive mb-4">{busyError}</p>}

        <div className="flex flex-col gap-2">
          {hourGroups.map((group) => (
            <div key={group.hour} className="border border-border rounded-lg overflow-hidden bg-card">
              <button
                onClick={() => setExpandedHour(expandedHour === group.hour ? null : group.hour)}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform',
                    expandedHour === group.hour ? 'rotate-0' : '-rotate-90'
                  )}
                />
                {group.hour}
              </button>

              {expandedHour === group.hour && (
                <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
                  {group.slots.map((slot) => {
                    const available = isSlotAvailable(slot.time)
                    return (
                      <button
                        key={slot.time}
                        onClick={() => handleSlotClick(slot.time, available)}
                        disabled={!available}
                        className={cn(
                          'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                          available
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        )}
                      >
                        {slot.time}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setSelectedDate(new Date(selectedDate))}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    aria-label="Yenile"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        selectedTime={selectedSlot}
        selectedDate={selectedDate}
        doctorName={doctorName}
        clinicName={clinicName}
        hospitalName={hospitalName}
        submitLoading={submitLoading}
        submitError={submitError}
      />
    </div>
  )
}
