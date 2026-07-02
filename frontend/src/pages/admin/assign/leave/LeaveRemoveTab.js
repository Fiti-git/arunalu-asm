import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, Dialog, DialogContent, DialogActions,
  TextField, IconButton, Alert, CircularProgress, Avatar, Tooltip,
  FormControl, InputLabel, Select, MenuItem, FormHelperText,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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

export default function LeaveRemoveTab() {
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

  const [deleteDialog, setDeleteDialog] = useState({ open: false, row: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (outlets.length > 0 && !selectedOutlet) setSelectedOutlet(outlets[0].id);
  }, [outlets, selectedOutlet]);

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
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to fetch leave records.');
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

  const openDelete = (row) => setDeleteDialog({ open: true, row });
  const closeDelete = () => {
    if (deleting) return;
    setDeleteDialog({ open: false, row: null });
  };

  const runDelete = async () => {
    const { row } = deleteDialog;
    if (!row) return;
    setDeleting(true);
    try {
      await api.delete(`/api/attendance/leave/${row.leave_refno}/`);
      closeDelete();
      fetchLeaves();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete leave record.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
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
      render: (row) => <Typography variant="body2" noWrap>{row.leave_type_name || '—'}</Typography>,
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
      key: 'actions', label: 'Delete', width: 90, align: 'center',
      render: (row) => (
        <Tooltip title="Delete leave record">
          <IconButton size="small" color="error" onClick={() => openDelete(row)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const selectedOutletObj = outlets.find((o) => o.id === selectedOutlet);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Alert severity="warning" variant="outlined" sx={{ '& .MuiAlert-icon': { color: 'warning.dark' } }}>
        <strong>Caution:</strong> Deletes are permanent. Use this tab to remove mistaken or duplicate leave entries.
      </Alert>

      {/* Filters */}
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
        <Typography variant="body2" color="text.secondary">
          Showing leaves for <strong>{selectedOutletObj.name}</strong> · {totalRows} record{totalRows === 1 ? '' : 's'}
        </Typography>
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
          emptyMessage="No leave records"
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
            Find records, then remove them using the delete icon.
          </Typography>
        </Box>
      )}

      <Dialog open={deleteDialog.open} onClose={closeDelete} maxWidth="xs" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h5">Delete leave record?</Typography>
          <IconButton size="small" onClick={closeDelete} disabled={deleting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: 3, py: 1 }}>
          {deleteDialog.row && (
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: 'error.light', color: 'error.dark',
              display: 'flex', alignItems: 'center', gap: 2, mb: 2,
            }}>
              <Avatar sx={{
                bgcolor: pickAvatarColor(deleteDialog.row.employee_fullname || ''),
                width: 40, height: 40, fontWeight: 700,
              }}>
                {getInitials(deleteDialog.row.employee_fullname || '')}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>{deleteDialog.row.employee_fullname}</Typography>
                <Typography variant="caption">
                  {deleteDialog.row.leave_type_name || 'Leave'} · {deleteDialog.row.leave_date}
                </Typography>
              </Box>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            This permanently removes leave ref <strong>#{deleteDialog.row?.leave_refno}</strong>.
            This cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={closeDelete} disabled={deleting}>Cancel</Button>
          <Button
            onClick={runDelete}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}
            sx={{ px: 3 }}
          >
            {deleting ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}