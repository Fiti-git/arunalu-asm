import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar,
  IconButton, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { PageHeader, StatCard } from 'components/ui';
import WatchLaterOutlinedIcon from '@mui/icons-material/WatchLaterOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { firstOfMonth, today, exportCsv, getInitials, rangeFieldSx } from './shared';
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

  const fetchData = useCallback(async () => {
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get('/report/reports/overtime/', {
        params: { start_date: startDate, end_date: endDate },
      });
      setRows(res.data || []);
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
    { field: 'ot_hours', headerName: 'OT Hours', flex: 0.6, minWidth: 110, align: 'center', headerAlign: 'center',
      renderCell: ({ value }) => <Typography fontWeight={700} color="info.dark">{value}h</Typography> },
    { field: 'days_with_ot', headerName: 'Days w/ OT', flex: 0.6, minWidth: 110, align: 'center', headerAlign: 'center' },
    { field: 'worked_hours', headerName: 'Total Worked', flex: 0.7, minWidth: 120, align: 'center', headerAlign: 'center',
      renderCell: ({ value }) => <Typography variant="body2">{value}h</Typography> },
  ];

  const handleExport = () =>
    exportCsv(`overtime_${startDate}_to_${endDate}.csv`, rows, {
      empcode: 'Emp Code', fullname: 'Employee', primary_outlet_name: 'Outlet',
      ot_hours: 'OT Hours', days_with_ot: 'Days with OT', worked_hours: 'Total Worked Hours',
    });

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Overtime</Typography>
      </Box>

      <PageHeader
        title="Overtime"
        subtitle={`${rows.length} employee${rows.length === 1 ? '' : 's'} with recorded OT`}
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
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={rows.length === 0}>
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

      <Box sx={{ height: 560, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
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