import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar, Chip,
  IconButton, Tooltip, Autocomplete, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader, StatCard, DataTable, applyClientFilters, exportRowsToCsv } from 'components/ui';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import { firstOfMonth, today, getInitials, rangeFieldSx } from './shared';
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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

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
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [selectedEmployee, startDate, endDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const totals = useMemo(() => {
    if (!report?.daily_report) return { present: 0, leave: 0 };
    const rs = report.daily_report;
    const isLeave = (r) => r.leave_refno != null || (r.attendance_status || '').toLowerCase() === 'on leave';
    return {
      present: rs.filter((r) => {
        const v = (r.attendance_status || '').toLowerCase();
        return !isLeave(r) && (v === 'present' || v === 'late' || v === 'half day');
      }).length,
      leave: rs.filter(isLeave).length,
    };
  }, [report]);

  const rows = useMemo(() => (report?.daily_report || []).map((r, i) => ({ id: i, ...r })), [report]);

  const columns = [
    {
      key: 'work_date', label: 'Date', width: 130,
      sortKey: 'work_date', filterKey: 'f_date', filterType: 'text',
      render: (row) => {
        const d = new Date(row.work_date);
        if (isNaN(d.getTime())) return row.work_date || '—';
        return (
          <Box>
            <Typography variant="body2" fontWeight={600}>{d.toLocaleDateString()}</Typography>
            <Typography variant="caption" color="text.secondary">{d.toLocaleDateString([], { weekday: 'short' })}</Typography>
          </Box>
        );
      },
    },
    {
      key: 'attendance_status', label: 'Status', width: 130,
      sortKey: 'attendance_status', filterKey: 'f_status', filterType: 'text',
      render: (row) => {
        if (row.leave_refno != null) {
          const label = row.att_type_name || 'Leave';
          return <Chip label={label} size="small" color="info" sx={{ fontWeight: 600 }} />;
        }
        const v = (row.attendance_status || '').toLowerCase();
        if (v === 'absent' || v === 'late') return null;
        return row.attendance_status ? <Chip label={row.attendance_status} size="small" color={statusChipColor(row.attendance_status)} sx={{ fontWeight: 600 }} /> : null;
      },
    },
    {
      key: 'check_in_time', label: 'Check-in', width: 110,
      sortKey: 'check_in_time',
      render: (row) => <Typography variant="body2">{fmtT(row.check_in_time)}</Typography>,
    },
    {
      key: 'check_out_time', label: 'Check-out', width: 110,
      sortKey: 'check_out_time',
      render: (row) => <Typography variant="body2">{fmtT(row.check_out_time)}</Typography>,
    },
    {
      key: 'worked_hours', label: 'Hours', width: 90, align: 'center',
      sortKey: 'worked_hours',
      render: (row) => (row.worked_hours != null ? `${row.worked_hours}h` : '—'),
    },
    {
      key: 'leave_remarks', label: 'Leave / Notes', width: 240,
      filterKey: 'f_notes', filterType: 'text',
      filterValue: (row) => `${row.leave_refno || ''} ${row.leave_remarks || ''}`,
      render: (row) => (
        <Typography variant="caption" color="text.secondary" noWrap>
          {row.leave_refno ? `${row.leave_refno} — ` : ''}{row.leave_remarks || ''}
        </Typography>
      ),
    },
  ];

  const filteredRows = useMemo(
    () => applyClientFilters(rows, columns, columnFilters, sortBy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, columnFilters, sortBy]
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

  const handleExport = () => {
    if (!report) return;
    const exportCols = [
      { label: 'Date', key: 'work_date' },
      { label: 'Status', key: 'attendance_status' },
      { label: 'Check-in', key: 'check_in_time' },
      { label: 'Check-out', key: 'check_out_time' },
      { label: 'Hours', key: 'worked_hours' },
      { label: 'Leave Ref', key: 'leave_refno' },
      { label: 'Leave Remarks', key: 'leave_remarks' },
    ];
    const emp = selectedEmployee?.fullname?.replace(/\s+/g, '_') || 'employee';
    exportRowsToCsv(`employee-${emp}_${startDate}_to_${endDate}.csv`, exportCols, filteredRows);
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
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={!report || filteredRows.length === 0}>
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

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(r) => r.id}
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
        emptyMessage="No attendance records in range"
      />
    </Box>
  );
}
