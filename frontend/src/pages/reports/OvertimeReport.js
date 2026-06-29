import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar,
  IconButton, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader, StatCard, DataTable, applyClientFilters, exportRowsToCsv } from 'components/ui';
import WatchLaterOutlinedIcon from '@mui/icons-material/WatchLaterOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { firstOfMonth, today, getInitials, rangeFieldSx } from './shared';
import { getUserRole } from 'utils/auth';

export default function OvertimeReport() {
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
      const res = await api.get('/report/reports/overtime/', {
        params: { start_date: startDate, end_date: endDate },
      });
      setRows(res.data || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totals = useMemo(() => {
    const otSum = rows.reduce((acc, r) => acc + Number(r.ot_hours || 0), 0);
    const daysSum = rows.reduce((acc, r) => acc + Number(r.days_with_ot || 0), 0);
    return { otSum: otSum.toFixed(1), daysSum, empCount: rows.length };
  }, [rows]);

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
      key: 'ot_hours', label: 'OT Hours', width: 120, align: 'center',
      sortKey: 'ot_hours',
      render: (row) => <Typography fontWeight={700} color="info.dark">{row.ot_hours}h</Typography>,
    },
    {
      key: 'days_with_ot', label: 'Days w/ OT', width: 120, align: 'center',
      sortKey: 'days_with_ot',
      render: (row) => row.days_with_ot,
    },
    {
      key: 'worked_hours', label: 'Total Worked', width: 130, align: 'center',
      sortKey: 'worked_hours',
      render: (row) => <Typography variant="body2">{row.worked_hours}h</Typography>,
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
      { label: 'OT Hours', key: 'ot_hours' },
      { label: 'Days with OT', key: 'days_with_ot' },
      { label: 'Total Worked Hours', key: 'worked_hours' },
    ];
    exportRowsToCsv(`overtime_${startDate}_to_${endDate}.csv`, exportCols, filteredRows);
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Overtime</Typography>
      </Box>

      <PageHeader
        title="Overtime"
        subtitle={`${filteredRows.length} employee${filteredRows.length === 1 ? '' : 's'} with recorded OT`}
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

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
        <StatCard icon={<WatchLaterOutlinedIcon />} label="Total OT Hours" value={`${totals.otSum}h`} color="info" />
        <StatCard icon={<EventAvailableOutlinedIcon />} label="OT Days" value={totals.daysSum} color="primary" />
        <StatCard icon={<PeopleAltOutlinedIcon />} label="Employees" value={totals.empCount} color="secondary" />
      </Box>

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
        emptyMessage="No overtime records in range"
      />
    </Box>
  );
}
