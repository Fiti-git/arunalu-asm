import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, TextField, Alert, CircularProgress, Avatar, Tooltip,
  FormControl, InputLabel, Select, MenuItem, FormHelperText,
  Dialog, DialogContent, DialogActions, IconButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { useUserOutlets, usePrimaryOutletEmployees, getInitials } from '../assign/leave/shared';
import { statusChipColor, formatTime } from './shared';
import { DataTable } from 'components/ui';

export default function AttendanceRemoveTab() {
  const { outlets } = useUserOutlets();
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { employees, loading: employeesLoading } = usePrimaryOutletEmployees(selectedOutlet, startDate, endDate);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, row: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (outlets.length > 0 && !selectedOutlet) setSelectedOutlet(outlets[0].id);
  }, [outlets, selectedOutlet]);

  useEffect(() => { setSelectedEmployee('all'); }, [selectedOutlet]);

  const fetchRows = useCallback(async () => {
    if (!appliedFilters || !appliedFilters.outlet_id) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        ...appliedFilters,
        page,
        page_size: pageSize,
        ...Object.fromEntries(Object.entries(columnFilters).filter(([, v]) => v !== '' && v != null)),
      };
      if (sortBy.key) params.ordering = (sortBy.dir === 'desc' ? '-' : '') + sortBy.key;
      const res = await api.get('/api/attendance/v3/', { params });
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
  }, [appliedFilters, page, pageSize, columnFilters, sortBy]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleFilterChange = (filterKey, value) => {
    const next = { ...columnFilters, [filterKey]: value };
    if (value === '' || value == null) delete next[filterKey];
    setColumnFilters(next);
    setPage(1);
  };

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
      await api.delete(`/api/attendance/v3/${row.attendance_id}/delete/`);
      closeDelete();
      fetchRows();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'employee', label: 'Employee', width: 240,
      sortKey: 'employee', filterKey: 'f_employee', filterType: 'text',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
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
      key: 'date', label: 'Date', width: 130,
      sortKey: 'date', filterKey: 'f_date', filterType: 'date',
      render: (row) => row.date ? new Date(row.date).toLocaleDateString() : '',
    },
    {
      key: 'check_in_time', label: 'In', width: 90, sortKey: 'check_in_time',
      render: (row) => <Typography variant="body2">{formatTime(row.check_in_time)}</Typography>,
    },
    {
      key: 'check_out_time', label: 'Out', width: 90, sortKey: 'check_out_time',
      render: (row) => <Typography variant="body2">{formatTime(row.check_out_time)}</Typography>,
    },
    {
      key: 'worked_hours', label: 'Hours', width: 80, sortKey: 'worked_hours',
      render: (row) => (row.worked_hours != null ? `${row.worked_hours}h` : '—'),
    },
    {
      key: 'status', label: 'Status', width: 130,
      sortKey: 'status', filterKey: 'f_status', filterType: 'text',
      render: (row) => (
        <Chip label={row.status || '—'} color={statusChipColor(row.status)} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
    {
      key: 'actions', label: 'Delete', width: 90, align: 'center',
      render: (row) => (
        <Tooltip title="Delete record">
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
      <Alert severity="warning" variant="outlined">
        <strong>Caution:</strong> Deletes are permanent. Use this tab to remove mistaken or duplicate attendance rows.
      </Alert>

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
            <MenuItem value="all">All Employees{employees.length ? ` (${employees.length})` : ''}</MenuItem>
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
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.attendance_id}
          loading={loading}
          page={page}
          pageSize={pageSize}
          totalCount={totalRows}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          filters={columnFilters}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          onSortChange={(s) => { setSortBy(s); setPage(1); }}
          emptyMessage="No attendance records"
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
          <Typography variant="h5">Delete attendance record?</Typography>
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
                  {new Date(deleteDialog.row.date).toLocaleDateString()} · {deleteDialog.row.status}
                </Typography>
              </Box>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            This permanently removes attendance <strong>#{deleteDialog.row?.attendance_id}</strong>.
            This cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={closeDelete} disabled={deleting}>Cancel</Button>
          <Button onClick={runDelete} variant="contained" color="error" disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}
            sx={{ px: 3 }}>
            {deleting ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}