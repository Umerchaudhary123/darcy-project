import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, FileText, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { applicantsApi, documentsApi, conversationsApi, notificationsApi } from '../../../services';
import { StatCard, StatusBadge, PageHeader, Spinner } from '../../components/ui';
import { formatDate, formatDateTime } from '../../../utils';
import type { Applicant, Document, Notification } from '../../../types';

export const ClientDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({ total: 0, interviewReady: 0, inProgress: 0, disqualified: 0, hired: 0 });
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [appRes, statRes, docRes, notifRes] = await Promise.all([
          applicantsApi.getMy({ limit: 5 }),
          applicantsApi.getStats(),
          documentsApi.getMy(),
          notificationsApi.getAll({ limit: 5 }),
        ]);
        setApplicants(appRes.data.data);
        setStats(statRes.data.data);
        setDocs(docRes.data.data.slice(0, 4));
        setNotifications(notifRes.data.data);
        setUnread(notifRes.data.meta?.unreadCount || 0);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'} 👋`}
        description="Here's what's happening with your driver pipeline."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Applicants" value={stats.total} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
        <StatCard label="Interview Ready" value={stats.interviewReady} icon={<Users className="w-5 h-5" />} color="text-green-400" trend="Passed all vetting" />
        <StatCard label="In Progress" value={stats.inProgress} icon={<Users className="w-5 h-5" />} color="text-yellow-400" />
        <StatCard label="Hired" value={stats.hired} icon={<Users className="w-5 h-5" />} color="text-brand" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Applicants */}
        <div className="lg:col-span-2 card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Applicants</h2>
            <Link to="/pipeline" className="text-xs text-brand hover:underline">View all →</Link>
          </div>
          {applicants.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No applicants yet. Darcy Staffing is building your pipeline.</p>
          ) : (
            <div className="space-y-3">
              {applicants.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                    {a.firstName[0]}{a.lastName[0]}
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
                {unread > 0 && <span className="bg-brand text-white text-xs px-1.5 py-0.5 rounded-full">{unread}</span>}
              </h2>
              <Link to="/notifications" className="text-xs text-brand hover:underline">View all →</Link>
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

          {/* Quick Links */}
          <div className="card-base p-5">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'View Pipeline', href: '/pipeline', icon: <Users className="w-4 h-4" /> },
                { label: 'Schedule', href: '/calendar', icon: <Calendar className="w-4 h-4" /> },
                { label: 'Documents', href: '/documents', icon: <FileText className="w-4 h-4" /> },
                { label: 'Messages', href: '/messages', icon: <MessageSquare className="w-4 h-4" /> },
              ].map((q) => (
                <Link key={q.href} to={q.href}
                  className="flex flex-col items-center gap-2 p-4 bg-secondary hover:bg-accent rounded-lg transition-colors text-xs text-muted-foreground hover:text-foreground">
                  {q.icon}
                  {q.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Documents */}
          {docs.length > 0 && (
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Recent Documents</h2>
                <Link to="/documents" className="text-xs text-brand hover:underline">View all →</Link>
              </div>
              <div className="space-y-2">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate flex-1 text-xs">{d.originalName}</span>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
