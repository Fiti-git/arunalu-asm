import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar, Chip,
  IconButton, Tooltip, Autocomplete, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader, StatCard } from 'components/ui';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import { firstOfMonth, today, exportCsv, getInitials, rangeFieldSx } from './shared';
import { getUserRole } from 'utils/auth';

const statusChipColor = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'present') return 'success';
  if (v === 'late') return 'warning';
  if (v === 'half day') return 'info';
  if (v === 'absent') return 'error';
  if (v === 'on leave') return 'default';
  return 'default';
};
const fmtT = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function EmployeeReport() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const backPath = role === 'admin' ? '/admin/reports' : '/manager/reports';

  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load outlets
  useEffect(() => {
    api.get('/api/user/').then((res) => {
      const list = res.data?.outlets || [];
      setOutlets(list);
      if (list.length > 0) setSelectedOutlet(list[0].id);
    }).catch(() => {});
  }, []);

  // Load employees for the selected outlet
  useEffect(() => {
    if (!selectedOutlet) return;
    setEmployees([]);
    setSelectedEmployee(null);
    api.get('/api/primary-outlet-employees/', { params: { outlet_id: selectedOutlet } })
      .then((res) => {
        const list = res.data || [];
        setEmployees(list);
        if (list.length > 0) setSelectedEmployee(list[0]);
      }).catch(() => {});
  }, [selectedOutlet]);

  const fetchReport = useCallback(async () => {
    if (!selectedEmployee) { setReport(null); return; }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get(`/report/employee/${selectedEmployee.employee_id}/`, {
        params: { start_date: startDate, end_date: endDate },
      });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [selectedEmployee, startDate, endDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const totals = useMemo(() => {
    if (!report?.daily_report) return { present: 0, late: 0, leave: 0, absent: 0 };
    const rows = report.daily_report;
    return {
      present: rows.filter((r) => (r.attendance_status || '').toLowerCase() === 'present').length,
      late: rows.filter((r) => (r.attendance_status || '').toLowerCase() === 'late').length,
      leave: rows.filter((r) => (r.attendance_status || '').toLowerCase() === 'on leave').length,
      absent: rows.filter((r) => (r.attendance_status || '').toLowerCase() === 'absent').length,
    };
  }, [report]);

  const rows = useMemo(() => (report?.daily_report || []).map((r, i) => ({ id: i, ...r })), [report]);

  const columns = [
    { field: 'work_date', headerName: 'Date', flex: 0.8, minWidth: 120,
      renderCell: ({ value }) => {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value || '—';
        return (
          <Box>
            <Typography variant="body2" fontWeight={600}>{d.toLocaleDateString()}</Typography>
            <Typography variant="caption" color="text.secondary">{d.toLocaleDateString([], { weekday: 'short' })}</Typography>
          </Box>
        );
      },
    },
    { field: 'attendance_status', headerName: 'Status', flex: 0.7, minWidth: 110,
      renderCell: ({ value }) => {
        const v = (value || '').toLowerCase();
        if (v === 'absent' || v === 'late') return null;
        return value ? <Chip label={value} size="small" color={statusChipColor(value)} sx={{ fontWeight: 600 }} /> : null;
      } },
    { field: 'check_in_time', headerName: 'Check-in', flex: 0.6, minWidth: 100,
      renderCell: ({ value }) => <Typography variant="body2">{fmtT(value)}</Typography> },
    { field: 'check_out_time', headerName: 'Check-out', flex: 0.6, minWidth: 100,
      renderCell: ({ value }) => <Typography variant="body2">{fmtT(value)}</Typography> },
    { field: 'worked_hours', headerName: 'Hours', flex: 0.5, minWidth: 80, align: 'center', headerAlign: 'center',
      renderCell: ({ value }) => (value != null ? `${value}h` : '—') },
    { field: 'leave_remarks', headerName: 'Leave / Notes', flex: 1.5, minWidth: 200,
      renderCell: ({ row }) => (
        <Typography variant="caption" color="text.secondary" noWrap>
          {row.leave_refno ? `${row.leave_refno} — ` : ''}{row.leave_remarks || ''}
        </Typography>
      ),
    },
  ];

  const handleExport = () => {
    if (!report) return;
    const csvRows = rows.map((r) => ({
      date: r.work_date,
      status: r.attendance_status,
      check_in: r.check_in_time,
      check_out: r.check_out_time,
      hours: r.worked_hours,
      leave_refno: r.leave_refno,
      leave_remarks: r.leave_remarks,
    }));
    const emp = selectedEmployee?.fullname?.replace(/\s+/g, '_') || 'employee';
    exportCsv(`employee-${emp}_${startDate}_to_${endDate}.csv`, csvRows);
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Individual Employee</Typography>
      </Box>

      <PageHeader
        title="Individual Employee Report"
        subtitle="Day-by-day attendance history for one employee"
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="From" type="date" size="small" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <TextField label="To" type="date" size="small" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchReport} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={!report}>
              Export CSV
            </Button>
          </Box>
        }
      />

      {/* Pickers */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Outlet</InputLabel>
          <Select label="Outlet" value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)}>
            {outlets.length === 0 && <MenuItem value="" disabled>No outlets assigned</MenuItem>}
            {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Autocomplete
          size="small"
          options={employees}
          value={selectedEmployee}
          onChange={(_, v) => setSelectedEmployee(v)}
          isOptionEqualToValue={(a, b) => a?.employee_id === b?.employee_id}
          getOptionLabel={(o) => (o ? `${o.fullname}${o.empcode ? ` · ${o.empcode}` : ''}` : '')}
          sx={{ minWidth: 320 }}
          renderInput={(params) => <TextField {...params} label="Employee" />}
        />
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {selectedEmployee && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: pickAvatarColor(selectedEmployee.fullname || ''), fontWeight: 700, fontSize: '1.3rem' }}>
            {getInitials(selectedEmployee.fullname)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap>{selectedEmployee.fullname}</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedEmployee.empcode || `#${selectedEmployee.employee_id}`}
            </Typography>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        <StatCard icon={<EventAvailableOutlinedIcon />} label="Present" value={totals.present} color="success" />
        <StatCard icon={<BeachAccessOutlinedIcon />} label="Leave" value={totals.leave} color="info" />
      </Box>

      <Box sx={{ height: 540, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>
    </Box>
  );
}