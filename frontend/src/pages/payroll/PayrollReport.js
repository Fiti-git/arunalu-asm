import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert, Button,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Card, CardContent,
  IconButton, Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, Legend,
} from 'recharts';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS = [
  { key: 'employees', label: 'Per-Employee Salaries' },
  { key: 'outlet-summary', label: 'Outlet Cost Summary' },
  { key: 'multi-outlet', label: 'Multi-Outlet Breakdown' },
];

export default function PayrollReport() {
  const [month, setMonth] = useState(currentMonth());
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('all');
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    api.get('/api/outlets/').then((res) => {
      setOutlets(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    }).catch(() => {});
  }, []);

  const activeTab = TABS[tab].key;

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { month };
      if (outletId !== 'all') params.outlet = outletId;
      const res = await api.get(`/calculation/payroll-report/${activeTab}/`, { params });
      setData(res.data);
      setPage(1);
      setColumnFilters({});
      setSortBy({ key: '', dir: 'asc' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
      setData(null);
    } finally { setLoading(false); }
  }, [month, outletId, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportXlsx = async () => {
    try {
      const params = { tab: activeTab, month };
      if (outletId !== 'all') params.outlet = outletId;
      const res = await api.get('/calculation/payroll-report/export/', {
        params, responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${activeTab}_${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export.');
    }
  };

  // ---------- Columns per tab ----------
  const employeeCols = useMemo(() => [
    { key: 'empcode', label: 'Emp Code', width: 110, sortKey: 'empcode', filterKey: 'f_empcode', filterType: 'text' },
    { key: 'fullname', label: 'Employee', width: 200, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text' },
    { key: 'outlets', label: 'Outlets', width: 220, sortKey: 'outlets', filterKey: 'f_outlets', filterType: 'text' },
    {
      key: 'gross_pay', label: 'Gross', width: 120, align: 'right', sortKey: 'gross_pay',
      render: (row) => fmt(row.gross_pay),
    },
    {
      key: 'epf_employee_deduction', label: 'EPF (Emp)', width: 110, align: 'right', sortKey: 'epf_employee_deduction',
      render: (row) => fmt(row.epf_employee_deduction),
    },
    {
      key: 'epf_company_contribution', label: 'EPF (Com)', width: 110, align: 'right', sortKey: 'epf_company_contribution',
      render: (row) => fmt(row.epf_company_contribution),
    },
    {
      key: 'etf_company_contribution', label: 'ETF (Com)', width: 110, align: 'right', sortKey: 'etf_company_contribution',
      render: (row) => fmt(row.etf_company_contribution),
    },
    {
      key: 'deduction_total', label: 'Deduct.', width: 110, align: 'right', sortKey: 'deduction_total',
      render: (row) => fmt(row.deduction_total),
    },
    {
      key: 'net_pay', label: 'Net', width: 130, align: 'right', sortKey: 'net_pay',
      render: (row) => <Typography variant="body2" fontWeight={700}>{fmt(row.net_pay)}</Typography>,
    },
  ], []);

  const outletCols = useMemo(() => [
    { key: 'outlet_name', label: 'Outlet', width: 220, sortKey: 'outlet_name', filterKey: 'f_outlet_name', filterType: 'text' },
    { key: 'employee_count', label: 'Employees', width: 130, align: 'right', sortKey: 'employee_count' },
    {
      key: 'total_cost', label: 'Total Cost', width: 160, align: 'right', sortKey: 'total_cost',
      render: (row) => <Typography variant="body2" fontWeight={700}>{fmt(row.total_cost)}</Typography>,
    },
  ], []);

  const multiCols = useMemo(() => [
    { key: 'empcode', label: 'Emp Code', width: 110, sortKey: 'empcode', filterKey: 'f_empcode', filterType: 'text' },
    { key: 'fullname', label: 'Employee', width: 200, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text' },
    {
      key: 'net_pay', label: 'Net Pay', width: 130, align: 'right', sortKey: 'net_pay',
      render: (row) => fmt(row.net_pay),
    },
    { key: 'outlet_name', label: 'Outlet', width: 200, sortKey: 'outlet_name', filterKey: 'f_outlet_name', filterType: 'text' },
    {
      key: 'percentage', label: '%', width: 90, align: 'right', sortKey: 'percentage',
      render: (row) => `${Number(row.percentage || 0).toFixed(2)}%`,
    },
    {
      key: 'amount', label: 'Amount', width: 130, align: 'right', sortKey: 'amount',
      render: (row) => <Typography variant="body2" fontWeight={700}>{fmt(row.amount)}</Typography>,
    },
  ], []);

  // ---------- Rows / totals per tab ----------
  const rows = data?.rows || [];
  const totals = data?.totals || null;
  const grandTotal = data?.grand_total;

  const rowId = (r) => {
    if (activeTab === 'employees') return r.voucher_id;
    if (activeTab === 'outlet-summary') return r.outlet_id;
    return `${r.voucher_id}-${r.outlet_id}`;
  };

  const cols = activeTab === 'employees' ? employeeCols
            : activeTab === 'outlet-summary' ? outletCols
            : multiCols;

  const filteredRows = useMemo(
    () => applyClientFilters(rows, cols, columnFilters, sortBy),
    [rows, cols, columnFilters, sortBy]
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
        title="Payroll Report"
        subtitle="Monthly salary cost sourced from locked Payment Vouchers. Only employees with a locked voucher for the selected month are included."
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="Month" type="month" size="small" value={month}
              onChange={(e) => setMonth(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Outlet</InputLabel>
              <Select label="Outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                <MenuItem value="all">All Outlets</MenuItem>
                {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchData} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportXlsx}>
              Export Excel
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable"
        sx={{ borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map(t => <Tab key={t.key} label={t.label} />)}
      </Tabs>

      {/* Summary cards */}
      {activeTab === 'employees' && totals && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <SummaryCard label="Employees Paid" value={rows.length} raw />
          <SummaryCard label="Total Gross" value={fmt(totals.gross)} />
          <SummaryCard label="Total Net" value={fmt(totals.net)} highlight />
          <SummaryCard label="EPF (Employee)" value={fmt(totals.epf_emp)} />
          <SummaryCard label="EPF (Company)" value={fmt(totals.epf_com)} />
          <SummaryCard label="ETF (Company)" value={fmt(totals.etf_com)} />
        </Box>
      )}
      {activeTab === 'outlet-summary' && grandTotal != null && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <SummaryCard label="Outlets" value={rows.length} raw />
          <SummaryCard label="Grand Total Cost" value={fmt(grandTotal)} highlight />
        </Box>
      )}

      {/* Chart for outlet summary */}
      {activeTab === 'outlet-summary' && rows.length > 0 && (
        <Card sx={{ borderRadius: 2.5 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Cost per Outlet</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="outlet_name" />
                  <YAxis />
                  <RTooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="total_cost" name="Total Cost" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={cols}
        rows={pagedRows}
        getRowId={rowId}
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
        emptyMessage="No data"
      />
    </Box>
  );
}

function SummaryCard({ label, value, highlight, raw }) {
  return (
    <Card sx={{
      minWidth: 160, borderRadius: 2.5,
      borderLeft: 4, borderColor: highlight ? 'primary.main' : 'divider',
    }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" fontWeight={700}>
          {raw ? value : value}
        </Typography>
      </CardContent>
    </Card>
  );
}
