import { Suspense } from 'react'
import { MHRSHeader } from '@/components/mhrs/header'
import { MHRSFooter } from '@/components/mhrs/footer'
import { StepperSidebar } from '@/components/mhrs/stepper-sidebar'
import { HospitalResults } from '@/components/mhrs/hospital-results'

const steps = [
  { number: 1, label: 'Randevu Ara', active: false, completed: true },
  { number: 2, label: 'Hastane', active: true, completed: false },
  { number: 3, label: 'Randevu Al', active: false, completed: false },
  { number: 4, label: 'Randevu Onayla', active: false, completed: false },
]

export default function HastanePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MHRSHeader />
      <div className="flex flex-1">
        <StepperSidebar steps={steps} duration={2} />
        <Suspense fallback={<div className="flex-1 p-6 text-sm text-muted-foreground">Yukleniyor...</div>}>
          <HospitalResults />
        </Suspense>
      </div>
      <MHRSFooter />
    </div>
  )
}
