"use client"

import { useEffect, useState } from 'react'
import { Search, Settings, ChevronDown, User } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type SessionState = {
  authenticated: boolean
  role: string
  email: string
  doctorName: string
}

export function MHRSHeader() {
  const router = useRouter()
  const [session, setSession] = useState<SessionState>({
    authenticated: false,
    role: '',
    email: '',
    doctorName: '',
  })

  useEffect(() => {
    const accessToken = localStorage.getItem('mhrs_access_token')
    const role = localStorage.getItem('mhrs_role') ?? ''
    const email = localStorage.getItem('mhrs_email') ?? ''
    const doctorName = localStorage.getItem('mhrs_doctor_name') ?? ''

    setSession({
      authenticated: Boolean(accessToken),
      role,
      email,
      doctorName,
    })
  }, [])

  function getAccountLabel() {
    if (session.role === 'doctor' && session.doctorName) {
      return session.doctorName.toUpperCase()
    }
    if (session.email) {
      return session.email.toUpperCase()
    }
    return 'HESABIM'
  }

  function getAccountHref() {
    if (session.role === 'doctor') return '/doctor'
    if (session.role === 'admin') return '/admin/panel'
    return '/'
  }

  function handleLogout() {
    localStorage.removeItem('mhrs_access_token')
    localStorage.removeItem('mhrs_refresh_token')
    localStorage.removeItem('mhrs_role')
    localStorage.removeItem('mhrs_email')
    localStorage.removeItem('mhrs_doctor_name')

    setSession({
      authenticated: false,
      role: '',
      email: '',
      doctorName: '',
    })
    router.push('/')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between bg-card border-b border-border px-4 py-2">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/mhrs-brand.svg" alt="Merkezi Hekim Randevu Sistemi" width={320} height={95} className="h-14 w-auto" priority />
        </Link>
      </div>

      <div className="flex-1 max-w-xl mx-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Randevu aradiginiz hastane, klinik veya hekim bilgisini yaziniz."
            className="w-full border border-border rounded-md py-2 px-4 pr-10 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Erisilebilirlik">
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
            <circle cx="12" cy="4" r="2" />
            <path d="M12 7c-3.5 0-6 1-6 1v2s2.5-.5 5-.5v3l-3 7h2l2-5 2 5h2l-3-7v-3c2.5 0 5 .5 5 .5V8s-2.5-1-6-1z" />
          </svg>
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Ayarlar">
          <Settings className="size-5" />
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg viewBox="0 0 30 20" className="w-6 h-4 rounded-sm overflow-hidden">
            <rect width="30" height="20" fill="#c8102e" />
            <circle cx="13" cy="10" r="6" fill="white" />
            <circle cx="15" cy="10" r="5" fill="#c8102e" />
            <polygon points="16.5,7.5 17.5,10 16.5,12.5 18,11 15,11" fill="white" transform="translate(0.5,0)" />
          </svg>
          <span>Turkce</span>
          <ChevronDown className="size-3" />
        </button>

        {session.authenticated ? (
          <>
            <Link
              href={getAccountHref()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <User className="size-4" />
              <span>{getAccountLabel()}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              Cikis
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/auth?tab=login"
              className="px-3 py-2 rounded-md text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              Giris
            </Link>
            <Link
              href="/auth?tab=register"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <User className="size-4" />
              <span>Kayit Ol</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
