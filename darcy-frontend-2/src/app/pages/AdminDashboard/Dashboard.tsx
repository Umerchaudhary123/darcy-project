import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Users, Plus, Archive, RotateCcw, Mail, Clock, ChevronRight, Calendar, FileText, MessageSquare, Bell } from 'lucide-react';
import { adminApi, applicantsApi, notificationsApi } from '../../../services';
import { PageHeader, SearchInput, StatusBadge, Spinner, EmptyState, Modal, Input, Select, Button, StatCard, Tabs } from '../../components/ui';
import { formatDate, formatDateTime } from '../../../utils';
import { useAuthStore } from '../../context/authStore';
import type { Client, Applicant, Notification } from '../../../types';

const ITEM = 'CLIENT_CARD';

// ─── Draggable Client Card ────────────────────────────────────────────────
const ClientCard: React.FC<{
  client: Client;
  index: number;
  onMove: (from: number, to: number) => void;
  onDrop: () => void;
  onArchive: (id: string, archived: boolean) => void;
}> = ({ client, index, onMove, onDrop, onArchive }) => {
  const navigate = useNavigate();
  const [{ isDragging }, drag] = useDrag({
    type: ITEM,
    item: { index },
    collect: (m) => ({ isDragging: m.isDragging() }),
    end: (_item, monitor) => { if (monitor.didDrop()) onDrop(); },
  });
  const [, drop] = useDrop({
    accept: ITEM,
    hover: (item: { index: number }) => {
      if (item.index !== index) { onMove(item.index, index); item.index = index; }
    },
  });

  const applicantCount = client.applicants?.length || 0;
  const readyCount = client.applicants?.filter((a) => a.pipelineStatus === 'interview_ready').length || 0;

  return (
    <div
      ref={(node) => { drag(drop(node)); }}
      className={`card-base p-4 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{client.businessName}</h3>
          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
        </div>
        <StatusBadge status={client.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="bg-secondary rounded p-2">
          <p className="text-muted-foreground">Total</p>
          <p className="font-bold text-base">{applicantCount}</p>
        </div>
        <div className="bg-secondary rounded p-2">
          <p className="text-muted-foreground">Ready</p>
          <p className="font-bold text-base text-green-400">{readyCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/admin/client/${client.id}`)}
          className="btn-secondary text-xs px-3 py-1.5 flex-1 flex items-center justify-center gap-1"
        >
          View Details <ChevronRight className="w-3 h-3" />
        </button>
        <button
          onClick={() => onArchive(client.id, client.status !== 'archived')}
          className="btn-ghost p-1.5"
          title={client.status === 'archived' ? 'Restore' : 'Archive'}
        >
          {client.status === 'archived'
            ? <RotateCcw className="w-4 h-4 text-green-400" />
            : <Archive className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('active');
  const [stats, setStats] = useState({ totalClients: 0, activeClients: 0, totalApplicants: 0, interviewReady: 0 });
  const [recentApplicants, setRecentApplicants] = useState<Applicant[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ businessName: '', email: '', contactName: '', phone: '', contractorType: 'P&D' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientRes, statsRes, appRes, notifRes] = await Promise.all([
        adminApi.getClients({ search: search || undefined, status: tab, all: true }),
        adminApi.getStats(),
        applicantsApi.getAll({ limit: 5 }),
        notificationsApi.getAll({ limit: 5 }),
      ]);
      setClients(clientRes.data.data);
      setStats(statsRes.data.data);
      setRecentApplicants(appRes.data.data);
      setNotifications(notifRes.data.data);
      setUnread(notifRes.data.meta?.unreadCount || 0);
    } catch { } finally { setLoading(false); }
  }, [search, tab]);

  useEffect(() => { load(); }, [load]);

  const moveCard = (from: number, to: number) => {
    setClients((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const persistOrder = async () => {
    try {
      await adminApi.updateDisplayOrder(clients.map((c) => c.id));
      toast.success('Order saved');
    } catch { toast.error('Failed to save order'); }
  };

  const archive = async (id: string, archived: boolean) => {
    try {
      await adminApi.setArchived(id, archived);
      toast.success(archived ? 'Client archived' : 'Client restored');
      load();
    } catch { toast.error('Action failed'); }
  };

  const addClient = async () => {
    if (!addForm.businessName || !addForm.email) { toast.error('Business name and email required'); return; }
    setAdding(true);
    try {
      await adminApi.addClient(addForm);
      toast.success('Client added and invite sent');
      setAddModal(false);
      setAddForm({ businessName: '', email: '', contactName: '', phone: '', contractorType: 'P&D' });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add client');
    } finally { setAdding(false); }
  };

  const tabs = [
    { id: 'active', label: 'Active' },
    { id: 'invited', label: 'Invited' },
    { id: 'archived', label: 'Archived' },
    { id: 'all', label: 'All' },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="animate-fade-in">
        <PageHeader
          title={`Welcome, ${user?.name?.split(' ')[0] || 'Admin'} 👋`}
          description="Here's what's happening across all contractor accounts."
          action={<Button onClick={() => setAddModal(true)} icon={<Plus className="w-4 h-4" />}>Add Client</Button>}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Clients" value={stats.totalClients} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
          <StatCard label="Active Clients" value={stats.activeClients} icon={<Users className="w-5 h-5" />} color="text-green-400" />
          <StatCard label="Total Applicants" value={stats.totalApplicants} icon={<Users className="w-5 h-5" />} color="text-yellow-400" />
          <StatCard label="Interview Ready" value={stats.interviewReady} icon={<Users className="w-5 h-5" />} color="text-brand" />
        </div>

        {/* Recent Activity — same layout as client dashboard */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Applicants */}
          <div className="lg:col-span-2 card-base p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Applicants</h2>
              <Link to="/admin/pipeline" className="text-xs text-brand hover:underline">View all →</Link>
            </div>
            {recentApplicants.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">No applicants yet.</p>
            ) : (
              <div className="space-y-3">
                {recentApplicants.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                      {a.firstName?.[0]}{a.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.firstName} {a.lastName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                    </div>
                    <StatusBadge status={a.pipelineStatus} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  Notifications
                  {unread > 0 && (
                    <span className="bg-brand text-white text-xs px-1.5 py-0.5 rounded-full">{unread}</span>
                  )}
                </h2>
                <Link to="/admin/notifications" className="text-xs text-brand hover:underline">View all →</Link>
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notifications</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 4).map((n) => (
                    <div key={n.id} className={`p-3 rounded-lg text-sm ${n.isRead ? 'bg-secondary' : 'bg-primary/10 border border-primary/20'}`}>
                      <p className="font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card-base p-5">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Pipeline', href: '/admin/pipeline', icon: <Users className="w-4 h-4" /> },
                  { label: 'Calendar', href: '/admin/calendar', icon: <Calendar className="w-4 h-4" /> },
                  { label: 'Documents', href: '/admin/documents', icon: <FileText className="w-4 h-4" /> },
                  { label: 'Messages', href: '/admin/messages', icon: <MessageSquare className="w-4 h-4" /> },
                ].map((q) => (
                  <Link
                    key={q.href}
                    to={q.href}
                    className="flex flex-col items-center gap-2 p-4 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs text-muted-foreground hover:text-foreground"
                  >
                    {q.icon}
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Client Cards Section */}
        <div className="mb-4">
          <h2 className="font-semibold text-lg mb-4">Client Accounts</h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <SearchInput value={search} onChange={setSearch} placeholder="Search clients…" className="sm:w-72" />
            <Tabs tabs={tabs} active={tab} onChange={setTab} />
            {clients.length > 0 && !search && (
              <Button variant="secondary" size="sm" onClick={persistOrder} icon={<Clock className="w-3.5 h-3.5" />}>
                Save Order
              </Button>
            )}
          </div>

          {clients.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="No clients found"
              action={<Button onClick={() => setAddModal(true)}>Add First Client</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clients.map((c, i) => (
                <ClientCard key={c.id} client={c} index={i} onMove={moveCard} onDrop={persistOrder} onArchive={archive} />
              ))}
            </div>
          )}
        </div>

        {/* Add Client Modal */}
        <Modal open={addModal} onClose={() => setAddModal(false)} title="Add New Client" size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business Name *"
                value={addForm.businessName}
                onChange={(e) => setAddForm({ ...addForm, businessName: e.target.value })}
                placeholder="ABC Logistics LLC"
              />
              <Input
                label="Email *"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Contact Name"
                value={addForm.contactName}
                onChange={(e) => setAddForm({ ...addForm, contactName: e.target.value })}
                placeholder="John Smith"
              />
              <Input
                label="Phone"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="(555) 000-0000"
              />
            </div>
            <Select
              label="Contractor Type"
              value={addForm.contractorType}
              onChange={(e) => setAddForm({ ...addForm, contractorType: e.target.value })}
              options={[
                { value: 'P&D', label: 'P&D' },
                { value: 'Linehaul', label: 'Linehaul' },
                { value: 'Both', label: 'Both' },
              ]}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded p-3">
              <Mail className="w-4 h-4 flex-shrink-0" />
              An invite email will be sent to the client to complete their registration.
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button loading={adding} onClick={addClient}>Add & Invite Client</Button>
          </div>
        </Modal>
      </div>
    </DndProvider>
  );
};