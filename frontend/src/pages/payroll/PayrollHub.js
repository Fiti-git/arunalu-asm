import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert, Avatar, Chip, Button,
  IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import ButtonGroup from '@mui/material/ButtonGroup';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';
import { pickAvatarColor } from 'theme/tokens';

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const endOfMonth = () => {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
};
const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const statusColor = (s) => (s === 'Locked' ? 'success' : s === 'Draft' ? 'warning' : 'default');

export default function PayrollHub() {
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('all');
  const [periodStart, setPeriodStart] = useState(firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(endOfMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true); setError('');
    try {
      const params = { period_start: periodStart, period_end: periodEnd };
      if (outletId !== 'all') params.outlet_id = outletId;
      const res = await api.get('/payroll/employees/', { params });
      setRows(res.data || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load employees.');
    } finally { setLoading(false); }
  }, [outletId, periodStart, periodEnd]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const downloadExport = async (kind, { includeDrafts = false } = {}) => {
    const month = periodStart.slice(0, 7); // YYYY-MM
    setError('');
    try {
      const params = { month };
      if (outletId !== 'all') params.outlet_id = outletId;
      if (includeDrafts) params.include_drafts = 1;
      const res = await api.get(`/payroll/export/${kind}/`, {
        params, responseType: 'blob',
      });
      const missing = res.headers['x-missing-bank-details'];
      if (kind === 'bank' && missing) {
        setError(`Bank details missing for: ${missing}. The file was still generated — fix these in Employee Bank Details.`);
      }
      const cd = res.headers['content-disposition'] || '';
      const m = /filename="?([^";]+)"?/.exec(cd);
      const filename = m ? m[1] : `${kind}_${month}.xlsx`;
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
    } catch (err) {
      const body = err.response?.data;
      let msg = `Failed to download ${kind} file.`;
      if (body instanceof Blob) {
        try {
          const text = await body.text();
          try { msg = JSON.parse(text).error || text; }
          catch { msg = text || msg; }
        } catch { /* keep default */ }
      } else if (body?.error) {
        msg = body.error;
      }
      setError(msg);
    }
  };

  const openEmployee = (row) => {
    const qs = `?start=${periodStart}&end=${periodEnd}`;
    navigate(`/admin/payroll/employee/${row.employee_id}${qs}`);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  };

  const downloadRowPayslip = async (row) => {
    if (!row.payroll_id) return;
    setError('');
    try {
      const res = await api.get(`/payroll/payrolls/${row.payroll_id}/payslip/`, {
        responseType: 'blob',
      });
      const filename = `payslip_${row.empcode || row.employee_id}_${periodStart}_${periodEnd}.pdf`;
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), filename);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to download payslip.');
    }
  };

  const downloadPayslipZip = async ({ includeDrafts = false } = {}) => {
    setError('');
    try {
      const params = { period_start: periodStart, period_end: periodEnd };
      if (outletId !== 'all') params.outlet_id = outletId;
      if (includeDrafts) params.include_drafts = 1;
      const res = await api.get('/payroll/payslips-zip/', {
        params, responseType: 'blob',
      });
      const cd = res.headers['content-disposition'] || '';
      const m = /filename="?([^";]+)"?/.exec(cd);
      const filename = m ? m[1] : `payslips_${periodStart}_to_${periodEnd}.zip`;
      downloadBlob(new Blob([res.data], { type: 'application/zip' }), filename);
    } catch (err) {
      const body = err.response?.data;
      let msg = 'Failed to download payslip ZIP.';
      if (body instanceof Blob) {
        try {
          const text = await body.text();
          try { msg = JSON.parse(text).error || text; } catch { msg = text || msg; }
        } catch { /* keep default */ }
      } else if (body?.error) {
        msg = body.error;
      }
      setError(msg);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'fullname', label: 'Employee', width: 240,
      sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text',
      filterValue: (row) => row.fullname,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, bgcolor: pickAvatarColor(row.fullname || '') }}>
            {getInitials(row.fullname)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{row.fullname}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.empcode || `#${row.employee_id}`}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { key: 'primary_outlet_name', label: 'Outlet', width: 160, sortKey: 'primary_outlet_name', filterKey: 'f_outlet', filterType: 'text' },
    {
      key: 'basic_salary', label: 'Basic', width: 110, align: 'right', sortKey: 'basic_salary',
      render: (row) => Number(row.basic_salary || 0).toLocaleString(),
    },
    {
      key: 'payroll_score', label: 'Att. Score', width: 140, sortKey: 'payroll_score',
      render: (row) => row.payroll_score == null ? '—' : (
        <Box sx={{ width: '100%', py: 0.5 }}>
          <Typography variant="caption">{Number(row.payroll_score).toFixed(0)}%</Typography>
          <LinearProgress variant="determinate" value={Math.min(100, Number(row.payroll_score))}
            color={row.payroll_score >= 90 ? 'success' : row.payroll_score >= 75 ? 'warning' : 'error'}
            sx={{ height: 6, borderRadius: 1 }} />
        </Box>
      ),
    },
    {
      key: 'payroll_status', label: 'This Period', width: 140, sortKey: 'payroll_status',
      filterKey: 'f_status', filterType: 'select',
      filterOptions: [
        { value: 'Locked', label: 'Locked' },
        { value: 'Draft', label: 'Draft' },
      ],
      render: (row) => row.payroll_id ? (
        <Chip label={row.payroll_status} size="small" color={statusColor(row.payroll_status)} sx={{ fontWeight: 600 }} />
      ) : <Typography variant="caption" color="text.disabled">Not generated</Typography>,
    },
    {
      key: 'payroll_net_pay', label: 'Net Pay', width: 130, align: 'right', sortKey: 'payroll_net_pay',
      render: (row) => row.payroll_net_pay != null ? Number(row.payroll_net_pay).toLocaleString() : '—',
    },
    {
      key: 'actions', label: 'Action', width: 200, align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Button size="small" variant="outlined" startIcon={<CalculateOutlinedIcon />} onClick={() => openEmployee(row)}>
            {row.payroll_id ? 'Open' : 'Calc'}
          </Button>
          {row.payroll_id && (
            <Tooltip title="Download payslip PDF">
              <IconButton size="small" color="primary" onClick={() => downloadRowPayslip(row)}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ], [periodStart, periodEnd]); // eslint-disable-line react-hooks/exhaustive-deps

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
        title="Payroll"
        subtitle="Monthly payroll per employee. Uses attendance, leave, holidays and the employee's work schedule to compute gross dynamically."
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="Period From" type="date" size="small" value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
            <TextField label="Period To" type="date" size="small" value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
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
                <IconButton onClick={fetchList} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <ButtonGroup size="small" variant="outlined" color="primary">
              <Button startIcon={<DownloadIcon />} onClick={() => downloadExport('epf')}>EPF</Button>
              <Button startIcon={<DownloadIcon />} onClick={() => downloadExport('etf')}>ETF</Button>
              <Button startIcon={<DownloadIcon />} onClick={() => downloadExport('bank')}>Bank</Button>
              <Button startIcon={<DownloadIcon />} onClick={() => downloadPayslipZip()}>Payslips ZIP</Button>
            </ButtonGroup>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

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
