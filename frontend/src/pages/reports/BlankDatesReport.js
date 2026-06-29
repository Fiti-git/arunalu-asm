import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar,
  IconButton, Tooltip, Autocomplete, FormControl, InputLabel, Select, MenuItem, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Paper,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader, DataTable, applyClientFilters, exportRowsToCsv } from 'components/ui';
import { firstOfMonth, today, getInitials, rangeFieldSx } from './shared';
import { getUserRole } from 'utils/auth';

const ALL_EMPLOYEES = { employee_id: '__all__', fullname: 'All employees' };

function FixDialog({ row, onClose, onFixed }) {
  const open = !!row;
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [tab, setTab] = useState('pending'); // tracks which section was used last (for messaging)
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // Add-leave form
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveRemarks, setLeaveRemarks] = useState('');

  // Add-attendance form
  const [checkIn, setCheckIn] = useState('09:00');
  const [checkOut, setCheckOut] = useState('17:00');

  useEffect(() => {
    if (!open) return;
    setError(''); setLeaveTypeId(''); setLeaveRemarks('');
    setCheckIn('09:00'); setCheckOut('17:00');
    api.get('/api/leavetypes/').then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setLeaveTypes(list);
    }).catch(() => setLeaveTypes([]));
  }, [open]);

  if (!open) return null;

  const fmtDate = (() => {
    const d = new Date(row.work_date);
    return isNaN(d.getTime()) ? row.work_date : d.toLocaleDateString();
  })();

  const approvePending = async () => {
    if (!row.pending_leave_refno) return;
    setBusy('approve'); setError('');
    try {
      await api.put(`/api/attendance/updateleavestatus/${row.pending_leave_refno}/`, { status: 'approved' });
      setTab('approve');
      onFixed(row);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Approve failed.');
    } finally { setBusy(''); }
  };

  const addLeave = async () => {
    if (!leaveTypeId) { setError('Pick a leave type.'); return; }
    setBusy('leave'); setError('');
    try {
      const res = await api.post('/api/attendance/bulk-addleave/v2/', {
        employee_ids: [row.employee_id],
        leave_dates: [row.work_date],
        leave_type: leaveTypeId,
        remarks: leaveRemarks,
      });
      const skipped = res.data?.skipped || [];
      if (skipped.length > 0) {
        setError(skipped[0].reason || 'Could not add leave.');
        return;
      }
      setTab('leave');
      onFixed(row);
    } catch (err) {
      setError(err.response?.data?.error || 'Add leave failed.');
    } finally { setBusy(''); }
  };

  const addAttendance = async () => {
    if (!checkIn || !checkOut) { setError('Enter both check-in and check-out times.'); return; }
    if (checkOut <= checkIn) { setError('Check-out must be after check-in.'); return; }
    setBusy('att'); setError('');
    try {
      const res = await api.post('/api/attendance/v3/bulk-add/', {
        employee_ids: [row.employee_id],
        dates: [row.work_date],
        status: 'Present',
        check_in_time: checkIn,
        check_out_time: checkOut,
      });
      const skipped = res.data?.skipped || [];
      if (skipped.length > 0) {
        setError(skipped[0].reason || 'Could not add attendance.');
        return;
      }
      setTab('att');
      onFixed(row);
    } catch (err) {
      setError(err.response?.data?.error || 'Add attendance failed.');
    } finally { setBusy(''); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Fix blank date — {row.fullname} <Typography component="span" color="text.secondary" variant="body2"> · {fmtDate}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

        {/* 1. Pending leave approval */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>1. Approve pending leave</Typography>
          <Divider sx={{ mb: 1.5 }} />
          {row.pending_leave_refno ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2">
                  <strong>{row.pending_leave_type_name || row.pending_leave_type_code || `Type #${row.pending_leave_type_id}`}</strong>
                  {row.pending_leave_remarks ? ` — ${row.pending_leave_remarks}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">Ref #{row.pending_leave_refno}</Typography>
              </Box>
              <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
                disabled={!!busy} onClick={approvePending}>
                {busy === 'approve' ? <CircularProgress size={18} /> : 'Approve'}
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No pending leave for this date.</Typography>
          )}
        </Paper>

        {/* 2. Add a leave */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>2. Add a leave</Typography>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1.5, mb: 1.5 }}>
            <FormControl size="small">
              <InputLabel>Leave type</InputLabel>
              <Select label="Leave type" value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
                {leaveTypes.map((lt) => (
                  <MenuItem key={lt.id} value={lt.id}>
                    {lt.att_type_name || lt.att_type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="Remarks" value={leaveRemarks}
              onChange={(e) => setLeaveRemarks(e.target.value)} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" disabled={!!busy} onClick={addLeave}>
              {busy === 'leave' ? <CircularProgress size={18} /> : 'Add leave'}
            </Button>
          </Box>
        </Paper>

        {/* 3. Add attendance */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>3. Add attendance</Typography>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
            <TextField size="small" type="time" label="Check-in" value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="time" label="Check-out" value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" disabled={!!busy} onClick={addAttendance}>
              {busy === 'att' ? <CircularProgress size={18} /> : 'Add attendance'}
            </Button>
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function BlankDatesReport() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const backPath = role === 'admin' ? '/admin/reports' : '/manager/reports';

  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(ALL_EMPLOYEES);

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fixRow, setFixRow] = useState(null);
  const [fixedCount, setFixedCount] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    api.get('/api/user/').then((res) => {
      const list = res.data?.outlets || [];
      setOutlets(list);
      if (list.length > 0) setSelectedOutlet(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedOutlet) { setEmployees([]); return; }
    setSelectedEmployee(ALL_EMPLOYEES);
    api.get('/api/primary-outlet-employees/', { params: { outlet_id: selectedOutlet } })
      .then((res) => setEmployees(res.data || []))
      .catch(() => setEmployees([]));
  }, [selectedOutlet]);

  const fetchData = useCallback(async () => {
    if (!selectedOutlet) { setRows([]); return; }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const params = { start_date: startDate, end_date: endDate, outlet_id: selectedOutlet };
      if (selectedEmployee && selectedEmployee.employee_id !== '__all__') {
        params.employee_id = selectedEmployee.employee_id;
      }
      const res = await api.get('/report/reports/blank-dates/', { params });
      setRows((res.data || []).map((r, i) => ({ id: `${r.employee_id}-${r.work_date}-${i}`, ...r })));
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [selectedOutlet, selectedEmployee, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFixed = (row) => {
    setRows((current) => current.filter((r) => r.id !== row.id));
    setFixedCount((n) => n + 1);
    setFixRow(null);
  };

  const columns = [
    {
      key: 'fullname', label: 'Employee', width: 240,
      sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text',
      filterValue: (row) => row.fullname,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', overflow: 'hidden' }}>
          <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, flexShrink: 0, bgcolor: pickAvatarColor(row.fullname || '') }}>
            {getInitials(row.fullname)}
          </Avatar>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.2 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.25 }}>
              {row.fullname}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.25 }}>
              {row.empcode || `#${row.employee_id}`}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'primary_outlet_name', label: 'Outlet', width: 180,
      sortKey: 'primary_outlet_name', filterKey: 'f_outlet', filterType: 'text',
      render: (row) => row.primary_outlet_name || '—',
    },
    {
      key: 'work_date', label: 'Date', width: 150,
      sortKey: 'work_date', filterKey: 'f_date', filterType: 'text',
      render: (row) => {
        const d = new Date(row.work_date);
        const label = isNaN(d.getTime()) ? row.work_date : d.toLocaleDateString();
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.2 }}>
            <Typography variant="body2" fontWeight={600}>{label}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>{row.weekday}</Typography>
          </Box>
        );
      },
    },
    {
      key: 'attendance_status', label: 'Status', width: 160,
      render: (row) => (
        row.pending_leave_refno
          ? <Chip label="Pending Leave" size="small" color="info" sx={{ fontWeight: 600 }} />
          : <Chip label="Blank Day" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
      ),
    },
    {
      key: '_fix', label: 'Fix', width: 110,
      render: (row) => (
        <Button size="small" variant="contained" startIcon={<BuildIcon fontSize="small" />}
          onClick={() => setFixRow(row)}>Fix</Button>
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
    if (filteredRows.length === 0) return;
    const empPart = selectedEmployee && selectedEmployee.employee_id !== '__all__'
      ? `_${selectedEmployee.fullname.replace(/\s+/g, '_')}`
      : '_all';
    const exportCols = [
      { label: 'Emp Code', key: 'empcode' },
      { label: 'Employee', key: 'fullname' },
      { label: 'Outlet', key: 'primary_outlet_name' },
      { label: 'Date', key: 'work_date' },
      { label: 'Weekday', key: 'weekday' },
      { label: 'Status', key: 'attendance_status' },
      { label: 'Pending Leave Ref', key: 'pending_leave_refno' },
      { label: 'Pending Leave Type', key: 'pending_leave_type_name' },
    ];
    exportRowsToCsv(`blank-dates${empPart}_${startDate}_to_${endDate}.csv`, exportCols, filteredRows);
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Blank Dates</Typography>
      </Box>

      <PageHeader
        title="Blank Dates"
        subtitle={`${filteredRows.length} day${filteredRows.length === 1 ? '' : 's'} with no attendance and no approved leave${fixedCount ? ` · ${fixedCount} fixed this session` : ''}`}
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
                <IconButton onClick={fetchData} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={filteredRows.length === 0}>
              Export CSV
            </Button>
          </Box>
        }
      />

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
          options={[ALL_EMPLOYEES, ...employees]}
          value={selectedEmployee}
          onChange={(_, v) => setSelectedEmployee(v || ALL_EMPLOYEES)}
          isOptionEqualToValue={(a, b) => a?.employee_id === b?.employee_id}
          getOptionLabel={(o) => (o ? `${o.fullname}${o.empcode ? ` · ${o.empcode}` : ''}` : '')}
          sx={{ minWidth: 320 }}
          disableClearable
          renderInput={(params) => <TextField {...params} label="Employee" />}
        />
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

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
        emptyMessage="No blank dates in the selected range."
      />

      <FixDialog row={fixRow} onClose={() => setFixRow(null)} onFixed={handleFixed} />
    </Box>
  );
}
