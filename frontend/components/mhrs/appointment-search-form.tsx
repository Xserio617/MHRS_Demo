"use client"

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, RotateCcw, Star, Info, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { listHospitals, searchDoctors, type Hospital, type SearchDoctorItem } from '@/lib/mhrs-api'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'

function toInputDate(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}

function fromInputDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

export function AppointmentSearchForm() {
  const router = useRouter()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [doctors, setDoctors] = useState<SearchDoctorItem[]>([])

  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('fark-etmez')
  const [selectedClinic, setSelectedClinic] = useState('')
  const [selectedHospitalId, setSelectedHospitalId] = useState('fark-etmez')
  const [selectedExamPlace, setSelectedExamPlace] = useState('fark-etmez')
  const [selectedDoctorId, setSelectedDoctorId] = useState('fark-etmez')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [errorText, setErrorText] = useState('')

  const today = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()
  const startOfCurrentYear = useMemo(() => new Date(currentYear, 0, 1), [currentYear])
  const endOfCurrentYear = useMemo(() => new Date(currentYear, 11, 31), [currentYear])

  useEffect(() => {
    async function loadHospitals() {
      try {
        const data = await listHospitals()
        setHospitals(data)
      } catch (error) {
        setErrorText((error as Error).message)
      }
    }
    void loadHospitals()
  }, [])

  useEffect(() => {
    async function loadDoctors() {
      try {
        const query = selectedClinic || selectedCity || 'doktor'
        const response = await searchDoctors(query)
        setDoctors(response.items)
      } catch {
        setDoctors([])
      }
    }
    void loadDoctors()
  }, [selectedClinic, selectedCity])

  const cityOptions = useMemo(
    () => Array.from(new Set(hospitals.map((hospital) => hospital.city))).sort((left, right) => left.localeCompare(right, 'tr')),
    [hospitals]
  )

  const hospitalsByCity = useMemo(() => {
    if (!selectedCity) {
      return hospitals
    }
    return hospitals.filter((hospital) => hospital.city === selectedCity)
  }, [hospitals, selectedCity])

  const districtOptions = useMemo(() => {
    return Array.from(new Set(hospitalsByCity.map((hospital) => hospital.district))).sort((left, right) => left.localeCompare(right, 'tr'))
  }, [hospitalsByCity])

  const filteredHospitals = useMemo(() => {
    return hospitalsByCity.filter((hospital) => {
      if (selectedDistrict !== 'fark-etmez' && hospital.district !== selectedDistrict) {
        return false
      }
      if (selectedClinic && !hospital.clinics.some((clinic) => clinic.name === selectedClinic)) {
        return false
      }
      return true
    })
  }, [hospitalsByCity, selectedDistrict, selectedClinic])

  const clinicOptions = useMemo(() => {
    const names = filteredHospitals.flatMap((hospital) => hospital.clinics.map((clinic) => clinic.name))
    return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right, 'tr'))
  }, [filteredHospitals])

  const doctorOptions = useMemo(() => {
    return doctors.filter((doctor) => {
      if (selectedClinic && !doctor.clinics.includes(selectedClinic)) {
        return false
      }
      if (selectedCity && !doctor.cities.includes(selectedCity)) {
        return false
      }
      if (selectedHospitalId !== 'fark-etmez') {
        const hospital = hospitals.find((item) => String(item.id) === selectedHospitalId)
        if (hospital && !doctor.hospitals.includes(hospital.name)) {
          return false
        }
      }
      return true
    })
  }, [doctors, selectedClinic, selectedCity, selectedHospitalId, hospitals])

  function handleSearch() {
    setErrorText('')
    if (!selectedClinic) {
      setErrorText('Lutfen klinik seciniz.')
      return
    }
    if (!startDate || !endDate) {
      setErrorText('Lutfen baslangic ve bitis tarihini seciniz.')
      return
    }
    if (startDate > endDate) {
      setErrorText('Baslangic tarihi bitis tarihinden buyuk olamaz.')
      return
    }

    const queryParams = new URLSearchParams()
    queryParams.set('city', selectedCity || 'fark-etmez')
    queryParams.set('district', selectedDistrict)
    queryParams.set('clinic', selectedClinic)
  queryParams.set('hospital_id', selectedHospitalId)
  queryParams.set('exam_place', selectedExamPlace)
  queryParams.set('doctor_id', selectedDoctorId)
    queryParams.set('start_date', startDate)
    queryParams.set('end_date', endDate)

    router.push(`/hastane?${queryParams.toString()}`)
  }

  function handleClear() {
    setSelectedCity('')
    setSelectedDistrict('fark-etmez')
    setSelectedClinic('')
    setSelectedHospitalId('fark-etmez')
    setSelectedExamPlace('fark-etmez')
    setSelectedDoctorId('fark-etmez')
    setStartDate('')
    setEndDate('')
    setStartDateOpen(false)
    setEndDateOpen(false)
    setErrorText('')
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-5xl">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/" className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">Randevu Ara</h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <span className="text-destructive">*</span>
            <span className="text-sm font-bold text-foreground">Il :</span>
          </div>
          <span className="text-sm text-destructive">* Zorunlu Alan</span>
        </div>

        <div className="flex flex-col gap-5">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-full h-10 bg-card">
              <SelectValue placeholder="Il Seciniz" />
            </SelectTrigger>
            <SelectContent>
              {cityOptions.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Ilce :</label>
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger className="w-full h-10 bg-card">
                <SelectValue placeholder="-FARK ETMEZ-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fark-etmez">-FARK ETMEZ-</SelectItem>
                {districtOptions.map((district) => (
                  <SelectItem key={district} value={district}>{district}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-destructive">*</span>
              <span className="text-sm font-bold text-foreground">Klinik :</span>
            </div>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-full h-10 bg-card">
                <SelectValue placeholder="Klinik Seciniz" />
              </SelectTrigger>
              <SelectContent>
                {clinicOptions.map((clinic) => (
                  <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Hastane :</label>
            <div className="relative">
              <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                <SelectTrigger className="w-full h-10 bg-card pl-9">
                  <SelectValue placeholder="-FARK ETMEZ-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fark-etmez">-FARK ETMEZ-</SelectItem>
                  {filteredHospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={String(hospital.id)}>
                      {hospital.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10">
                <Info className="size-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Muayene Yeri :</label>
            <Select value={selectedExamPlace} onValueChange={setSelectedExamPlace}>
              <SelectTrigger className="w-full h-10 bg-card">
                <SelectValue placeholder="-FARK ETMEZ-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fark-etmez">-FARK ETMEZ-</SelectItem>
                {clinicOptions.map((clinic) => (
                  <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Hekim :</label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-full h-10 bg-card">
                <SelectValue placeholder="-FARK ETMEZ-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fark-etmez">-FARK ETMEZ-</SelectItem>
                {doctorOptions.map((doctor) => (
                  <SelectItem key={doctor.doctor_id} value={String(doctor.doctor_id)}>
                    {doctor.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setStartDateOpen((prev) => !prev)
                  setEndDateOpen(false)
                }}
                className="w-full h-10 border border-border rounded-md px-3 text-left text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center justify-between"
              >
                <span>{startDate ? format(fromInputDate(startDate), 'dd/MM/yyyy') : 'Başlangıç tarihi seçiniz'}</span>
                <CalendarDays className="size-4 text-muted-foreground" />
              </button>

              {startDateOpen && (
                <div className="absolute z-20 mt-2 rounded-lg border border-border bg-card shadow-md">
                  <Calendar
                    mode="single"
                    selected={startDate ? fromInputDate(startDate) : undefined}
                    onSelect={(date) => {
                      if (!date) {
                        return
                      }
                      const nextDate = toInputDate(date)
                      setStartDate(nextDate)
                      if (endDate && nextDate > endDate) {
                        setEndDate(nextDate)
                      }
                      setStartDateOpen(false)
                    }}
                    fromMonth={startOfCurrentYear}
                    toMonth={endOfCurrentYear}
                    disabled={{ before: today, after: endOfCurrentYear }}
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setEndDateOpen((prev) => !prev)
                  setStartDateOpen(false)
                }}
                className="w-full h-10 border border-border rounded-md px-3 text-left text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center justify-between"
              >
                <span>{endDate ? format(fromInputDate(endDate), 'dd/MM/yyyy') : 'Bitiş tarihi seçiniz'}</span>
                <CalendarDays className="size-4 text-muted-foreground" />
              </button>

              {endDateOpen && (
                <div className="absolute z-20 mt-2 rounded-lg border border-border bg-card shadow-md">
                  <Calendar
                    mode="single"
                    selected={endDate ? fromInputDate(endDate) : undefined}
                    onSelect={(date) => {
                      if (!date) {
                        return
                      }
                      setEndDate(toInputDate(date))
                      setEndDateOpen(false)
                    }}
                    fromMonth={startOfCurrentYear}
                    toMonth={endOfCurrentYear}
                    disabled={{ before: startDate ? fromInputDate(startDate) : today, after: endOfCurrentYear }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            <Button
              variant="outline"
              className="h-10 border-primary text-primary hover:bg-primary/5 gap-2"
              onClick={handleSearch}
            >
              <Search className="size-4" />
              Randevu Ara
            </Button>
            <Button
              className="h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              onClick={handleClear}
            >
              <RotateCcw className="size-4" />
              Temizle
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2"
            >
              <Star className="size-4" />
              Favorilere Ekle
            </Button>
          </div>

          {errorText && <p className="text-sm text-destructive">{errorText}</p>}
        </div>
      </div>
    </div>
  )
}
