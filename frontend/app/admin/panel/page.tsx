"use client"

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addClinic,
  createDoctor,
  createHospital,
  deleteDoctorForAdmin,
  listDoctorsForAdmin,
  listHospitals,
  searchDoctors,
  updateDoctorForAdmin,
  listUsers,
  type DoctorAdminItem,
  type Hospital,
  type SearchDoctorItem,
  type UserListItem,
} from '@/lib/mhrs-api'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCities, getDistrictsByCityCode } from 'turkey-neighbourhoods'

type Feedback = {
  type: 'success' | 'error'
  text: string
} | null

const CLINIC_OPTIONS = [
  'Aile Hekimligi',
  'Dahiliye',
  'Kardiyoloji',
  'Nöroloji',
  'Ortopedi ve Travmatoloji',
  'Göz Hastaliklari',
  'Kulak Burun Bogaz',
  'Cildiye',
  'Fizik Tedavi ve Rehabilitasyon',
  'Kadın Hastaliklari ve Dogum',
  'Çocuk Sagligi ve Hastaliklari',
  'Psikiyatri',
  'Üroloji',
  'Genel Cerrahi',
]

const SHIFT_PRESETS: Record<'tam' | 'nobetci', { start: string; end: string; label: string }> = {
  tam: { start: '08:30', end: '17:00', label: 'Tam Zamanlı (08:30-17:00)' },
  nobetci: { start: '16:00', end: '08:00', label: 'Nöbetçi (16:00-08:00)' },
}

export default function AdminPanelPage() {
  const router = useRouter()

  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [users, setUsers] = useState<UserListItem[]>([])
  const [doctors, setDoctors] = useState<DoctorAdminItem[]>([])

  const [hospitalName, setHospitalName] = useState('')
  const [hospitalCity, setHospitalCity] = useState('')
  const [hospitalCityCode, setHospitalCityCode] = useState('')
  const [hospitalDistrict, setHospitalDistrict] = useState('')
  const [firstClinicName, setFirstClinicName] = useState('')

  const [selectedHospitalId, setSelectedHospitalId] = useState('')
  const [newClinicName, setNewClinicName] = useState('')

  const [selectedUserUid, setSelectedUserUid] = useState('')
  const [doctorFirstName, setDoctorFirstName] = useState('')
  const [doctorLastName, setDoctorLastName] = useState('')
  const [doctorTitle, setDoctorTitle] = useState('Uzm. Dr.')
  const [doctorType, setDoctorType] = useState<'tam' | 'nobetci'>('tam')
  const [doctorShiftStart, setDoctorShiftStart] = useState(SHIFT_PRESETS.tam.start)
  const [doctorShiftEnd, setDoctorShiftEnd] = useState(SHIFT_PRESETS.tam.end)
  const [selectedDoctorHospitalId, setSelectedDoctorHospitalId] = useState('')
  const [selectedClinicId, setSelectedClinicId] = useState('')

  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null)
  const [editingFirstName, setEditingFirstName] = useState('')
  const [editingLastName, setEditingLastName] = useState('')
  const [editingTitle, setEditingTitle] = useState('')
  const [editingHospitalId, setEditingHospitalId] = useState('')
  const [editingClinicId, setEditingClinicId] = useState('')
  const [editingDoctorType, setEditingDoctorType] = useState<'tam' | 'nobetci'>('tam')
  const [editingShiftStart, setEditingShiftStart] = useState(SHIFT_PRESETS.tam.start)
  const [editingShiftEnd, setEditingShiftEnd] = useState(SHIFT_PRESETS.tam.end)

  const [feedback, setFeedback] = useState<Feedback>(null)
  const [loading, setLoading] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('')
  const [doctorSearchResults, setDoctorSearchResults] = useState<SearchDoctorItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const turkeyCities = useMemo(() => getCities(), [])

  const clinicOptions = useMemo(
    () => hospitals.flatMap((hospital) => hospital.clinics.map((clinic) => ({ ...clinic, hospitalName: hospital.name }))),
    [hospitals]
  )

  const selectedDoctorHospital = useMemo(
    () => hospitals.find((hospital) => String(hospital.id) === selectedDoctorHospitalId),
    [hospitals, selectedDoctorHospitalId]
  )

  const doctorHospitalClinicOptions = useMemo(() => {
    if (!selectedDoctorHospital) {
      return []
    }
    return selectedDoctorHospital.clinics
  }, [selectedDoctorHospital])

  const pendingDoctorCandidates = useMemo(
    () =>
      users.filter(
        (user) => !user.is_doctor && (user.doctor_application_status === 'pending' || user.wants_doctor_role)
      ),
    [users]
  )

  const districtOptions = useMemo(() => {
    if (!hospitalCityCode) {
      return []
    }
    return getDistrictsByCityCode(hospitalCityCode)
  }, [hospitalCityCode])

  const editingHospitalClinicOptions = useMemo(() => {
    if (!editingHospitalId) {
      return []
    }
    return hospitals.find((hospital) => String(hospital.id) === editingHospitalId)?.clinics ?? []
  }, [hospitals, editingHospitalId])

  async function refreshData() {
    try {
      const [hospitalData, userData, doctorData] = await Promise.all([listHospitals(), listUsers(), listDoctorsForAdmin()])
      setHospitals(hospitalData)
      setUsers(userData)
      setDoctors(doctorData)
    } catch (error) {
      setFeedback({
        type: 'error',
        text:
          (error as Error).message === 'Method Not Allowed'
            ? 'Backend doktor yönetim endpointleri güncel değil. Backend servislerini yeniden başlatın ve migration çalıştırın.'
            : (error as Error).message,
      })
      setDoctors([])
    }
  }

  useEffect(() => {
    const role = localStorage.getItem('mhrs_role')
    if (role !== 'admin') {
      router.replace('/admin')
      return
    }

    setAuthorized(true)
    void refreshData()
  }, [router])

  async function handleCreateHospital(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      await createHospital(hospitalName, hospitalCity, hospitalDistrict, firstClinicName || undefined)
      setHospitalName('')
      setHospitalCity('')
      setHospitalCityCode('')
      setHospitalDistrict('')
      setFirstClinicName('')
      await refreshData()
      setFeedback({ type: 'success', text: 'Hastane basariyla olusturuldu.' })
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddClinic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      await addClinic(Number(selectedHospitalId), newClinicName)
      setNewClinicName('')
      await refreshData()
      setFeedback({ type: 'success', text: 'Klinik basariyla eklendi.' })
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function handleAssignDoctor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    const assignedUserUid = selectedUserUid

    try {
      await createDoctor({
        user_uid: assignedUserUid,
        clinic_ids: [Number(selectedClinicId)],
        first_name: doctorFirstName,
        last_name: doctorLastName,
        title: doctorTitle,
        doctor_type: doctorType,
        shift_start: doctorShiftStart,
        shift_end: doctorShiftEnd,
      })

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === assignedUserUid
            ? {
                ...user,
                is_doctor: true,
                wants_doctor_role: false,
                doctor_application_status: 'approved',
              }
            : user
        )
      )

      setSelectedUserUid('')
      setDoctorFirstName('')
      setDoctorLastName('')
      setDoctorTitle('Uzm. Dr.')
      setDoctorType('tam')
      setDoctorShiftStart(SHIFT_PRESETS.tam.start)
      setDoctorShiftEnd(SHIFT_PRESETS.tam.end)
      setSelectedDoctorHospitalId('')
      setSelectedClinicId('')

      try {
        await refreshData()
      } catch {
        // no-op
      }

      setFeedback({ type: 'success', text: 'Kullanici doktor olarak atandi.' })
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  function handleDoctorTypeChange(nextType: 'tam' | 'nobetci') {
    setDoctorType(nextType)
    setDoctorShiftStart(SHIFT_PRESETS[nextType].start)
    setDoctorShiftEnd(SHIFT_PRESETS[nextType].end)
  }

  function startEditingDoctor(doctor: DoctorAdminItem) {
    const matchedHospital = hospitals.find((hospital) => hospital.name === doctor.hospital_name)
    setEditingDoctorId(doctor.id)
    setEditingFirstName(doctor.first_name)
    setEditingLastName(doctor.last_name)
    setEditingTitle(doctor.title)
    setEditingHospitalId(matchedHospital ? String(matchedHospital.id) : '')
    setEditingClinicId(String(doctor.clinic_id))
    setEditingDoctorType(doctor.doctor_type)
    setEditingShiftStart(doctor.shift_start)
    setEditingShiftEnd(doctor.shift_end)
  }

  function cancelEditingDoctor() {
    setEditingDoctorId(null)
    setEditingFirstName('')
    setEditingLastName('')
    setEditingTitle('')
    setEditingHospitalId('')
    setEditingClinicId('')
    setEditingDoctorType('tam')
    setEditingShiftStart(SHIFT_PRESETS.tam.start)
    setEditingShiftEnd(SHIFT_PRESETS.tam.end)
  }

  function handleEditingDoctorTypeChange(nextType: 'tam' | 'nobetci') {
    setEditingDoctorType(nextType)
    setEditingShiftStart(SHIFT_PRESETS[nextType].start)
    setEditingShiftEnd(SHIFT_PRESETS[nextType].end)
  }

  async function handleUpdateDoctor() {
    if (!editingDoctorId || !editingClinicId || !editingFirstName || !editingLastName || !editingTitle) {
      return
    }

    setLoading(true)
    setFeedback(null)
    try {
      await updateDoctorForAdmin(editingDoctorId, {
        first_name: editingFirstName,
        last_name: editingLastName,
        title: editingTitle,
        clinic_id: Number(editingClinicId),
        doctor_type: editingDoctorType,
        shift_start: editingShiftStart,
        shift_end: editingShiftEnd,
      })
      await refreshData()
      cancelEditingDoctor()
      setFeedback({ type: 'success', text: 'Doktor bilgileri güncellendi.' })
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDoctor(doctorId: number) {
    setLoading(true)
    setFeedback(null)
    try {
      await deleteDoctorForAdmin(doctorId)
      await refreshData()
      if (editingDoctorId === doctorId) {
        cancelEditingDoctor()
      }
      setFeedback({ type: 'success', text: 'Doktor kaydı kaldırıldı.' })
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDoctorSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearchLoading(true)
    setFeedback(null)

    try {
      const response = await searchDoctors(doctorSearchQuery.trim())
      setDoctorSearchResults(response.items)
    } catch (error) {
      setFeedback({ type: 'error', text: (error as Error).message })
    } finally {
      setSearchLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('mhrs_access_token')
    localStorage.removeItem('mhrs_refresh_token')
    localStorage.removeItem('mhrs_role')
    localStorage.removeItem('mhrs_email')
    router.push('/admin')
  }

  if (!authorized) {
    return <main className="min-h-screen bg-background p-6" />
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="border border-border rounded-xl bg-card p-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Sayfasi</h1>
            <p className="text-sm text-muted-foreground mt-2">Hastane, klinik ve doktor onay islemleri</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>Cikis Yap</Button>
        </section>

        {feedback && (
          <section className="border border-border rounded-xl bg-card p-5">
            <p className={`text-sm ${feedback.type === 'success' ? 'text-primary' : 'text-destructive'}`}>{feedback.text}</p>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="border border-border rounded-xl bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">1) Hastane Olustur</h2>
            <form onSubmit={handleCreateHospital} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Hastane Adi</label>
                <input
                  value={hospitalName}
                  onChange={(event) => setHospitalName(event.target.value)}
                  required
                  className="w-full border border-border rounded-md h-10 px-3 bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sehir</label>
                <Select
                  value={hospitalCityCode}
                  onValueChange={(value) => {
                    const selectedCity = turkeyCities.find((city) => city.code === value)
                    setHospitalCityCode(value)
                    setHospitalCity(selectedCity?.name ?? '')
                    setHospitalDistrict('')
                  }}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Sehir seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {turkeyCities.map((city) => (
                      <SelectItem key={city.code} value={city.code}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ilce</label>
                <Select value={hospitalDistrict} onValueChange={setHospitalDistrict}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Ilce seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {districtOptions.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ilk Klinik (Opsiyonel)</label>
                <Select value={firstClinicName || 'seciniz'} onValueChange={(value) => setFirstClinicName(value === 'seciniz' ? '' : value)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Klinik seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seciniz">Seciniz</SelectItem>
                    {CLINIC_OPTIONS.map((clinic) => (
                      <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading || !hospitalCity || !hospitalDistrict}>Kaydet</Button>
            </form>
          </section>

          <section className="border border-border rounded-xl bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">2) Kliniği Hastaneye Ekle</h2>
            <form onSubmit={handleAddClinic} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Hastane</label>
                <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Hastane seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={String(hospital.id)}>{hospital.name} ({hospital.city}/{hospital.district})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Yeni Klinik Adi</label>
                <Select value={newClinicName || 'seciniz'} onValueChange={(value) => setNewClinicName(value === 'seciniz' ? '' : value)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Klinik seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seciniz">Seciniz</SelectItem>
                    {CLINIC_OPTIONS.map((clinic) => (
                      <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading || !selectedHospitalId || !newClinicName}>Klinik Ekle</Button>
            </form>
          </section>

          <section className="border border-border rounded-xl bg-card p-5 xl:col-span-2">
            <h2 className="text-lg font-semibold mb-1">3) Bekleyen Havuzdan Doktor Onayla</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Kullaniciyi secin, doktor bilgilerini doldurun, hastane secin ve o hastanedeki bir klinik ile onaylayin.
            </p>
            <form onSubmit={handleAssignDoctor} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Kullanici</label>
                <Select
                  value={selectedUserUid}
                  onValueChange={(value) => {
                    setSelectedUserUid(value)
                    const selected = pendingDoctorCandidates.find((user) => user.uid === value)
                    if (selected?.preferred_hospital_id) {
                      setSelectedDoctorHospitalId(String(selected.preferred_hospital_id))
                      setSelectedClinicId('')
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Kullanici seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingDoctorCandidates.map((user) => (
                      <SelectItem key={user.uid} value={user.uid}>{user.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ad</label>
                <input
                  value={doctorFirstName}
                  onChange={(event) => setDoctorFirstName(event.target.value)}
                  required
                  className="w-full border border-border rounded-md h-10 px-3 bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Soyad</label>
                <input
                  value={doctorLastName}
                  onChange={(event) => setDoctorLastName(event.target.value)}
                  required
                  className="w-full border border-border rounded-md h-10 px-3 bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unvan</label>
                <input
                  value={doctorTitle}
                  onChange={(event) => setDoctorTitle(event.target.value)}
                  required
                  className="w-full border border-border rounded-md h-10 px-3 bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Doktor Türü</label>
                <Select value={doctorType} onValueChange={(value: 'tam' | 'nobetci') => handleDoctorTypeChange(value)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Tür seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tam">{SHIFT_PRESETS.tam.label}</SelectItem>
                    <SelectItem value="nobetci">{SHIFT_PRESETS.nobetci.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Hastane</label>
                <Select
                  value={selectedDoctorHospitalId}
                  onValueChange={(value) => {
                    setSelectedDoctorHospitalId(value)
                    setSelectedClinicId('')
                  }}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Hastane seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={String(hospital.id)}>{hospital.name} ({hospital.city}/{hospital.district})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Klinik</label>
                <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Klinik seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorHospitalClinicOptions.map((clinic) => (
                      <SelectItem key={clinic.id} value={String(clinic.id)}>{clinic.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mesai Başlangıç</label>
                <input
                  value={doctorShiftStart}
                  readOnly
                  className="w-full border border-border rounded-md h-10 px-3 bg-muted text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mesai Bitiş</label>
                <input
                  value={doctorShiftEnd}
                  readOnly
                  className="w-full border border-border rounded-md h-10 px-3 bg-muted text-foreground"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedUserUid ||
                    !selectedDoctorHospitalId ||
                    !selectedClinicId ||
                    !doctorFirstName ||
                    !doctorLastName ||
                    !doctorTitle
                  }
                >
                  Doktor Olarak Ata
                </Button>
              </div>
            </form>
          </section>

          <section className="border border-border rounded-xl bg-card p-5 xl:col-span-2">
            <h2 className="text-lg font-semibold mb-3">Bekleyen Doktor Adaylari Havuzu</h2>
            {pendingDoctorCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bekleyen aday bulunmuyor.</p>
            ) : (
              <ul className="space-y-2">
                {pendingDoctorCandidates.map((user) => (
                  <li key={user.uid} className="text-sm border border-border rounded-md px-3 py-2 bg-background">
                    {user.email}
                    {user.preferred_hospital_id ? (
                      <span className="text-muted-foreground"> - Tercih hastane ID: {user.preferred_hospital_id}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-border rounded-xl bg-card p-5 xl:col-span-2">
            <h2 className="text-lg font-semibold mb-3">4) Doktor Paneli (Yönetim)</h2>

            {doctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sistemde doktor kaydı bulunmuyor.</p>
            ) : (
              <div className="space-y-3">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="border border-border rounded-md p-3 bg-background">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{doctor.first_name} {doctor.last_name} ({doctor.title})</p>
                        <p className="text-sm text-muted-foreground">{doctor.user_email}</p>
                        <p className="text-sm text-muted-foreground">{doctor.hospital_name} / {doctor.clinic_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Tür: {doctor.doctor_type === 'tam' ? 'Tam' : 'Nöbetçi'} | Mesai: {doctor.shift_start} - {doctor.shift_end}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => startEditingDoctor(doctor)} disabled={loading}>
                          Düzenle
                        </Button>
                        <Button variant="destructive" onClick={() => void handleDeleteDoctor(doctor.id)} disabled={loading}>
                          Kaldır
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editingDoctorId ? (
              <div className="mt-5 border border-border rounded-md p-4 bg-card">
                <h3 className="text-base font-semibold mb-3">Doktor Düzenle (ID: {editingDoctorId})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ad</label>
                    <input
                      value={editingFirstName}
                      onChange={(event) => setEditingFirstName(event.target.value)}
                      className="w-full border border-border rounded-md h-10 px-3 bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Soyad</label>
                    <input
                      value={editingLastName}
                      onChange={(event) => setEditingLastName(event.target.value)}
                      className="w-full border border-border rounded-md h-10 px-3 bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unvan</label>
                    <input
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      className="w-full border border-border rounded-md h-10 px-3 bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hastane</label>
                    <Select
                      value={editingHospitalId}
                      onValueChange={(value) => {
                        setEditingHospitalId(value)
                        setEditingClinicId('')
                      }}
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Hastane seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {hospitals.map((hospital) => (
                          <SelectItem key={hospital.id} value={String(hospital.id)}>{hospital.name} ({hospital.city}/{hospital.district})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Klinik</label>
                    <Select value={editingClinicId} onValueChange={setEditingClinicId}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Klinik seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {editingHospitalClinicOptions.map((clinic) => (
                          <SelectItem key={clinic.id} value={String(clinic.id)}>{clinic.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Doktor Türü</label>
                    <Select value={editingDoctorType} onValueChange={(value: 'tam' | 'nobetci') => handleEditingDoctorTypeChange(value)}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Tür seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tam">{SHIFT_PRESETS.tam.label}</SelectItem>
                        <SelectItem value="nobetci">{SHIFT_PRESETS.nobetci.label}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mesai Başlangıç</label>
                    <input value={editingShiftStart} readOnly className="w-full border border-border rounded-md h-10 px-3 bg-muted text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mesai Bitiş</label>
                    <input value={editingShiftEnd} readOnly className="w-full border border-border rounded-md h-10 px-3 bg-muted text-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    onClick={() => void handleUpdateDoctor()}
                    disabled={loading || !editingFirstName || !editingLastName || !editingTitle || !editingClinicId}
                  >
                    Kaydet
                  </Button>
                  <Button variant="outline" onClick={cancelEditingDoctor} disabled={loading}>
                    İptal
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="border border-border rounded-xl bg-card p-5 xl:col-span-2">
            <h2 className="text-lg font-semibold mb-3">Bilgi Ozeti</h2>
            <p className="text-sm text-muted-foreground">Toplam hastane: {hospitals.length}</p>
            <p className="text-sm text-muted-foreground">Doktor yapilmayi bekleyen kullanici: {pendingDoctorCandidates.length}</p>
            <p className="text-sm text-muted-foreground">Toplam klinik: {clinicOptions.length}</p>
            <p className="text-sm text-muted-foreground">Toplam doktor: {doctors.length}</p>
          </section>

          <section className="border border-border rounded-xl bg-card p-5 xl:col-span-2">
            <h2 className="text-lg font-semibold mb-3">Elasticsearch ile Doktor Ara</h2>
            <form onSubmit={handleDoctorSearch} className="flex gap-3 items-end mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Arama Metni</label>
                <input
                  value={doctorSearchQuery}
                  onChange={(event) => setDoctorSearchQuery(event.target.value)}
                  required
                  className="w-full border border-border rounded-md h-10 px-3 bg-background"
                  placeholder="Doktor, klinik, hastane veya sehir"
                />
              </div>
              <Button type="submit" disabled={searchLoading || !doctorSearchQuery.trim()}>
                {searchLoading ? 'Araniyor...' : 'Ara'}
              </Button>
            </form>

            {doctorSearchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">Arama sonucu bulunmuyor.</p>
            ) : (
              <ul className="space-y-2">
                {doctorSearchResults.map((doctor) => (
                  <li key={doctor.doctor_id} className="text-sm border border-border rounded-md px-3 py-2 bg-background">
                    <p className="font-medium">{doctor.full_name} ({doctor.title})</p>
                    <p className="text-muted-foreground">Hastaneler: {doctor.hospitals.join(', ')}</p>
                    <p className="text-muted-foreground">Klinikler: {doctor.clinics.join(', ')}</p>
                    <p className="text-muted-foreground">Sehirler: {doctor.cities.join(', ')}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
