import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { availabilityApi, documentsApi, conversationsApi, notificationsApi, subscriptionApi, authApi } from '../../../services';
import { PageHeader, Button, Modal, Input, Spinner, EmptyState, StatusBadge, Alert } from '../../components/ui';
import { formatDate, formatDateTime, formatFileSize } from '../../../utils';
import type { AvailabilitySlot, Document, Conversation, Message, Notification, Subscription } from '../../../types';
import { Calendar as CalIcon, FileText, MessageSquare, Bell, CreditCard, Shield, Download, Trash2 } from 'lucide-react';

// ─── Calendar ────────────────────────────────────────────────────────────
export const ClientCalendar: React.FC = () => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [newSlot, setNewSlot] = useState({ date: '', startTime: '', endTime: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await availabilityApi.getMySlots();
      setSlots(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addSlot = async () => {
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) {
      toast.error('Please fill in date and times'); return;
    }
    setSaving(true);
    try {
      const startTime = new Date(`${newSlot.date}T${newSlot.startTime}`).toISOString();
      const endTime = new Date(`${newSlot.date}T${newSlot.endTime}`).toISOString();
      await availabilityApi.createSlot({ startTime, endTime, notes: newSlot.notes });
      toast.success('Availability slot added');
      setAddModal(false);
      setNewSlot({ date: '', startTime: '', endTime: '', notes: '' });
      load();
    } catch { toast.error('Failed to add slot'); } finally { setSaving(false); }
  };

  const deleteSlot = async (id: string) => {
    try {
      await availabilityApi.deleteSlot(id);
      toast.success('Slot removed');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Cannot delete booked slot'); }
  };

  const upcoming = slots.filter((s) => new Date(s.startTime) >= new Date());
  const past = slots.filter((s) => new Date(s.startTime) < new Date());

  return (
    <div className="animate-fade-in">
      <PageHeader title="Calendar" description="Manage your interview availability"
        action={<Button onClick={() => setAddModal(true)} icon={<CalIcon className="w-4 h-4" />}>Add Availability</Button>} />

      {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Slots ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <div className="card-base p-8 text-center text-muted-foreground text-sm">No upcoming availability slots set.</div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((s) => (
                  <div key={s.id} className="card-base p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{formatDateTime(s.startTime)}</div>
                      <div className="text-xs text-muted-foreground">to {new Date(s.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                      {s.notes && <div className="text-xs text-muted-foreground mt-1">{s.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {s.isBooked ? (
                        <span className="badge-ready text-xs">Booked — {s.bookedApplicant?.firstName} {s.bookedApplicant?.lastName}</span>
                      ) : (
                        <>
                          <span className="badge-pending text-xs">Open</span>
                          <button onClick={() => deleteSlot(s.id)} className="btn-ghost p-1.5 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Past Slots</h2>
              <div className="space-y-2 opacity-60">
                {past.slice(0, 5).map((s) => (
                  <div key={s.id} className="card-base p-3 text-sm flex justify-between">
                    <span>{formatDateTime(s.startTime)}</span>
                    {s.isBooked ? <span className="text-xs text-green-400">Completed</span> : <span className="text-xs text-muted-foreground">No booking</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Availability Slot">
        <div className="space-y-4">
          <Input label="Date *" type="date" value={newSlot.date} onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time *" type="time" value={newSlot.startTime} onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })} />
            <Input label="End Time *" type="time" value={newSlot.endTime} onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })} />
          </div>
          <Input label="Notes" value={newSlot.notes} onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })} placeholder="Optional notes" />
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
          <Button loading={saving} onClick={addSlot}>Add Slot</Button>
        </div>
      </Modal>
    </div>
  );
};

// ─── Documents ────────────────────────────────────────────────────────────
export const ClientDocuments: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await documentsApi.getMy(); setDocs(r.data.data); } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', 'general');
    setUploading(true);
    try {
      await documentsApi.upload(fd);
      toast.success('Document uploaded successfully');
      load();
    } catch { toast.error('Upload failed. Please try again.'); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const download = async (doc: Document) => {
    try {
      const res = await documentsApi.getDownloadUrl(doc.id);
      window.open(res.data.data.url, '_blank');
    } catch { toast.error('Could not get download link'); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documents" description="Upload and manage your documents"
        action={
          <div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            <Button onClick={() => fileRef.current?.click()} loading={uploading} icon={<FileText className="w-4 h-4" />}>
              Upload Document
            </Button>
          </div>
        } />
      {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> :
        docs.length === 0 ? <EmptyState icon={<FileText className="w-12 h-12" />} title="No documents yet" description="Upload documents for Darcy Staffing to review." /> :
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="card-base p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{d.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(d.fileSize)} · {formatDate(d.createdAt)}</p>
                  {d.adminNotes && <p className="text-xs text-muted-foreground mt-1">Note: {d.adminNotes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={d.status} />
                  <button onClick={() => download(d)} className="btn-ghost p-1.5"><Download className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
};

// ─── Messages ─────────────────────────────────────────────────────────────
export const ClientMessages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newModal, setNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    try { const r = await conversationsApi.getMy(); setConversations(r.data.data); } catch { } finally { setLoading(false); }
  };

  const loadMessages = async (id: string) => {
    try { const r = await conversationsApi.getMessages(id); setMessages(r.data.data); } catch { }
  };

  useEffect(() => { loadConvs(); }, []);
  useEffect(() => { if (active) loadMessages(active); }, [active]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      await conversationsApi.sendMessage(active, text);
      setText('');
      loadMessages(active);
      loadConvs();
    } catch { toast.error('Failed to send'); } finally { setSending(false); }
  };

  const createConv = async () => {
    if (!newSubject.trim()) { toast.error('Subject required'); return; }
    try {
      const r = await conversationsApi.create({ subject: newSubject });
      setNewModal(false);
      setNewSubject('');
      await loadConvs();
      setActive(r.data.data.id);
    } catch { toast.error('Failed to create conversation'); }
  };

  const activeConv = conversations.find((c) => c.id === active);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Messages" description="Direct communication with Darcy Staffing"
        action={<Button onClick={() => setNewModal(true)} size="sm">+ New Conversation</Button>} />
      <div className="flex gap-4 h-[600px]">
        {/* Sidebar */}
        <div className="w-full sm:w-64 lg:w-72 flex-shrink-0 card-base overflow-y-auto">
          {loading ? <div className="flex justify-center p-8"><Spinner /></div> :
            conversations.length === 0 ? <p className="text-center text-sm text-muted-foreground p-8">No conversations yet</p> :
              conversations.map((c) => (
                <button key={c.id} onClick={() => setActive(c.id)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-accent transition-colors ${active === c.id ? 'bg-accent' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium truncate">{c.subject}</p>
                    {c.unreadByClient > 0 && <span className="bg-brand text-white text-xs px-1.5 rounded-full ml-1 flex-shrink-0">{c.unreadByClient}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.lastMessageAt ? formatDateTime(c.lastMessageAt) : formatDate(c.createdAt)}</p>
                </button>
              ))}
        </div>

        {/* Chat area */}
        <div className="flex-1 card-base flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <EmptyState icon={<MessageSquare className="w-10 h-10" />} title="Select a conversation" />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border font-medium text-sm">{activeConv?.subject}</div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderRole === 'client' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                      m.senderRole === 'client' ? 'bg-brand text-white rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'
                    }`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${m.senderRole === 'client' ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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

      <Modal open={newModal} onClose={() => setNewModal(false)} title="New Conversation">
        <Input label="Subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="What is this about?" />
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setNewModal(false)}>Cancel</Button>
          <Button onClick={createConv}>Create</Button>
        </div>
      </Modal>
    </div>
  );
};

// ─── Notifications ─────────────────────────────────────────────────────────
export const ClientNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await notificationsApi.getAll(); setNotifications(r.data.data); } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Notifications" description={`${unread} unread`}
        action={unread > 0 ? <Button variant="secondary" size="sm" onClick={markAll}>Mark All Read</Button> : undefined} />
      {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> :
        notifications.length === 0 ? <EmptyState icon={<Bell className="w-12 h-12" />} title="No notifications" description="You're all caught up!" /> :
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
                className={`card-base p-4 cursor-pointer hover:border-border/80 transition-colors ${!n.isRead ? 'border-primary/40 bg-primary/5' : ''}`}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                    {!n.isRead && <span className="inline-block w-2 h-2 bg-brand rounded-full mt-1" />}
                  </div>
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
};

// ─── Subscription ──────────────────────────────────────────────────────────
export const ClientSubscription: React.FC = () => {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    subscriptionApi.getMy().then((r) => setSub(r.data.data)).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const r = await subscriptionApi.getBillingPortal();
      window.location.href = r.data.data.url;
    } catch { toast.error('Could not open billing portal'); } finally { setPortalLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader title="Subscription" description="Manage your Darcy Staffing plan and billing" />
      {!sub ? (
        <Alert type="warning">No active subscription found.</Alert>
      ) : (
        <div className="space-y-4">
          <div className="card-base p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-2xl font-bold mt-1">{sub.plan}</p>
              </div>
              <StatusBadge status={sub.status} label={sub.status.replace('_', ' ')} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <p className="text-muted-foreground">Monthly Amount</p>
                <p className="font-medium">${sub.monthlyAmount?.toFixed(2) || '—'}/month</p>
              </div>
              {sub.currentPeriodEnd && (
                <div>
                  <p className="text-muted-foreground">Next Renewal</p>
                  <p className="font-medium">{formatDate(sub.currentPeriodEnd)}</p>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-4 mb-4">
              <p className="text-sm font-medium mb-3">Add-ons</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extra Indeed Listings</span>
                  <span>{sub.extraIndeedListings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extra Terminals</span>
                  <span>{sub.extraTerminals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">I-9 Service</span>
                  <span>{sub.i9Service ? 'Active' : 'Not active'}</span>
                </div>
              </div>
            </div>
            <Button onClick={openBillingPortal} loading={portalLoading} variant="secondary" icon={<CreditCard className="w-4 h-4" />}>
              Manage Billing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Security ──────────────────────────────────────────────────────────────
export const ClientSecurity: React.FC = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword);
      toast.success('Password updated successfully');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in max-w-lg">
      <PageHeader title="Security Settings" description="Manage your account security" />
      <div className="card-base p-6">
        <h2 className="font-semibold mb-5 flex items-center gap-2"><Shield className="w-4 h-4" /> Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <Input label="Current Password" type="password" value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          <Input label="New Password" type="password" value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
          <Input label="Confirm New Password" type="password" value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
          <Button type="submit" loading={loading}>Update Password</Button>
        </form>
      </div>
    </div>
  );
};
