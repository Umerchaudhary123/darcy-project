import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { applicantsApi, adminApi, aiApi } from '../../../services';
import { PageHeader, SearchInput, StatusBadge, Spinner, EmptyState, Modal, Input, Select, Button, StatCard, Tabs, Pagination, Textarea } from '../../components/ui';
import { formatDate } from '../../../utils';
import type { Applicant, Client, PipelineStats } from '../../../types';
import { Users, Plus, Trash2, Download, Edit2, ChevronDown, ChevronUp, Sparkles, Bot, Upload } from 'lucide-react';

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

const AI_LABELS = {
  high_alignment: 'High alignment',
  good_alignment: 'Good alignment',
  review: 'Review',
  limited_evidence: 'Limited evidence',
} as const;

const AiScoreBadge: React.FC<{ applicant: Applicant }> = ({ applicant }) => {
  if (applicant.aiScore == null) {
    return <span className="text-xs text-muted-foreground">Not screened</span>;
  }

  const color = applicant.aiScore >= 80
    ? 'border-green-500/40 bg-green-500/10 text-green-400'
    : applicant.aiScore >= 65
      ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
      : applicant.aiScore >= 45
        ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
        : 'border-orange-500/40 bg-orange-500/10 text-orange-400';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${color}`}>
      <Sparkles className="w-3 h-3" /> {applicant.aiScore}/100
    </span>
  );
};

// ─── Mobile Applicant Card ────────────────────────────────────────────────
const ApplicantMobileCard: React.FC<{
  applicant: Applicant;
  onEdit: (a: Applicant) => void;
  onDelete: (id: string) => void;
  onScreen: (a: Applicant) => void;
}> = ({ applicant: a, onEdit, onDelete, onScreen }) => {
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
          <AiScoreBadge applicant={a} />
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
          {a.aiAssessment && (
            <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs space-y-1">
              <p className="text-primary font-medium">AI CV summary</p>
              <p className="text-muted-foreground">{a.aiAssessment.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-border">
        <button
          onClick={() => onScreen(a)}
          className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" /> {a.aiScore == null ? 'Screen CV' : 'AI Details'}
        </button>
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
  const [screenModal, setScreenModal] = useState<{ open: boolean; applicant: Applicant | null }>({ open: false, applicant: null });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [screenCriteria, setScreenCriteria] = useState('');
  const [screening, setScreening] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

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

  const openScreen = (applicant: Applicant) => {
    setScreenModal({ open: true, applicant });
    setCvFile(null);
    setScreenCriteria(applicant.aiAssessment?.criteria || '');
  };

  const runScreening = async () => {
    if (!screenModal.applicant || !cvFile) {
      toast.error('Please attach a CV file');
      return;
    }

    const formData = new FormData();
    formData.append('cv', cvFile);
    if (screenCriteria.trim()) formData.append('criteria', screenCriteria.trim());

    setScreening(true);
    try {
      const response = await aiApi.screenApplicant(screenModal.applicant.id, formData);
      setScreenModal({ open: true, applicant: response.data.data });
      setCvFile(null);
      toast.success(`CV screened — AI score ${response.data.data.aiScore}/100`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'AI screening failed');
    } finally {
      setScreening(false);
    }
  };

  const askAssistant = async () => {
    if (assistantQuestion.trim().length < 3) return;
    setAssistantLoading(true);
    setAssistantAnswer('');
    try {
      const response = await aiApi.askAssistant(assistantQuestion.trim(), clientFilter || undefined);
      setAssistantAnswer(response.data.data.answer);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'AI assistant failed');
    } finally {
      setAssistantLoading(false);
    }
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
    <div className="min-w-0 animate-fade-in">
      <PageHeader
        title="Applicant Pipeline"
        description={`${total} applicants`}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAssistantOpen(true)} icon={<Bot className="w-3.5 h-3.5" />}>
              AI Assistant
            </Button>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
        <StatCard label="Ready" value={stats.interviewReady} icon={<Users className="w-5 h-5" />} color="text-green-400" />
        <StatCard label="In Progress" value={stats.inProgress} icon={<Users className="w-5 h-5" />} color="text-yellow-400" />
        <StatCard label="Hired" value={stats.hired} icon={<Users className="w-5 h-5" />} color="text-brand" />
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-2">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search applicants…"
            className="flex-1"
          />
          <select
            value={clientFilter}
            onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
            className="input-field w-full sm:w-52 flex-shrink-0"
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
                onScreen={openScreen}
              />
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Applicant', 'Client', 'AI Score', 'AVP', 'Background', 'Drug', 'Med Card', 'Status', 'Added', 'Actions'].map((h) => (
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
                      <td className="px-4 py-3"><AiScoreBadge applicant={a} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.avpStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.backgroundStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.drugScreenStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.medCardStatus} /></td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={a.pipelineStatus} /></td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openScreen(a)} className="btn-ghost p-1.5 text-primary" title="AI CV screening" aria-label={`Screen CV for ${a.firstName} ${a.lastName}`}>
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(a)} className="btn-ghost p-1.5" aria-label={`Edit ${a.firstName} ${a.lastName}`}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteApplicant(a.id)} className="btn-ghost p-1.5 text-destructive hover:text-destructive" aria-label={`Delete ${a.firstName} ${a.lastName}`}>
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

      {/* CV screening */}
      <Modal
        open={screenModal.open}
        onClose={() => setScreenModal({ open: false, applicant: null })}
        title={`AI CV Screening${screenModal.applicant ? ` — ${screenModal.applicant.firstName} ${screenModal.applicant.lastName}` : ''}`}
        size="lg"
      >
        {screenModal.applicant && (
          <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-5">
            {screenModal.applicant.aiAssessment && (
              <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <AiScoreBadge applicant={screenModal.applicant} />
                  <span className="text-sm font-medium">
                    {screenModal.applicant.aiRecommendation
                      ? AI_LABELS[screenModal.applicant.aiRecommendation]
                      : 'AI assessment'}
                  </span>
                  {screenModal.applicant.resumeFileName && (
                    <span className="text-xs text-muted-foreground">{screenModal.applicant.resumeFileName}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{screenModal.applicant.aiAssessment.summary}</p>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-green-400 mb-2">Strengths</p>
                    <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                      {screenModal.applicant.aiAssessment.strengths.map((item, index) => <li key={`strength-${index}-${item}`}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-400 mb-2">Verify / discuss</p>
                    <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                      {[...screenModal.applicant.aiAssessment.concerns, ...screenModal.applicant.aiAssessment.missingRequirements]
                        .slice(0, 8)
                        .map((item, index) => <li key={`verify-${index}-${item}`}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  {[
                    ['Experience', screenModal.applicant.aiAssessment.scoreBreakdown.relevantExperience, 30],
                    ['Skills', screenModal.applicant.aiAssessment.scoreBreakdown.licensesAndSkills, 25],
                    ['Safety', screenModal.applicant.aiAssessment.scoreBreakdown.safetyAndCompliance, 20],
                    ['History', screenModal.applicant.aiAssessment.scoreBreakdown.workHistory, 15],
                    ['CV clarity', screenModal.applicant.aiAssessment.scoreBreakdown.resumeQuality, 10],
                  ].map(([label, value, max]) => (
                    <div key={String(label)} className="bg-secondary rounded p-2">
                      <p className="text-lg font-semibold">{String(value)}<span className="text-xs text-muted-foreground">/{String(max)}</span></p>
                      <p className="text-xs text-muted-foreground">{String(label)}</p>
                    </div>
                  ))}
                </div>

                {screenModal.applicant.aiAssessment.suggestedInterviewQuestions.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">Suggested interview questions</p>
                    <ol className="space-y-1 text-sm text-muted-foreground list-decimal pl-4">
                      {screenModal.applicant.aiAssessment.suggestedInterviewQuestions.map((item, index) => <li key={`question-${index}-${item}`}>{item}</li>)}
                    </ol>
                  </div>
                )}
                <p className="text-xs text-muted-foreground border-t border-border pt-3">
                  {screenModal.applicant.aiAssessment.disclaimer}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  {screenModal.applicant.aiScore == null ? 'Upload CV' : 'Upload a new CV to re-screen'}
                </label>
                <div className="relative">
                  <Upload className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="file"
                    className="input-field pl-9 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-foreground"
                    accept=".pdf,.docx,.txt"
                    aria-label={`Upload CV for ${screenModal.applicant.firstName} ${screenModal.applicant.lastName}`}
                    onChange={(event) => setCvFile(event.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <Textarea
                label="Role requirements (optional)"
                value={screenCriteria}
                onChange={(event) => setScreenCriteria(event.target.value)}
                placeholder="Leave blank to use the client's P&D/Linehaul criteria, or add specific license and experience requirements."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                CV text is extracted on the backend. OpenRouter's free model is used when configured; a local rubric fallback keeps screening available during free-tier limits. The score is decision support, not an automatic hiring decision.
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setScreenModal({ open: false, applicant: null })}>Close</Button>
          <Button loading={screening} disabled={!cvFile} onClick={runScreening} icon={<Sparkles className="w-4 h-4" />}>
            {screenModal.applicant?.aiScore == null ? 'Analyze CV' : 'Re-analyze CV'}
          </Button>
        </div>
      </Modal>

      {/* Pipeline assistant */}
      <Modal open={assistantOpen} onClose={() => setAssistantOpen(false)} title="Darcy AI Pipeline Assistant" size="lg">
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            Ask about ranked candidates, missing screening steps, interview priorities, or pipeline workload.
            {clientFilter && <span className="text-primary"> The current client filter will be applied.</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              'Who are the top CV matches and why?',
              'Which candidates need human review next?',
              'Summarize missing screening steps.',
            ].map((question) => (
              <button key={question} onClick={() => setAssistantQuestion(question)} className="btn-secondary text-xs px-3 py-2">
                {question}
              </button>
            ))}
          </div>
          <Textarea
            label="Ask the assistant"
            value={assistantQuestion}
            onChange={(event) => setAssistantQuestion(event.target.value)}
            placeholder="Example: Compare the top five applicants using job-relevant evidence."
            rows={3}
          />
          {assistantLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Reviewing pipeline…</div>}
          {assistantAnswer && (
            <div className="rounded-lg bg-secondary p-4 text-sm leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                }}
              >
                {assistantAnswer}
              </ReactMarkdown>
              <p className="text-xs text-muted-foreground border-t border-border mt-4 pt-3">AI assistance only — verify the source data before taking hiring action.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setAssistantOpen(false)}>Close</Button>
          <Button loading={assistantLoading} disabled={assistantQuestion.trim().length < 3} onClick={askAssistant} icon={<Bot className="w-4 h-4" />}>
            Ask AI
          </Button>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Applicant" size="md">
        <div className="max-h-[65vh] sm:max-h-[70vh] overflow-y-auto pr-1 space-y-4">
          <Select
            label="Client *"
            value={addForm.clientId}
            onChange={(e) => setAddForm({ ...addForm, clientId: e.target.value })}
            options={[{ value: '', label: 'Select client…' }, ...clients.map((c) => ({ value: c.id, label: c.businessName }))]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name *" value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} />
            <Input label="Last Name *" value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setAddModal(false)} className="w-full sm:w-auto">Cancel</Button>
          <Button loading={saving} onClick={addApplicant} className="w-full sm:w-auto">Add Applicant</Button>
        </div>
      </Modal>

      {/* Edit Modal — fixed: internal scroll so it never overflows the viewport on any screen size */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, applicant: null })} title="Edit Applicant" size="lg">
        {editModal.applicant && (
          <div className="max-h-[65vh] sm:max-h-[70vh] overflow-y-auto pr-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              <Input label="Last Name" value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <Input label="Phone" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">Vetting Status</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setEditModal({ open: false, applicant: null })} className="w-full sm:w-auto">Cancel</Button>
          <Button loading={saving} onClick={saveEdit} className="w-full sm:w-auto">Save Changes</Button>
        </div>
      </Modal>
    </div>
  );
};
