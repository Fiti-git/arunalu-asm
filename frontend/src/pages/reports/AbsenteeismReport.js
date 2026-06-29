import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar, LinearProgress,
  IconButton, Tooltip, MenuItem,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader, DataTable, applyClientFilters, exportRowsToCsv } from 'components/ui';
import { firstOfMonth, today, getInitials, rangeFieldSx } from './shared';
import { getUserRole } from 'utils/auth';

export default function AbsenteeismReport() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const backPath = role === 'admin' ? '/admin/reports' : '/manager/reports';

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [minDays, setMinDays] = useState(1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const fetchData = useCallback(async () => {
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get('/report/reports/absenteeism/', {
        params: { start_date: startDate, end_date: endDate, min_days: minDays },
      });
      setRows(res.data || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [startDate, endDate, minDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      key: 'fullname', label: 'Employee', width: 240,
      sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text',
      filterValue: (row) => row.fullname,
      render: (row) => (
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
    {
      key: 'primary_outlet_name', label: 'Outlet', width: 180,
      sortKey: 'primary_outlet_name', filterKey: 'f_outlet', filterType: 'text',
      render: (row) => row.primary_outlet_name || '—',
    },
    {
      key: 'total_days', label: 'Days', width: 90, align: 'center',
      sortKey: 'total_days',
      render: (row) => row.total_days,
    },
    {
      key: 'present_days', label: 'Present', width: 100, align: 'center',
      sortKey: 'present_days',
      render: (row) => row.present_days,
    },
    {
      key: 'leave_days', label: 'Leave', width: 100, align: 'center',
      sortKey: 'leave_days',
      render: (row) => row.leave_days,
    },
    {
      key: 'absent_days', label: 'Absent', width: 100, align: 'center',
      sortKey: 'absent_days',
      render: (row) => <Typography fontWeight={700} color="error.dark">{row.absent_days}</Typography>,
    },
    {
      key: 'absent_rate', label: 'Absent Rate', width: 170, sortKey: 'absent_rate',
      render: (row) => {
        const value = row.absent_rate;
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress variant="determinate" value={Math.min(Number(value || 0), 100)}
              sx={{
                flex: 1, height: 6, borderRadius: 3, bgcolor: 'grey.100',
                '& .MuiLinearProgress-bar': {
                  bgcolor: Number(value) >= 40 ? 'error.main' : Number(value) >= 20 ? 'warning.main' : 'success.main',
                  borderRadius: 3,
                },
              }} />
            <Typography variant="caption" fontWeight={700} sx={{ width: 46, textAlign: 'right' }}>{value}%</Typography>
          </Box>
        );
      },
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
    const exportCols = [
      { label: 'Emp Code', key: 'empcode' },
      { label: 'Employee', key: 'fullname' },
      { label: 'Outlet', key: 'primary_outlet_name' },
      { label: 'Days', key: 'total_days' },
      { label: 'Present', key: 'present_days' },
      { label: 'Leave', key: 'leave_days' },
      { label: 'Absent', key: 'absent_days' },
      { label: 'Absent Rate (%)', key: 'absent_rate' },
    ];
    exportRowsToCsv(`absenteeism_${startDate}_to_${endDate}.csv`, exportCols, filteredRows);
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Absenteeism</Typography>
      </Box>

      <PageHeader
        title="Absenteeism"
        subtitle={`${filteredRows.length} employee${filteredRows.length === 1 ? '' : 's'} with ≥ ${minDays} absent day${minDays === 1 ? '' : 's'}`}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="From" type="date" size="small" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <TextField label="To" type="date" size="small" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <TextField select label="Min absent" size="small" value={minDays}
              onChange={(e) => setMinDays(Number(e.target.value))} sx={{ width: 130 }}>
              {[0, 1, 3, 5, 10].map((n) => (
                <MenuItem key={n} value={n}>{n === 0 ? 'All' : `≥ ${n} days`}</MenuItem>
              ))}
            </TextField>
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

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(r) => r.employee_id}
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
        emptyMessage="No absentees in range"
      />
    </Box>
  );
}
