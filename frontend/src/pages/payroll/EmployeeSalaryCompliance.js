import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Alert, FormControl, InputLabel, Select, MenuItem,
  IconButton, Tooltip, CircularProgress, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

export default function EmployeeSalaryCompliance() {
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
    { field: 'empcode', headerName: 'Emp Code', width: 110, editable: true },
    { field: 'fullname', headerName: 'Full Name', flex: 1.2, minWidth: 200, editable: true },
    { field: 'initials', headerName: 'Initials', width: 110, editable: true },
    { field: 'surname', headerName: 'Surname', width: 140, editable: true },
    { field: 'idnumber', headerName: 'NIC', width: 140, editable: true },
    { field: 'primary_outlet_name', headerName: 'Outlet', width: 140, editable: false },
    { field: 'basic_salary', headerName: 'Basic (Rs.)', width: 120, type: 'number', editable: true,
      align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => Number(value || 0).toLocaleString() },
    { field: 'epf_number', headerName: 'EPF Member No', width: 140, editable: true },
    { field: 'epf_member_status', headerName: 'EPF Status', width: 110, editable: true,
      type: 'singleSelect', valueOptions: [
        { value: 'E', label: 'E (Existing)' }, { value: 'N', label: 'N (New)' },
      ],
      renderCell: ({ value }) => (
        <Chip size="small" label={value === 'N' ? 'N — New' : 'E — Existing'}
          color={value === 'N' ? 'warning' : 'default'} />
      ),
    },
    { field: 'epf_grade', headerName: 'Occ. Grade', width: 120, editable: true },
    { field: 'epf_cal_date', headerName: 'EPF Start Date', width: 140, editable: true,
      type: 'date',
      valueGetter: (v) => (v ? new Date(v) : null),
      valueSetter: ({ row, value }) => ({
        ...row,
        epf_cal_date: value ? new Date(value).toISOString().slice(0, 10) : null,
      }),
    },
    { field: 'etf_member_no', headerName: 'ETF Member No', width: 140, editable: true,
      description: 'Leave blank to use EPF number in exports' },
    { field: 'epf_emp_per', headerName: 'EPF Emp %', width: 110, type: 'number', editable: true },
    { field: 'epf_com_per', headerName: 'EPF Co %', width: 110, type: 'number', editable: true },
    { field: 'etf_com_per', headerName: 'ETF Co %', width: 110, type: 'number', editable: true },
  ], []);

  return (
    <Box sx={{ width: '97%', mx: 'auto', mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Employee Salary / EPF / ETF"
        subtitle="One-time setup of statutory details. Double-click any cell to edit — changes queue up; click Save All to write them back."
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
