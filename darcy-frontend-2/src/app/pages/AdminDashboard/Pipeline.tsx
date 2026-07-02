import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { applicantsApi, adminApi } from '../../../services';
import { PageHeader, SearchInput, StatusBadge, Spinner, EmptyState, Modal, Input, Select, Button, StatCard, Tabs, Pagination } from '../../components/ui';
import { formatDate } from '../../../utils';
import type { Applicant, Client, PipelineStats } from '../../../types';
import { Users, Plus, Trash2, Download, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

const VETTING_OPTIONS = {
  avpStatus: [
    { value: 'pending', label: 'Pending' },
    { value: 'passed', label: 'Passed' },
    { value: 'failed', label: 'Failed' },
    { value: 'waived', label: 'Waived' },
  ],
  backgroundStatus: [
    { value: 'pending', label: 'Pending' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'clear', label: 'Clear' },
    { value: 'consider', label: 'Consider' },
    { value: 'failed', label: 'Failed' },
  ],
  drugScreenStatus: [
    { value: 'pending', label: 'Pending' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'negative', label: 'Negative' },
    { value: 'positive', label: 'Positive' },
    { value: 'failed', label: 'Failed' },
  ],
  medCardStatus: [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'expired', label: 'Expired' },
    { value: 'missing', label: 'Missing' },
    { value: 'failed', label: 'Failed' },
  ],
  hireStatus: [
    { value: '', label: 'Not Set' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' },
  ],
};

// ─── Mobile Applicant Card ────────────────────────────────────────────────
const ApplicantMobileCard: React.FC<{
  applicant: Applicant;
  onEdit: (a: Applicant) => void;
  onDelete: (id: string) => void;
}> = ({ applicant: a, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-base p-4 space-y-3">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
            {a.firstName?.[0]}{a.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{a.firstName} {a.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{a.email || a.phone || '—'}</p>
            <p className="text-xs text-muted-foreground truncate">{(a.client as any)?.businessName || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <StatusBadge status={a.pipelineStatus} />
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost p-1.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quick Status Row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-secondary rounded p-2">
          <p className="text-muted-foreground mb-1">AVP</p>
          <StatusBadge status={a.avpStatus} />
        </div>
        <div className="bg-secondary rounded p-2">
          <p className="text-muted-foreground mb-1">Background</p>
          <StatusBadge status={a.backgroundStatus} />
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-secondary rounded p-2">
              <p className="text-muted-foreground mb-1">Drug Screen</p>
              <StatusBadge status={a.drugScreenStatus} />
            </div>
            <div className="bg-secondary rounded p-2">
              <p className="text-muted-foreground mb-1">Med Card</p>
              <StatusBadge status={a.medCardStatus} />
            </div>
          </div>
          <div className="bg-secondary rounded p-2 text-xs">
            <p className="text-muted-foreground mb-1">Added</p>
            <p className="font-medium">{formatDate(a.createdAt)}</p>
          </div>
          {a.adminNotes && (
            <div className="bg-secondary rounded p-2 text-xs">
              <p className="text-muted-foreground mb-1">Notes</p>
              <p>{a.adminNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-border">
        <button
          onClick={() => onEdit(a)}
          className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={() => onDelete(a.id)}
          className="flex-1 text-xs py-2 flex items-center justify-center gap-1.5 rounded-md border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
};

// ─── Admin Pipeline ───────────────────────────────────────────────────────
export const AdminPipeline: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<PipelineStats>({ total: 0, interviewReady: 0, inProgress: 0, disqualified: 0, hired: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; applicant: Applicant | null }>({ open: false, applicant: null });
  const [addForm, setAddForm] = useState({ clientId: '', firstName: '', lastName: '', email: '', phone: '', source: 'Direct' });
  const [editForm, setEditForm] = useState<Partial<Applicant>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, statRes] = await Promise.all([
        applicantsApi.getAll({
          search: search || undefined,
          status: tab !== 'all' ? tab : undefined,
          clientId: clientFilter || undefined,
          page, limit: 15,
        }),
        applicantsApi.getStats(clientFilter || undefined),
      ]);
      setApplicants(appRes.data.data);
      setStats(statRes.data.data);
      setTotal(appRes.data.meta?.total || 0);
      setPages(appRes.data.meta?.pages || 1);
    } catch { } finally { setLoading(false); }
  }, [search, tab, clientFilter, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.getClients({ all: true }).then((r) => setClients(r.data.data)).catch(() => { });
  }, []);

  const addApplicant = async () => {
    if (!addForm.clientId || !addForm.firstName || !addForm.lastName) {
      toast.error('Client, first and last name required'); return;
    }
    setSaving(true);
    try {
      await applicantsApi.create(addForm);
      toast.success('Applicant added');
      setAddModal(false);
      setAddForm({ clientId: '', firstName: '', lastName: '', email: '', phone: '', source: 'Direct' });
      load();
    } catch { toast.error('Failed to add applicant'); } finally { setSaving(false); }
  };

  const openEdit = (a: Applicant) => {
    setEditModal({ open: true, applicant: a });
    setEditForm({ ...a });
  };

  const saveEdit = async () => {
    if (!editModal.applicant) return;
    setSaving(true);
    try {
      await applicantsApi.update(editModal.applicant.id, editForm);
      toast.success('Applicant updated');
      setEditModal({ open: false, applicant: null });
      load();
    } catch { toast.error('Failed to update'); } finally { setSaving(false); }
  };

  const deleteApplicant = async (id: string) => {
    if (!confirm('Delete this applicant?')) return;
    try {
      await applicantsApi.delete(id);
      toast.success('Applicant deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const exportCsv = async () => {
    try {
      const res = await applicantsApi.exportCsv(clientFilter || undefined);
      const url = URL.createObjectURL(new Blob([res.data as any]));
      const a = document.createElement('a');
      a.href = url; a.download = 'applicants.csv'; a.click();
    } catch { toast.error('Export failed'); }
  };

  const tabs = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'interview_ready', label: 'Ready', count: stats.interviewReady },
    { id: 'in_progress', label: 'Progress', count: stats.inProgress },
    { id: 'disqualified', label: 'DQ', count: stats.disqualified },
  ];

  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map((c) => ({ value: c.id, label: c.businessName })),
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Applicant Pipeline"
        description={`${total} applicants`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv} icon={<Download className="w-3.5 h-3.5" />}>
              Export
            </Button>
            <Button size="sm" onClick={() => setAddModal(true)} icon={<Plus className="w-4 h-4" />}>
              Add
            </Button>
          </div>
        }
      />

      {/* Stats — 2 col mobile, 4 col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
        <StatCard label="Ready" value={stats.interviewReady} icon={<Users className="w-5 h-5" />} color="text-green-400" />
        <StatCard label="In Progress" value={stats.inProgress} icon={<Users className="w-5 h-5" />} color="text-yellow-400" />
        <StatCard label="Hired" value={stats.hired} icon={<Users className="w-5 h-5" />} color="text-brand" />
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-5">
        <div className="flex gap-2">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search applicants…"
            className="flex-1"
          />
          <select
            value={clientFilter}
            onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
            className="input-field w-36 sm:w-52 flex-shrink-0"
          >
            {clientOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <Tabs tabs={tabs} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : applicants.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No applicants found"
          action={<Button onClick={() => setAddModal(true)}>Add First Applicant</Button>}
        />
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block lg:hidden space-y-3">
            {applicants.map((a) => (
              <ApplicantMobileCard
                key={a.id}
                applicant={a}
                onEdit={openEdit}
                onDelete={deleteApplicant}
              />
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Applicant', 'Client', 'AVP', 'Background', 'Drug', 'Med Card', 'Status', 'Added', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applicants.map((a) => (
                    <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{a.firstName} {a.lastName}</p>
                          <p className="text-xs text-muted-foreground">{a.email || a.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{(a.client as any)?.businessName || '—'}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.avpStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.backgroundStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.drugScreenStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.medCardStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.pipelineStatus} /></td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(a)} className="btn-ghost p-1.5">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteApplicant(a.id)} className="btn-ghost p-1.5 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Pagination page={page} pages={pages} onPage={setPage} />

      {/* Add Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Applicant" size="md">
        <div className="space-y-4">
          <Select
            label="Client *"
            value={addForm.clientId}
            onChange={(e) => setAddForm({ ...addForm, clientId: e.target.value })}
            options={[{ value: '', label: 'Select client…' }, ...clients.map((c) => ({ value: c.id, label: c.businessName }))]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} />
            <Input label="Last Name *" value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            <Input label="Phone" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
          </div>
          <Select
            label="Source"
            value={addForm.source}
            onChange={(e) => setAddForm({ ...addForm, source: e.target.value })}
            options={[
              { value: 'Direct', label: 'Direct' },
              { value: 'Indeed', label: 'Indeed' },
              { value: 'Referral', label: 'Referral' },
              { value: 'Other', label: 'Other' },
            ]}
          />
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
          <Button loading={saving} onClick={addApplicant}>Add Applicant</Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, applicant: null })} title="Edit Applicant" size="lg">
        {editModal.applicant && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              <Input label="Last Name" value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <Input label="Phone" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">Vetting Status</p>
              <div className="grid grid-cols-2 gap-4">
                <Select label="AVP Status" value={editForm.avpStatus || 'pending'}
                  onChange={(e) => setEditForm({ ...editForm, avpStatus: e.target.value as any })}
                  options={VETTING_OPTIONS.avpStatus} />
                <Select label="Background" value={editForm.backgroundStatus || 'pending'}
                  onChange={(e) => setEditForm({ ...editForm, backgroundStatus: e.target.value as any })}
                  options={VETTING_OPTIONS.backgroundStatus} />
                <Select label="Drug Screen" value={editForm.drugScreenStatus || 'pending'}
                  onChange={(e) => setEditForm({ ...editForm, drugScreenStatus: e.target.value as any })}
                  options={VETTING_OPTIONS.drugScreenStatus} />
                <Select label="Med Card" value={editForm.medCardStatus || 'pending'}
                  onChange={(e) => setEditForm({ ...editForm, medCardStatus: e.target.value as any })}
                  options={VETTING_OPTIONS.medCardStatus} />
              </div>
            </div>
            <Select
              label="Hire Status"
              value={editForm.hireStatus || ''}
              onChange={(e) => setEditForm({ ...editForm, hireStatus: e.target.value as any || undefined })}
              options={VETTING_OPTIONS.hireStatus}
            />
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Admin Notes</label>
              <textarea
                value={editForm.adminNotes || ''}
                onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Internal notes…"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setEditModal({ open: false, applicant: null })}>Cancel</Button>
          <Button loading={saving} onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>
    </div>
  );
};