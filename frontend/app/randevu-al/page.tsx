import { MHRSHeader } from '@/components/mhrs/header'
import { MHRSFooter } from '@/components/mhrs/footer'
import { StepperSidebar } from '@/components/mhrs/stepper-sidebar'
import { AppointmentBooking } from '@/components/mhrs/appointment-booking'
import { Suspense } from 'react'

const steps = [
  { number: 1, label: 'Randevu Ara', active: false, completed: true },
  { number: 2, label: 'Hastane', active: false, completed: true },
  { number: 3, label: 'Randevu Al', active: true, completed: false },
  { number: 4, label: 'Randevu Onayla', active: false, completed: false },
]

export default function RandevuAlPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MHRSHeader />
      <div className="flex flex-1">
        <StepperSidebar steps={steps} duration={1} />
        <Suspense fallback={<div className="flex-1 p-6 text-sm text-muted-foreground">Randevu ekranı yükleniyor...</div>}>
          <AppointmentBooking />
        </Suspense>
      </div>
      <MHRSFooter />
    </div>
  )
}
