import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert,
  LinearProgress, Chip, Avatar, Divider, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import StoreMallDirectoryOutlinedIcon from '@mui/icons-material/StoreMallDirectoryOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from 'utils/api';
import { PageHeader, SectionLabel, StatCard } from 'components/ui';
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

export default function ManagerDashboard() {
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());

  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [employees, setEmployees] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // Fetch overview + outlets on range change
  const fetchAll = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const params = { start_date: startDate, end_date: endDate };
      const [ovRes, outRes, trRes] = await Promise.all([
        api.get('/report/outlet-summary/overview/', { params }),
        api.get('/report/outlet-summary/outlets/', { params }),
        api.get('/report/outlet-summary/trend/', { params }),
      ]);
      setOverview(ovRes.data);
      setOutlets(outRes.data || []);
      setTrend(trRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Default selected outlet = first one (and only one if single-outlet manager)
  useEffect(() => {
    if (outlets.length > 0 && !selectedOutletId) {
      setSelectedOutletId(outlets[0].outlet_id);
    }
  }, [outlets, selectedOutletId]);

  // Drill-down: per-outlet employee table
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
    { field: 'present_days', headerName: 'Present', flex: 0.5, minWidth: 90, align: 'center', headerAlign: 'center' },
    { field: 'leave_days', headerName: 'Leave', flex: 0.5, minWidth: 90, align: 'center', headerAlign: 'center' },
    { field: 'absent_days', headerName: 'Absent', flex: 0.5, minWidth: 90, align: 'center', headerAlign: 'center' },
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
        title="Manager Dashboard"
        subtitle={
          outlets.length > 1
            ? `${outlets.length} outlets · attendance health for the selected range`
            : 'Your outlet attendance for the selected range'
        }
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="From" type="date" size="small" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
            <TextField label="To" type="date" size="small" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchAll} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* KPI Strip */}
      <Box sx={{
        display: 'grid', gap: 2,
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
      }}>
        <StatCard icon={<StoreMallDirectoryOutlinedIcon />} label="My Outlets" value={overview?.outlets ?? '—'} color="primary" />
        <StatCard icon={<PeopleAltOutlinedIcon />} label="Active Staff" value={overview?.active_emp ?? '—'} color="secondary" />
        <StatCard icon={<EventAvailableOutlinedIcon />} label="Present (days)" value={overview?.present_days ?? '—'}
          trend={overview ? `${overview.present_rate}% rate` : ''} color="success" />
        <StatCard icon={<BeachAccessOutlinedIcon />} label="Leave (days)" value={overview?.leave_days ?? '—'} color="warning" />
        <StatCard icon={<EventBusyOutlinedIcon />} label="Absent (days)" value={overview?.absent_days ?? '—'} color="error" />
        <StatCard icon={<PendingActionsOutlinedIcon />} label="Pending Leaves" value={overview?.pending_leave_req ?? '—'} color="info" />
      </Box>

      {/* Network Trend */}
      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2.5 }}>
        <SectionLabel>Attendance Trend</SectionLabel>
        {trend.length === 0 && !loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No data for this range.
          </Typography>
        ) : (
          <Box sx={{ height: 260, mt: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mgrPresGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="mgrLvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="mgrNmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="date_label" tick={{ fontSize: 11, fill: '#6B7280' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#16A34A" strokeWidth={2} fill="url(#mgrPresGrad)" />
                <Area type="monotone" dataKey="leave" name="On Leave" stroke="#F59E0B" strokeWidth={2} fill="url(#mgrLvGrad)" />
                <Area type="monotone" dataKey="not_marked" name="Not Marked" stroke="#DC2626" strokeWidth={2} fill="url(#mgrNmGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      {/* Outlet selector + detail */}
      {outlets.length > 0 && (
        <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <SectionLabel>{outlets.length === 1 ? 'Outlet Detail' : 'Outlet Detail'}</SectionLabel>
            <Box sx={{ ml: 'auto' }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Outlet</InputLabel>
                <Select label="Outlet" value={selectedOutletId || ''}
                  onChange={(e) => setSelectedOutletId(e.target.value)}>
                  {outlets.map((o) => (
                    <MenuItem key={o.outlet_id} value={o.outlet_id}>{o.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {selectedOutlet && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
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
                  <Box sx={{ height: 340 }}>
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
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}