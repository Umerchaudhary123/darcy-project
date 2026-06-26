import api from './api';
import { ApiResponse, Client, Applicant, Document, Conversation, Message, Notification, AvailabilitySlot, Subscription, PipelineStats, TimeTracking, User } from '../types';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email?: string; username?: string; password: string }) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string; redirectTo: string }>>('/auth/login', data),

  adminLogin: (data: { email: string; password: string; superAdmin?: boolean }) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string; redirectTo: string }>>('/auth/admin-login', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<ApiResponse<User>>('/auth/me'),

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  enable2FA: () => api.post('/auth/enable-2fa'),

  verify2FA: (token: string) => api.post('/auth/verify-2fa', { token }),

  disable2FA: () => api.post('/auth/disable-2fa'),
};

// ─── Onboarding ──────────────────────────────────────────────────────────────
export const onboardingApi = {
  saveStep: (step: number, sessionId: string | null, data: Record<string, unknown>) =>
    api.post<ApiResponse<{ sessionId: string }>>('/onboarding/step', { step, sessionId, ...data }),

  getSession: (sessionId: string) => api.get(`/onboarding/session/${sessionId}`),

  verifyInvite: (token: string) => api.get(`/onboarding/invite/${token}`),

  setPaymentPending: (sessionId: string, stripeSessionId: string) =>
    api.post('/onboarding/payment-pending', { sessionId, stripeSessionId }),
};

// ─── Client ──────────────────────────────────────────────────────────────────
export const clientApi = {
  getProfile: () => api.get<ApiResponse<Client>>('/clients/profile'),

  updateProfile: (data: Partial<Client>) => api.put<ApiResponse<Client>>('/clients/profile', data),

  updateCredentials: (data: Record<string, string>) => api.put('/clients/credentials', data),

  completeSetup: (data: { userId: string; username?: string; password: string }) =>
    api.post('/clients/setup', data),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get<ApiResponse<{ totalClients: number; activeClients: number; totalApplicants: number; interviewReady: number }>>('/admin/stats'),

  getClients: (params?: { cursor?: string; limit?: number; search?: string; status?: string; all?: boolean }) =>
    api.get<ApiResponse<Client[]>>('/admin/clients', { params }),

  getClient: (id: string) => api.get<ApiResponse<Client>>(`/admin/clients/${id}`),

  addClient: (data: { businessName: string; email: string; contactName?: string; phone?: string; contractorType?: string }) =>
    api.post<ApiResponse<Client>>('/admin/clients', data),

  updateClient: (id: string, data: Partial<Client>) =>
    api.put<ApiResponse<Client>>(`/admin/clients/${id}`, data),

  setArchived: (id: string, archived: boolean) =>
    api.patch(`/admin/clients/${id}/archive`, { archived }),

  resendInvite: (id: string) => api.post(`/admin/clients/${id}/resend-invite`),

  updateDisplayOrder: (orderedIds: string[]) =>
    api.put('/admin/clients/display-order', { orderedIds }),

  startTimer: (clientId: string) => api.post(`/admin/clients/${clientId}/timer/start`),

  stopTimer: (trackingId: string, notes?: string) =>
    api.patch<ApiResponse<TimeTracking>>(`/admin/timer/${trackingId}/stop`, { notes }),

  getTimeHistory: (clientId: string) =>
    api.get<ApiResponse<TimeTracking[]>>(`/admin/clients/${clientId}/timer/history`),
};

// ─── Applicants ──────────────────────────────────────────────────────────────
export const applicantsApi = {
  getAll: (params?: { clientId?: string; search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<Applicant[]>>('/applicants', { params }),

  getMy: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<Applicant[]>>('/applicants/my', { params }),

  getStats: (clientId?: string) =>
    api.get<ApiResponse<PipelineStats>>('/applicants/stats', { params: { clientId } }),

  create: (data: { clientId: string; firstName: string; lastName: string; email?: string; phone?: string; source?: string }) =>
    api.post<ApiResponse<Applicant>>('/applicants', data),

  update: (id: string, data: Partial<Applicant>) =>
    api.put<ApiResponse<Applicant>>(`/applicants/${id}`, data),

  addClientNote: (id: string, notes: string) =>
    api.patch(`/applicants/${id}/note`, { notes }),

  delete: (id: string) => api.delete(`/applicants/${id}`),

  bulkUpdate: (ids: string[], updates: Partial<Applicant>) =>
    api.post('/applicants/bulk', { ids, updates }),

  exportCsv: (clientId?: string) =>
    api.get('/applicants/export/csv', { params: { clientId }, responseType: 'blob' }),
};

// ─── Availability ─────────────────────────────────────────────────────────────
export const availabilityApi = {
  getMySlots: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<AvailabilitySlot[]>>('/availability/my', { params }),

  createSlot: (data: { startTime: string; endTime: string; isRecurring?: boolean; recurringType?: string; notes?: string }) =>
    api.post<ApiResponse<AvailabilitySlot>>('/availability/my', data),

  deleteSlot: (id: string) => api.delete(`/availability/my/${id}`),

  getAllSlots: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<AvailabilitySlot[]>>('/availability', { params }),

  getClientSlots: (clientId: string, params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<AvailabilitySlot[]>>(`/availability/client/${clientId}`, { params }),

  bookSlot: (slotId: string, applicantId: string) =>
    api.patch(`/availability/${slotId}/book`, { applicantId }),

  unbookSlot: (slotId: string) => api.patch(`/availability/${slotId}/unbook`),
};

// ─── Conversations ────────────────────────────────────────────────────────────
export const conversationsApi = {
  getMy: () => api.get<ApiResponse<Conversation[]>>('/conversations/my'),

  getAll: (clientId?: string) =>
    api.get<ApiResponse<Conversation[]>>('/conversations', { params: { clientId } }),

  create: (data: { subject: string; clientId?: string; initialMessage?: string }) =>
    api.post<ApiResponse<Conversation>>('/conversations', data),

  getMessages: (conversationId: string) =>
    api.get<ApiResponse<Message[]>>(`/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, content: string) =>
    api.post<ApiResponse<Message>>(`/conversations/${conversationId}/messages`, { content }),
};

// ─── Documents ────────────────────────────────────────────────────────────────
export const documentsApi = {
  getMy: () => api.get<ApiResponse<Document[]>>('/documents/my'),

  getClientDocs: (clientId: string) =>
    api.get<ApiResponse<Document[]>>(`/documents/client/${clientId}`),

  upload: (formData: FormData) =>
    api.post<ApiResponse<Document>>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getDownloadUrl: (id: string) =>
    api.get<ApiResponse<{ url: string; expiresIn: number }>>(`/documents/${id}/download`),

  review: (id: string, status: 'approved' | 'rejected', notes?: string) =>
    api.patch<ApiResponse<Document>>(`/documents/${id}/review`, { status, notes }),

  delete: (id: string) => api.delete(`/documents/${id}`),
};

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptionApi = {
  getMy: () => api.get<ApiResponse<Subscription>>('/subscriptions/my'),

  getBillingPortal: () =>
    api.get<ApiResponse<{ url: string }>>('/subscriptions/my/billing-portal'),

  getClientSub: (clientId: string) =>
    api.get<ApiResponse<Subscription>>(`/subscriptions/client/${clientId}`),

  updateAddons: (clientId: string, data: { extraIndeedListings?: number; extraTerminals?: number; i9Service?: boolean }) =>
    api.patch(`/subscriptions/client/${clientId}/addons`, data),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  createCheckout: (data: { sessionId: string | null; plan: string; email: string; businessName: string }) =>
    api.post<ApiResponse<{ url: string; sessionId: string }>>('/payments/checkout', data),

  getCheckoutSession: (sessionId: string) =>
    api.get<ApiResponse<{ email: string; userId: string; status: string }>>(`/payments/checkout/${sessionId}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<ApiResponse<Notification[]>>('/notifications', { params }),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),

  delete: (id: string) => api.delete(`/notifications/${id}`),
};
