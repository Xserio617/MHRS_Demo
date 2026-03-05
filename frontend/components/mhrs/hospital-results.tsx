"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Star, ChevronLeft, ChevronRight, SlidersHorizontal, Building2, Link2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { searchAvailableDoctors, type SearchDoctorItem } from '@/lib/mhrs-api'
import Link from 'next/link'

function formatDateDdMmYy(value: string): string {
  if (!value) {
    return ''
  }
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year.slice(-2)}`
}

export function HospitalResults() {
  const searchParams = useSearchParams()
  const [results, setResults] = useState<SearchDoctorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const clinic = searchParams.get('clinic') ?? ''
  const startDate = searchParams.get('start_date') ?? ''
  const endDate = searchParams.get('end_date') ?? ''
  const hospitalId = searchParams.get('hospital_id') ?? 'fark-etmez'
  const doctorId = searchParams.get('doctor_id') ?? 'fark-etmez'
  const query = clinic || 'doktor'

  useEffect(() => {
    async function loadResults() {
      if (!startDate || !endDate) {
        setErrorText('Tarih araligi secimi bulunamadi. Lutfen tekrar randevu ara ekranindan seciniz.')
        return
      }

      setLoading(true)
      setErrorText('')
      try {
        const response = await searchAvailableDoctors({
          query,
          clinic,
          startDate,
          endDate,
          hospitalId: hospitalId !== 'fark-etmez' ? Number(hospitalId) : undefined,
        })
        const filteredItems = doctorId === 'fark-etmez'
          ? response.items
          : response.items.filter((item) => String(item.doctor_id) === doctorId)
        setResults(filteredItems)
      } catch (error) {
        setErrorText((error as Error).message)
      } finally {
        setLoading(false)
      }
    }

    void loadResults()
  }, [query, clinic, startDate, endDate, hospitalId, doctorId])

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/randevu-ara" className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">Hastane</h1>
        </div>

        <Tabs defaultValue="hastane">
          <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="hastane"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm font-medium"
            >
              Hastane
            </TabsTrigger>
            <TabsTrigger
              value="semt"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm font-medium"
            >
              Semt Poliklinigi / Ek Bina
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hastane" className="mt-4">
            <div className="mb-4">
              <Button variant="outline" className="gap-2 text-sm h-9">
                Arama Filtreleme
                <SlidersHorizontal className="size-4" />
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Uygun doktorlar aranıyor...</div>
              ) : results.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Bu tarih aralığında uygun doktor bulunamadı.</div>
              ) : (
                results.map((doctor, index) => {
                  const bookingQuery = new URLSearchParams({
                    doctor_id: String(doctor.doctor_id),
                    doctor_name: doctor.full_name,
                    clinic_name: doctor.clinics.join(', ') || 'Belirtilmedi',
                    hospital_name: doctor.hospitals.join(', ') || 'Belirtilmedi',
                    start_date: startDate,
                    end_date: endDate,
                  }).toString()

                  return (
                    <Link
                      key={`${doctor.doctor_id}-${index}`}
                      href={`/randevu-al?${bookingQuery}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                    >
                      <button
                        className="shrink-0 text-muted-foreground hover:text-yellow-500 transition-colors"
                        aria-label="Favorilere ekle"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Star className="size-6" />
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <svg viewBox="0 0 24 24" className="size-5 text-destructive" fill="currentColor">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M12 14c-6 0-8 3-8 3v1h16v-1s-2-3-8-3z" />
                        </svg>
                        <span className="text-sm font-medium text-foreground">{doctor.full_name}</span>
                      </div>

                      <div className="bg-[#e8f4fd] rounded-md px-4 py-2 shrink-0 border-l-4 border-primary">
                        <p className="text-xs font-bold text-foreground">En Erken Tarih</p>
                        <p className="text-sm text-primary font-medium">
                          {formatDateDdMmYy(startDate)} - {formatDateDdMmYy(endDate)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Info className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{doctor.hospitals.join(', ') || 'Belirtilmedi'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Building2 className="size-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{doctor.clinics.join(', ') || 'Belirtilmedi'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link2 className="size-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{doctor.title}</span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>

            {errorText && <p className="text-sm text-destructive mt-3">{errorText}</p>}

            <div className="flex items-center justify-end gap-1 mt-4">
              <Button variant="ghost" size="icon" className="size-8" disabled>
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-primary text-primary"
              >
                1
              </Button>
              <Button variant="ghost" size="icon" className="size-8" disabled>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="semt" className="mt-4">
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Veri Yok
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
