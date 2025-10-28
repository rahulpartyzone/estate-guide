// Simple API helper with credentials and JSON handling
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';

// Restore persisted accessToken (if page reloaded) into sessionStorage
try {
  const persisted = localStorage.getItem('accessToken');
  if (persisted && !sessionStorage.getItem('accessToken')) {
    sessionStorage.setItem('accessToken', persisted);
  }
} catch (_) {}

export interface ApiError { status: number; message: string }

let refreshInFlight: Promise<boolean> | null = null;
async function ensureAccessTokenForAdmin() {
  if (sessionStorage.getItem('accessToken')) return;
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => { refreshInFlight = null; });
  }
  try { await refreshInFlight; } catch (_) {}
}

async function request<T>(path: string, options: RequestInit = {}, attempt = 0): Promise<T> {
  if (path.startsWith('/admin') && !sessionStorage.getItem('accessToken') && attempt === 0) {
    await ensureAccessTokenForAdmin();
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any || {}),
  };
  const token = sessionStorage.getItem('accessToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (res.status === 401 && attempt === 0) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, 1);
    }
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      msg = data.message || data.error || msg;
    } catch (_) {}
    throw { status: res.status, message: msg } as ApiError;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.accessToken) {
        sessionStorage.setItem('accessToken', data.accessToken);
        try { localStorage.setItem('accessToken', data.accessToken); } catch (_) {}
      }
      return true;
    }
  } catch (_) {}
  return false;
}

export const api = {
  // Force acquisition of an access token for admin flows
  ensureAdmin: ensureAccessTokenForAdmin,
  login(email: string, password: string) {
    return request<{ user: any; accessToken?: string; message: string }>(`/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) })
      .then(r => {
        if (r.accessToken) {
          sessionStorage.setItem('accessToken', r.accessToken);
          try { localStorage.setItem('accessToken', r.accessToken); } catch (_) {}
        } else {
          // Fallback: immediately attempt refresh to populate token if backend only set cookies
          refreshAccessToken();
        }
        return r;
      });
  },
  logout() { return request<void>('/auth/logout', { method: 'POST' }); },
  me() { return request<any>('/auth/me'); },

  // Testimonials
  listTestimonials(published?: boolean) {
    const q = published === undefined ? '' : `?published=${published}`;
    return request<any[]>(`/testimonials${q}`);
  },
  createTestimonial(payload: { name: string; role: string; company: string; content: string; rating: number; published?: boolean }) {
    return request<any>(`/admin/testimonials`, { method: 'POST', body: JSON.stringify(payload) });
  },
  updateTestimonial(id: string, payload: { name: string; role: string; company: string; content: string; rating: number; published?: boolean }) {
    return request<any>(`/admin/testimonials/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteTestimonial(id: string) {
    return request<void>(`/admin/testimonials/${id}`, { method: 'DELETE' });
  },
  publishTestimonial(id: string, published: boolean) {
    return request<any>(`/admin/testimonials/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) });
  },

  // Properties (public)
  listProperties(params: Record<string, any> = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
    });
    const qs = search.toString();
    return request<{ data: any[]; meta: any }>(`/properties${qs ? `?${qs}` : ''}`);
  },
  getProperty(id: string) {
    return request<any>(`/properties/${id}`);
  },
  listHotProperties(limit?: number) {
    const q = limit ? `?limit=${limit}` : '';
    return request<any[]>(`/properties/hot${q}`);
  },
  // Brochure OTP
  requestBrochureOtp(propertyId: string, payload: { phone?: string; email?: string }) {
    return request<void>(`/properties/${propertyId}/brochure/request-otp`, { method: 'POST', body: JSON.stringify(payload) });
  },
  verifyBrochureOtp(propertyId: string, payload: { otp: string; contact?: string }) {
    return request<{ downloadUrl: string }>(`/properties/${propertyId}/brochure/verify-otp`, { method: 'POST', body: JSON.stringify(payload) });
  },
  verifyBrochureWidget(propertyId: string, accessToken: string, opts?: { phone?: string; propertyName?: string }) {
    return request<{ downloadUrl: string }>(`/properties/${propertyId}/brochure/verify-widget`, { method: 'POST', body: JSON.stringify({ accessToken, ...(opts||{}) }) });
  },

  // Builders (public)
  listBuilders() {
    return request<any[]>(`/builders`);
  },
  getBuilder(id: string) {
    return request<any>(`/builders/${id}`);
  },

  // Admin Properties
  createProperty(dto: any) { return request<any>(`/admin/properties`, { method: 'POST', body: JSON.stringify(dto) }); },
  updateProperty(id: string, dto: any) { return request<any>(`/admin/properties/${id}`, { method: 'PUT', body: JSON.stringify(dto) }); },
  deleteProperty(id: string) { return request<void>(`/admin/properties/${id}`, { method: 'DELETE' }); },
  setPropertyHot(id: string, isHotProject: boolean) { return request<any>(`/admin/properties/${id}/hot`, { method: 'PATCH', body: JSON.stringify({ isHotProject }) }); },
  presignPropertyImage(id: string, contentType: string) { return request<any>(`/admin/properties/${id}/images/presign`, { method: 'POST', body: JSON.stringify({ contentType }) }); },
  presignPropertyBrochure(id: string, contentType: string) { return request<any>(`/admin/properties/${id}/brochure/presign`, { method: 'POST', body: JSON.stringify({ contentType }) }); },
  async uploadToSignedUrl(uploadUrl: string, file: File | Blob, contentType: string) {
    const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
    if (!res.ok) throw new Error('Upload failed');
  },
  async uploadFileDirect(file: File) {
    const form = new FormData();
    form.append('file', file);
    const token = sessionStorage.getItem('accessToken');
    const res = await fetch(`${API_BASE}/files`, { method: 'POST', body: form, credentials: 'include', headers: token? { Authorization: `Bearer ${token}` } : undefined });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  // Admin Builders
  createBuilder(dto: any) { return request<any>(`/admin/builders`, { method: 'POST', body: JSON.stringify(dto) }); },
  updateBuilder(id: string, dto: any) { return request<any>(`/admin/builders/${id}`, { method: 'PUT', body: JSON.stringify(dto) }); },
  deleteBuilder(id: string) { return request<void>(`/admin/builders/${id}`, { method: 'DELETE' }); },

  // Subscribers (public)
  subscribe(email: string, name?: string) { return request<any>(`/subscribers`, { method: 'POST', body: JSON.stringify({ email, name }) }); },
  unsubscribe(token: string) { return request<void>(`/subscribers/unsubscribe`, { method: 'POST', body: JSON.stringify({ token }) }); },
  // Admin Subscribers
  listSubscribers(params: { status?: string; page?: number; pageSize?: number } = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') search.append(k, String(v)); });
    const qs = search.toString();
    return request<{ data: any[]; meta: any }>(`/admin/subscribers${qs ? `?${qs}` : ''}`);
  },
  deleteSubscriber(id: string) { return request<void>(`/admin/subscribers/${id}`, { method: 'DELETE' }); },
  exportSubscribersCsv(): Promise<Blob> {
    return fetch(`${API_BASE}/admin/subscribers/export`, { credentials: 'include' }).then(async res => {
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      return blob;
    });
  },

  // Admin Leads
  listLeads(params: { type?: string; status?: string; page?: number; pageSize?: number } = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
    });
    const qs = search.toString();
    return request<{ data: any[]; meta: any }>(`/admin/leads${qs ? `?${qs}` : ''}`);
  },
  exportLeadsCsv(params: { type?: string; months?: number } = {}): Promise<Blob> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
    });
    return fetch(`${API_BASE}/admin/leads/export${search.size ? `?${search.toString()}` : ''}`, { credentials: 'include' }).then(async res => {
      if (!res.ok) throw new Error('Failed to export');
      return res.blob();
    });
  },

  // Amenities
  listAmenities() { return request<any[]>(`/amenities`); },
  listAmenitiesAdmin() { return request<any[]>(`/admin/amenities`); },
  createAmenity(dto: { name: string; code?: string; imageUrl?: string }) { return request<any>(`/admin/amenities`, { method: 'POST', body: JSON.stringify(dto) }); },
  updateAmenity(id: string, dto: { name?: string; code?: string; imageUrl?: string }) { return request<any>(`/admin/amenities/${id}`, { method: 'PUT', body: JSON.stringify(dto) }); },
  deleteAmenity(id: string) { return request<void>(`/admin/amenities/${id}`, { method: 'DELETE' }); },
};

// interface already exported above; no re-export needed
