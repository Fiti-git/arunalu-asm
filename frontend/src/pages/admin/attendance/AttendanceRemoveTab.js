import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, TextField, Alert, CircularProgress, Avatar, Tooltip,
  FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogContent, DialogActions, IconButton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { useUserOutlets, usePrimaryOutletEmployees, getInitials } from '../assign/leave/shared';
import { statusChipColor, formatTime } from './shared';

export default function AttendanceRemoveTab() {
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
      field: 'employee', headerName: 'Employee', flex: 1.2, minWidth: 200, sortable: false,
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
      field: 'date', headerName: 'Date', flex: 0.7, minWidth: 110,
      valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : '',
    },
    {
      field: 'check_in_time', headerName: 'In', flex: 0.5, minWidth: 80,
      renderCell: ({ value }) => <Typography variant="body2">{formatTime(value)}</Typography>,
    },
    {
      field: 'check_out_time', headerName: 'Out', flex: 0.5, minWidth: 80,
      renderCell: ({ value }) => <Typography variant="body2">{formatTime(value)}</Typography>,
    },
    {
      field: 'worked_hours', headerName: 'Hours', flex: 0.5, minWidth: 80,
      valueFormatter: (value) => (value != null ? `${value}h` : '—'),
    },
    {
      field: 'status', headerName: 'Status', flex: 0.7, minWidth: 110,
      renderCell: ({ value }) => (
        <Chip label={value || '—'} color={statusChipColor(value)} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
    {
      field: 'actions', headerName: 'Delete', flex: 0.5, minWidth: 90,
      sortable: false, filterable: false, align: 'center', headerAlign: 'center',
      renderCell: ({ row }) => (
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