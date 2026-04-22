import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableHead, TableRow, Switch, FormControlLabel,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

export default function OutletAllocations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [multiOnly, setMultiOnly] = useState(true);
  const [editing, setEditing] = useState(null); // selected employee row
  const [draft, setDraft] = useState([]);       // [{outlet_id, outlet_name, percentage}]
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = multiOnly ? { multi_only: '1' } : {};
      const res = await api.get('/calculation/allocations/', { params });
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load allocations.');
    } finally { setLoading(false); }
  }, [multiOnly]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openEditor = (row) => {
    const existing = new Map((row.allocations || []).map(a => [a.outlet_id, a.percentage]));
    const initial = row.outlets.map(o => ({
      outlet_id: o.id,
      outlet_name: o.name,
      percentage: existing.has(o.id)
        ? existing.get(o.id)
        : (row.outlets.length ? Number((100 / row.outlets.length).toFixed(2)) : 0),
    }));
    setEditing(row);
    setDraft(initial);
  };

  const closeEditor = () => { setEditing(null); setDraft([]); };

  const updatePct = (outlet_id, value) => {
    const n = value === '' ? 0 : Number(value);
    setDraft(d => d.map(row =>
      row.outlet_id === outlet_id ? { ...row, percentage: isNaN(n) ? 0 : n } : row
    ));
  };

  const sum = useMemo(
    () => draft.reduce((acc, r) => acc + Number(r.percentage || 0), 0),
    [draft]
  );
  const sumOk = Math.abs(sum - 100) < 0.01;

  const save = async () => {
    if (!editing || !sumOk) return;
    setSaving(true); setError('');
    try {
      await api.put(`/calculation/allocations/${editing.employee_id}/`,
        draft.map(d => ({ outlet_id: d.outlet_id, percentage: d.percentage })),
      );
      closeEditor();
      fetchList();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save allocations.');
    } finally { setSaving(false); }
  };

  const columns = useMemo(() => [
    { field: 'empcode', headerName: 'Emp Code', width: 120 },
    { field: 'fullname', headerName: 'Employee', flex: 1, minWidth: 200 },
    {
      field: 'outlets', headerName: 'Assigned Outlets', flex: 1.5, minWidth: 260, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', py: 0.5 }}>
          {row.outlets.map(o => <Chip key={o.id} label={o.name} size="small" />)}
        </Box>
      ),
    },
    {
      field: 'has_explicit', headerName: 'Allocation', width: 150,
      renderCell: ({ row }) => row.has_explicit
        ? <Chip label="Configured" size="small" color="success" />
        : <Chip label="Default split" size="small" />,
    },
    {
      field: 'allocations', headerName: 'Split', flex: 1.2, minWidth: 240, sortable: false,
      renderCell: ({ row }) => {
        if (!row.has_explicit) {
          return <Typography variant="caption" color="text.secondary">Auto (primary=100% or equal)</Typography>;
        }
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', py: 0.5 }}>
            {row.allocations.map(a => (
              <Chip key={a.outlet_id} size="small" variant="outlined"
                label={`${a.outlet_name} — ${a.percentage}%`} />
            ))}
          </Box>
        );
      },
    },
    {
      field: 'actions', headerName: 'Edit', width: 110, sortable: false, filterable: false,
      renderCell: ({ row }) => (
        <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />}
          onClick={() => openEditor(row)}>Edit</Button>
      ),
    },
  ], []);

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Outlet Salary Allocations"
        subtitle="For employees assigned to multiple outlets, set what % of their monthly salary each outlet absorbs. Percentages must sum to 100."
        actions={
          <FormControlLabel
            control={<Switch checked={multiOnly} onChange={(e) => setMultiOnly(e.target.checked)} />}
            label="Only multi-outlet employees"
          />
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ height: 640, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows} columns={columns}
          getRowId={(r) => r.employee_id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
          getRowHeight={() => 'auto'}
        />
      </Box>

      <Dialog open={!!editing} onClose={closeEditor} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Allocation — {editing?.fullname}
          <Typography variant="caption" display="block" color="text.secondary">
            {editing?.empcode}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Outlet</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>Percentage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draft.map(row => (
                <TableRow key={row.outlet_id}>
                  <TableCell>{row.outlet_name}</TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small" type="number" value={row.percentage}
                      onChange={(e) => updatePct(row.outlet_id, e.target.value)}
                      inputProps={{ min: 0, max: 100, step: 0.01 }}
                      sx={{ width: 110 }}
                      InputProps={{ endAdornment: <Typography variant="caption">%</Typography> }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right"
                  sx={{ fontWeight: 700, color: sumOk ? 'success.main' : 'error.main' }}>
                  {sum.toFixed(2)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {!sumOk && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Percentages must sum to exactly 100.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditor} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!sumOk || saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
