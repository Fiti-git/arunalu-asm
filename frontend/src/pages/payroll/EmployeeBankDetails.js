import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Alert, FormControl, InputLabel, Select, MenuItem,
  IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

// Common Sri Lankan bank codes (Central Bank SLIP list) for quick-fill
const SL_BANK_CODES = [
  { code: '7135', name: "People's Bank" },
  { code: '7010', name: 'Bank of Ceylon' },
  { code: '7056', name: 'Commercial Bank' },
  { code: '7278', name: 'Hatton National Bank' },
  { code: '7083', name: 'Sampath Bank' },
  { code: '7162', name: 'Seylan Bank' },
  { code: '7302', name: 'Nations Trust Bank' },
  { code: '7454', name: 'NDB Bank' },
  { code: '7728', name: 'DFCC Bank' },
];

export default function EmployeeBankDetails() {
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('all');
  const [rows, setRows] = useState([]);
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/api/outlets/').then((res) => {
      setOutlets(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    }).catch(() => {});
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const params = {};
      if (outletId !== 'all') params.outlet_id = outletId;
      const res = await api.get('/payroll/financial-profiles/', { params });
      setRows(res.data || []);
      setDirtyIds(new Set());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load employees.');
    } finally { setLoading(false); }
  }, [outletId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const processRowUpdate = (newRow, oldRow) => {
    const changed = JSON.stringify(newRow) !== JSON.stringify(oldRow);
    if (changed) {
      // If bank_code changed to a known code, auto-fill bank_name
      const known = SL_BANK_CODES.find((b) => b.code === String(newRow.bank_code || '').trim());
      if (known && newRow.bank_name !== known.name) newRow.bank_name = known.name;

      setRows((prev) => prev.map((r) => (r.employee_id === newRow.employee_id ? newRow : r)));
      setDirtyIds((prev) => new Set(prev).add(newRow.employee_id));
    }
    return newRow;
  };

  const saveAll = async () => {
    if (!dirtyIds.size) return;
    setSaving(true); setError(''); setSuccess('');
    const dirtyRows = rows.filter((r) => dirtyIds.has(r.employee_id));
    try {
      const res = await api.post('/payroll/financial-profiles/bulk/', { rows: dirtyRows });
      setSuccess(`Saved ${res.data.updated} row(s).`);
      if (res.data.errors?.length) {
        setError(`${res.data.errors.length} row(s) failed: ${JSON.stringify(res.data.errors)}`);
      }
      setDirtyIds(new Set());
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed. Admin-only endpoint.');
    } finally { setSaving(false); }
  };

  const columns = useMemo(() => [
    { field: 'empcode', headerName: 'Emp Code', width: 110, editable: false },
    { field: 'fullname', headerName: 'Full Name', flex: 1.2, minWidth: 200, editable: false },
    { field: 'primary_outlet_name', headerName: 'Outlet', width: 140, editable: false },
    { field: 'bank_code', headerName: 'Bank Code', width: 120, editable: true,
      type: 'singleSelect',
      valueOptions: [{ value: '', label: '—' }, ...SL_BANK_CODES.map((b) => ({
        value: b.code, label: `${b.code} · ${b.name}`,
      }))],
    },
    { field: 'bank_name', headerName: 'Bank Name', width: 200, editable: true },
    { field: 'bank_branch_code', headerName: 'Branch Code', width: 130, editable: true },
    { field: 'bank_account_no', headerName: 'Account No', flex: 1, minWidth: 180, editable: true },
  ], []);

  return (
    <Box sx={{ width: '97%', mx: 'auto', mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Employee Bank Details"
        subtitle="Salary disbursement accounts. Pick a bank code to auto-fill the name; all fields are required for the People's Bank CIB upload file."
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Outlet</InputLabel>
              <Select label="Outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                <MenuItem value="all">All Outlets</MenuItem>
                {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Tooltip title="Refresh"><span>
              <IconButton onClick={fetchList} disabled={loading} color="primary">
                {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
              </IconButton>
            </span></Tooltip>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              disabled={!dirtyIds.size || saving}
              onClick={saveAll}
            >
              Save All {dirtyIds.size ? `(${dirtyIds.size})` : ''}
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ height: 680, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.employee_id}
          loading={loading}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={(err) => setError(String(err))}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
          getRowClassName={({ id }) => dirtyIds.has(id) ? 'row-dirty' : ''}
          sx={{
            '& .row-dirty': { bgcolor: 'warning.lighter', '&:hover': { bgcolor: 'warning.light' } },
          }}
        />
      </Box>
    </Box>
  );
}
