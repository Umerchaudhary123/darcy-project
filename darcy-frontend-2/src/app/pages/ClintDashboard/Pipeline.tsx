import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { applicantsApi } from '../../../services';
import { PageHeader, SearchInput, StatusBadge, Spinner, EmptyState, Pagination, Modal, Textarea, Button, Tabs } from '../../components/ui';
import { formatDate } from '../../../utils';
import type { Applicant } from '../../../types';
import { Users } from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'interview_ready', label: 'Interview Ready' },
  { id: 'disqualified', label: 'Disqualified' },
];

const VettingField: React.FC<{ label: string; status: string }> = ({ label, status }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground">{label}</span>
    <StatusBadge status={status} />
  </div>
);

export const ClientPipeline: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [noteModal, setNoteModal] = useState<{ open: boolean; applicant: Applicant | null }>({ open: false, applicant: null });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await applicantsApi.getMy({
        search: search || undefined,
        status: tab !== 'all' ? tab : undefined,
        page,
        limit: 10,
      });
      setApplicants(res.data.data);
      setTotal(res.data.meta?.total || 0);
      setPages(res.data.meta?.pages || 1);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [search, tab, page]);

  useEffect(() => { load(); }, [load]);

  const openNote = (a: Applicant) => {
    setNoteModal({ open: true, applicant: a });
    setNote(a.clientNotes || '');
  };

  const saveNote = async () => {
    if (!noteModal.applicant) return;
    setSaving(true);
    try {
      await applicantsApi.addClientNote(noteModal.applicant.id, note);
      toast.success('Note saved');
      setNoteModal({ open: false, applicant: null });
      load();
    } catch { toast.error('Failed to save note'); } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Applicant Pipeline" description={`${total} applicants in your pipeline`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name…" className="sm:w-72" />
        <Tabs tabs={TABS} active={tab} onChange={(t) => { setTab(t); setPage(1); }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : applicants.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} title="No applicants found" description="Darcy Staffing is actively recruiting for you." />
      ) : (
        <div className="space-y-3">
          {applicants.map((a) => (
            <div key={a.id} className="card-base p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold flex-shrink-0">
                  {a.firstName[0]}{a.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold">{a.firstName} {a.lastName}</h3>
                    <StatusBadge status={a.pipelineStatus} />
                    {a.hireStatus && <StatusBadge status={a.hireStatus} label={a.hireStatus} />}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                    {a.email && <span>{a.email}</span>}
                    {a.phone && <span>{a.phone}</span>}
                    <span>Added {formatDate(a.createdAt)}</span>
                    {a.interviewDate && <span className="text-green-400">Interview: {formatDate(a.interviewDate)}</span>}
                  </div>
                  {/* Vetting status (read-only) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-secondary rounded-lg mb-3">
                    <VettingField label="AVP" status={a.avpStatus} />
                    <VettingField label="Background" status={a.backgroundStatus} />
                    <VettingField label="Drug Screen" status={a.drugScreenStatus} />
                    <VettingField label="Med Card" status={a.medCardStatus} />
                  </div>
                  {a.clientNotes && (
                    <div className="text-xs text-muted-foreground bg-secondary rounded p-2 mb-2">
                      <span className="text-foreground font-medium">My Note: </span>{a.clientNotes}
                    </div>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => openNote(a)}>
                  {a.clientNotes ? 'Edit Note' : 'Add Note'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={pages} onPage={setPage} />

      <Modal open={noteModal.open} onClose={() => setNoteModal({ open: false, applicant: null })} title="Add Note">
        <p className="text-sm text-muted-foreground mb-3">
          Note for <strong>{noteModal.applicant?.firstName} {noteModal.applicant?.lastName}</strong>
        </p>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter your note…" rows={4} />
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => setNoteModal({ open: false, applicant: null })}>Cancel</Button>
          <Button loading={saving} onClick={saveNote}>Save Note</Button>
        </div>
      </Modal>
    </div>
  );
};
