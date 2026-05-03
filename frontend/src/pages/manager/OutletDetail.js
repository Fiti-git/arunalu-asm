import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert,
  LinearProgress, Chip, Avatar, Divider, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Button, Menu,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  PieChart, Pie, Cell, Legend, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import api from 'utils/api';
import { PageHeader, SectionLabel } from 'components/ui';
import { pickAvatarColor } from 'theme/tokens';

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

function AbsentDatesCell({ dates }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const list = Array.isArray(dates) ? dates : [];
  if (list.length === 0) return <Typography variant="caption" color="text.secondary">—</Typography>;
  return (
    <>
      <Button
        size="small"
        startIcon={<CalendarMonthIcon fontSize="small" />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ textTransform: 'none' }}
      >
        {list.length} date{list.length === 1 ? '' : 's'}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { maxHeight: 320 } }}>
        {list.map((d) => (
          <MenuItem key={d} dense disableRipple sx={{ fontSize: 13 }}>
            {d}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

const csvEscape = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function OutletDetail() {
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drillLoading, setDrillLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOutlets = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get('/report/outlet-summary/outlets/', {
        params: { start_date: startDate, end_date: endDate },
      });
      setOutlets(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load outlets.');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchOutlets(); }, [fetchOutlets]);

  useEffect(() => {
    if (outlets.length > 0 && !selectedOutletId) setSelectedOutletId(outlets[0].outlet_id);
  }, [outlets, selectedOutletId]);

  useEffect(() => {
    if (!selectedOutletId) return;
    let cancelled = false;
    setDrillLoading(true);
    api.get(`/report/outlet-summary/outlets/${selectedOutletId}/employees/`, {
      params: { start_date: startDate, end_date: endDate },
    })
      .then((res) => { if (!cancelled) setEmployees(res.data || []); })
      .catch(() => { if (!cancelled) setEmployees([]); })
      .finally(() => { if (!cancelled) setDrillLoading(false); });
    return () => { cancelled = true; };
  }, [selectedOutletId, startDate, endDate]);

  const selectedOutlet = useMemo(
    () => outlets.find((o) => o.outlet_id === selectedOutletId) || null,
    [outlets, selectedOutletId],
  );

  const donutData = useMemo(() => {
    if (!selectedOutlet) return [];
    return [
      { name: 'Present', value: Number(selectedOutlet.present_days || 0), color: '#16A34A' },
      { name: 'On Leave', value: Number(selectedOutlet.leave_days || 0), color: '#F59E0B' },
      { name: 'Absent', value: Number(selectedOutlet.absent_days || 0), color: '#DC2626' },
    ].filter((d) => d.value > 0);
  }, [selectedOutlet]);

  const handleDownloadCsv = () => {
    const headers = ['Employee', 'EMP Code', 'Username', 'Present', 'Leave', 'Absent', 'Rate %', 'Absent Dates'];
    const lines = [headers.map(csvEscape).join(',')];
    employees.forEach((e) => {
      lines.push([
        e.fullname,
        e.empcode || `#${e.employee_id}`,
        e.username || '',
        e.present_days,
        e.leave_days,
        e.absent_days,
        e.present_rate,
        (e.absent_dates || []).join('; '),
      ].map(csvEscape).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = (selectedOutlet?.name || 'outlet').replace(/[^a-z0-9]+/gi, '_');
    a.download = `outlet_${name}_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const empColumns = [
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
    { field: 'username', headerName: 'Username', flex: 0.7, minWidth: 120 },
    { field: 'present_days', headerName: 'Present', flex: 0.4, minWidth: 80, align: 'center', headerAlign: 'center' },
    { field: 'leave_days', headerName: 'Leave', flex: 0.4, minWidth: 80, align: 'center', headerAlign: 'center' },
    { field: 'absent_days', headerName: 'Absent', flex: 0.4, minWidth: 80, align: 'center', headerAlign: 'center' },
    {
      field: 'absent_dates', headerName: 'Absent Dates', flex: 0.7, minWidth: 130, sortable: false,
      renderCell: ({ row }) => <AbsentDatesCell dates={row.absent_dates} />,
    },
    {
      field: 'present_rate', headerName: 'Rate', flex: 0.8, minWidth: 130,
      renderCell: ({ value }) => (
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={Math.min(Number(value || 0), 100)}
            sx={{
              flex: 1, height: 6, borderRadius: 3, bgcolor: 'grey.100',
              '& .MuiLinearProgress-bar': {
                bgcolor: Number(value) >= 80 ? 'success.main' : Number(value) >= 60 ? 'warning.main' : 'error.main',
                borderRadius: 3,
              },
            }} />
          <Typography variant="caption" fontWeight={700} sx={{ width: 40, textAlign: 'right' }}>{value}%</Typography>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Outlet Detail"
        subtitle="Per-outlet attendance breakdown for the selected range"
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Outlet</InputLabel>
              <Select label="Outlet" value={selectedOutletId || ''}
                onChange={(e) => setSelectedOutletId(e.target.value)}>
                {outlets.map((o) => (
                  <MenuItem key={o.outlet_id} value={o.outlet_id}>{o.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="From" type="date" size="small" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
            <TextField label="To" type="date" size="small" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchOutlets} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadIcon />}
              disabled={!employees.length} onClick={handleDownloadCsv}>
              Download CSV
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {outlets.length === 0 && !loading && (
        <Alert severity="info">No outlets available for this range.</Alert>
      )}

      {selectedOutlet && (
        <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2.5 }}>
          <SectionLabel>{selectedOutlet.name}</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, my: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>Rate</Typography>
              <Typography variant="h5" fontWeight={800}>{selectedOutlet.present_rate}%</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">Employees</Typography>
              <Typography variant="h5" fontWeight={800}>{selectedOutlet.total_emp}</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">Present · Leave · Absent</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                <Chip size="small" label={selectedOutlet.present_days} color="success" sx={{ fontWeight: 700 }} />
                <Chip size="small" label={selectedOutlet.leave_days} color="warning" sx={{ fontWeight: 700 }} />
                <Chip size="small" label={selectedOutlet.absent_days} color="error" sx={{ fontWeight: 700 }} />
              </Box>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">Manager</Typography>
              <Typography variant="body2" fontWeight={600} noWrap>{selectedOutlet.manager_name || '—'}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{selectedOutlet.address || ''}</Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2, mb: 2 }}>
            <Box sx={{ height: 200 }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Breakdown
              </Typography>
              {donutData.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No data for this range.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Employees ({employees.length})
              </Typography>
              <Box sx={{ height: 480 }}>
                {drillLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <DataGrid
                    rows={employees}
                    columns={empColumns}
                    getRowId={(r) => r.employee_id}
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 25, 50, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
