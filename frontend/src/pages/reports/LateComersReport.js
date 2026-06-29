import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar, LinearProgress,
  IconButton, Tooltip,
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

export default function LateComersReport() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const backPath = role === 'admin' ? '/admin/reports' : '/manager/reports';

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
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
      const res = await api.get('/report/reports/late-comers/', {
        params: { start_date: startDate, end_date: endDate },
      });
      setRows(res.data || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      key: 'fullname', label: 'Employee', width: 260,
      sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text',
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
      key: 'late_days', label: 'Late Days', width: 110, align: 'center',
      sortKey: 'late_days',
      render: (row) => <Typography variant="body2" fontWeight={700} color="warning.dark">{row.late_days}</Typography>,
    },
    {
      key: 'total_records', label: 'Total Days', width: 110, align: 'center',
      sortKey: 'total_records',
      render: (row) => row.total_records,
    },
    {
      key: 'late_rate', label: 'Late Rate', width: 160, sortKey: 'late_rate',
      render: (row) => (
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={Math.min(Number(row.late_rate || 0), 100)}
            sx={{
              flex: 1, height: 6, borderRadius: 3, bgcolor: 'grey.100',
              '& .MuiLinearProgress-bar': { bgcolor: 'warning.main', borderRadius: 3 },
            }} />
          <Typography variant="caption" fontWeight={700} sx={{ width: 46, textAlign: 'right' }}>{row.late_rate}%</Typography>
        </Box>
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
    const exportCols = [
      { label: 'Emp Code', key: 'empcode' },
      { label: 'Employee', key: 'fullname' },
      { label: 'Outlet', key: 'primary_outlet_name' },
      { label: 'Late Days', key: 'late_days' },
      { label: 'Total Days', key: 'total_records' },
      { label: 'Late Rate (%)', key: 'late_rate' },
    ];
    exportRowsToCsv(`late-comers_${startDate}_to_${endDate}.csv`, exportCols, filteredRows);
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Late Comers</Typography>
      </Box>

      <PageHeader
        title="Late Comers"
        subtitle={`${filteredRows.length} employee${filteredRows.length === 1 ? '' : 's'} with at least one late day`}
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
        emptyMessage="No late comers in range"
      />
    </Box>
  );
}
