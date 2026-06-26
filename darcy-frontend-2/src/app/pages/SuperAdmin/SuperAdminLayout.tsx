import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SidebarLayout } from '../../components/layout/SidebarLayout';
import { adminApi } from '../../../services';
import {
  PageHeader, SearchInput, StatusBadge, Spinner, EmptyState,
  Button, Select, Table, Tr, Td,
} from '../../components/ui';
import { formatDate } from '../../../utils';
import type { Client } from '../../../types';
import { LayoutDashboard, Users, GripVertical, ChevronRight, RefreshCw } from 'lucide-react';

// ─── Super Admin Layout ───────────────────────────────────────────────────
const navItems = [
  { label: 'Client Management', href: '/admin/super-admin', icon: <Users className="w-4 h-4" /> },
  { label: 'Admin Portal', href: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
];

interface LayoutProps { children: React.ReactNode }

export const SuperAdminLayout: React.FC<LayoutProps> = ({ children }) => (
  <SidebarLayout navItems={navItems} title="Super Admin">
    {children}
  </SidebarLayout>
);

// ─── Draggable table row ──────────────────────────────────────────────────
const ITEM = 'SA_CLIENT_ROW';

const DraggableRow: React.FC<{
  client: Client;
  index: number;
  onMove: (from: number, to: number) => void;
  onDrop: () => void;
  onView: (id: string) => void;
}> = ({ client, index, onMove, onDrop, onView }) => {
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

  return (
    <Tr key={client.id} className={isDragging ? 'opacity-40' : ''}>
      <Td>
        <div ref={(node) => { drag(drop(node)); }} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </Td>
      <Td>
        <div>
          <p className="font-medium text-sm">{client.businessName}</p>
          <p className="text-xs text-muted-foreground">{client.email}</p>
        </div>
      </Td>
      <Td><span className="text-xs text-muted-foreground">{client.contractorType}</span></Td>
      <Td><span className="text-xs text-muted-foreground">{client.contactName || '—'}</span></Td>
      <Td><StatusBadge status={client.status} /></Td>
      <Td>
        <div className="text-xs text-muted-foreground">
          <span className="text-green-400 font-medium">{client.applicants?.filter((a) => a.pipelineStatus === 'interview_ready').length || 0}</span>
          /{client.applicants?.length || 0}
        </div>
      </Td>
      <Td><span className="text-xs text-muted-foreground">{formatDate(client.createdAt)}</span></Td>
      <Td>
        <button onClick={() => onView(client.id)} className="btn-ghost p-1.5">
          <ChevronRight className="w-4 h-4" />
        </button>
      </Td>
    </Tr>
  );
};

// ─── Super Admin Clients Page ─────────────────────────────────────────────
export const SuperAdminClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async (reset = true) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await adminApi.getClients({
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        cursor: reset ? undefined : cursor || undefined,
        limit: 20,
      });
      const newClients = res.data.data;
      if (reset) setClients(newClients);
      else setClients((prev) => [...prev, ...newClients]);
      setHasMore(!!res.data.meta?.hasMore);
      setCursor(res.data.meta?.nextCursor || null);
    } catch { } finally {
      if (reset) setLoading(false); else setLoadingMore(false);
    }
  }, [search, status, cursor]);

  useEffect(() => { load(true); }, [search, status]);

  const moveRow = (from: number, to: number) => {
    setClients((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setOrderDirty(true);
  };

  const saveOrder = async () => {
    try {
      await adminApi.updateDisplayOrder(clients.map((c) => c.id));
      setOrderDirty(false);
      toast.success('Display order saved — synced with Admin portal');
    } catch { toast.error('Failed to save order'); }
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'invited', label: 'Invited' },
    { value: 'pending', label: 'Pending' },
    { value: 'archived', label: 'Archived' },
    { value: 'suspended', label: 'Suspended' },
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="animate-fade-in">
        <PageHeader
          title="Client Management"
          description={`${clients.length} clients • Drag to reorder (synced with Admin portal)`}
          action={
            orderDirty ? (
              <Button size="sm" onClick={saveOrder} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Save Order
              </Button>
            ) : undefined
          }
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <SearchInput value={search} onChange={(v) => setSearch(v)} placeholder="Search clients…" className="sm:w-72" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} className="sm:w-44" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : clients.length === 0 ? (
          <EmptyState icon={<Users className="w-12 h-12" />} title="No clients found" description="Try adjusting your filters." />
        ) : (
          <div className="card-base overflow-hidden">
            <Table headers={['⠿', 'Business', 'Type', 'Contact', 'Status', 'Ready/Total', 'Joined', '']}>
              {clients.map((c, i) => (
                <DraggableRow
                  key={c.id}
                  client={c}
                  index={i}
                  onMove={moveRow}
                  onDrop={() => setOrderDirty(true)}
                  onView={(id) => navigate(`/admin/client/${id}`)}
                />
              ))}
            </Table>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button variant="secondary" loading={loadingMore} onClick={() => load(false)}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </DndProvider>
  );
};
