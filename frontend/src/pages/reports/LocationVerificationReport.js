import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar,
  IconButton, Tooltip, Chip, FormControlLabel, Switch, Link,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader, DataTable, applyClientFilters, exportRowsToCsv } from 'components/ui';
import { firstOfMonth, today, getInitials, rangeFieldSx } from './shared';
import { getUserRole } from 'utils/auth';

const fmtDist = (m) => {
  if (m === null || m === undefined) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
};

const fmtCoords = (lat, lon) => {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return '—';
  return `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
};

function MatchChip({ match, distance, radius }) {
  if (distance === null || distance === undefined) {
    return <Chip size="small" label="No data" variant="outlined" />;
  }
  return (
    <Chip
      size="small"
      icon={match ? <CheckCircleIcon /> : <CancelIcon />}
      label={match ? `Match (${fmtDist(distance)})` : `Off (${fmtDist(distance)})`}
      color={match ? 'success' : 'error'}
      variant={match ? 'filled' : 'outlined'}
      title={`Distance: ${fmtDist(distance)} • Radius: ${radius ?? '?'} m`}
    />
  );
}

export default function LocationVerificationReport() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const backPath = role === 'admin' ? '/admin/reports' : '/manager/reports';

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [mismatchOnly, setMismatchOnly] = useState(false);
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
      const res = await api.get('/report/reports/location-verification/', {
        params: { start_date: startDate, end_date: endDate },
      });
      setRows(res.data || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const visibleRows = useMemo(
    () => (mismatchOnly
      ? rows.filter((r) => r.check_in_match === false || r.check_out_match === false)
      : rows),
    [rows, mismatchOnly]
  );

  const columns = [
    {
      key: 'date', label: 'Date', width: 110,
      sortKey: 'date', filterKey: 'f_date', filterType: 'text',
      render: (row) => row.date,
    },
    {
      key: 'fullname', label: 'Employee', width: 220,
      sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text',
      filterValue: (row) => row.fullname,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: pickAvatarColor(row.fullname || '') }}>
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
      key: 'check_in_time', label: 'In Time', width: 90, align: 'center',
      sortKey: 'check_in_time',
      render: (row) => row.check_in_time,
    },
    {
      key: 'check_in_coords', label: 'In Coords', width: 190,
      render: (row) => {
        const label = fmtCoords(row.check_in_lat, row.check_in_long);
        if (row.check_in_lat === null || row.check_in_long === null) return label;
        const url = `https://maps.google.com/?q=${row.check_in_lat},${row.check_in_long}`;
        return <Link href={url} target="_blank" rel="noreferrer" underline="hover">{label}</Link>;
      },
    },
    {
      key: 'check_in_outlet_name', label: 'Nearest Outlet (In)', width: 180,
      sortKey: 'check_in_outlet_name', filterKey: 'f_in_outlet', filterType: 'text',
      render: (row) => row.check_in_outlet_name || <Typography variant="caption" color="text.secondary">—</Typography>,
    },
    {
      key: 'check_in_match', label: 'In Match', width: 170,
      render: (row) => <MatchChip match={row.check_in_match} distance={row.check_in_distance_m} radius={row.check_in_radius_m} />,
    },
    {
      key: 'check_out_time', label: 'Out Time', width: 90, align: 'center',
      sortKey: 'check_out_time',
      render: (row) => row.check_out_time || <Typography variant="caption" color="text.secondary">—</Typography>,
    },
    {
      key: 'check_out_coords', label: 'Out Coords', width: 190,
      render: (row) => {
        const label = fmtCoords(row.check_out_lat, row.check_out_long);
        if (row.check_out_lat === null || row.check_out_long === null) return label;
        const url = `https://maps.google.com/?q=${row.check_out_lat},${row.check_out_long}`;
        return <Link href={url} target="_blank" rel="noreferrer" underline="hover">{label}</Link>;
      },
    },
    {
      key: 'check_out_outlet_name', label: 'Nearest Outlet (Out)', width: 180,
      sortKey: 'check_out_outlet_name', filterKey: 'f_out_outlet', filterType: 'text',
      render: (row) => row.check_out_outlet_name || <Typography variant="caption" color="text.secondary">—</Typography>,
    },
    {
      key: 'check_out_match', label: 'Out Match', width: 170,
      render: (row) => <MatchChip match={row.check_out_match} distance={row.check_out_distance_m} radius={row.check_out_radius_m} />,
    },
  ];

  const filteredRows = useMemo(
    () => applyClientFilters(visibleRows, columns, columnFilters, sortBy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleRows, columnFilters, sortBy]
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
      { label: 'Date', key: 'date' },
      { label: 'Emp Code', key: 'empcode' },
      { label: 'Employee', key: 'fullname' },
      { label: 'In Time', key: 'check_in_time' },
      { label: 'In Lat', key: 'check_in_lat' },
      { label: 'In Long', key: 'check_in_long' },
      { label: 'Nearest Outlet (In)', key: 'check_in_outlet_name' },
      { label: 'In Distance (m)', key: 'check_in_distance_m' },
      { label: 'In Radius (m)', key: 'check_in_radius_m' },
      { label: 'In Match', key: 'check_in_match' },
      { label: 'Out Time', key: 'check_out_time' },
      { label: 'Out Lat', key: 'check_out_lat' },
      { label: 'Out Long', key: 'check_out_long' },
      { label: 'Nearest Outlet (Out)', key: 'check_out_outlet_name' },
      { label: 'Out Distance (m)', key: 'check_out_distance_m' },
      { label: 'Out Radius (m)', key: 'check_out_radius_m' },
      { label: 'Out Match', key: 'check_out_match' },
    ];
    exportRowsToCsv(`location-verification_${startDate}_to_${endDate}.csv`, exportCols, filteredRows);
  };

  const mismatchCount = useMemo(
    () => rows.filter((r) => r.check_in_match === false || r.check_out_match === false).length,
    [rows]
  );

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Location Verification</Typography>
      </Box>

      <PageHeader
        title="Location Verification"
        subtitle={`${filteredRows.length} punch record${filteredRows.length === 1 ? '' : 's'} — ${mismatchCount} off-site`}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="From" type="date" size="small" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <TextField label="To" type="date" size="small" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <FormControlLabel
              control={<Switch size="small" checked={mismatchOnly} onChange={(e) => { setMismatchOnly(e.target.checked); setPage(1); }} />}
              label={<Typography variant="body2">Off-site only</Typography>}
            />
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
        getRowId={(r) => r.attendance_id}
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
        emptyMessage="No location records in range"
      />
    </Box>
  );
}
