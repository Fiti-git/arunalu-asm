import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, TextField, Alert, CircularProgress, Avatar, Tooltip,
  FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogContent, DialogActions, IconButton, Divider, Snackbar,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import HistoryIcon from '@mui/icons-material/History';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { useUserOutlets, usePrimaryOutletEmployees, getInitials } from '../assign/leave/shared';
import { ATTENDANCE_WRITE_STATUSES, statusChipColor, formatTime, extractTimeHHMM, extractDateYMD } from './shared';
import ModificationHistoryDialog from './ModificationHistoryDialog';

export default function AttendanceModifyTab() {
  const { outlets } = useUserOutlets();
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const { employees, loading: employeesLoading } = usePrimaryOutletEmployees(selectedOutlet);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [editDialog, setEditDialog] = useState({ open: false, row: null });
  const [editForm, setEditForm] = useState({
    check_in_date: '', check_in_time: '',
    check_out_date: '', check_out_time: '',
    status: 'Present',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [toast, setToast] = useState({ open: false, severity: 'success', message: '' });

  const [historyDialog, setHistoryDialog] = useState({ open: false, attendanceId: null });

  useEffect(() => {
    if (outlets.length > 0 && !selectedOutlet) setSelectedOutlet(outlets[0].id);
  }, [outlets, selectedOutlet]);

  useEffect(() => { setSelectedEmployee('all'); }, [selectedOutlet]);

  const fetchRows = useCallback(async () => {
    if (!appliedFilters || !appliedFilters.outlet_id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/attendance/v3/', {
        params: {
          ...appliedFilters,
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
        },
      });
      const data = res.data;
      const items = Array.isArray(data) ? data : (data.results || []);
      const total = Array.isArray(data) ? data.length : (data.count ?? items.length);
      setRows(items);
      setTotalRows(total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load attendance.');
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, paginationModel]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const runSearch = () => {
    if (!selectedOutlet) { setError('Pick an outlet first.'); return; }
    setError('');
    setAppliedFilters({
      outlet_id: selectedOutlet,
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setHasSearched(true);
  };

  const resetFilters = () => {
    setSelectedEmployee('all');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
  };

  const openEdit = (row) => {
    setEditError('');
    setEditForm({
      check_in_date: extractDateYMD(row.check_in_time) || row.date || '',
      check_in_time: extractTimeHHMM(row.check_in_time),
      check_out_date: extractDateYMD(row.check_out_time),
      check_out_time: extractTimeHHMM(row.check_out_time),
      status: row.status || 'Present',
      reason: '',
    });
    setEditDialog({ open: true, row });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditDialog({ open: false, row: null });
  };

  const saveEdit = async () => {
    const { row } = editDialog;
    if (!row) return;
    if (!editForm.check_in_date) {
      setEditError('Check-in date is required.');
      return;
    }
    if (!editForm.check_in_time) {
      setEditError('Check-in time is required.');
      return;
    }
    const hasCheckOutTime = !!editForm.check_out_time;
    const hasCheckOutDate = !!editForm.check_out_date;
    if (hasCheckOutTime && !hasCheckOutDate) {
      setEditError('Check-out date is required when check-out time is set.');
      return;
    }
    if (row.is_locked && !editForm.reason.trim()) {
      setEditError('This record is locked (older than 45 days). A reason is required to submit for admin approval.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const res = await api.patch(`/api/attendance/v3/${row.attendance_id}/`, {
        status: editForm.status,
        check_in_date: editForm.check_in_date,
        check_in_time: editForm.check_in_time,
        check_out_date: hasCheckOutTime ? editForm.check_out_date : null,
        check_out_time: hasCheckOutTime ? editForm.check_out_time : null,
        reason: editForm.reason.trim() || undefined,
      });
      closeEdit();
      if (res?.data?.pending_approval) {
        setToast({
          open: true, severity: 'info',
          message: res.data.message || 'Submitted for admin approval.',
        });
      } else {
        setToast({ open: true, severity: 'success', message: 'Attendance updated.' });
        fetchRows();
      }
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const openHistory = (row) => setHistoryDialog({ open: true, attendanceId: row.attendance_id });
  const closeHistory = () => setHistoryDialog({ open: false, attendanceId: null });

  const columns = [
    {
      field: 'employee', headerName: 'Employee', flex: 1.1, minWidth: 180, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.5, minWidth: 0 }}>
          <Avatar sx={{
            width: 32, height: 32, fontSize: 12, fontWeight: 700,
            bgcolor: pickAvatarColor(row.employee_fullname || ''),
          }}>
            {getInitials(row.employee_fullname || '')}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{row.employee_fullname || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.empcode || `#${row.employee_id}`}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'date', headerName: 'Date', flex: 0.6, minWidth: 110,
      valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : '',
    },
    {
      field: 'check_in_time', headerName: 'In', flex: 0.45, minWidth: 80,
      renderCell: ({ value }) => <Typography variant="body2">{formatTime(value)}</Typography>,
    },
    {
      field: 'check_out_time', headerName: 'Out', flex: 0.45, minWidth: 80,
      renderCell: ({ value }) => <Typography variant="body2">{formatTime(value)}</Typography>,
    },
    {
      field: 'worked_hours', headerName: 'Hours', flex: 0.4, minWidth: 70,
      valueFormatter: (value) => (value != null ? `${value}h` : '—'),
    },
    {
      field: 'status', headerName: 'Status', flex: 0.7, minWidth: 110,
      renderCell: ({ value }) => (
        <Chip label={value || '—'} color={statusChipColor(value)} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
    {
      field: 'actions', headerName: 'Actions', flex: 0.6, minWidth: 120,
      sortable: false, filterable: false, align: 'center', headerAlign: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'center' }}>
          <Tooltip title={row.is_locked ? 'Locked (needs admin approval)' : 'Modify record'}>
            <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
              {row.is_locked
                ? <LockOutlinedIcon fontSize="small" />
                : <EditOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="View modification history">
            <IconButton size="small" onClick={() => openHistory(row)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const selectedOutletObj = outlets.find((o) => o.id === selectedOutlet);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 220 }} disabled={outlets.length === 0}>
          <InputLabel>Outlet</InputLabel>
          <Select label="Outlet" value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)}>
            {outlets.length === 0 && <MenuItem value="" disabled>No outlets assigned</MenuItem>}
            {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 240 }} disabled={!selectedOutlet || employeesLoading}>
          <InputLabel>Employee</InputLabel>
          <Select label="Employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
            <MenuItem value="all">All Employees{employees.length ? ` (${employees.length})` : ''}</MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.employee_id} value={emp.employee_id}>
                {emp.fullname}{emp.empcode ? ` · ${emp.empcode}` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField label="From" type="date" size="small" value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <TextField label="To" type="date" size="small" value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" onClick={resetFilters} startIcon={<RestartAltIcon />}>
          Reset
        </Button>
        <Button variant="contained" size="small" onClick={runSearch}
          disabled={!selectedOutlet || loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
          sx={{ px: 3 }}>
          Search
        </Button>
      </Box>

      {hasSearched && selectedOutletObj && (
        <Typography variant="body2" color="text.secondary">
          Showing attendance for <strong>{selectedOutletObj.name}</strong> · {totalRows} record{totalRows === 1 ? '' : 's'}
        </Typography>
      )}

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {hasSearched ? (
        <Box sx={{ height: 580 }}>
          <DataGrid
            rows={rows} columns={columns} getRowId={(r) => r.attendance_id}
            loading={loading} rowCount={totalRows}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[25, 50, 100]}
            disableRowSelectionOnClick
          />
        </Box>
      ) : (
        <Box sx={{
          py: 8, px: 3, textAlign: 'center',
          border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 2,
          color: 'text.secondary',
        }}>
          <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
            Pick your filters and click Search
          </Typography>
          <Typography variant="body2">
            Find records, then click the edit icon on any row.
          </Typography>
        </Box>
      )}

      <Dialog open={editDialog.open} onClose={closeEdit} maxWidth="sm" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5">Modify Attendance</Typography>
            {editDialog.row && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                {editDialog.row.employee_fullname} · {new Date(editDialog.row.date).toLocaleDateString()}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={closeEdit} disabled={saving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}

          {editDialog.row?.is_locked && (
            <Alert severity="warning" icon={<LockOutlinedIcon fontSize="inherit" />} sx={{ mb: 2 }}>
              <strong>Locked record.</strong> This attendance is older than 45 days.
              Your change will be submitted for admin approval — it won’t apply immediately.
            </Alert>
          )}

          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Check-in
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField label="Date" type="date" size="small"
              value={editForm.check_in_date}
              onChange={(e) => setEditForm((prev) => ({ ...prev, check_in_date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField label="Time" type="time" size="small"
              value={editForm.check_in_time}
              onChange={(e) => setEditForm((prev) => ({ ...prev, check_in_time: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Check-out
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField label="Date" type="date" size="small"
              value={editForm.check_out_date}
              onChange={(e) => setEditForm((prev) => ({ ...prev, check_out_date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Use next day for overnight shifts"
            />
            <TextField label="Time" type="time" size="small"
              value={editForm.check_out_time}
              onChange={(e) => setEditForm((prev) => ({ ...prev, check_out_time: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Leave blank to clear"
            />
          </Box>

          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={editForm.status}
              onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}>
              {ATTENDANCE_WRITE_STATUSES.map((s) => (
                <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={editDialog.row?.is_locked ? 'Reason (required for admin approval)' : 'Reason (optional)'}
            size="small" fullWidth multiline minRows={2}
            value={editForm.reason}
            onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
            required={!!editDialog.row?.is_locked}
            sx={{ mt: 2 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Times are stored in Asia/Kolkata (+05:30). Every change is logged with the
            original values, who edited it, and when. Records older than 45 days require
            admin approval before the change applies.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={closeEdit} disabled={saving}>Cancel</Button>
          <Button onClick={saveEdit} variant="contained" disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
            sx={{ px: 3 }}>
            {saving ? 'Saving…' : editDialog.row?.is_locked ? 'Submit for Approval' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <ModificationHistoryDialog
        open={historyDialog.open}
        attendanceId={historyDialog.attendanceId}
        onClose={closeHistory}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}