import { DamageStatus, DamageSeverity } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, SEVERITY_LABELS, SEVERITY_COLORS } from '../../utils/formatters';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: DamageStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: DamageSeverity }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', SEVERITY_COLORS[severity])}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
