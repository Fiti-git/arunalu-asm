import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Tooltip,
  Dialog, DialogContent, DialogActions, Divider, Snackbar, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader } from 'components/ui';
import api from 'utils/api';
import { formatDate } from './attendance/shared';

export default function AttendanceLockPeriods() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('all');

  const [form, setForm] = useState({ outlet_id: '', start_date: '', end_date: '', note: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [deleteDialog, setDeleteDialog] = useState({ open: false, period: null });
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState({ open: false, severity: 'success', message: '' });

  useEffect(() => {
    api.get('/api/outlets/').then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setOutlets(list);
      if (list.length > 0 && !form.outlet_id) {
        setForm((prev) => ({ ...prev, outlet_id: list[0].id }));
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedOutlet !== 'all') params.outlet_id = selectedOutlet;
      const res = await api.get('/api/attendance/v3/lock-periods/', { params });
      setPeriods(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lock periods.');
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  const createPeriod = async () => {
    setFormError('');
    if (!form.outlet_id) return setFormError('Pick an outlet.');
    if (!form.start_date || !form.end_date) return setFormError('Both start and end dates are required.');
    if (form.end_date < form.start_date) return setFormError('End date must be on or after start date.');
    setCreating(true);
    try {
      await api.post('/api/attendance/v3/lock-periods/', {
        outlet_id: form.outlet_id,
        start_date: form.start_date,
        end_date: form.end_date,
        note: form.note.trim() || undefined,
      });
      setForm((prev) => ({ ...prev, start_date: '', end_date: '', note: '' }));
      setToast({ open: true, severity: 'success', message: 'Lock period created.' });
      fetchPeriods();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create lock period.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (period) => {
    try {
      await api.patch(`/api/attendance/v3/lock-periods/${period.lock_id}/`, { active: !period.active });
      setToast({
        open: true, severity: 'success',
        message: period.active ? 'Lock deactivated.' : 'Lock re-activated.',
      });
      fetchPeriods();
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.response?.data?.error || 'Failed to update.' });
    }
  };

  const confirmDelete = async () => {
    const p = deleteDialog.period;
    if (!p) return;
    setDeleting(true);
    try {
      await api.delete(`/api/attendance/v3/lock-periods/${p.lock_id}/`);
      setToast({ open: true, severity: 'success', message: 'Lock period deleted.' });
      setDeleteDialog({ open: false, period: null });
      fetchPeriods();
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.response?.data?.error || 'Failed to delete.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Attendance Lock Periods"
        subtitle="Close attendance edits for an outlet between a date range. Records older than 45 days lock automatically."
      />

      <Alert severity="info" icon={<LockOutlinedIcon fontSize="inherit" />} variant="outlined">
        While a period is <strong>active</strong>, any attendance record inside it (for that outlet)
        requires admin approval to modify. Deactivate a period to temporarily remove the lock without
        deleting the history.
      </Alert>

      {/* --- Create new lock --- */}
      <Box sx={{ p: 2.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Create lock period
        </Typography>
        {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>{formError}</Alert>}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Outlet</InputLabel>
            <Select label="Outlet" value={form.outlet_id}
              onChange={(e) => setForm((prev) => ({ ...prev, outlet_id: e.target.value }))}>
              {outlets.length === 0 && <MenuItem value="" disabled>No outlets</MenuItem>}
              {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="From" type="date" size="small" sx={{ width: 170 }}
            value={form.start_date}
            onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField label="To" type="date" size="small" sx={{ width: 170 }}
            value={form.end_date}
            onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField label="Note (optional)" size="small" sx={{ flex: 1, minWidth: 220 }}
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
          />
          <Button variant="contained" startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
            onClick={createPeriod} disabled={creating}>
            {creating ? 'Locking…' : 'Lock Period'}
          </Button>
        </Box>
      </Box>

      {/* --- Existing periods --- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Filter by outlet</InputLabel>
          <Select label="Filter by outlet" value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}>
            <MenuItem value="all">All Outlets</MenuItem>
            {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Loading…' : `${periods.length} period${periods.length === 1 ? '' : 's'}`}
        </Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {!loading && periods.length === 0 && (
        <Box sx={{
          py: 6, px: 3, textAlign: 'center',
          border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 2,
          color: 'text.secondary',
        }}>
          <LockOpenOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>No lock periods</Typography>
          <Typography variant="body2">
            Create one above to lock attendance edits for a range.
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {periods.map((p) => (
          <Box key={p.lock_id} sx={{
            p: 2, borderRadius: 2, border: 1,
            borderColor: p.active ? 'warning.main' : 'divider',
            bgcolor: 'background.paper',
            display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: p.active ? 'warning.light' : 'action.hover',
              color: p.active ? 'warning.dark' : 'text.secondary',
            }}>
              {p.active ? <LockOutlinedIcon /> : <LockOpenOutlinedIcon />}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body1" fontWeight={700} noWrap>
                {p.outlet_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(p.start_date)} → {formatDate(p.end_date)}
                {p.note ? ` · ${p.note}` : ''}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Created by {p.created_by || '—'}{p.created_at ? ` · ${new Date(p.created_at).toLocaleString()}` : ''}
              </Typography>
            </Box>
            <Chip
              label={p.active ? 'Active' : 'Inactive'}
              size="small" color={p.active ? 'warning' : 'default'}
              sx={{ fontWeight: 600 }}
            />
            <Tooltip title={p.active ? 'Deactivate (remove lock)' : 'Re-activate (lock again)'}>
              <Switch checked={p.active} onChange={() => toggleActive(p)} />
            </Tooltip>
            <Tooltip title="Delete lock period">
              <IconButton color="error" onClick={() => setDeleteDialog({ open: true, period: p })}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Box>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, period: null })} maxWidth="xs" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h5">Delete lock period?</Typography>
          <IconButton size="small" onClick={() => setDeleteDialog({ open: false, period: null })} disabled={deleting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {deleteDialog.period && (
            <Typography variant="body2" color="text.secondary">
              Removing the <strong>{deleteDialog.period.outlet_name}</strong> lock for{' '}
              <strong>{formatDate(deleteDialog.period.start_date)} → {formatDate(deleteDialog.period.end_date)}</strong>.
              Records in that range will no longer require admin approval (unless the 45-day rule applies).
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, period: null })} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
            {deleting ? 'Deleting…' : 'Delete'}
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