export const ATTENDANCE_STATUS = [
  { key: 'all', label: 'All' },
  { key: 'Present', label: 'Present' },
  { key: 'Late', label: 'Late' },
  { key: 'Half Day', label: 'Half Day' },
  { key: 'Absent', label: 'Absent' },
  { key: 'On Leave', label: 'On Leave' },
];

export const ATTENDANCE_WRITE_STATUSES = ATTENDANCE_STATUS.filter((s) => s.key !== 'all');

export const statusChipColor = (s) => {
  if (s === 'Present') return 'success';
  if (s === 'Late') return 'warning';
  if (s === 'Half Day') return 'info';
  if (s === 'Absent') return 'error';
  if (s === 'On Leave') return 'default';
  return 'default';
};

export const formatTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
};

export const extractTimeHHMM = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const extractDateYMD = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};