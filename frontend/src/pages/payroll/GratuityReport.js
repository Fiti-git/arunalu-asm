import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Alert, Chip, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent,
} from '@mui/material';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GratuityReport() {
  const [rows, setRows] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    api.get('/api/outlets/').then(res => {
      setOutlets(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    }).catch(() => {});
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = outletId !== 'all' ? { outlet: outletId } : {};
      const res = await api.get('/payroll/gratuity/', { params });
      setRows(res.data || []);
      setPage(1);
    } catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, [outletId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const eligibleCount = rows.filter(r => r.eligible).length;
  const totalLiability = rows.reduce((a, r) => a + Number(r.gratuity || 0), 0);

  const columns = useMemo(() => [
    { key: 'empcode', label: 'Emp Code', width: 110, sortKey: 'empcode', filterKey: 'f_empcode', filterType: 'text' },
    { key: 'fullname', label: 'Employee', width: 200, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text' },
    { key: 'primary_outlet_name', label: 'Outlet', width: 160, sortKey: 'primary_outlet_name', filterKey: 'f_outlet', filterType: 'text' },
    {
      key: 'service_start', label: 'Start Date', width: 120, sortKey: 'service_start',
      filterKey: 'f_start', filterType: 'date',
      render: (row) => row.service_start || '—',
    },
    {
      key: 'service_years', label: 'Years', width: 100, align: 'right', sortKey: 'service_years',
      render: (row) => Number(row.service_years || 0).toFixed(2),
    },
    {
      key: 'basic_salary', label: 'Basic (Rs.)', width: 130, align: 'right', sortKey: 'basic_salary',
      render: (row) => fmt(row.basic_salary),
    },
    {
      key: 'eligible', label: 'Status', width: 130, sortKey: 'eligible',
      filterKey: 'f_eligible', filterType: 'bool',
      render: (row) => row.eligible
        ? <Chip size="small" label="Eligible" color="success" />
        : <Chip size="small" label="Not yet" />,
    },
    {
      key: 'gratuity', label: 'Gratuity (Rs.)', width: 160, align: 'right', sortKey: 'gratuity',
      render: (row) => (
        <Typography variant="body2" fontWeight={row.gratuity > 0 ? 700 : 400}
          color={row.gratuity > 0 ? 'success.main' : 'text.disabled'}>
          {fmt(row.gratuity)}
        </Typography>
      ),
    },
    { key: 'note', label: 'Note', width: 220, sortKey: 'note', filterKey: 'f_note', filterType: 'text' },
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
        title="Gratuity Report"
        subtitle="SL Payment of Gratuity Act: ½ month's basic × years of service, payable after 5 years. Service start taken from the employee's EPF Calculation Date."
        actions={
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Outlet</InputLabel>
            <Select label="Outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              <MenuItem value="all">All Outlets</MenuItem>
              {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
            </Select>
          </FormControl>
        }
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 180, borderLeft: 4, borderColor: 'divider' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary">Total Employees</Typography>
            <Typography variant="h6" fontWeight={700}>{rows.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 180, borderLeft: 4, borderColor: 'success.main' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary">Eligible</Typography>
            <Typography variant="h6" fontWeight={700}>{eligibleCount}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 220, borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary">Total Accrued Liability</Typography>
            <Typography variant="h6" fontWeight={700}>Rs. {fmt(totalLiability)}</Typography>
          </CardContent>
        </Card>
      </Box>

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
        emptyMessage="No employees"
      />
    </Box>
  );
}
