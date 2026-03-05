import { MHRSHeader } from '@/components/mhrs/header'
import { MHRSFooter } from '@/components/mhrs/footer'
import { StepperSidebar } from '@/components/mhrs/stepper-sidebar'
import { AppointmentSearchForm } from '@/components/mhrs/appointment-search-form'

const steps = [
  { number: 1, label: 'Randevu Ara', active: true, completed: false },
  { number: 2, label: 'Hastane', active: false, completed: false },
  { number: 3, label: 'Randevu Al', active: false, completed: false },
  { number: 4, label: 'Randevu Onayla', active: false, completed: false },
]

export default function RandevuAraPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MHRSHeader />
      <div className="flex flex-1">
        <StepperSidebar steps={steps} />
        <AppointmentSearchForm />
      </div>
      <MHRSFooter />
    </div>
  )
}
