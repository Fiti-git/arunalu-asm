import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Chip, Dialog, DialogContent, DialogActions,
  TextField, IconButton, Alert, CircularProgress, Avatar, Tooltip,
  FormControl, InputLabel, Select, MenuItem, FormHelperText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import api from 'utils/api';
import { DataTable } from 'components/ui';
import { pickAvatarColor } from 'theme/tokens';
import {
  statusChipColor, getInitials,
  useUserOutlets, usePrimaryOutletEmployees,
} from './shared';

export default function LeaveApprovalTab() {
  const { outlets } = useUserOutlets();
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { employees, loading: employeesLoading } = usePrimaryOutletEmployees(selectedOutlet, startDate, endDate);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({ open: false, row: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-select first outlet once loaded
  useEffect(() => {
    if (outlets.length > 0 && !selectedOutlet) setSelectedOutlet(outlets[0].id);
  }, [outlets, selectedOutlet]);

  // Reset employee when outlet changes
  useEffect(() => { setSelectedEmployee('all'); }, [selectedOutlet]);

  const fetchLeaves = useCallback(async () => {
    if (!appliedFilters || !appliedFilters.outlet_id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/simple-leave-requests/', {
        params: {
          ...appliedFilters,
          page,
          page_size: pageSize,
        },
      });
      const data = res.data;
      const items = Array.isArray(data) ? data : (data.results || []);
      const total = Array.isArray(data) ? data.length : (data.count ?? items.length);
      setRows(items);
      setTotalRows(total);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to fetch leave requests.');
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const runSearch = () => {
    if (!selectedOutlet) {
      setError('Pick an outlet first.');
      return;
    }
    setError('');
    setAppliedFilters({
      outlet_id: selectedOutlet,
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
    setPage(1);
    setHasSearched(true);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedEmployee('all');
    setStatusFilter('all');
  };

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
    return c;
  }, [rows]);

  const openConfirm = (row, action) => setConfirmDialog({ open: true, row, action });
  const closeConfirm = () => {
    if (actionLoading) return;
    setConfirmDialog({ open: false, row: null, action: null });
  };

  const runAction = async () => {
    const { row, action } = confirmDialog;
    if (!row || !action) return;
    setActionLoading(true);
    try {
      await api.put(`/api/attendance/updateleavestatus/${row.leave_refno}/`, { status: action });
      closeConfirm();
      fetchLeaves();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update leave status.');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'employee', label: 'Employee', width: 220,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.5, minWidth: 0 }}>
          <Avatar sx={{
            width: 32, height: 32,
            bgcolor: pickAvatarColor(row.employee_fullname || ''),
            fontSize: 12, fontWeight: 700,
          }}>
            {getInitials(row.employee_fullname || '')}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {row.employee_fullname || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.empcode || `#${row.employee_id}`}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'leave_type_name', label: 'Leave Type', width: 150,
      render: (row) => (
        <Box sx={{ py: 0.5, minWidth: 0 }}>
          <Typography variant="body2" noWrap>{row.leave_type_name || '—'}</Typography>
          {row.leave_type_code && (
            <Typography variant="caption" color="text.secondary" noWrap>{row.leave_type_code}</Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'leave_date', label: 'Leave Date', width: 130,
      render: (row) => {
        if (!row.leave_date) return '';
        const d = new Date(row.leave_date);
        return isNaN(d.getTime()) ? row.leave_date : d.toLocaleDateString();
      },
    },
    {
      key: 'remarks', label: 'Remarks', width: 200,
      render: (row) => (
        <Tooltip title={row.remarks || ''} placement="top-start">
          <Typography variant="body2" noWrap color={row.remarks ? 'text.primary' : 'text.disabled'}>
            {row.remarks || '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      key: 'add_date', label: 'Requested', width: 120,
      render: (row) => {
        if (!row.add_date) return '';
        const d = new Date(row.add_date);
        return isNaN(d.getTime()) ? row.add_date : d.toLocaleDateString();
      },
    },
    {
      key: 'status', label: 'Status', width: 120,
      render: (row) => (
        <Chip
          label={row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : '—'}
          color={statusChipColor(row.status)}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      key: 'actions', label: 'Actions', width: 120, align: 'center',
      render: (row) =>
        row.status === 'pending' ? (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title="Approve">
              <IconButton size="small" color="success" onClick={() => openConfirm(row, 'approved')}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject">
              <IconButton size="small" color="error" onClick={() => openConfirm(row, 'rejected')}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled">—</Typography>
        ),
    },
  ], []);

  const selectedOutletObj = outlets.find((o) => o.id === selectedOutlet);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Dropdowns row: outlet + employee + date range */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 220 }} disabled={outlets.length === 0}>
          <InputLabel>Outlet</InputLabel>
          <Select label="Outlet" value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)}>
            {outlets.length === 0 && <MenuItem value="" disabled>No outlets assigned</MenuItem>}
            {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField label="From" type="date" size="small" value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <TextField label="To" type="date" size="small" value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />

        <FormControl size="small" sx={{ minWidth: 240 }}
          disabled={!selectedOutlet || employeesLoading || !startDate || !endDate}>
          <InputLabel>Employee</InputLabel>
          <Select label="Employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
            <MenuItem value="all">
              All Employees{employees.length ? ` (${employees.length})` : ''}
            </MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.employee_id} value={emp.employee_id}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <span>{emp.fullname}{emp.empcode ? ` · ${emp.empcode}` : ''}</span>
                  {emp.fully_active === false && (
                    <Chip size="small" color="warning" variant="outlined"
                      label={`${emp.active_days}/${emp.range_days}d`}
                      sx={{ ml: 1, fontSize: '0.65rem', height: 18 }} />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {(!startDate || !endDate)
              ? 'Select date range first'
              : `${employees.length} employee${employees.length === 1 ? '' : 's'} active in range`}
          </FormHelperText>
        </FormControl>
      </Box>

      {/* Actions */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Showing leaves for <strong>{selectedOutletObj.name}</strong>
          </Typography>
          <Chip label={`${counts.pending} pending`} color="warning" size="small" sx={{ fontWeight: 600 }} />
          <Chip label={`${counts.approved} approved`} color="success" size="small" sx={{ fontWeight: 600 }} />
          <Chip label={`${counts.rejected} rejected`} color="error" size="small" sx={{ fontWeight: 600 }} />
        </Box>
      )}

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {hasSearched ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.leave_refno}
          loading={loading}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={[25, 50, 100]}
          totalCount={totalRows}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          emptyMessage="No leave requests"
          height={580}
          minHeight={580}
        />
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
            Select an outlet, optionally an employee or date range, then hit Search to load leave requests.
          </Typography>
        </Box>
      )}

      <Dialog open={confirmDialog.open} onClose={closeConfirm} maxWidth="xs" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h5">
            {confirmDialog.action === 'approved' ? 'Approve Leave?' : 'Reject Leave?'}
          </Typography>
          <IconButton size="small" onClick={closeConfirm} disabled={actionLoading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: 3, py: 1 }}>
          {confirmDialog.row && (
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: confirmDialog.action === 'approved' ? 'success.light' : 'error.light',
              color: confirmDialog.action === 'approved' ? 'success.dark' : 'error.dark',
              display: 'flex', alignItems: 'center', gap: 2, mb: 2,
            }}>
              <Avatar sx={{
                bgcolor: pickAvatarColor(confirmDialog.row.employee_fullname || ''),
                width: 40, height: 40, fontWeight: 700,
              }}>
                {getInitials(confirmDialog.row.employee_fullname || '')}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>{confirmDialog.row.employee_fullname}</Typography>
                <Typography variant="caption">
                  {confirmDialog.row.leave_type_name || 'Leave'} · {confirmDialog.row.leave_date}
                </Typography>
              </Box>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            This will mark the leave as <strong>{confirmDialog.action}</strong>.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={closeConfirm} disabled={actionLoading}>Cancel</Button>
          <Button
            onClick={runAction}
            variant="contained"
            color={confirmDialog.action === 'approved' ? 'success' : 'error'}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ px: 3 }}
          >
            {actionLoading ? 'Processing…' : (confirmDialog.action === 'approved' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}