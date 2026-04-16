import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  IconButton, Tooltip, Checkbox, Autocomplete, TextField, Snackbar,
  FormControlLabel, Divider, Dialog, DialogContent, DialogActions,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PublishIcon from '@mui/icons-material/Publish';
import UndoIcon from '@mui/icons-material/Undo';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate, useParams } from 'react-router-dom';
import api from 'utils/api';
import { PageHeader, StatCard } from 'components/ui';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import { getUserRole } from 'utils/auth';

const statusColor = (s) => ({
  Matched: 'success', Manual: 'info', Ambiguous: 'warning', Unmatched: 'error',
}[s] || 'default');

const uploadStatusColor = (s) => ({
  Staged: 'warning', Committed: 'success', Reverted: 'default',
}[s] || 'default');

export default function FingerprintUploadDetail() {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const base = role === 'admin' ? '/admin/fingerprint' : '/manager/fingerprint';

  const [upload, setUpload] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all'); // all / Matched / Ambiguous / Unmatched / conflict
  const [search, setSearch] = useState('');

  const [empOptions, setEmpOptions] = useState([]);
  const empCache = useRef({});

  const [toast, setToast] = useState({ open: false, severity: 'success', message: '' });
  const [commitDialog, setCommitDialog] = useState(false);
  const [overrideConflicts, setOverrideConflicts] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (tab !== 'all' && tab !== 'conflict') params.status = tab;
      if (tab === 'conflict') params.conflict = 'true';
      if (search.trim()) params.q = search.trim();
      const [up, rs] = await Promise.all([
        api.get(`/fingerprint/uploads/${uploadId}/`),
        api.get(`/fingerprint/uploads/${uploadId}/rows/`, { params }),
      ]);
      setUpload(up.data);
      setRows(rs.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load.');
    } finally { setLoading(false); }
  }, [uploadId, tab, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch employee list once (for Autocomplete options)
  useEffect(() => {
    api.get('/api/getallemployees/').then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setEmpOptions(list);
      list.forEach((e) => { empCache.current[e.employee_id] = e; });
    }).catch(() => {});
  }, []);

  const locked = upload?.status === 'Committed';

  const patchRow = async (rowId, body) => {
    try {
      const res = await api.patch(`/fingerprint/rows/${rowId}/`, body);
      setRows((prev) => prev.map((r) => r.id === rowId ? res.data : r));
      // Upload stats may have shifted
      const upRes = await api.get(`/fingerprint/uploads/${uploadId}/`);
      setUpload(upRes.data);
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.response?.data?.error || 'Update failed.' });
    }
  };

  const doRematch = async () => {
    setWorking(true);
    try {
      await api.post(`/fingerprint/uploads/${uploadId}/rematch/`);
      setToast({ open: true, severity: 'success', message: 'Re-matched.' });
      fetchAll();
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.response?.data?.error || 'Rematch failed.' });
    } finally { setWorking(false); }
  };

  const doCommit = async () => {
    setWorking(true);
    try {
      const res = await api.post(`/fingerprint/uploads/${uploadId}/commit/`, {
        override_conflicts: overrideConflicts,
      });
      const { created, skipped_conflict, skipped_unmatched, skipped_user } = res.data;
      setToast({
        open: true, severity: 'success',
        message: `Committed: ${created} · Skipped — conflict ${skipped_conflict}, unmatched ${skipped_unmatched}, user ${skipped_user}`,
      });
      setCommitDialog(false);
      setOverrideConflicts(false);
      fetchAll();
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.response?.data?.error || 'Commit failed.' });
    } finally { setWorking(false); }
  };

  const doRevert = async () => {
    if (!window.confirm('Delete all attendance rows created by this upload?')) return;
    setWorking(true);
    try {
      const res = await api.post(`/fingerprint/uploads/${uploadId}/revert/`);
      setToast({ open: true, severity: 'info', message: `Reverted. ${res.data.removed} attendance rows removed.` });
      fetchAll();
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.response?.data?.error || 'Revert failed.' });
    } finally { setWorking(false); }
  };

  const doDelete = async () => {
    if (!window.confirm('Delete this entire upload (staging data)? This cannot be undone.')) return;
    setWorking(true);
    try {
      await api.delete(`/fingerprint/uploads/${uploadId}/`);
      setToast({ open: true, severity: 'success', message: 'Upload deleted.' });
      setTimeout(() => navigate(base), 600);
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.response?.data?.error || 'Delete failed.' });
    } finally { setWorking(false); }
  };

  const columns = useMemo(() => [
    {
      field: 'raw_name', headerName: 'Raw Name', flex: 1.3, minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{row.raw_name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            code: {row.parsed_empcode || '—'} · {row.parsed_name || ''}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'matched_employee', headerName: 'Matched Employee', flex: 1.6, minWidth: 260,
      renderCell: ({ row }) => {
        const selected = empOptions.find((e) => e.employee_id === row.matched_employee) || null;
        return (
          <Autocomplete
            size="small" disablePortal
            options={empOptions} value={selected} disabled={locked}
            isOptionEqualToValue={(a, b) => a?.employee_id === b?.employee_id}
            getOptionLabel={(o) => o ? `${o.fullname}${o.empcode ? ` · ${o.empcode}` : ''}` : ''}
            onChange={(_, val) => patchRow(row.id, { matched_employee: val?.employee_id || null })}
            renderInput={(p) => <TextField {...p} variant="standard" placeholder="Pick employee" />}
            sx={{ width: '100%' }}
          />
        );
      },
    },
    {
      field: 'match_status', headerName: 'Match', flex: 0.6, minWidth: 110,
      renderCell: ({ value }) => <Chip label={value} size="small" color={statusColor(value)} sx={{ fontWeight: 600 }} />,
    },
    { field: 'date', headerName: 'Date', flex: 0.6, minWidth: 105,
      renderCell: ({ value }) => value ? new Date(value).toLocaleDateString() : '—' },
    {
      field: 'check_in', headerName: 'Check-in', flex: 0.5, minWidth: 95,
      renderCell: ({ value }) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
    },
    {
      field: 'check_out', headerName: 'Check-out', flex: 0.5, minWidth: 95,
      renderCell: ({ value }) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
    },
    {
      field: 'has_asm_conflict', headerName: 'Conflict', flex: 0.5, minWidth: 95, align: 'center', headerAlign: 'center',
      renderCell: ({ value }) => value ? (
        <Tooltip title="ASM already has an attendance row for this employee & date"><WarningAmberIcon fontSize="small" color="warning" /></Tooltip>
      ) : null,
    },
    {
      field: 'skip_commit', headerName: 'Skip', flex: 0.4, minWidth: 75, align: 'center', headerAlign: 'center',
      renderCell: ({ row }) => (
        <Checkbox
          size="small" checked={!!row.skip_commit} disabled={locked}
          onChange={(e) => patchRow(row.id, { skip_commit: e.target.checked })}
        />
      ),
    },
  ], [empOptions, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!upload && loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }
  if (!upload) return null;

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(base)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Fingerprint Import / Upload #{upload.id}</Typography>
      </Box>

      <PageHeader
        title={upload.filename}
        subtitle={<>
          <Chip size="small" label={upload.status} color={uploadStatusColor(upload.status)} sx={{ fontWeight: 600, mr: 1 }} />
          {upload.period_start} → {upload.period_end} · uploaded by {upload.uploaded_by_name || '—'}
        </>}
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchAll} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            {!locked && (
              <>
                <Button variant="outlined" size="small" startIcon={<AutorenewIcon />}
                  onClick={doRematch} disabled={working}>Re-match</Button>
                <Button variant="contained" size="small" startIcon={<PublishIcon />}
                  onClick={() => setCommitDialog(true)} disabled={working}>Commit</Button>
              </>
            )}
            {locked && (
              <Button variant="outlined" color="warning" size="small" startIcon={<UndoIcon />}
                onClick={doRevert} disabled={working}>Revert</Button>
            )}
            {!locked && (
              <Button variant="outlined" color="error" size="small" startIcon={<DeleteOutlineIcon />}
                onClick={doDelete} disabled={working}>Delete</Button>
            )}
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' } }}>
        <StatCard icon={<InventoryOutlinedIcon />} label="Total" value={upload.total_rows} color="primary" />
        <StatCard icon={<CheckCircleOutlineIcon />} label="Matched" value={upload.matched_rows} color="success" />
        <StatCard icon={<HelpOutlineIcon />} label="Ambiguous" value={upload.ambiguous_rows} color="warning" />
        <StatCard icon={<CancelOutlinedIcon />} label="Unmatched" value={upload.unmatched_rows} color="error" />
        <StatCard icon={<WarningAmberIcon />} label="Conflicts" value={upload.conflict_rows} color="info" />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'Matched', 'Ambiguous', 'Unmatched', 'conflict'].map((t) => (
          <Button key={t} size="small"
            variant={tab === t ? 'contained' : 'outlined'}
            onClick={() => setTab(t)}
            sx={{ borderRadius: 5, px: 2 }}>
            {t === 'all' ? 'All' : t === 'conflict' ? 'Conflicts' : t}
          </Button>
        ))}
        <TextField
          size="small" placeholder="Search name…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ ml: 'auto', width: 240 }}
        />
      </Box>

      <Box sx={{ height: 620, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows} columns={columns} getRowId={(r) => r.id}
          loading={loading}
          disableRowSelectionOnClick
          rowHeight={58}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        />
      </Box>

      {/* Commit dialog */}
      <Dialog open={commitDialog} onClose={() => !working && setCommitDialog(false)} maxWidth="xs" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 1.5 }}>
          <Typography variant="h5">Commit to Attendance</Typography>
        </Box>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creates Attendance rows for every row that is <strong>Matched</strong> or <strong>Manual</strong> (and not marked Skip).
            Rows with an <strong>ASM conflict</strong> are skipped by default.
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={overrideConflicts} onChange={(e) => setOverrideConflicts(e.target.checked)} />}
            label="Also commit rows with ASM conflicts (will create duplicates)"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setCommitDialog(false)} disabled={working}>Cancel</Button>
          <Button variant="contained" onClick={doCommit} disabled={working}
            startIcon={working ? <CircularProgress size={14} /> : <PublishIcon />}>
            {working ? 'Committing…' : 'Commit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4500}
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