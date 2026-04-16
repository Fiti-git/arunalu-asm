import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, Alert, CircularProgress, Avatar, Tooltip,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogContent, DialogActions,
  IconButton, Divider, TextField, Snackbar,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { getInitials } from '../assign/leave/shared';
import { formatDate, formatTime } from './shared';

const statusColor = (s) => {
  if (s === 'Pending') return 'warning';
  if (s === 'Approved') return 'info';
  if (s === 'Rejected') return 'error';
  if (s === 'Applied') return 'success';
  return 'default';
};

function DiffTable({ original, proposed }) {
  const row = (label, before, after) => {
    const changed = (before || '') !== (after || '');
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 1, py: 0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" sx={{ textDecoration: changed ? 'line-through' : 'none', color: changed ? 'text.disabled' : 'text.primary' }}>
          {before || '—'}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: changed ? 700 : 400, color: changed ? 'primary.main' : 'text.primary' }}>
          {after || '—'}
        </Typography>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 1, pb: 0.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Field</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Original</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Proposed</Typography>
      </Box>
      {row('Date', formatDate(original.date), formatDate(proposed.date))}
      {row('Check-in', `${formatDate(original.check_in_time)} ${formatTime(original.check_in_time)}`,
        `${formatDate(proposed.check_in_time)} ${formatTime(proposed.check_in_time)}`)}
      {row('Check-out', `${formatDate(original.check_out_time)} ${formatTime(original.check_out_time)}`,
        `${formatDate(proposed.check_out_time)} ${formatTime(proposed.check_out_time)}`)}
      {row('Status', original.status, proposed.status)}
    </Box>
  );
}

export default function AttendanceApprovalsTab() {
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [reviewDialog, setReviewDialog] = useState({ open: false, row: null, action: null });
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: 'success', message: '' });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/attendance/v3/modification-requests/', {
        params: { status: statusFilter, page_size: 100 },
      });
      const data = res.data;
      setRows(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load requests.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openReview = (row, action) => {
    setReviewNote('');
    setReviewDialog({ open: true, row, action });
  };
  const closeReview = () => {
    if (saving) return;
    setReviewDialog({ open: false, row: null, action: null });
  };

  const submitReview = async () => {
    const { row, action } = reviewDialog;
    if (!row || !action) return;
    setSaving(true);
    try {
      const url = `/api/attendance/v3/modification-requests/${row.log_id}/${action}/`;
      await api.post(url, { review_note: reviewNote.trim() || undefined });
      setToast({
        open: true,
        severity: action === 'approve' ? 'success' : 'info',
        message: action === 'approve' ? 'Change approved and applied.' : 'Change rejected.',
      });
      closeReview();
      fetchRows();
    } catch (err) {
      setToast({
        open: true, severity: 'error',
        message: err.response?.data?.error || 'Failed to process review.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="info" icon={<VerifiedOutlinedIcon fontSize="inherit" />} variant="outlined">
        <strong>Attendance Edit Approvals.</strong> Changes to records older than 45 days
        arrive here. Approve to apply the proposed values to the attendance record, or reject
        to discard them. Every decision is logged.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
            <MenuItem value="all">All (inc. Applied)</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Loading…' : `${rows.length} request${rows.length === 1 ? '' : 's'}`}
        </Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {!loading && rows.length === 0 && (
        <Box sx={{
          py: 8, px: 3, textAlign: 'center',
          border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 2,
          color: 'text.secondary',
        }}>
          <VerifiedOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>Nothing to review</Typography>
          <Typography variant="body2">
            {statusFilter === 'Pending' ? 'No pending requests right now.' : `No ${statusFilter.toLowerCase()} requests.`}
          </Typography>
        </Box>
      )}

      {rows.map((r) => (
        <Box key={r.log_id} sx={{
          p: 2.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Avatar sx={{
              width: 40, height: 40, fontSize: 14, fontWeight: 700,
              bgcolor: pickAvatarColor(r.employee_fullname || ''),
            }}>
              {getInitials(r.employee_fullname || '')}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body1" fontWeight={700} noWrap>{r.employee_fullname}</Typography>
              <Typography variant="caption" color="text.secondary">
                {r.empcode || `#${r.employee_id}`} · Attendance #{r.attendance_id}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip label={r.status} size="small" color={statusColor(r.status)} sx={{ fontWeight: 600 }} />
              <Typography variant="caption" color="text.secondary">
                Requested by {r.requested_by || '—'} · {r.requested_at ? new Date(r.requested_at).toLocaleString() : ''}
              </Typography>
            </Box>
          </Box>

          <DiffTable original={r.original || {}} proposed={r.proposed || {}} />

          {r.reason && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              <strong>Reason:</strong> {r.reason}
            </Typography>
          )}
          {r.review_note && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              <strong>Review note:</strong> {r.review_note}
            </Typography>
          )}

          {r.status === 'Pending' && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
              <Tooltip title="Reject this change">
                <Button color="error" variant="outlined" startIcon={<DoNotDisturbIcon />}
                  onClick={() => openReview(r, 'reject')}>
                  Reject
                </Button>
              </Tooltip>
              <Tooltip title="Approve and apply the proposed values">
                <Button color="primary" variant="contained" startIcon={<CheckIcon />}
                  onClick={() => openReview(r, 'approve')}>
                  Approve
                </Button>
              </Tooltip>
            </Box>
          )}
        </Box>
      ))}

      <Dialog open={reviewDialog.open} onClose={closeReview} maxWidth="sm" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h5">
            {reviewDialog.action === 'approve' ? 'Approve modification' : 'Reject modification'}
          </Typography>
          <IconButton size="small" onClick={closeReview} disabled={saving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {reviewDialog.action === 'approve'
              ? 'Approving will apply the proposed values to the attendance record.'
              : 'Rejecting will discard the proposed values. The record stays unchanged.'}
          </Typography>
          <TextField
            label="Review note (optional)"
            multiline minRows={2} fullWidth size="small"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={closeReview} disabled={saving}>Cancel</Button>
          <Button
            onClick={submitReview} disabled={saving}
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'primary' : 'error'}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : (reviewDialog.action === 'approve' ? <CheckIcon /> : <DoNotDisturbIcon />)}
            sx={{ px: 3 }}
          >
            {saving ? 'Working…' : (reviewDialog.action === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}