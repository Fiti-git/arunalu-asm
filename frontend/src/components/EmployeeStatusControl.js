import React, { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography, IconButton, Divider, CircularProgress, Paper, Drawer,
} from '@mui/material';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import api from 'utils/api';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EmployeeStatusControl({ employee, onChanged, dense = false }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  if (!employee) return null;
  const isActive = !!employee.is_active;

  const handleConfirm = async () => {
    if (!effectiveDate) {
      setError('Please select an effective date.');
      return;
    }
    if (effectiveDate > todayISO()) {
      setError('Effective date cannot be in the future.');
      return;
    }
    setSubmitting(true);
    setError('');
    const endpoint = isActive
      ? `/api/deactivate-employee/${employee.employee_id}/`
      : `/api/activate-employee/${employee.employee_id}/`;
    try {
      await api.post(endpoint, { note, effective_date: effectiveDate });
      setConfirmOpen(false);
      setNote('');
      onChanged && onChanged({ ...employee, is_active: !isActive });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await api.get(`/api/employee-status-history/${employee.employee_id}/`);
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={isActive ? 'Active' : 'Inactive'}
          color={isActive ? 'success' : 'error'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Button
          size={dense ? 'small' : 'medium'}
          variant="outlined"
          color={isActive ? 'error' : 'success'}
          startIcon={isActive ? <PersonOffIcon /> : <PersonIcon />}
          onClick={() => { setError(''); setNote(''); setEffectiveDate(todayISO()); setConfirmOpen(true); }}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          size={dense ? 'small' : 'medium'}
          variant="text"
          startIcon={<HistoryIcon />}
          onClick={openHistory}
        >
          History
        </Button>
      </Box>

      <Dialog open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isActive ? 'Deactivate Employee' : 'Activate Employee'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isActive
              ? 'This will prevent the employee from logging in to the system.'
              : "This will restore the employee's access to the system."}
          </Typography>
          {error && <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>}
          <TextField
            label={isActive ? 'Deactivation date' : 'Activation date'}
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            fullWidth size="small"
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: todayISO() }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Reason (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth multiline rows={2} size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={isActive ? 'error' : 'success'}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={18} color="inherit" /> : (isActive ? 'Deactivate' : 'Activate')}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 3 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Status History</Typography>
            <Typography variant="body2" color="text.secondary">{employee.fullname}</Typography>
          </Box>
          <IconButton onClick={() => setHistoryOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : history.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <HistoryIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No history found.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {history.map((log, idx) => (
              <Paper
                key={idx} elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: log.action === 'ACTIVATED' ? '#b2dfdb' : '#ffcdd2',
                  borderRadius: 2, p: 1.5,
                  bgcolor: log.action === 'ACTIVATED' ? '#f0fdf4' : '#fff8f8',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Chip
                    label={log.action} size="small"
                    color={log.action === 'ACTIVATED' ? 'success' : 'error'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {log.action_at ? new Date(log.action_at).toLocaleString() : ''}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  By: <strong>{log.action_by}</strong>
                </Typography>
                {log.effective_date && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    Effective: <strong>{log.effective_date}</strong>
                  </Typography>
                )}
                {log.note && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    Note: {log.note}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Drawer>
    </>
  );
}
