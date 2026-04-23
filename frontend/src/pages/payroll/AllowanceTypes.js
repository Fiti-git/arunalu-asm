import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel,
  IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import BlockIcon from '@mui/icons-material/Block';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

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

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/payroll/allowance-types/');
      setRows(res.data || []);
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
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    {
      field: 'calc_mode', headerName: 'Mode', width: 140,
      renderCell: ({ value }) => (
        <Chip size="small" label={value === 'PERCENT' ? '% of Basic' : 'Fixed'}
          color={value === 'PERCENT' ? 'info' : 'default'} />
      ),
    },
    { field: 'default_amount', headerName: 'Default', width: 120, align: 'right', headerAlign: 'right',
      renderCell: ({ value, row }) => row.calc_mode === 'PERCENT' ? `${value}%` : Number(value).toLocaleString() },
    { field: 'max_cap_amount', headerName: 'Max Cap', width: 120, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => Number(value) > 0 ? Number(value).toLocaleString() : '—' },
    {
      field: 'is_active', headerName: 'Active', width: 100,
      renderCell: ({ value }) => value
        ? <Chip label="Active" size="small" color="success" />
        : <Chip label="Inactive" size="small" />,
    },
    { field: 'notes', headerName: 'Notes', flex: 1.2, minWidth: 200 },
    {
      field: 'actions', headerName: 'Actions', width: 140, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
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

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Allowance Types"
        subtitle="Catalog of allowances (Transport, BRA, Cost-of-Living, etc.). Each can have a max cap enforced when applied to a payroll."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>New Allowance</Button>}
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ height: 600, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows} columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

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
