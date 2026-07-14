import React from 'react';
import { cn } from '../../../utils';

// ─── Button ────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brand hover:bg-brand-dark text-white',
    secondary: 'bg-secondary hover:bg-accent text-foreground border border-border',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent',
    danger: 'bg-destructive hover:bg-red-700 text-white',
    outline: 'border border-brand text-brand hover:bg-brand hover:text-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
};

// ─── Input ────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className, id, ...props }) => (
  <div className="w-full">
    {label && <label htmlFor={id} className="block text-sm text-muted-foreground mb-1.5">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
      <input
        id={id}
        className={cn(
          'input-field',
          icon && 'pl-10',
          error && 'border-destructive focus:ring-destructive',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-destructive text-xs mt-1">{error}</p>}
  </div>
);

// ─── Select ──────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, id, ...props }) => (
  <div className="w-full">
    {label && <label htmlFor={id} className="block text-sm text-muted-foreground mb-1.5">{label}</label>}
    <select id={id} className={cn('input-field', error && 'border-destructive', className)} {...props}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-destructive text-xs mt-1">{error}</p>}
  </div>
);

// ─── Textarea ─────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, id, ...props }) => (
  <div className="w-full">
    {label && <label htmlFor={id} className="block text-sm text-muted-foreground mb-1.5">{label}</label>}
    <textarea
      id={id}
      className={cn('input-field min-h-[100px] resize-y', error && 'border-destructive', className)}
      {...props}
    />
    {error && <p className="text-destructive text-xs mt-1">{error}</p>}
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────
interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, label, className }) => {
  const colorMap: Record<string, string> = {
    interview_ready: 'bg-green-500/20 text-green-400 border-green-500/30',
    in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    disqualified: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    invited: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
    archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    clear: 'bg-green-500/20 text-green-400 border-green-500/30',
    passed: 'bg-green-500/20 text-green-400 border-green-500/30',
    negative: 'bg-green-500/20 text-green-400 border-green-500/30',
    verified: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    positive: 'bg-red-500/20 text-red-400 border-red-500/30',
    ordered: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    waived: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    hired: 'bg-green-500/20 text-green-400 border-green-500/30',
    consider: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  const labelMap: Record<string, string> = {
    interview_ready: 'Interview Ready',
    in_progress: 'In Progress',
    disqualified: 'Disqualified',
  };

  const display = label || labelMap[status] || status.replace(/_/g, ' ');
  const colorClass = colorMap[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border capitalize', colorClass, className)}>
      {display}
    </span>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={cn('animate-spin rounded-full border-2 border-border border-t-primary', sizes[size], className)} />
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <div onClick={onClick} className={cn('card-base p-5', onClick && 'cursor-pointer hover:border-primary/50 transition-colors', className)}>
    {children}
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-card border border-border rounded-xl shadow-2xl animate-slide-up', sizes[size])}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }> = ({
  icon, title, description, action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="text-muted-foreground mb-4 opacity-50">{icon}</div>}
    <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
    {action}
  </div>
);

// ─── Stats Card ────────────────────────────────────────────────────────────
export const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  trend?: string;
}> = ({ label, value, icon, color = 'text-primary', trend }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('p-2 rounded-lg bg-secondary', color)}>{icon}</span>
    </div>
    <div className="text-2xl font-bold">{value}</div>
    {trend && <div className="text-xs text-muted-foreground">{trend}</div>}
  </div>
);

// ─── Table ────────────────────────────────────────────────────────────────
export const Table: React.FC<{
  headers: string[];
  children: React.ReactNode;
  className?: string;
}> = ({ headers, children, className }) => (
  <div className={cn('overflow-x-auto', className)}>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          {headers.map((h) => (
            <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">{children}</tbody>
    </table>
  </div>
);

export const Tr: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <tr onClick={onClick} className={cn('hover:bg-accent/30 transition-colors', onClick && 'cursor-pointer', className)}>
    {children}
  </tr>
);

export const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={cn('px-4 py-3 text-foreground', className)}>{children}</td>
);

// ─── Page Header ──────────────────────────────────────────────────────────
export const PageHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

// ─── Loading Screen ───────────────────────────────────────────────────────
export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading…' }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  </div>
);

// ─── Alert ────────────────────────────────────────────────────────────────
export const Alert: React.FC<{
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ type = 'info', title, children, className }) => {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
  };

  return (
    <div className={cn('border rounded-lg p-4', styles[type], className)}>
      {title && <p className="font-medium mb-1">{title}</p>}
      <div className="text-sm opacity-90">{children}</div>
    </div>
  );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────
export const Tabs: React.FC<{
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex max-w-full flex-wrap gap-1 bg-secondary rounded-lg p-1">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={cn(
          'flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          active === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t.label}
        {t.count !== undefined && (
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full', active === t.id ? 'bg-primary/20 text-primary' : 'bg-border text-muted-foreground')}>
            {t.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ─── Search Input ─────────────────────────────────────────────────────────
export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search…', className }) => (
  <div className={cn('relative', className)}>
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-field pl-10"
    />
  </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────
export const Pagination: React.FC<{
  page: number;
  pages: number;
  onPage: (p: number) => void;
}> = ({ page, pages, onPage }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 mt-4">
      <button disabled={page === 1} onClick={() => onPage(page - 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Prev</button>
      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
      <button disabled={page === pages} onClick={() => onPage(page + 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Next →</button>
    </div>
  );
};
