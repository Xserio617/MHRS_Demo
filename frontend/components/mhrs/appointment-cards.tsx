"use client"

import Link from 'next/link'
import { Stethoscope, Building2, HeartPulse } from 'lucide-react'

const cards = [
  {
    title: 'Aile Hekimi Randevusu Al',
    description: 'Bagli bulundugunuz Aile Hekiminizden randevu alabilirsiniz.',
    icon: Stethoscope,
    bgColor: 'bg-[#2b9e8f]',
    href: '/randevu-ara',
  },
  {
    title: 'Hastane Randevusu Al',
    description: 'Hastanede bulunan kliniklerden randevu alabilirsiniz.',
    icon: Building2,
    bgColor: 'bg-[#8b2332]',
    href: '/randevu-ara',
  },
  {
    title: 'Saglikli Hayat Merkezi Randevusu Al',
    description: 'Saglikli Hayat Merkezlerinde bulunan kliniklerden randevu alabilirsiniz.',
    icon: HeartPulse,
    bgColor: 'bg-[#3d2252]',
    href: '/randevu-ara',
  },
]

export function AppointmentCards() {
  return (
    <div className="flex flex-col gap-4">
      {cards.map((card) => (
        <Link
          key={card.title}
          href={card.href}
          className={`${card.bgColor} text-white rounded-lg p-6 flex items-center gap-4 hover:opacity-90 transition-opacity`}
        >
          <div className="size-12 flex items-center justify-center bg-white/20 rounded-full shrink-0">
            <card.icon className="size-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{card.title}</h3>
            <p className="text-sm text-white/80 mt-0.5">{card.description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
