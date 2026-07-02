import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Chip, TextField, Alert, CircularProgress, Avatar,
  FormControl, InputLabel, Select, MenuItem, FormHelperText,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { useUserOutlets, usePrimaryOutletEmployees, getInitials } from '../assign/leave/shared';
import { statusChipColor, formatTime } from './shared';
import { DataTable } from 'components/ui';

export default function AttendanceHistoryTab() {
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
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

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

  const columns = useMemo(() => [
    {
      key: 'employee', label: 'Employee', width: 240,
      sortKey: 'employee', filterKey: 'f_employee', filterType: 'text',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
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
      key: 'date', label: 'Date', width: 130,
      sortKey: 'date', filterKey: 'f_date', filterType: 'date',
      render: (row) => {
        if (!row.date) return '';
        const d = new Date(row.date);
        return isNaN(d.getTime()) ? row.date : d.toLocaleDateString();
      },
    },
    {
      key: 'check_in_time', label: 'In', width: 90,
      sortKey: 'check_in_time',
      render: (row) => <Typography variant="body2">{formatTime(row.check_in_time)}</Typography>,
    },
    {
      key: 'check_out_time', label: 'Out', width: 90,
      sortKey: 'check_out_time',
      render: (row) => <Typography variant="body2">{formatTime(row.check_out_time)}</Typography>,
    },
    {
      key: 'worked_hours', label: 'Hours', width: 80, sortKey: 'worked_hours',
      render: (row) => (row.worked_hours != null ? `${row.worked_hours}h` : '—'),
    },
    {
      key: 'ot_hours', label: 'OT', width: 70, sortKey: 'ot_hours',
      render: (row) => (row.ot_hours ? `${row.ot_hours}h` : '—'),
    },
    {
      key: 'status', label: 'Status', width: 130,
      sortKey: 'status', filterKey: 'f_status', filterType: 'select',
      filterOptions: [
        { value: 'Present', label: 'Present' },
        { value: 'Late', label: 'Late' },
        { value: 'Half Day', label: 'Half Day' },
        { value: 'Absent', label: 'Absent' },
        { value: 'On Leave', label: 'On Leave' },
      ],
      render: (row) => (
        <Chip label={row.status || '—'} color={statusChipColor(row.status)} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
  ], []);

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
            Review attendance history for the selected outlet.
          </Typography>
        </Box>
      )}
    </Box>
  );
}