import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Alert, Chip, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GratuityReport() {
  const [rows, setRows] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, [outletId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const eligibleCount = rows.filter(r => r.eligible).length;
  const totalLiability = rows.reduce((a, r) => a + Number(r.gratuity || 0), 0);

  const columns = useMemo(() => [
    { field: 'empcode', headerName: 'Emp Code', width: 110 },
    { field: 'fullname', headerName: 'Employee', flex: 1, minWidth: 180 },
    { field: 'primary_outlet_name', headerName: 'Outlet', flex: 0.9, minWidth: 150 },
    { field: 'service_start', headerName: 'Start Date', width: 120,
      renderCell: ({ value }) => value || '—' },
    { field: 'service_years', headerName: 'Years', width: 100, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => Number(value || 0).toFixed(2) },
    { field: 'basic_salary', headerName: 'Basic (Rs.)', width: 130, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => fmt(value) },
    {
      field: 'eligible', headerName: 'Status', width: 130,
      renderCell: ({ row }) => row.eligible
        ? <Chip size="small" label="Eligible" color="success" />
        : <Chip size="small" label="Not yet" />,
    },
    { field: 'gratuity', headerName: 'Gratuity (Rs.)', width: 160, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={value > 0 ? 700 : 400}
          color={value > 0 ? 'success.main' : 'text.disabled'}>
          {fmt(value)}
        </Typography>
      ) },
    { field: 'note', headerName: 'Note', flex: 1, minWidth: 200 },
  ], []);

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

      <Box sx={{ height: 600, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows} columns={columns}
          getRowId={(r) => r.employee_id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        />
      </Box>
    </Box>
  );
}
