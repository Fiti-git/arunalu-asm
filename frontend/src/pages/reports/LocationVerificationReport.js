import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar,
  IconButton, Tooltip, Chip, FormControlLabel, Switch, Link,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader } from 'components/ui';
import { firstOfMonth, today, exportCsv, getInitials, rangeFieldSx } from './shared';
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

  const fetchData = useCallback(async () => {
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get('/report/reports/location-verification/', {
        params: { start_date: startDate, end_date: endDate },
      });
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const visibleRows = mismatchOnly
    ? rows.filter((r) => r.check_in_match === false || r.check_out_match === false)
    : rows;

  const columns = [
    { field: 'date', headerName: 'Date', width: 110 },
    {
      field: 'fullname', headerName: 'Employee', flex: 1.2, minWidth: 200,
      renderCell: ({ row }) => (
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
    { field: 'check_in_time', headerName: 'In Time', width: 90, align: 'center', headerAlign: 'center' },
    {
      field: 'check_in_coords', headerName: 'In Coords', flex: 1, minWidth: 180,
      valueGetter: (_v, row) => fmtCoords(row.check_in_lat, row.check_in_long),
      renderCell: ({ row, value }) => {
        if (row.check_in_lat === null || row.check_in_long === null) return value;
        const url = `https://maps.google.com/?q=${row.check_in_lat},${row.check_in_long}`;
        return <Link href={url} target="_blank" rel="noreferrer" underline="hover">{value}</Link>;
      },
    },
    { field: 'check_in_outlet_name', headerName: 'Nearest Outlet (In)', flex: 1, minWidth: 160,
      renderCell: ({ value }) => value || <Typography variant="caption" color="text.secondary">—</Typography> },
    {
      field: 'check_in_match', headerName: 'In Match', width: 170,
      renderCell: ({ row }) => <MatchChip match={row.check_in_match} distance={row.check_in_distance_m} radius={row.check_in_radius_m} />,
    },
    { field: 'check_out_time', headerName: 'Out Time', width: 90, align: 'center', headerAlign: 'center',
      renderCell: ({ value }) => value || <Typography variant="caption" color="text.secondary">—</Typography> },
    {
      field: 'check_out_coords', headerName: 'Out Coords', flex: 1, minWidth: 180,
      valueGetter: (_v, row) => fmtCoords(row.check_out_lat, row.check_out_long),
      renderCell: ({ row, value }) => {
        if (row.check_out_lat === null || row.check_out_long === null) return value;
        const url = `https://maps.google.com/?q=${row.check_out_lat},${row.check_out_long}`;
        return <Link href={url} target="_blank" rel="noreferrer" underline="hover">{value}</Link>;
      },
    },
    { field: 'check_out_outlet_name', headerName: 'Nearest Outlet (Out)', flex: 1, minWidth: 160,
      renderCell: ({ value }) => value || <Typography variant="caption" color="text.secondary">—</Typography> },
    {
      field: 'check_out_match', headerName: 'Out Match', width: 170,
      renderCell: ({ row }) => <MatchChip match={row.check_out_match} distance={row.check_out_distance_m} radius={row.check_out_radius_m} />,
    },
  ];

  const handleExport = () =>
    exportCsv(`location-verification_${startDate}_to_${endDate}.csv`, visibleRows, {
      date: 'Date',
      empcode: 'Emp Code',
      fullname: 'Employee',
      check_in_time: 'In Time',
      check_in_lat: 'In Lat',
      check_in_long: 'In Long',
      check_in_outlet_name: 'Nearest Outlet (In)',
      check_in_distance_m: 'In Distance (m)',
      check_in_radius_m: 'In Radius (m)',
      check_in_match: 'In Match',
      check_out_time: 'Out Time',
      check_out_lat: 'Out Lat',
      check_out_long: 'Out Long',
      check_out_outlet_name: 'Nearest Outlet (Out)',
      check_out_distance_m: 'Out Distance (m)',
      check_out_radius_m: 'Out Radius (m)',
      check_out_match: 'Out Match',
    });

  const mismatchCount = rows.filter((r) => r.check_in_match === false || r.check_out_match === false).length;

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Location Verification</Typography>
      </Box>

      <PageHeader
        title="Location Verification"
        subtitle={`${rows.length} punch record${rows.length === 1 ? '' : 's'} — ${mismatchCount} off-site`}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="From" type="date" size="small" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <TextField label="To" type="date" size="small" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <FormControlLabel
              control={<Switch size="small" checked={mismatchOnly} onChange={(e) => setMismatchOnly(e.target.checked)} />}
              label={<Typography variant="body2">Off-site only</Typography>}
            />
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchData} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={visibleRows.length === 0}>
              Export CSV
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ height: 640, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={visibleRows}
          columns={columns}
          getRowId={(r) => r.attendance_id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>
    </Box>
  );
}
