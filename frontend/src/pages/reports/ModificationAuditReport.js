import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Chip, Avatar,
  IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader } from 'components/ui';
import { firstOfMonth, today, exportCsv, getInitials, rangeFieldSx } from './shared';
import { getUserRole } from 'utils/auth';

const statusColor = (s) => {
  if (s === 'Applied') return 'success';
  if (s === 'Pending') return 'warning';
  if (s === 'Approved') return 'info';
  if (s === 'Rejected') return 'error';
  return 'default';
};

const fmtDT = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString();
};
const fmtD = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString();
};
const fmtT = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function DiffRow({ label, before, after }) {
  const changed = (before || '') !== (after || '');
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 1, py: 0.4 }}>
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

export default function ModificationAuditReport() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const backPath = role === 'admin' ? '/admin/reports' : '/manager/reports';

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [statusFilter, setStatusFilter] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get('/api/attendance/v3/modification-requests/', {
        params: {
          status: statusFilter,
          start_date: startDate,
          end_date: endDate,
          page_size: 200,
        },
      });
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setLogs(list);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit log.');
    } finally { setLoading(false); }
  }, [startDate, endDate, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const rows = logs.map((log) => ({
      log_id: log.log_id,
      status: log.status,
      requested_at: log.requested_at,
      requested_by: log.requested_by || '',
      employee: log.employee_fullname,
      empcode: log.empcode || '',
      original_date: log.original?.date || '',
      original_checkin: log.original?.check_in_time || '',
      original_checkout: log.original?.check_out_time || '',
      original_status: log.original?.status || '',
      new_date: log.proposed?.date || '',
      new_checkin: log.proposed?.check_in_time || '',
      new_checkout: log.proposed?.check_out_time || '',
      new_status: log.proposed?.status || '',
      reason: log.reason || '',
      reviewed_by: log.reviewed_by || '',
      reviewed_at: log.reviewed_at || '',
      review_note: log.review_note || '',
    }));
    exportCsv(`modification-audit_${startDate}_to_${endDate}.csv`, rows);
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Modification Audit</Typography>
      </Box>

      <PageHeader
        title="Attendance Modification Audit"
        subtitle={`${logs.length} entr${logs.length === 1 ? 'y' : 'ies'} in the selected range`}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="From" type="date" size="small" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <TextField label="To" type="date" size="small" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <FormControl size="small" sx={{ width: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="Applied">Applied</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchData} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={logs.length === 0}>
              Export CSV
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : logs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No modifications in this range.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {logs.map((log) => {
            const o = log.original || {};
            const p = log.proposed || {};
            return (
              <Box key={log.log_id} sx={{
                p: 2, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1, flexWrap: 'wrap' }}>
                  <Avatar sx={{
                    width: 32, height: 32, fontSize: 12, fontWeight: 700,
                    bgcolor: pickAvatarColor(log.employee_fullname || ''),
                  }}>
                    {getInitials(log.employee_fullname || '')}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {log.employee_fullname}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {log.empcode || ''} · Att #{log.attendance_id}
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      By <strong>{log.requested_by || '—'}</strong> · {fmtDT(log.requested_at)}
                    </Typography>
                  </Box>
                  <Chip label={log.status} size="small" color={statusColor(log.status)} sx={{ fontWeight: 600 }} />
                </Box>

                <Divider sx={{ mb: 1 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 1, pb: 0.4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Field</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Original</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Proposed</Typography>
                </Box>
                <DiffRow label="Date" before={fmtD(o.date)} after={fmtD(p.date)} />
                <DiffRow label="Check-in" before={`${fmtD(o.check_in_time)} ${fmtT(o.check_in_time)}`}
                  after={`${fmtD(p.check_in_time)} ${fmtT(p.check_in_time)}`} />
                <DiffRow label="Check-out" before={`${fmtD(o.check_out_time)} ${fmtT(o.check_out_time)}`}
                  after={`${fmtD(p.check_out_time)} ${fmtT(p.check_out_time)}`} />
                <DiffRow label="Status" before={o.status} after={p.status} />

                {log.reason && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    <strong>Reason:</strong> {log.reason}
                  </Typography>
                )}
                {log.reviewed_by && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                    <strong>Reviewed by:</strong> {log.reviewed_by} · {fmtDT(log.reviewed_at)}
                    {log.review_note ? ` · ${log.review_note}` : ''}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}