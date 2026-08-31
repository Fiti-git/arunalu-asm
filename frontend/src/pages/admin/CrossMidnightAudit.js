import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip, Button, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Alert, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { PageHeader } from 'components/ui';
import api from 'utils/api';

const fmtDT = (v) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return String(v);
  }
};

const fmtDate = (v) => {
  if (!v) return '—';
  try {
    const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString();
  } catch {
    return String(v);
  }
};

export default function CrossMidnightAudit() {
  const [minHours, setMinHours] = useState(20);
  const [limit, setLimit] = useState(500);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/attendance/admin/crossmidnight/', {
        params: { min_hours: minHours, limit },
      });
      setRows(res.data.results || []);
      setCount(res.data.count || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load audit data.');
    } finally {
      setLoading(false);
    }
  }, [minHours, limit]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Cross-Midnight Attendance Audit"
        subtitle={loading ? 'Loading…' : `${count} record(s) flagged`}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              label="Min hours"
              type="number"
              value={minHours}
              onChange={(e) => setMinHours(Number(e.target.value) || 0)}
              size="small"
              sx={{ width: 110 }}
              inputProps={{ min: 12, max: 200, step: 1 }}
            />
            <TextField
              label="Limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 100)}
              size="small"
              sx={{ width: 110 }}
              inputProps={{ min: 50, max: 2000, step: 50 }}
            />
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRows} disabled={loading}>
              Refresh
            </Button>
          </Stack>
        }
      />

      <Alert severity="warning" icon={<WarningAmberIcon />}>
        These attendance records have a check-out time on a different calendar day than the record's date —
        usually a forgotten punch-out that was closed on a later day. Review each row and fix it through
        the <b>Attendance Management → Modification</b> tab. Records with 12–20&nbsp;h that span midnight
        are legitimate night shifts and are excluded by default.
      </Alert>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">No cross-midnight records above {minHours}h.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Att. ID</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Outlets</TableCell>
                  <TableCell>Row date</TableCell>
                  <TableCell>Check-in</TableCell>
                  <TableCell>Check-out</TableCell>
                  <TableCell align="right">Worked&nbsp;h</TableCell>
                  <TableCell align="right">Days span</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.attendance_id} hover>
                    <TableCell>{r.attendance_id}</TableCell>
                    <TableCell>
                      <Tooltip title={`emp_id=${r.employee_id}`}>
                        <span>{r.fullname}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {(r.outlets || []).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{fmtDate(r.date)}</TableCell>
                    <TableCell>{fmtDT(r.check_in_time)}</TableCell>
                    <TableCell>{fmtDT(r.check_out_time)}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={Number(r.worked_hours).toFixed(1)}
                        size="small"
                        color={r.worked_hours > 48 ? 'error' : 'warning'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right">{r.days_span}</TableCell>
                    <TableCell>
                      <Chip label={r.status || '—'} size="small" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
