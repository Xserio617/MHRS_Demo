export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8001/api/v1'

type BackendError = {
  error?: {
    message?: string
  }
  detail?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as BackendError | null
    const message = payload?.error?.message ?? payload?.detail ?? 'Istek basarisiz.'
    throw new Error(message)
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

export type Clinic = {
  id: number
  name: string
}

export type Hospital = {
  id: number
  name: string
  city: string
  district: string
  clinics: Clinic[]
}

export type SearchDoctorItem = {
  doctor_id: number
  full_name: string
  title: string
  clinics: string[]
  hospitals: string[]
  cities: string[]
}

export type SearchDoctorResponse = {
  query: string
  start_date?: string
  end_date?: string
  count: number
  items: SearchDoctorItem[]
}

export type LoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

export type RegisterPayload = {
  email: string
  password: string
  wants_doctor_role?: boolean
  preferred_hospital_id?: number
}

export type RegisterResponse = {
  uid: string
  email: string
  is_active: boolean
  is_email_verified: boolean
  is_doctor: boolean
  is_admin: boolean
  wants_doctor_role: boolean
  doctor_application_status: string
  preferred_hospital_id: number | null
}

export type AuthUser = {
  uid: string
  email: string
  is_active: boolean
  is_email_verified: boolean
  is_doctor: boolean
  is_admin: boolean
  wants_doctor_role: boolean
  doctor_application_status: string
  preferred_hospital_id: number | null
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export type UserListItem = AuthUser

export type DoctorMeProfile = {
  id: number
  first_name: string
  last_name: string
  title: string
}

export type CreateDoctorPayload = {
  user_uid: string
  clinic_ids: number[]
  first_name: string
  last_name: string
  title: string
  doctor_type: 'tam' | 'nobetci'
  shift_start: string
  shift_end: string
}

export type DoctorAdminItem = {
  id: number
  user_uid: string
  user_email: string
  first_name: string
  last_name: string
  title: string
  hospital_name: string
  clinic_id: number
  clinic_name: string
  doctor_type: 'tam' | 'nobetci'
  shift_start: string
  shift_end: string
}

export type UpdateDoctorPayload = {
  first_name: string
  last_name: string
  title: string
  clinic_id: number
  doctor_type: 'tam' | 'nobetci'
  shift_start: string
  shift_end: string
}

export type AppointmentCreatePayload = {
  doctor_id: number
  appointment_date: string
}

export type AppointmentItem = {
  uid: string
  doctor_id: number
  appointment_date: string
  status: string
}

export type AppointmentSearchItem = {
  appointment_uid: string
  patient_id: number
  doctor_id: number
  doctor_full_name: string
  hospital_name: string
  clinic_name: string
  appointment_date: string
  status: string
}

export type DoctorBusySlotsResponse = {
  doctor_id: number
  date: string
  busy_slots: string[]
}

export async function listHospitals(): Promise<Hospital[]> {
  return request<Hospital[]>('/hospitals/')
}

export async function searchDoctors(query: string): Promise<SearchDoctorResponse> {
  const encoded = encodeURIComponent(query)
  return request<SearchDoctorResponse>(`/search/doctors?q=${encoded}`)
}

export async function searchAvailableDoctors(params: {
  query: string
  startDate: string
  endDate: string
  hospitalId?: number
  clinic?: string
}): Promise<SearchDoctorResponse> {
  const queryParams = new URLSearchParams()
  queryParams.set('q', params.query)
  queryParams.set('start_date', params.startDate)
  queryParams.set('end_date', params.endDate)
  if (params.hospitalId) {
    queryParams.set('hospital_id', String(params.hospitalId))
  }
  if (params.clinic) {
    queryParams.set('clinic', params.clinic)
  }
  return request<SearchDoctorResponse>(`/search/available-doctors?${queryParams.toString()}`)
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams()
  body.set('username', email)
  body.set('password', password)

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as BackendError | null
    const message = payload?.error?.message ?? payload?.detail ?? 'Login basarisiz.'
    throw new Error(message)
  }

  return (await response.json()) as LoginResponse
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createAppointment(
  payload: AppointmentCreatePayload,
  accessToken: string
) {
  return request('/appointments/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function getDoctorAppointments(accessToken: string): Promise<AppointmentItem[]> {
  return request<AppointmentItem[]>('/appointments/doctor/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export async function getMyAppointmentsFromSearch(
  accessToken: string
): Promise<AppointmentSearchItem[]> {
  return request<AppointmentSearchItem[]>('/appointments/me/search', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export async function getDoctorBusySlots(params: {
  doctorId: number
  date: string
}): Promise<DoctorBusySlotsResponse> {
  const queryParams = new URLSearchParams()
  queryParams.set('date', params.date)
  return request<DoctorBusySlotsResponse>(
    `/appointments/doctor/${params.doctorId}/busy-slots?${queryParams.toString()}`
  )
}

export async function listUsers(): Promise<UserListItem[]> {
  return request<UserListItem[]>('/auth/users')
}

export async function getMe(accessToken: string): Promise<AuthUser> {
  return request<AuthUser>('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export async function getMyDoctorProfile(accessToken: string): Promise<DoctorMeProfile> {
  return request<DoctorMeProfile>('/doctors/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export async function createHospital(
  name: string,
  city: string,
  district: string,
  firstClinicName?: string
): Promise<Hospital> {
  const clinics = firstClinicName ? [{ name: firstClinicName }] : []
  return request<Hospital>('/hospitals/', {
    method: 'POST',
    body: JSON.stringify({ name, city, district, clinics }),
  })
}

export async function addClinic(hospitalId: number, name: string): Promise<Clinic> {
  return request<Clinic>(`/hospitals/${hospitalId}/clinics`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function createDoctor(payload: CreateDoctorPayload) {
  return request('/doctors/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listDoctorsForAdmin(): Promise<DoctorAdminItem[]> {
  return request<DoctorAdminItem[]>('/doctors/')
}

export async function updateDoctorForAdmin(doctorId: number, payload: UpdateDoctorPayload): Promise<DoctorAdminItem> {
  return request<DoctorAdminItem>(`/doctors/${doctorId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteDoctorForAdmin(doctorId: number): Promise<void> {
  return request<void>(`/doctors/${doctorId}`, {
    method: 'DELETE',
  })
}
