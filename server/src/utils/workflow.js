import { AppError } from './AppError.js';
export function assertTransition(current, next, transitions, label = 'Record') {
  if (!next || next === current) return;
  const allowed = transitions[current] || [];
  if (!allowed.includes(next))
    throw new AppError(
      409,
      label + ' cannot move from ' + current + ' to ' + next,
      'INVALID_STATUS_TRANSITION',
    );
}
