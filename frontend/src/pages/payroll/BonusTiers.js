import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, TextField, Alert, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Switch, FormControlLabel, IconButton, Tooltip, CircularProgress, Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

const empty = { id: null, min_pct: 90, max_pct: 100, bonus_amount: 0, label: 'Attendance Bonus', is_active: true };

export default function BonusTiers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/payroll/bonus-tiers/');
      setRows(res.data || []);
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
    { field: 'label', headerName: 'Label', flex: 1.2, minWidth: 160 },
    { field: 'min_pct', headerName: 'Min %', width: 100, align: 'right', headerAlign: 'right' },
    { field: 'max_pct', headerName: 'Max %', width: 100, align: 'right', headerAlign: 'right' },
    { field: 'bonus_amount', headerName: 'Bonus (Rs.)', width: 140, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => <Typography variant="body2" fontWeight={700}>{Number(value).toLocaleString()}</Typography> },
    {
      field: 'is_active', headerName: 'Status', width: 110,
      renderCell: ({ value }) => value
        ? <Chip label="Active" size="small" color="success" />
        : <Chip label="Inactive" size="small" />,
    },
    {
      field: 'actions', headerName: 'Actions', width: 120, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
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

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Attendance Bonus Tiers"
        subtitle="Score = 100 − 10×absent − 5×late. The highest tier whose range covers the score adds a bonus line to the payroll."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ ...empty })}>New Tier</Button>}
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ height: 500, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows} columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

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
