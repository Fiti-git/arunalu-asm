import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, TextField, Alert, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Switch, FormControlLabel, IconButton, Tooltip, CircularProgress, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';

const empty = { id: null, min_pct: 90, max_pct: 100, bonus_amount: 0, label: 'Attendance Bonus', is_active: true };

export default function BonusTiers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/payroll/bonus-tiers/');
      setRows(res.data || []);
      setPage(1);
    } catch (err) { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const { id, ...payload } = dialog;
      if (id) await api.patch(`/payroll/bonus-tiers/${id}/`, payload);
      else await api.post('/payroll/bonus-tiers/', payload);
      setDialog(null); fetchList();
    } catch (err) {
      setError(err.response?.data?.error
        || Object.values(err.response?.data || {}).flat().join(', ')
        || 'Save failed.');
    } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete tier "${row.min_pct}–${row.max_pct}%"?`)) return;
    try { await api.delete(`/payroll/bonus-tiers/${row.id}/`); fetchList(); }
    catch { setError('Delete failed.'); }
  };

  const columns = useMemo(() => [
    { key: 'label', label: 'Label', width: 200, sortKey: 'label', filterKey: 'f_label', filterType: 'text' },
    { key: 'min_pct', label: 'Min %', width: 100, align: 'right', sortKey: 'min_pct' },
    { key: 'max_pct', label: 'Max %', width: 100, align: 'right', sortKey: 'max_pct' },
    {
      key: 'bonus_amount', label: 'Bonus (Rs.)', width: 140, align: 'right', sortKey: 'bonus_amount',
      render: (row) => <Typography variant="body2" fontWeight={700}>{Number(row.bonus_amount).toLocaleString()}</Typography>,
    },
    {
      key: 'is_active', label: 'Status', width: 110, sortKey: 'is_active',
      filterKey: 'f_is_active', filterType: 'bool',
      render: (row) => row.is_active
        ? <Chip label="Active" size="small" color="success" />
        : <Chip label="Inactive" size="small" />,
    },
    {
      key: 'actions', label: 'Actions', width: 120, align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setDialog({ ...row })}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => remove(row)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
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
        title="Attendance Bonus Tiers"
        subtitle="Score = 100 − 10×absent − 5×late. The highest tier whose range covers the score adds a bonus line to the payroll."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ ...empty })}>New Tier</Button>}
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(r) => r.id}
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
        emptyMessage="No bonus tiers"
      />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog?.id ? 'Edit Tier' : 'New Tier'}</DialogTitle>
        <DialogContent dividers>
          {dialog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Label" value={dialog.label}
                onChange={(e) => setDialog(d => ({ ...d, label: e.target.value }))} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField label="Min Score %" type="number" value={dialog.min_pct}
                  onChange={(e) => setDialog(d => ({ ...d, min_pct: e.target.value }))} />
                <TextField label="Max Score %" type="number" value={dialog.max_pct}
                  onChange={(e) => setDialog(d => ({ ...d, max_pct: e.target.value }))} />
              </Box>
              <TextField label="Bonus Amount (Rs.)" type="number" value={dialog.bonus_amount}
                onChange={(e) => setDialog(d => ({ ...d, bonus_amount: e.target.value }))} />
              <FormControlLabel
                control={<Switch checked={dialog.is_active}
                  onChange={(e) => setDialog(d => ({ ...d, is_active: e.target.checked }))} />}
                label="Active"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
