import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert, Avatar, Chip, Button,
  IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, LinearProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import ButtonGroup from '@mui/material/ButtonGroup';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { PageHeader } from 'components/ui';
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
      // Error responses come back as Blob because responseType='blob' — parse if JSON
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
      field: 'fullname', headerName: 'Employee', flex: 1.3, minWidth: 220,
      renderCell: ({ row }) => (
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
    { field: 'primary_outlet_name', headerName: 'Outlet', flex: 0.9, minWidth: 150 },
    { field: 'basic_salary', headerName: 'Basic', flex: 0.5, minWidth: 100, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => Number(value || 0).toLocaleString() },
    {
      field: 'payroll_score', headerName: 'Att. Score', flex: 0.7, minWidth: 130,
      renderCell: ({ value }) => value == null ? '—' : (
        <Box sx={{ width: '100%', py: 0.5 }}>
          <Typography variant="caption">{Number(value).toFixed(0)}%</Typography>
          <LinearProgress variant="determinate" value={Math.min(100, Number(value))}
            color={value >= 90 ? 'success' : value >= 75 ? 'warning' : 'error'}
            sx={{ height: 6, borderRadius: 1 }} />
        </Box>
      ),
    },
    {
      field: 'payroll_status', headerName: 'This Period', flex: 0.6, minWidth: 130,
      renderCell: ({ row }) => row.payroll_id ? (
        <Chip label={row.payroll_status} size="small" color={statusColor(row.payroll_status)} sx={{ fontWeight: 600 }} />
      ) : <Typography variant="caption" color="text.disabled">Not generated</Typography>,
    },
    { field: 'payroll_net_pay', headerName: 'Net Pay', flex: 0.7, minWidth: 130, align: 'right', headerAlign: 'right',
      renderCell: ({ value }) => value != null ? Number(value).toLocaleString() : '—' },
    {
      field: 'actions', headerName: 'Action', flex: 0.8, minWidth: 200, sortable: false, filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
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

      <Box sx={{ height: 640, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows} columns={columns}
          getRowId={(r) => r.employee_id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
          onRowDoubleClick={(p) => openEmployee(p.row)}
          getRowHeight={() => 'auto'}
        />
      </Box>
    </Box>
  );
}
