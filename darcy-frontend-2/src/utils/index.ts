import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...opts,
  });
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getPipelineStatusLabel(status: string): string {
  const map: Record<string, string> = {
    in_progress: 'In Progress',
    interview_ready: 'Interview Ready',
    disqualified: 'Disqualified',
  };
  return map[status] || status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-green-400',
    invited: 'text-blue-400',
    pending: 'text-yellow-400',
    archived: 'text-gray-400',
    suspended: 'text-red-400',
    in_progress: 'text-yellow-400',
    interview_ready: 'text-green-400',
    disqualified: 'text-red-400',
    approved: 'text-green-400',
    rejected: 'text-red-400',
    clear: 'text-green-400',
    passed: 'text-green-400',
    negative: 'text-green-400',
    verified: 'text-green-400',
    failed: 'text-red-400',
    positive: 'text-red-400',
    expired: 'text-red-400',
  };
  return map[status] || 'text-gray-400';
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    interview_ready: 'badge-ready',
    in_progress: 'badge-progress',
    disqualified: 'badge-disqualified',
    pending: 'badge-pending',
    approved: 'badge-ready',
    rejected: 'badge-disqualified',
    active: 'badge-ready',
    invited: 'badge-progress',
    suspended: 'badge-disqualified',
    archived: 'badge-pending',
  };
  return map[status] || 'badge-pending';
}

export function truncate(str: string, len = 50): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms = 300
): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout>;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}