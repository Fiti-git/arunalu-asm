import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Alert, FormControl, InputLabel, Select, MenuItem,
  IconButton, Tooltip, CircularProgress, Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';

const EPF_STATUS_OPTIONS = [
  { value: 'E', label: 'E (Existing)' },
  { value: 'N', label: 'N (New)' },
];

export default function EmployeeSalaryCompliance() {
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('all');
  const [rows, setRows] = useState([]);
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

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
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load employees.');
    } finally { setLoading(false); }
  }, [outletId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleCellEdit = (row, key, value) => {
    const updated = { ...row, [key]: value };
    setRows((prev) => prev.map((r) => (r.employee_id === row.employee_id ? updated : r)));
    setDirtyIds((prev) => new Set(prev).add(row.employee_id));
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
    { key: 'empcode', label: 'Emp Code', width: 110, sortKey: 'empcode', filterKey: 'f_empcode', filterType: 'text', editable: true, editType: 'text' },
    { key: 'fullname', label: 'Full Name', width: 220, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text', editable: true, editType: 'text' },
    { key: 'initials', label: 'Initials', width: 110, sortKey: 'initials', filterKey: 'f_initials', filterType: 'text', editable: true, editType: 'text' },
    { key: 'surname', label: 'Surname', width: 140, sortKey: 'surname', filterKey: 'f_surname', filterType: 'text', editable: true, editType: 'text' },
    { key: 'idnumber', label: 'NIC', width: 140, sortKey: 'idnumber', filterKey: 'f_nic', filterType: 'text', editable: true, editType: 'text' },
    { key: 'primary_outlet_name', label: 'Outlet', width: 150, sortKey: 'primary_outlet_name', filterKey: 'f_outlet', filterType: 'text' },
    {
      key: 'basic_salary', label: 'Basic (Rs.)', width: 130, align: 'right', sortKey: 'basic_salary',
      editable: true, editType: 'number',
      render: (row) => Number(row.basic_salary || 0).toLocaleString(),
    },
    { key: 'epf_number', label: 'EPF Member No', width: 140, sortKey: 'epf_number', filterKey: 'f_epf_number', filterType: 'text', editable: true, editType: 'text' },
    {
      key: 'epf_member_status', label: 'EPF Status', width: 130, sortKey: 'epf_member_status',
      filterKey: 'f_epf_status', filterType: 'select', filterOptions: EPF_STATUS_OPTIONS,
      editable: true, editType: 'select', editOptions: EPF_STATUS_OPTIONS,
      render: (row) => (
        <Chip size="small" label={row.epf_member_status === 'N' ? 'N — New' : 'E — Existing'}
          color={row.epf_member_status === 'N' ? 'warning' : 'default'} />
      ),
    },
    { key: 'epf_grade', label: 'Occ. Grade', width: 120, sortKey: 'epf_grade', filterKey: 'f_grade', filterType: 'text', editable: true, editType: 'text' },
    {
      key: 'epf_cal_date', label: 'EPF Start Date', width: 150, sortKey: 'epf_cal_date',
      filterKey: 'f_epf_cal_date', filterType: 'date',
      editable: true, editType: 'date',
      render: (row) => row.epf_cal_date || '—',
    },
    { key: 'etf_member_no', label: 'ETF Member No', width: 140, sortKey: 'etf_member_no', filterKey: 'f_etf_no', filterType: 'text', editable: true, editType: 'text' },
    { key: 'epf_emp_per', label: 'EPF Emp %', width: 110, align: 'right', sortKey: 'epf_emp_per', editable: true, editType: 'number' },
    { key: 'epf_com_per', label: 'EPF Co %', width: 110, align: 'right', sortKey: 'epf_com_per', editable: true, editType: 'number' },
    { key: 'etf_com_per', label: 'ETF Co %', width: 110, align: 'right', sortKey: 'etf_com_per', editable: true, editType: 'number' },
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
        onCellEdit={handleCellEdit}
        onRowClassName={(row) => dirtyIds.has(row.employee_id) ? 'row-dirty' : ''}
        emptyMessage="No employees"
        height={680}
        minHeight={680}
      />
      <style>{`.row-dirty td { background-color: rgba(255,167,38,0.08) !important; }`}</style>
    </Box>
  );
}
