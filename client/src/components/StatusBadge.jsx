import { Badge } from './ui/badge';

const SUCCESS = ['active', 'accepted', 'completed', 'paid', 'approved', 'resolved', 'verified'];
const DESTRUCTIVE = ['overdue', 'rejected', 'cancelled', 'canceled', 'failed', 'expired', 'void'];
const WARNING = ['draft', 'pending', 'scheduled', 'approval-pending', 'partially-paid', 'assigned', 'paused'];

function variantFor(value) {
  const key = String(value).toLowerCase().replaceAll(' ', '-').replaceAll('+', '');
  if (SUCCESS.some((s) => key.includes(s))) return 'success';
  if (DESTRUCTIVE.some((s) => key.includes(s))) return 'destructive';
  if (WARNING.some((s) => key.includes(s))) return 'warning';
  return 'secondary';
}

export function StatusBadge({ value }) {
  return <Badge variant={variantFor(value)}>{value}</Badge>;
}
