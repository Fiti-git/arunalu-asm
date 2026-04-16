import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogActions, Box, Typography, IconButton,
  CircularProgress, Alert, Chip, Divider, Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from 'utils/api';
import { formatTime, formatDate } from './shared';

const statusColor = (s) => {
  if (s === 'Applied') return 'success';
  if (s === 'Pending') return 'warning';
  if (s === 'Approved') return 'info';
  if (s === 'Rejected') return 'error';
  return 'default';
};

function DiffRow({ label, before, after }) {
  const changed = before !== after;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 1, py: 0.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ textDecoration: changed ? 'line-through' : 'none', color: changed ? 'text.disabled' : 'text.primary' }}>
        {before || '—'}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: changed ? 700 : 400, color: changed ? 'primary.main' : 'text.primary' }}>
        {after || '—'}
      </Typography>
    </Box>
  );
}

export default function ModificationHistoryDialog({ open, attendanceId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({ logs: [], is_locked: false, lock_days: 45 });

  useEffect(() => {
    if (!open || !attendanceId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get(`/api/attendance/v3/${attendanceId}/modifications/`)
      .then((res) => { if (!cancelled) setData(res.data || { logs: [] }); })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load history.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, attendanceId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5">Modification History</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Attendance #{attendanceId} · {data.logs?.length || 0} entr{(data.logs?.length || 0) === 1 ? 'y' : 'ies'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </Box>
      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (data.logs?.length || 0) === 0 && (
          <Alert severity="info">No modifications have been recorded for this attendance record.</Alert>
        )}
        {!loading && !error && data.logs?.map((log) => {
          const o = log.original || {};
          const p = log.proposed || {};
          return (
            <Box key={log.log_id} sx={{
              p: 2, mb: 2, border: 1, borderColor: 'divider', borderRadius: 2,
              bgcolor: 'background.paper',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Chip label={log.status} size="small" color={statusColor(log.status)} sx={{ fontWeight: 600 }} />
                <Typography variant="body2" fontWeight={600}>
                  {log.requested_by || 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {log.requested_at ? new Date(log.requested_at).toLocaleString() : ''}
                </Typography>
                {log.reviewed_by && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    Reviewed by {log.reviewed_by} · {log.reviewed_at ? new Date(log.reviewed_at).toLocaleString() : ''}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 1, pb: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Field</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Original</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Proposed</Typography>
              </Box>

              <DiffRow label="Date" before={formatDate(o.date)} after={formatDate(p.date)} />
              <DiffRow label="Check-in" before={`${formatDate(o.check_in_time)} ${formatTime(o.check_in_time)}`}
                after={`${formatDate(p.check_in_time)} ${formatTime(p.check_in_time)}`} />
              <DiffRow label="Check-out" before={`${formatDate(o.check_out_time)} ${formatTime(o.check_out_time)}`}
                after={`${formatDate(p.check_out_time)} ${formatTime(p.check_out_time)}`} />
              <DiffRow label="Status" before={o.status} after={p.status} />

              {log.reason && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  <strong>Reason:</strong> {log.reason}
                </Typography>
              )}
              {log.review_note && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  <strong>Review note:</strong> {log.review_note}
                </Typography>
              )}
            </Box>
          );
        })}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}