import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, TextField, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, FormControlLabel, IconButton, Tooltip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';

const empty = {
  id: null, label: '', min_monthly: 0, max_monthly: null,
  rate_pct: 0, deduct_amount: 0, is_active: true,
};

export default function ApitSlabs() {
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
      const res = await api.get('/payroll/apit-slabs/');
      setRows(res.data || []);
      setPage(1);
    } catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const { id, max_monthly, ...rest } = dialog;
      const payload = { ...rest, max_monthly: max_monthly === '' || max_monthly === null ? null : max_monthly };
      if (id) await api.patch(`/payroll/apit-slabs/${id}/`, payload);
      else await api.post('/payroll/apit-slabs/', payload);
      setDialog(null); fetchList();
    } catch (err) {
      setError(err.response?.data?.error
        || Object.values(err.response?.data || {}).flat().join(', ')
        || 'Save failed.');
    } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete slab ${row.min_monthly}–${row.max_monthly ?? '∞'}?`)) return;
    try { await api.delete(`/payroll/apit-slabs/${row.id}/`); fetchList(); }
    catch { setError('Delete failed.'); }
  };

  const columns = useMemo(() => [
    { key: 'label', label: 'Label', width: 180, sortKey: 'label', filterKey: 'f_label', filterType: 'text' },
    {
      key: 'min_monthly', label: 'Min (Rs.)', width: 130, align: 'right', sortKey: 'min_monthly',
      render: (row) => Number(row.min_monthly).toLocaleString(),
    },
    {
      key: 'max_monthly', label: 'Max (Rs.)', width: 130, align: 'right', sortKey: 'max_monthly',
      render: (row) => row.max_monthly == null ? '∞' : Number(row.max_monthly).toLocaleString(),
    },
    {
      key: 'rate_pct', label: 'Rate %', width: 100, align: 'right', sortKey: 'rate_pct',
      render: (row) => `${row.rate_pct}%`,
    },
    {
      key: 'deduct_amount', label: 'Subtract (Rs.)', width: 140, align: 'right', sortKey: 'deduct_amount',
      render: (row) => Number(row.deduct_amount).toLocaleString(),
    },
    {
      key: 'is_active', label: 'Status', width: 100, sortKey: 'is_active',
      filterKey: 'f_is_active', filterType: 'bool',
      render: (row) => row.is_active
        ? <Chip size="small" label="Active" color="success" />
        : <Chip size="small" label="Inactive" />,
    },
    {
      key: 'actions', label: 'Actions', width: 120, align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setDialog({
              ...row,
              max_monthly: row.max_monthly == null ? '' : row.max_monthly,
            })}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => remove(row)}>
              <DeleteIcon fontSize="small" /></IconButton>
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
        title="APIT (PAYE) Slabs"
        subtitle="Sri Lankan Advance Personal Income Tax. Formula per slab: tax = gross × rate% − subtract. Leave Max blank for the top unbounded slab."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ ...empty })}>New Slab</Button>}
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
        emptyMessage="No APIT slabs"
      />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog?.id ? 'Edit APIT Slab' : 'New APIT Slab'}</DialogTitle>
        <DialogContent dividers>
          {dialog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Label (optional)" value={dialog.label}
                placeholder="e.g. 6% slab"
                onChange={(e) => setDialog(d => ({ ...d, label: e.target.value }))} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField label="Min Monthly (Rs.)" type="number" value={dialog.min_monthly}
                  onChange={(e) => setDialog(d => ({ ...d, min_monthly: e.target.value }))} />
                <TextField label="Max Monthly (Rs.)" type="number" value={dialog.max_monthly ?? ''}
                  helperText="Blank = unbounded"
                  onChange={(e) => setDialog(d => ({ ...d, max_monthly: e.target.value }))} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField label="Rate %" type="number" value={dialog.rate_pct}
                  onChange={(e) => setDialog(d => ({ ...d, rate_pct: e.target.value }))} />
                <TextField label="Subtract (Rs.)" type="number" value={dialog.deduct_amount}
                  helperText="Fixed tax credit"
                  onChange={(e) => setDialog(d => ({ ...d, deduct_amount: e.target.value }))} />
              </Box>
              <FormControlLabel
                control={<Switch checked={dialog.is_active}
                  onChange={(e) => setDialog(d => ({ ...d, is_active: e.target.checked }))} />}
                label="Active"
              />
              <Typography variant="caption" color="text.secondary">
                Reference (SL 2024/25 monthly): 0–100k: 0%, 100k–141,667: 6% (−6,000),
                141,667–183,333: 12% (−14,500), 183,333–225,000: 18% (−25,500),
                225,000–266,667: 24% (−39,000), 266,667–308,333: 30% (−55,000),
                308,333+: 36% (−73,500).
              </Typography>
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
