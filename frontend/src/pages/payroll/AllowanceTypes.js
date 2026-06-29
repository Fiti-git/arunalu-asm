import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, TextField, MenuItem, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel,
  IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import BlockIcon from '@mui/icons-material/Block';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';

const emptyForm = {
  id: null, name: '', calc_mode: 'FIXED',
  default_amount: 0, max_cap_amount: 0, is_active: true, notes: '',
};

export default function AllowanceTypes() {
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
      const res = await api.get('/payroll/allowance-types/');
      setRows(res.data || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openNew = () => setDialog({ ...emptyForm });
  const openEdit = (r) => setDialog({
    id: r.id, name: r.name, calc_mode: r.calc_mode,
    default_amount: r.default_amount, max_cap_amount: r.max_cap_amount,
    is_active: r.is_active, notes: r.notes || '',
  });
  const close = () => setDialog(null);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const { id, ...payload } = dialog;
      if (id) await api.patch(`/payroll/allowance-types/${id}/`, payload);
      else await api.post('/payroll/allowance-types/', payload);
      close(); fetchList();
    } catch (err) {
      setError(err.response?.data?.error
        || Object.values(err.response?.data || {}).flat().join(', ')
        || 'Save failed.');
    } finally { setSaving(false); }
  };

  const deactivate = async (row) => {
    if (!window.confirm(`Deactivate "${row.name}"?`)) return;
    try {
      await api.delete(`/payroll/allowance-types/${row.id}/`);
      fetchList();
    } catch (err) { setError('Failed to deactivate.'); }
  };

  const columns = useMemo(() => [
    { key: 'name', label: 'Name', width: 200, sortKey: 'name', filterKey: 'f_name', filterType: 'text' },
    {
      key: 'calc_mode', label: 'Mode', width: 140, sortKey: 'calc_mode',
      filterKey: 'f_calc_mode', filterType: 'select',
      filterOptions: [
        { value: 'FIXED', label: 'Fixed' },
        { value: 'PERCENT', label: '% of Basic' },
      ],
      render: (row) => (
        <Chip size="small" label={row.calc_mode === 'PERCENT' ? '% of Basic' : 'Fixed'}
          color={row.calc_mode === 'PERCENT' ? 'info' : 'default'} />
      ),
    },
    {
      key: 'default_amount', label: 'Default', width: 120, align: 'right', sortKey: 'default_amount',
      render: (row) => row.calc_mode === 'PERCENT' ? `${row.default_amount}%` : Number(row.default_amount).toLocaleString(),
    },
    {
      key: 'max_cap_amount', label: 'Max Cap', width: 120, align: 'right', sortKey: 'max_cap_amount',
      render: (row) => Number(row.max_cap_amount) > 0 ? Number(row.max_cap_amount).toLocaleString() : '—',
    },
    {
      key: 'is_active', label: 'Active', width: 100, sortKey: 'is_active',
      filterKey: 'f_is_active', filterType: 'bool',
      render: (row) => row.is_active
        ? <Chip label="Active" size="small" color="success" />
        : <Chip label="Inactive" size="small" />,
    },
    { key: 'notes', label: 'Notes', width: 220, sortKey: 'notes', filterKey: 'f_notes', filterType: 'text' },
    {
      key: 'actions', label: 'Actions', width: 140, align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          {row.is_active && (
            <Tooltip title="Deactivate">
              <IconButton size="small" color="error" onClick={() => deactivate(row)}><BlockIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
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
        title="Allowance Types"
        subtitle="Catalog of allowances (Transport, BRA, Cost-of-Living, etc.). Each can have a max cap enforced when applied to a payroll."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>New Allowance</Button>}
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
        emptyMessage="No allowance types"
      />

      <Dialog open={!!dialog} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.id ? 'Edit Allowance Type' : 'New Allowance Type'}</DialogTitle>
        <DialogContent dividers>
          {dialog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Name *" value={dialog.name}
                onChange={(e) => setDialog(d => ({ ...d, name: e.target.value }))} />
              <TextField select label="Calculation Mode" value={dialog.calc_mode}
                onChange={(e) => setDialog(d => ({ ...d, calc_mode: e.target.value }))}>
                <MenuItem value="FIXED">Fixed rupee amount</MenuItem>
                <MenuItem value="PERCENT">Percent of basic salary</MenuItem>
              </TextField>
              <TextField label={dialog.calc_mode === 'PERCENT' ? 'Default %' : 'Default Amount'}
                type="number" value={dialog.default_amount}
                onChange={(e) => setDialog(d => ({ ...d, default_amount: e.target.value }))} />
              <TextField label="Max Cap (rupees)" type="number" value={dialog.max_cap_amount}
                helperText="0 = no cap. Enforced on save."
                onChange={(e) => setDialog(d => ({ ...d, max_cap_amount: e.target.value }))} />
              <TextField label="Notes" value={dialog.notes} multiline minRows={2}
                onChange={(e) => setDialog(d => ({ ...d, notes: e.target.value }))} />
              <FormControlLabel
                control={<Switch checked={dialog.is_active}
                  onChange={(e) => setDialog(d => ({ ...d, is_active: e.target.checked }))} />}
                label="Active"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !dialog?.name?.trim()}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
