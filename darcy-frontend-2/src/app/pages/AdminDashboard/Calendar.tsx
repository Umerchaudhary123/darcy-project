import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  availabilityApi, documentsApi, conversationsApi,
  notificationsApi, adminApi, applicantsApi, subscriptionApi,
} from '../../../services';
import {
  PageHeader, Button, Modal, Input, Select, Spinner, EmptyState,
  StatusBadge, Table, Tr, Td, SearchInput, Tabs, StatCard,
} from '../../components/ui';
import { formatDate, formatDateTime, formatFileSize } from '../../../utils';
import type {
  AvailabilitySlot, Document, Conversation, Message,
  Notification, Client, Applicant,
} from '../../../types';
import {
  Calendar, FileText, MessageSquare, Bell, Users,
  Download, CheckCircle, XCircle, Clock, ArrowLeft,
  Edit2, Mail,
} from 'lucide-react';

// ─── Admin Calendar ───────────────────────────────────────────────────────
export const AdminCalendar: React.FC = () => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookModal, setBookModal] = useState<{ open: boolean; slot: AvailabilitySlot | null }>({ open: false, slot: null });
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState('');
  const [booking, setBooking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await availabilityApi.getAllSlots();
      setSlots(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openBook = async (slot: AvailabilitySlot) => {
    setBookModal({ open: true, slot });
    setSelectedApplicant('');
    try {
      const res = await applicantsApi.getAll({ clientId: slot.clientId, limit: 100 });
      setApplicants(res.data.data.filter((a) => a.pipelineStatus === 'interview_ready'));
    } catch { }
  };

  const bookSlot = async () => {
    if (!bookModal.slot || !selectedApplicant) { toast.error('Select an applicant'); return; }
    setBooking(true);
    try {
      await availabilityApi.bookSlot(bookModal.slot.id, selectedApplicant);
      toast.success('Interview scheduled!');
      setBookModal({ open: false, slot: null });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Booking failed');
    } finally { setBooking(false); }
  };

  const unbook = async (id: string) => {
    if (!confirm('Unbook this slot?')) return;
    try {
      await availabilityApi.unbookSlot(id);
      toast.success('Slot unbooked');
      load();
    } catch { toast.error('Failed'); }
  };

  const upcoming = slots.filter((s) => new Date(s.startTime) >= new Date());
  const past = slots.filter((s) => new Date(s.startTime) < new Date());

  return (
    <div className="animate-fade-in">
      <PageHeader title="Calendar" description="View and manage all interview slots" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Slots ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <div className="card-base p-8 text-center text-muted-foreground text-sm">No upcoming slots across any clients.</div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((s) => (
                  <div key={s.id} className="card-base p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{formatDateTime(s.startTime)}</span>
                        <span className="text-xs text-muted-foreground">→ {new Date(s.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{(s.client as any)?.businessName || 'Unknown Client'}</p>
                      {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.isBooked ? (
                        <>
                          <span className="badge-ready text-xs">{s.bookedApplicant?.firstName} {s.bookedApplicant?.lastName}</span>
                          <Button variant="secondary" size="sm" onClick={() => unbook(s.id)}>Unbook</Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => openBook(s)}>Book Interview</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Past ({past.length})</h2>
              <div className="space-y-2 opacity-60">
                {past.slice(0, 10).map((s) => (
                  <div key={s.id} className="card-base p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                    <span>{formatDateTime(s.startTime)} — {(s.client as any)?.businessName}</span>
                    {s.isBooked
                      ? <span className="text-xs text-green-400">✓ {s.bookedApplicant?.firstName} {s.bookedApplicant?.lastName}</span>
                      : <span className="text-xs text-muted-foreground">No booking</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={bookModal.open} onClose={() => setBookModal({ open: false, slot: null })} title="Schedule Interview">
        {bookModal.slot && (
          <div className="space-y-4">
            <div className="bg-secondary rounded p-3 text-sm">
              <p className="font-medium">{formatDateTime(bookModal.slot.startTime)}</p>
              <p className="text-muted-foreground">{(bookModal.slot.client as any)?.businessName}</p>
            </div>
            {applicants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No interview-ready applicants for this client.</p>
            ) : (
              <Select label="Select Applicant (Interview Ready)" value={selectedApplicant}
                onChange={(e) => setSelectedApplicant(e.target.value)}
                options={[
                  { value: '', label: 'Select applicant…' },
                  ...applicants.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` })),
                ]} />
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setBookModal({ open: false, slot: null })}>Cancel</Button>
          <Button loading={booking} onClick={bookSlot} disabled={!selectedApplicant}>Confirm Booking</Button>
        </div>
      </Modal>
    </div>
  );
};
// ─── Admin Documents ──────────────────────────────────────────────────────
export const AdminDocuments: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientFilter, setClientFilter] = useState('');
  const [reviewModal, setReviewModal] = useState<{ open: boolean; doc: Document | null }>({ open: false, doc: null });
  const [reviewForm, setReviewForm] = useState({ status: 'approved', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clientFilter) { setLoading(false); setDocs([]); return; }
    setLoading(true);
    try {
      const res = await documentsApi.getClientDocs(clientFilter);
      setDocs(res.data.data);
    } catch { } finally { setLoading(false); }
  }, [clientFilter]);

  useEffect(() => {
    adminApi.getClients({ all: true }).then((r) => {
      setClients(r.data.data);
      if (r.data.data.length > 0) setClientFilter(r.data.data[0].id);
    }).catch(() => { });
  }, []);

  useEffect(() => { load(); }, [load]);

  const download = async (doc: Document) => {
    try {
      const res = await documentsApi.getDownloadUrl(doc.id);
      window.open(res.data.data.url, '_blank');
    } catch { toast.error('Could not get download link'); }
  };

  const openReview = (doc: Document) => {
    setReviewModal({ open: true, doc });
    setReviewForm({ status: 'approved', notes: '' });
  };

  const submitReview = async () => {
    if (!reviewModal.doc) return;
    setSaving(true);
    try {
      await documentsApi.review(reviewModal.doc.id, reviewForm.status as 'approved' | 'rejected', reviewForm.notes);
      toast.success(`Document ${reviewForm.status}`);
      setReviewModal({ open: false, doc: null });
      load();
    } catch { toast.error('Review failed'); } finally { setSaving(false); }
  };

  const clientOptions = [
    { value: '', label: 'Select client…' },
    ...clients.map((c) => ({ value: c.id, label: c.businessName })),
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documents" description="Review and approve client documents" />

      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}
          options={clientOptions} className="w-full sm:w-64" />
      </div>

      {!clientFilter ? (
        <div className="card-base p-10 text-center text-muted-foreground">Select a client to view documents.</div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : docs.length === 0 ? (
        <EmptyState icon={<FileText className="w-12 h-12" />} title="No documents" description="This client has not uploaded any documents." />
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="card-base p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{d.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="capitalize">{d.documentType || 'general'}</span> · {formatFileSize(d.fileSize)} · {formatDate(d.createdAt)}
                </p>
                {d.adminNotes && <p className="text-xs text-muted-foreground mt-1 break-words">Note: {d.adminNotes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                <StatusBadge status={d.status} />
                <button onClick={() => download(d)} className="btn-ghost p-1.5" title="Download">
                  <Download className="w-4 h-4" />
                </button>
                {d.status === 'pending' && (
                  <button onClick={() => openReview(d)} className="btn-ghost p-1.5 text-brand" title="Review">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={reviewModal.open} onClose={() => setReviewModal({ open: false, doc: null })} title="Review Document">
        {reviewModal.doc && (
          <div className="space-y-4">
            <div className="bg-secondary rounded p-3">
              <p className="text-sm font-medium truncate">{reviewModal.doc.originalName}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(reviewModal.doc.fileSize)}</p>
            </div>
            <Select label="Decision" value={reviewForm.status}
              onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
              options={[{ value: 'approved', label: '✅ Approve' }, { value: 'rejected', label: '❌ Reject' }]} />
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Notes (optional)</label>
              <textarea value={reviewForm.notes} onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                className="input-field" rows={3} placeholder="Add notes for the client…" />
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setReviewModal({ open: false, doc: null })} className="w-full sm:w-auto">Cancel</Button>
          <Button loading={saving} onClick={submitReview} className="w-full sm:w-auto"
            variant={reviewForm.status === 'approved' ? 'primary' : 'danger'}>
            {reviewForm.status === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// ─── Admin Messages ───────────────────────────────────────────────────────
export const AdminMessages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clientFilter, setClientFilter] = useState('');
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ clientId: '', subject: '', initialMessage: '' });
  const msgEndRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    try {
      const res = await conversationsApi.getAll(clientFilter || undefined);
      setConversations(res.data.data);
    } catch { } finally { setLoading(false); }
  }, [clientFilter]);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  useEffect(() => {
    adminApi.getClients({ all: true }).then((r) => setClients(r.data.data)).catch(() => { });
  }, []);

  useEffect(() => {
    if (active) {
      conversationsApi.getMessages(active).then((r) => setMessages(r.data.data)).catch(() => { });
    }
  }, [active]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      await conversationsApi.sendMessage(active, text);
      setText('');
      const res = await conversationsApi.getMessages(active);
      setMessages(res.data.data);
      loadConvs();
    } catch { toast.error('Failed to send'); } finally { setSending(false); }
  };

  const createConv = async () => {
    if (!newForm.clientId || !newForm.subject) { toast.error('Client and subject required'); return; }
    try {
      const r = await conversationsApi.create(newForm);
      setNewModal(false);
      setNewForm({ clientId: '', subject: '', initialMessage: '' });
      await loadConvs();
      setActive(r.data.data.id);
    } catch { toast.error('Failed'); }
  };

  const activeConv = conversations.find((c) => c.id === active);
  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map((c) => ({ value: c.id, label: c.businessName })),
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Messages" description="Conversations with all clients"
        action={<Button size="sm" onClick={() => setNewModal(true)}>+ New Conversation</Button>} />

      <div className="mb-4 max-w-xs">
        <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} options={clientOptions} />
      </div>

      <div className="flex gap-4 h-[600px]">
        <div className="w-full sm:w-72 flex-shrink-0 card-base overflow-y-auto">
          {loading ? <div className="flex justify-center p-8"><Spinner /></div> :
            conversations.length === 0 ? <p className="text-center text-sm text-muted-foreground p-8">No conversations</p> :
              conversations.map((c) => (
                <button key={c.id} onClick={() => setActive(c.id)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-accent transition-colors ${active === c.id ? 'bg-accent' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium truncate">{c.subject}</p>
                    {c.unreadByAdmin > 0 && (
                      <span className="bg-brand text-white text-xs px-1.5 rounded-full ml-1 flex-shrink-0">{c.unreadByAdmin}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{(c.client as any)?.businessName}</p>
                  <p className="text-xs text-muted-foreground">{c.lastMessageAt ? formatDateTime(c.lastMessageAt) : formatDate(c.createdAt)}</p>
                </button>
              ))}
        </div>

        <div className="flex-1 card-base flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<MessageSquare className="w-10 h-10" />} title="Select a conversation" />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border">
                <p className="font-medium text-sm">{activeConv?.subject}</p>
                <p className="text-xs text-muted-foreground">{(activeConv?.client as any)?.businessName}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${m.senderRole === 'admin' ? 'bg-brand text-white rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'}`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${m.senderRole === 'admin' ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {m.sender?.name} · {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
              <div className="p-4 border-t border-border flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Type a message…" className="input-field flex-1" />
                <Button onClick={send} loading={sending} disabled={!text.trim()}>Send</Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={newModal} onClose={() => setNewModal(false)} title="New Conversation" size="md">
        <div className="space-y-4">
          <Select label="Client *" value={newForm.clientId} onChange={(e) => setNewForm({ ...newForm, clientId: e.target.value })}
            options={[{ value: '', label: 'Select client…' }, ...clients.map((c) => ({ value: c.id, label: c.businessName }))]} />
          <Input label="Subject *" value={newForm.subject} onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })} placeholder="Subject…" />
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Initial Message (optional)</label>
            <textarea value={newForm.initialMessage} onChange={(e) => setNewForm({ ...newForm, initialMessage: e.target.value })}
              className="input-field" rows={3} placeholder="Hi, wanted to reach out about…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setNewModal(false)}>Cancel</Button>
          <Button onClick={createConv}>Create Conversation</Button>
        </div>
      </Modal>
    </div>
  );
};

// ─── Admin Notifications ──────────────────────────────────────────────────
export const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await notificationsApi.getAll();
      setNotifications(r.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      )
    );
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
    toast.success("All notifications marked as read");
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notifications"
        description={`${unread} unread`}
        action={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={markAll}
            >
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-12 h-12" />}
          title="No notifications"
          description="You're all caught up!"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`card-base p-4 cursor-pointer hover:border-border/80 transition-colors ${!n.isRead
                  ? "border-primary/40 bg-primary/5"
                  : ""
                }`}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium break-words ${!n.isRead
                        ? "text-foreground"
                        : "text-muted-foreground"
                      }`}
                  >
                    {n.title}
                  </p>

                  <p className="text-xs text-muted-foreground mt-0.5 break-words">
                    {n.body}
                  </p>
                </div>

                <div className="flex sm:flex-col sm:text-right items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(n.createdAt)}
                  </p>

                  {!n.isRead && (
                    <span className="inline-block w-2 h-2 bg-brand rounded-full flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Admin Client Details ─────────────────────────────────────────────────
export const AdminClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    adminApi.getClient(id).then((r) => {
      setClient(r.data.data);
      setEditForm(r.data.data);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [id]);

  // Timer tick
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  const startTimer = async () => {
    if (!id) return;
    try {
      const res = await adminApi.startTimer(id);
      setTrackingId((res.data as any).data.id);
      setTimerActive(true);
      setTimerSeconds(0);
      toast.success('Timer started');
    } catch { toast.error('Failed to start timer'); }
  };

  const stopTimer = async () => {
    if (!trackingId) return;
    try {
      await adminApi.stopTimer(trackingId);
      setTimerActive(false);
      setTrackingId(null);
      toast.success(`Tracked ${Math.floor(timerSeconds / 60)}m ${timerSeconds % 60}s`);
    } catch { toast.error('Failed to stop timer'); }
  };

  const saveEdit = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await adminApi.updateClient(id, editForm);
      setClient(res.data.data);
      setEditModal(false);
      toast.success('Client updated');
    } catch { toast.error('Failed to update'); } finally { setSaving(false); }
  };

  const resendInvite = async () => {
    if (!id) return;
    try {
      await adminApi.resendInvite(id);
      toast.success('Invite resent');
    } catch { toast.error('Failed'); }
  };

  const formatTimer = (s: number) => `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!client) return <div className="text-center py-20 text-muted-foreground">Client not found.</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/dashboard')} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.businessName}</h1>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={client.status} />
          {timerActive ? (
            <Button variant="danger" size="sm" onClick={stopTimer} icon={<Clock className="w-3.5 h-3.5" />}>
              Stop {formatTimer(timerSeconds)}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={startTimer} icon={<Clock className="w-3.5 h-3.5" />}>
              Track Time
            </Button>
          )}
          <Button size="sm" onClick={() => setEditModal(true)} icon={<Edit2 className="w-3.5 h-3.5" />}>Edit</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-base p-5">
            <h2 className="font-semibold mb-4">Business Information</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {[
                ['Business Name', client.businessName],
                ['Contact', client.contactName || '—'],
                ['Phone', client.phone || '—'],
                ['Type', client.contractorType],
                ['Address', [client.address, client.city, client.state, client.zip].filter(Boolean).join(', ') || '—'],
                ['Agreement', client.agreementSigned ? `✅ ${client.agreementSignedAt ? formatDate(client.agreementSignedAt) : 'Signed'}` : '❌ Not signed'],
                ['Member Since', formatDate(client.createdAt)],
                ['Stripe ID', client.stripeCustomerId || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-muted-foreground">{label}</p>
                  <p className="font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <div className="card-base p-5">
            <h2 className="font-semibold mb-4">Service Credentials</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Indeed Username</p>
                <p className="font-medium font-mono">{client.indeedUsername || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">First Advantage Username</p>
                <p className="font-medium font-mono">{client.firstAdvantageUsername || '—'}</p>
              </div>
            </div>
          </div>

          {client.adminNotes && (
            <div className="card-base p-5">
              <h2 className="font-semibold mb-2">Admin Notes</h2>
              <p className="text-sm text-muted-foreground">{client.adminNotes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {client.status === 'invited' && (
            <div className="card-base p-4">
              <p className="text-sm text-muted-foreground mb-3">Client hasn't completed signup.</p>
              <Button variant="secondary" size="sm" className="w-full" onClick={resendInvite} icon={<Mail className="w-3.5 h-3.5" />}>
                Resend Invite
              </Button>
            </div>
          )}

          {client.subscription && (
            <div className="card-base p-5">
              <h2 className="font-semibold mb-3">Subscription</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span>{client.subscription.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={client.subscription.status} />
                </div>
                {client.subscription.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Renews</span>
                    <span>{formatDate(client.subscription.currentPeriodEnd)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card-base p-5">
            <h2 className="font-semibold mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Button variant="secondary" size="sm" className="w-full justify-start"
                onClick={() => navigate(`/admin/pipeline?clientId=${client.id}`)}>
                <Users className="w-4 h-4" /> View Pipeline
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start"
                onClick={() => navigate(`/admin/documents?clientId=${client.id}`)}>
                <FileText className="w-4 h-4" /> View Documents
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start"
                onClick={() => navigate(`/admin/messages?clientId=${client.id}`)}>
                <MessageSquare className="w-4 h-4" /> View Messages
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Client" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Business Name" value={editForm.businessName || ''} onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })} />
            <Input label="Contact Name" value={editForm.contactName || ''} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Phone" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </div>
          <Select label="Status" value={editForm.status || 'active'}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'invited', label: 'Invited' },
              { value: 'pending', label: 'Pending' },
              { value: 'archived', label: 'Archived' },
              { value: 'suspended', label: 'Suspended' },
            ]} />
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Admin Notes</label>
            <textarea value={editForm.adminNotes || ''} onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
              className="input-field" rows={3} placeholder="Internal notes…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
          <Button loading={saving} onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>
    </div>
  );
};
