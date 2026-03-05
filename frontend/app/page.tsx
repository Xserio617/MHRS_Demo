import { MHRSHeader } from '@/components/mhrs/header'
import { MHRSFooter } from '@/components/mhrs/footer'
import { AppointmentCards } from '@/components/mhrs/appointment-cards'
import { AppointmentsPanel } from '@/components/mhrs/appointments-panel'
import { NearestHospital } from '@/components/mhrs/nearest-hospital'
import { LoginHistory } from '@/components/mhrs/login-history'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MHRSHeader />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <AppointmentCards />
            </div>
            <div className="lg:col-span-2">
              <AppointmentsPanel />
            </div>
          </div>

          <NearestHospital />

          <LoginHistory />
        </div>
      </main>
      <MHRSFooter />
    </div>
  )
}
