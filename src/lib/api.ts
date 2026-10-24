// Simple API helper with credentials and JSON handling
import { getAttribution } from './attribution';
import { trackLead } from './analytics';

// Lead endpoints send where the visitor came from, and report a conversion once the lead is saved.
const withAttribution = <T extends object>(payload: T) => ({ ...payload, attribution: getAttribution() });
const tracked = <R>(leadType: string, promise: Promise<R>) =>
  promise.then((result) => {
    trackLead(leadType);
    return result;
  });
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080/api/v1';
let siteProfileCache: { at: number; promise: Promise<any> } | null = null;

// Restore persisted accessToken (if page reloaded) into sessionStorage
try {
  const persisted = localStorage.getItem('accessToken');
  if (persisted && !sessionStorage.getItem('accessToken')) {
    sessionStorage.setItem('accessToken', persisted);
  }
} catch (_) {}

export interface ApiError { status: number; message: string }

export interface Buyer { id: string; phone: string; name: string | null; email: string | null }

export interface NewsletterInput {
  subject: string;
  previewText?: string;
  body?: string;
  propertyIds?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}
export interface Newsletter {
  id: string;
  subject: string;
  previewText?: string | null;
  body: string;
  propertyIds: string[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  status: 'draft' | 'sending' | 'sent';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  startedAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface NewsletterProgress {
  id: string;
  status: Newsletter['status'];
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  remaining: number;
  rateLimited?: boolean;
  lastError?: string;
}

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
  acceptInvite(payload: { token: string; password: string; name?: string }) {
    return request<{ user: any; accessToken?: string; message: string }>(`/auth/accept-invite`, { method: 'POST', body: JSON.stringify(payload) })
      .then((r) => {
        if (r.accessToken) {
          sessionStorage.setItem('accessToken', r.accessToken);
          try { localStorage.setItem('accessToken', r.accessToken); } catch (_) {}
        }
        return r;
      });
  },
  changePassword(payload: { currentPassword: string; newPassword: string; confirmNewPassword: string }) {
    return request<{ message: string }>(`/auth/change-password`, { method: 'POST', body: JSON.stringify(payload) });
  },

  // Testimonials
  // Saved projects (anonymous; see lib/saved.ts)
  getWishlist(anonId: string) {
    return request<{ propertyIds: string[] }>(`/wishlist`, { headers: { 'X-Anon-Id': anonId } });
  },
  addToWishlist(anonId: string, propertyId: string) {
    return request<{ ok: boolean }>(`/wishlist`, { method: 'POST', body: JSON.stringify({ propertyId }), headers: { 'X-Anon-Id': anonId } });
  },
  removeFromWishlist(anonId: string, propertyId: string) {
    return request<void>(`/wishlist/${propertyId}`, { method: 'DELETE', headers: { 'X-Anon-Id': anonId } });
  },

  // Buyer accounts (phone OTP sign-in; the session is an httpOnly cookie)
  buyerMe() { return request<{ buyer: Buyer | null }>(`/buyer/me`); },
  buyerWidgetLogin(anonId: string, payload: { accessToken: string; phone: string; name?: string }) {
    return request<{ buyer: Buyer; merged: number }>(`/buyer/auth/widget`, { method: 'POST', body: JSON.stringify(payload), headers: { 'X-Anon-Id': anonId } });
  },
  buyerUpdate(payload: { name?: string; email?: string }) {
    return request<{ buyer: Buyer }>(`/buyer/me`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  buyerLogout() { return request<void>(`/buyer/logout`, { method: 'POST' }); },

  // Public: published testimonials only
  listTestimonials() {
    return request<any[]>(`/testimonials`);
  },
  // Admin: all testimonials, drafts included
  listTestimonialsAdmin() {
    return request<any[]>(`/admin/testimonials`);
  },
  createTestimonial(payload: { name: string; role: string; company: string; content: string; rating: number; published?: boolean; photoUrl?: string | null; attachmentUrl?: string | null; attachmentMimeType?: string | null }) {
    return request<any>(`/admin/testimonials`, { method: 'POST', body: JSON.stringify(payload) });
  },
  updateTestimonial(id: string, payload: { name: string; role: string; company: string; content: string; rating: number; published?: boolean; photoUrl?: string | null; attachmentUrl?: string | null; attachmentMimeType?: string | null }) {
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
    return tracked('brochure', request<{ downloadUrl: string }>(`/properties/${propertyId}/brochure/verify-otp`, { method: 'POST', body: JSON.stringify(withAttribution(payload)) }));
  },
  verifyBrochureWidget(propertyId: string, accessToken: string, opts?: { phone?: string; propertyName?: string }) {
    return tracked('brochure', request<{ downloadUrl: string }>(`/properties/${propertyId}/brochure/verify-widget`, { method: 'POST', body: JSON.stringify(withAttribution({ accessToken, ...(opts||{}) })) }));
  },
  verifyBrochureExternalOtp(propertyId: string, payload: { contact: string; otp: string }) {
    return tracked('brochure', request<{ downloadUrl: string }>(`/properties/${propertyId}/brochure/verify-external-otp`, { method: 'POST', body: JSON.stringify(withAttribution(payload)) }));
  },
  createPreferenceLead(payload: {
    preferredPropertyType: string;
    preferredBudgetRange: string;
    preferredLocation: string;
    name: string;
    email?: string;
    phone: string;
    homeLoanAssistance?: 'yes' | 'no';
    sourcePage?: string;
  }) {
    return tracked('preference', request<any>(`/leads/preference`, { method: 'POST', body: JSON.stringify(withAttribution(payload)) }));
  },
  createSiteVisitLead(propertyId: string, payload: { name: string; phone: string; email?: string; message?: string; preferredDate?: string }) {
    return tracked('site_visit', request<any>(`/properties/${propertyId}/leads/site-visit`, { method: 'POST', body: JSON.stringify(withAttribution(payload)) }));
  },
  createInfoLead(propertyId: string, payload: { name: string; phone: string; email?: string; message?: string }) {
    return tracked('info', request<any>(`/properties/${propertyId}/leads/info`, { method: 'POST', body: JSON.stringify(withAttribution(payload)) }));
  },

  // Builders (public)
  listBuilders() {
    return request<any[]>(`/builders`);
  },
  getBuilder(id: string) {
    return request<any>(`/builders/${id}`);
  },

  // Site profile (public)
  /** Shared by the header, footer and pages, so it's fetched once a minute at most (always fresh in the admin). */
  getSiteProfile() {
    const inAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    if (inAdmin || !siteProfileCache || Date.now() - siteProfileCache.at > 60_000) {
      const promise = request<any>(`/site-profile`);
      if (inAdmin) return promise;
      siteProfileCache = { at: Date.now(), promise };
      promise.catch(() => { siteProfileCache = null; });
    }
    return siteProfileCache.promise;
  },

  // News (public)
  listNews() {
    return request<any[]>(`/news`);
  },
  getNewsBySlug(slug: string) {
    return request<any>(`/news/${slug}`);
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
  // Uploads a file and returns { id, url, filename, mimeType, size }.
  // With object storage (R2) configured, the browser sends the file straight to the bucket using a
  // presigned URL, so large images and brochures avoid Vercel's 4.5 MB request limit. Without it
  // (local dev), the API answers 501 and the file goes through the API as a multipart upload.
  async uploadFileDirect(file: File) {
    const mimeType = file.type || 'application/octet-stream';
    let target: { key: string; uploadUrl: string; headers?: Record<string, string> } | null = null;
    try {
      target = await request<any>(`/files/upload-url`, { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType, size: file.size }) });
    } catch (e: any) {
      if (e?.status !== 501) throw new Error(e?.message || 'Upload failed');
    }
    if (target) {
      const put = await fetch(target.uploadUrl, { method: 'PUT', body: file, headers: target.headers || { 'Content-Type': mimeType } });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      return request<any>(`/files/complete`, { method: 'POST', body: JSON.stringify({ key: target.key, filename: file.name, mimeType }) });
    }
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

  // Admin site profile + executives
  getAdminSiteProfile() { return request<any>(`/admin/site-profile`); },
  upsertAdminSiteProfile(dto: any) { return request<any>(`/admin/site-profile`, { method: 'PUT', body: JSON.stringify(dto) }); },
  createExecutive(dto: any) { return request<any>(`/admin/site-profile/executives`, { method: 'POST', body: JSON.stringify(dto) }); },
  updateExecutive(id: string, dto: any) { return request<any>(`/admin/site-profile/executives/${id}`, { method: 'PUT', body: JSON.stringify(dto) }); },
  deleteExecutive(id: string) { return request<void>(`/admin/site-profile/executives/${id}`, { method: 'DELETE' }); },

  // Admin News
  listNewsAdmin() { return request<any[]>(`/admin/news`); },
  createNews(dto: any) { return request<any>(`/admin/news`, { method: 'POST', body: JSON.stringify(dto) }); },
  updateNews(id: string, dto: any) { return request<any>(`/admin/news/${id}`, { method: 'PUT', body: JSON.stringify(dto) }); },
  deleteNews(id: string) { return request<void>(`/admin/news/${id}`, { method: 'DELETE' }); },
  publishNews(id: string, published: boolean) { return request<any>(`/admin/news/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) }); },

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

  // Admin Newsletters
  listNewsletters() {
    return request<{ data: Newsletter[]; activeSubscribers: number; mailConfigured: boolean; siteUrl: string }>(`/admin/newsletters`);
  },
  listNewsletterProjects() {
    return request<{ id: string; name: string; area: string; city: string; mainImageUrl?: string }[]>(`/admin/newsletters/projects`);
  },
  getNewsletter(id: string) { return request<Newsletter>(`/admin/newsletters/${id}`); },
  createNewsletter(body: NewsletterInput) { return request<Newsletter>(`/admin/newsletters`, { method: 'POST', body: JSON.stringify(body) }); },
  updateNewsletter(id: string, body: NewsletterInput) { return request<Newsletter>(`/admin/newsletters/${id}`, { method: 'PUT', body: JSON.stringify(body) }); },
  deleteNewsletter(id: string) { return request<void>(`/admin/newsletters/${id}`, { method: 'DELETE' }); },
  duplicateNewsletter(id: string) { return request<Newsletter>(`/admin/newsletters/${id}/duplicate`, { method: 'POST' }); },
  previewNewsletter(body: NewsletterInput) {
    return request<{ html: string; siteUrl: string }>(`/admin/newsletters/preview`, { method: 'POST', body: JSON.stringify(body) });
  },
  sendNewsletterTest(id: string, email?: string) {
    return request<{ sentTo: string }>(`/admin/newsletters/${id}/test`, { method: 'POST', body: JSON.stringify({ email: email || undefined }) });
  },
  sendNewsletterBatch(id: string) { return request<NewsletterProgress>(`/admin/newsletters/${id}/send`, { method: 'POST' }); },
  retryNewsletterFailed(id: string) { return request<NewsletterProgress>(`/admin/newsletters/${id}/retry-failed`, { method: 'POST' }); },
  listNewsletterFailures(id: string) {
    return request<{ email: string; error?: string | null; updatedAt: string }[]>(`/admin/newsletters/${id}/failures`);
  },

  // Admin Leads
  listLeads(params: { type?: string; status?: string; assignedTo?: string; due?: string; page?: number; pageSize?: number } = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
    });
    const qs = search.toString();
    return request<{ data: any[]; meta: any }>(`/admin/leads${qs ? `?${qs}` : ''}`);
  },
  getAdminStats() {
    return request<any>(`/admin/stats`);
  },
  recordPropertyView(id: string) {
    return request<void>(`/properties/${id}/view`, { method: 'POST' });
  },
  updateLeadStatus(id: string, status: string) {
    return request<any>(`/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  getLead(id: string) {
    return request<any>(`/admin/leads/${id}`);
  },
  /** Any of: status, assignedToId (null = no owner), nextFollowUpAt (ISO string, null = clear) */
  updateLead(id: string, payload: { status?: string; assignedToId?: string | null; nextFollowUpAt?: string | null }) {
    return request<any>(`/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  addLeadNote(id: string, body: string) {
    return request<any>(`/admin/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) });
  },
  listLeadAssignees() {
    return request<{ id: string; email: string; name?: string | null }[]>(`/admin/leads/assignees`);
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

  // Admin onboarding + RBAC
  listAdminUsers() { return request<any[]>(`/admin/users`); },
  updateAdminUser(userId: string, payload: { email?: string; isActive?: boolean; roleId?: string; receivesLeadAlerts?: boolean }) {
    return request<any>(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  getAdminMe() { return request<any>(`/admin/users/me`); },
  getOwnLeadAlerts() { return request<{ enabled: boolean }>(`/admin/users/me/lead-alerts`); },
  setOwnLeadAlerts(enabled: boolean) {
    return request<{ enabled: boolean }>(`/admin/users/me/lead-alerts`, { method: 'PUT', body: JSON.stringify({ enabled }) });
  },
  getAdminMenu() { return request<any[]>(`/admin/users/menu`); },
  createUserInvite(payload: { email: string; roleName: string }) {
    return request<any>(`/admin/users/invite`, { method: 'POST', body: JSON.stringify(payload) });
  },
  listRbacRoles() { return request<any[]>(`/admin/users/rbac/roles`); },
  listRbacPermissions() { return request<any[]>(`/admin/users/rbac/permissions`); },
  listRbacMenuItems() { return request<any[]>(`/admin/users/rbac/menu-items`); },
  setRolePermissions(roleId: string, permissionKeys: string[]) {
    return request<any>(`/admin/users/rbac/roles/${roleId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionKeys }) });
  },
  setRoleMenuAccess(roleId: string, menuKeys: string[]) {
    return request<any>(`/admin/users/rbac/roles/${roleId}/menu-access`, { method: 'PUT', body: JSON.stringify({ menuKeys }) });
  },
};

// interface already exported above; no re-export needed
