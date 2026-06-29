import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, TextField, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, CircularProgress, FormControl,
  InputLabel, Select, MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';

const DAYS = [
  ['mon_hours', 'Mon'], ['tue_hours', 'Tue'], ['wed_hours', 'Wed'],
  ['thu_hours', 'Thu'], ['fri_hours', 'Fri'], ['sat_hours', 'Sat'],
  ['sun_hours', 'Sun'],
];

export default function WorkSchedules() {
  const [rows, setRows] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // row being edited
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    api.get('/api/outlets/').then(res => {
      setOutlets(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    }).catch(() => {});
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = outletId !== 'all' ? { outlet: outletId } : {};
      const res = await api.get('/payroll/work-schedules/', { params });
      setRows(res.data || []);
      setPage(1);
    } catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, [outletId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openEdit = (row) => { setEditing(row); setDraft({ ...row }); };
  const close = () => { setEditing(null); setDraft(null); };

  const weeklyTotal = useMemo(() => {
    if (!draft) return 0;
    return DAYS.reduce((a, [k]) => a + Number(draft[k] || 0), 0);
  }, [draft]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = {};
      DAYS.forEach(([k]) => { payload[k] = Number(draft[k] || 0); });
      payload.ot_multiplier = Number(draft.ot_multiplier || 1.5);
      payload.holiday_multiplier = Number(draft.holiday_multiplier || 2);
      await api.put(`/payroll/work-schedules/${editing.employee_id}/`, payload);
      close(); fetchList();
    } catch (err) { setError('Save failed.'); }
    finally { setSaving(false); }
  };

  const columns = useMemo(() => [
    { key: 'empcode', label: 'Emp Code', width: 110, sortKey: 'empcode', filterKey: 'f_empcode', filterType: 'text' },
    { key: 'fullname', label: 'Employee', width: 200, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text' },
    { key: 'primary_outlet_name', label: 'Outlet', width: 150, sortKey: 'primary_outlet_name', filterKey: 'f_outlet', filterType: 'text' },
    ...DAYS.map(([k, label]) => ({
      key: k, label, width: 72, align: 'center', sortKey: k,
      render: (row) => Number(row[k]) === 0
        ? <Typography variant="caption" color="text.disabled">off</Typography>
        : <Typography variant="body2">{row[k]}</Typography>,
    })),
    {
      key: 'configured', label: 'Status', width: 120, sortKey: 'configured',
      filterKey: 'f_configured', filterType: 'bool',
      render: (row) => row.configured
        ? <Chip size="small" label="Configured" color="success" />
        : <Chip size="small" label="Default" />,
    },
    {
      key: 'actions', label: 'Edit', width: 80, align: 'center',
      render: (row) => (
        <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
      ),
    },
  ], []);

  const filteredRows = useMemo(
    () => applyClientFilters(rows, columns, columnFilters, sortBy),
    [rows, columns, columnFilters, sortBy]
  );
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize]
  );

  const handleFilterChange = (filterKey, value) => {
    const next = { ...columnFilters, [filterKey]: value };
    if (value === '' || value == null) delete next[filterKey];
    setColumnFilters(next);
    setPage(1);
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Work Schedules"
        subtitle="Weekly working-hours template per employee. Drives expected hours, OT threshold, and half-day cutoff in payroll."
        actions={
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Outlet</InputLabel>
            <Select label="Outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              <MenuItem value="all">All Outlets</MenuItem>
              {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
            </Select>
          </FormControl>
        }
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(r) => r.employee_id}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        emptyMessage="No employees"
      />

      <Dialog open={!!editing} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>
          Weekly Schedule — {editing?.fullname}
          <Typography variant="caption" display="block" color="text.secondary">{editing?.empcode}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {draft && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {DAYS.map(([k, label]) => (
                  <TextField key={k} label={label} size="small" type="number"
                    inputProps={{ min: 0, max: 24, step: 0.5 }}
                    value={draft[k]}
                    onChange={(e) => setDraft(d => ({ ...d, [k]: e.target.value }))} />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Weekly total: <b>{weeklyTotal.toFixed(1)}h</b> &middot; 0 means off-day
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField label="OT Multiplier" type="number"
                  inputProps={{ min: 1, step: 0.1 }} value={draft.ot_multiplier}
                  helperText="e.g. 1.5 = 150% rate"
                  onChange={(e) => setDraft(d => ({ ...d, ot_multiplier: e.target.value }))} />
                <TextField label="Holiday Multiplier" type="number"
                  inputProps={{ min: 1, step: 0.1 }} value={draft.holiday_multiplier}
                  helperText="e.g. 2.0 = 200% rate"
                  onChange={(e) => setDraft(d => ({ ...d, holiday_multiplier: e.target.value }))} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
