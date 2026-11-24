import React, { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { X, AlertTriangle, Loader2, Inbox, Sparkles, type LucideIcon } from 'lucide-react';

export interface CardProps {
  children?: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`faisaa-card finora-card bg-[#111218] border border-white/[0.06] rounded-2xl p-5 transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-white/[0.14] hover:bg-[#14161e] active:scale-[0.995]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'emerald' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40 shadow-xs shadow-indigo-600/20',
    secondary:
      'bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.1] text-zinc-200 border border-white/[0.08]',
    emerald:
      'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 shadow-xs shadow-emerald-600/20',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20',
    ghost: 'hover:bg-white/[0.05] text-zinc-400 hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-3.5 py-2 text-xs sm:text-sm rounded-xl gap-2',
    lg: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export interface BadgeProps {
  children?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple' | 'blue';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const styles = {
    default: 'bg-white/[0.05] text-zinc-300 border-white/[0.08]',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    purple: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    blue: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border tracking-tight ${
        styles[variant] || styles.default
      } ${className}`}
    >
      {children}
    </span>
  );
}

export interface ProgressBarProps {
  value?: number;
  color?: string;
  height?: string;
  className?: string;
}

export function ProgressBar({ value = 0, color = '#6366F1', height = 'h-1.5', className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className={`w-full bg-white/[0.06] rounded-full overflow-hidden ${height} ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${clamped}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`faisaa-card finora-card w-full ${maxWidth} bg-[#111218] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col`}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto sm:hidden mt-2.5 mb-0.5" />
        <div className="flex items-center justify-between px-5 py-3.5 sm:py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmLabel = 'Delete',
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export interface EmptyStateTemplate {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  badge?: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  templatesTitle?: string;
  templates?: EmptyStateTemplate[];
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  templatesTitle,
  templates,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-5 sm:px-8 rounded-2xl border border-dashed border-white/[0.09] bg-gradient-to-b from-white/[0.02] to-transparent relative overflow-hidden ${className}`}
    >
      {/* Subtle ambient glow behind icon */}
      <div className="absolute top-8 w-24 h-24 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

      <div className="relative w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] shadow-inner shadow-white/[0.05] flex items-center justify-center text-indigo-400 mb-3.5">
        <Icon className="w-6 h-6" />
      </div>

      <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
      {description && (
        <p className="text-xs text-zinc-400 max-w-md mt-1.5 mb-5 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mb-2">{action}</div>}

      {/* Actionable Starter Templates Grid */}
      {templates && templates.length > 0 && (
        <div className="w-full max-w-2xl mt-6 pt-6 border-t border-white/[0.06] text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-center mb-3.5 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {templatesTitle || 'Or pick a quick-start template:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {templates.map((tmpl, idx) => {
              const TmplIcon = tmpl.icon || Sparkles;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={tmpl.onClick}
                  className="group p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left flex items-start gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-500/20 flex items-center justify-center shrink-0 transition-transform">
                    <TmplIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold text-white group-hover:text-indigo-200 truncate">
                        {tmpl.title}
                      </span>
                      {tmpl.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium shrink-0">
                          {tmpl.badge}
                        </span>
                      )}
                    </div>
                    {tmpl.description && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 leading-normal">
                        {tmpl.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2.5">
      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonMetric,
  SkeletonTable,
  SkeletonChart,
  SkeletonList,
} from './Skeleton';

export { AnimatedNumber } from './AnimatedNumber';
export {
  InstitutionLogo,
  INSTITUTIONS,
  findInstitution,
} from './InstitutionLogo';
export type { InstitutionMeta, InstitutionLogoProps } from './InstitutionLogo';
