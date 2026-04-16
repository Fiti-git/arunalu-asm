import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar, LinearProgress,
  IconButton, Tooltip, MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader } from 'components/ui';
import { firstOfMonth, today, exportCsv, getInitials, rangeFieldSx } from './shared';
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

  const fetchData = useCallback(async () => {
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get('/report/reports/absenteeism/', {
        params: { start_date: startDate, end_date: endDate, min_days: minDays },
      });
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [startDate, endDate, minDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      field: 'fullname', headerName: 'Employee', flex: 1.4, minWidth: 220,
      renderCell: ({ row }) => (
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
    { field: 'primary_outlet_name', headerName: 'Outlet', flex: 1, minWidth: 160 },
    { field: 'total_days', headerName: 'Days', flex: 0.4, minWidth: 80, align: 'center', headerAlign: 'center' },
    { field: 'present_days', headerName: 'Present', flex: 0.5, minWidth: 90, align: 'center', headerAlign: 'center' },
    { field: 'leave_days', headerName: 'Leave', flex: 0.5, minWidth: 90, align: 'center', headerAlign: 'center' },
    { field: 'absent_days', headerName: 'Absent', flex: 0.5, minWidth: 90, align: 'center', headerAlign: 'center',
      renderCell: ({ value }) => <Typography fontWeight={700} color="error.dark">{value}</Typography> },
    {
      field: 'absent_rate', headerName: 'Absent Rate', flex: 0.8, minWidth: 150,
      renderCell: ({ value }) => (
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
      ),
    },
  ];

  const handleExport = () =>
    exportCsv(`absenteeism_${startDate}_to_${endDate}.csv`, rows, {
      empcode: 'Emp Code', fullname: 'Employee', primary_outlet_name: 'Outlet',
      total_days: 'Days', present_days: 'Present', leave_days: 'Leave', absent_days: 'Absent', absent_rate: 'Absent Rate (%)',
    });

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Absenteeism</Typography>
      </Box>

      <PageHeader
        title="Absenteeism"
        subtitle={`${rows.length} employee${rows.length === 1 ? '' : 's'} with ≥ ${minDays} absent day${minDays === 1 ? '' : 's'}`}
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
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={rows.length === 0}>
              Export CSV
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ height: 600, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.employee_id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>
    </Box>
  );
}