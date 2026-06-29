import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Alert, FormControl, InputLabel, Select, MenuItem,
  IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';

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

const BANK_CODE_OPTIONS = [
  { value: '', label: '—' },
  ...SL_BANK_CODES.map((b) => ({ value: b.code, label: `${b.code} · ${b.name}` })),
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
    // Auto-fill bank_name when a known bank_code is picked
    if (key === 'bank_code') {
      const known = SL_BANK_CODES.find((b) => b.code === String(value || '').trim());
      if (known) updated.bank_name = known.name;
    }
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
    { key: 'empcode', label: 'Emp Code', width: 110, sortKey: 'empcode', filterKey: 'f_empcode', filterType: 'text' },
    { key: 'fullname', label: 'Full Name', width: 220, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text' },
    { key: 'primary_outlet_name', label: 'Outlet', width: 150, sortKey: 'primary_outlet_name', filterKey: 'f_outlet', filterType: 'text' },
    {
      key: 'bank_code', label: 'Bank Code', width: 140,
      sortKey: 'bank_code', filterKey: 'f_bank_code', filterType: 'text',
      editable: true, editType: 'select', editOptions: BANK_CODE_OPTIONS,
      render: (row) => row.bank_code || '—',
    },
    {
      key: 'bank_name', label: 'Bank Name', width: 220,
      sortKey: 'bank_name', filterKey: 'f_bank_name', filterType: 'text',
      editable: true, editType: 'text',
      render: (row) => row.bank_name || '—',
    },
    {
      key: 'bank_branch_code', label: 'Branch Code', width: 140,
      sortKey: 'bank_branch_code', filterKey: 'f_branch', filterType: 'text',
      editable: true, editType: 'text',
      render: (row) => row.bank_branch_code || '—',
    },
    {
      key: 'bank_account_no', label: 'Account No', width: 200,
      sortKey: 'bank_account_no', filterKey: 'f_account', filterType: 'text',
      editable: true, editType: 'text',
      render: (row) => row.bank_account_no || '—',
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
    <Box sx={{ width: '97%', mx: 'auto', mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Employee Bank Details"
        subtitle="Salary disbursement accounts. Pick a bank code to auto-fill the name; all fields are required for the People's Bank CIB upload file. Double-click a cell to edit."
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
