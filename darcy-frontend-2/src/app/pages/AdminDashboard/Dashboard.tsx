import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { adminApi, applicantsApi, notificationsApi } from '../../../services';
import { PageHeader, SearchInput, StatusBadge, Spinner, EmptyState, Modal, Input, Select, Button, StatCard, Tabs } from '../../components/ui';
import { formatDate, formatDateTime } from '../../../utils';
import type { Client } from '../../../types';
import { Users, Plus, Archive, RotateCcw, Mail, Clock, ChevronRight } from 'lucide-react';

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
      className={`card-base p-5 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all ${isDragging ? 'opacity-40' : ''}`}
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
          className="btn-ghost p-1.5 text-xs"
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

// ─── Recent Applicants Widget ─────────────────────────────────────────────
const RecentApplicants: React.FC = () => {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<any[]>([]);

  useEffect(() => {
    applicantsApi.getAll({ limit: 5 }).then((r) => setApplicants(r.data.data)).catch(() => {});
  }, []);

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Recent Applicants</h3>
        <button onClick={() => navigate('/admin/pipeline')} className="text-xs text-brand hover:underline">
          View all →
        </button>
      </div>
      {applicants.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No applicants yet</p>
      ) : (
        applicants.slice(0, 5).map((a) => (
          <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0 text-foreground">
              {a.firstName?.[0]}{a.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.firstName} {a.lastName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
            </div>
            <StatusBadge status={a.pipelineStatus} />
          </div>
        ))
      )}
    </div>
  );
};

// ─── Recent Notifications Widget ──────────────────────────────────────────
const RecentNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    notificationsApi.getAll().then((r) => setNotifications(r.data.data)).catch(() => {});
  }, []);

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Notifications</h3>
        <button onClick={() => navigate('/admin/notifications')} className="text-xs text-brand hover:underline">
          View all →
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No notifications</p>
      ) : (
        notifications.slice(0, 5).map((n) => (
          <div key={n.id} className={`py-2 border-b border-border last:border-0 ${!n.isRead ? 'opacity-100' : 'opacity-60'}`}>
            <p className="text-xs font-medium">{n.title}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
          </div>
        ))
      )}
    </div>
  );
};

// ─── Quick Actions Widget ─────────────────────────────────────────────────
const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="card-base p-5">
      <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {[
          { label: '📋 View Pipeline', path: '/admin/pipeline' },
          { label: '📅 Schedule', path: '/admin/calendar' },
          { label: '📄 Documents', path: '/admin/documents' },
          { label: '💬 Messages', path: '/admin/messages' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full text-left text-sm px-3 py-2 rounded-md bg-secondary hover:bg-accent transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('active');
  const [stats, setStats] = useState({ totalClients: 0, activeClients: 0, totalApplicants: 0, interviewReady: 0 });
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ businessName: '', email: '', contactName: '', phone: '', contractorType: 'P&D' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientRes, statsRes] = await Promise.all([
        adminApi.getClients({ search: search || undefined, status: tab, all: true }),
        adminApi.getStats(),
      ]);
      setClients(clientRes.data.data);
      setStats(statsRes.data.data);
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="animate-fade-in">
        <PageHeader
          title="Client Dashboard"
          description="Manage all contractor accounts"
          action={<Button onClick={() => setAddModal(true)} icon={<Plus className="w-4 h-4" />}>Add Client</Button>}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Clients" value={stats.totalClients} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
          <StatCard label="Active Clients" value={stats.activeClients} icon={<Users className="w-5 h-5" />} color="text-green-400" />
          <StatCard label="Total Applicants" value={stats.totalApplicants} icon={<Users className="w-5 h-5" />} color="text-yellow-400" />
          <StatCard label="Interview Ready" value={stats.interviewReady} icon={<Users className="w-5 h-5" />} color="text-brand" />
        </div>

        {/* Recent Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <RecentApplicants />
          <RecentNotifications />
          <QuickActions />
        </div>

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

        {/* Client Cards */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : clients.length === 0 ? (
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