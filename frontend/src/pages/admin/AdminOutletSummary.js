import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert,
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
import CloseIcon from '@mui/icons-material/Close';
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

function OutletCard({ outlet, selected, onClick }) {
  const rate = Number(outlet.present_rate || 0);
  const color = pickAvatarColor(outlet.name || '');
  return (
    <Box
      onClick={() => onClick(outlet)}
      sx={{
        cursor: 'pointer',
        position: 'relative',
        p: 2, borderRadius: 2.5,
        border: 2, borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        transition: 'all 0.18s',
        '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
        ...(selected && {
          '&::before': {
            content: '""',
            position: 'absolute', left: 0, top: 12, bottom: 12,
            width: 4, borderRadius: 4,
            bgcolor: 'secondary.main',
          },
        }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Avatar sx={{ bgcolor: color, fontWeight: 700, width: 36, height: 36, fontSize: '0.9rem' }}>
          {getInitials(outlet.name)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>{outlet.name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {outlet.manager_name || 'No manager'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
        <Typography variant="h5" fontWeight={800} color="primary.main">{rate}%</Typography>
        <Typography variant="caption" color="text.secondary">present rate</Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={Math.min(rate, 100)}
        sx={{
          height: 6, borderRadius: 3, mb: 1.2,
          bgcolor: 'grey.100',
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 3 },
        }}
      />

      <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
        <Chip size="small" label={`${outlet.total_emp || 0} emp`} sx={{ fontSize: '0.7rem', height: 22 }} />
        <Chip size="small" label={`${outlet.present_days || 0} P`} color="success" sx={{ fontSize: '0.7rem', height: 22, fontWeight: 600 }} />
        <Chip size="small" label={`${outlet.leave_days || 0} L`} color="warning" sx={{ fontSize: '0.7rem', height: 22, fontWeight: 600 }} />
        <Chip size="small" label={`${outlet.absent_days || 0} A`} color="error" sx={{ fontSize: '0.7rem', height: 22, fontWeight: 600 }} />
      </Box>
    </Box>
  );
}

export default function AdminOutletSummary() {
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());

  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('rate_desc');

  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [outletTrend, setOutletTrend] = useState([]);
  const [outletEmployees, setOutletEmployees] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const params = { start_date: startDate, end_date: endDate };
      const [ovRes, trRes, outRes] = await Promise.all([
        api.get('/report/outlet-summary/overview/', { params }),
        api.get('/report/outlet-summary/trend/', { params }),
        api.get('/report/outlet-summary/outlets/', { params }),
      ]);
      setOverview(ovRes.data);
      setTrend(trRes.data || []);
      setOutlets(outRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load outlet summary.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Refresh drill-down when range or selection changes
  useEffect(() => {
    if (!selectedOutlet) return;
    let cancelled = false;
    setDrillLoading(true);
    const params = { start_date: startDate, end_date: endDate };
    Promise.all([
      api.get('/report/outlet-summary/trend/', { params: { ...params, outlet_id: selectedOutlet.outlet_id } }),
      api.get(`/report/outlet-summary/outlets/${selectedOutlet.outlet_id}/employees/`, { params }),
    ])
      .then(([t, e]) => {
        if (cancelled) return;
        setOutletTrend(t.data || []);
        setOutletEmployees(e.data || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDrillLoading(false); });
    return () => { cancelled = true; };
  }, [selectedOutlet, startDate, endDate]);

  const sortedOutlets = useMemo(() => {
    const list = [...outlets];
    switch (sortBy) {
      case 'rate_asc': list.sort((a, b) => Number(a.present_rate) - Number(b.present_rate)); break;
      case 'name': list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'absent_desc': list.sort((a, b) => Number(b.absent_days) - Number(a.absent_days)); break;
      case 'size_desc': list.sort((a, b) => Number(b.total_emp) - Number(a.total_emp)); break;
      default: list.sort((a, b) => Number(b.present_rate) - Number(a.present_rate)); break;
    }
    return list;
  }, [outlets, sortBy]);

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
      field: 'fullname', headerName: 'Employee', flex: 1.2, minWidth: 180,
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
      field: 'present_rate', headerName: 'Rate', flex: 0.7, minWidth: 110,
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
        title="Outlet Summary"
        subtitle="Network-wide attendance health for the selected date range"
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

      {/* ── KPI Strip ───────────────────────────────── */}
      <Box sx={{
        display: 'grid', gap: 2,
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
      }}>
        <StatCard icon={<StoreMallDirectoryOutlinedIcon />} label="Outlets" value={overview?.outlets ?? '—'} color="primary" />
        <StatCard icon={<PeopleAltOutlinedIcon />} label="Active Staff" value={overview?.active_emp ?? '—'} color="secondary" />
        <StatCard icon={<EventAvailableOutlinedIcon />} label="Present (days)" value={overview?.present_days ?? '—'}
          trend={overview ? `${overview.present_rate}% rate` : ''} color="success" />
        <StatCard icon={<BeachAccessOutlinedIcon />} label="Leave (days)" value={overview?.leave_days ?? '—'} color="warning" />
        <StatCard icon={<EventBusyOutlinedIcon />} label="Absent (days)" value={overview?.absent_days ?? '—'} color="error" />
        <StatCard icon={<PendingActionsOutlinedIcon />} label="Pending Leaves" value={overview?.pending_leave_req ?? '—'} color="info" />
      </Box>

      {/* ── Network Trend ──────────────────────────── */}
      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2.5 }}>
        <SectionLabel>Network Trend</SectionLabel>
        {trend.length === 0 && !loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No data for this range.
          </Typography>
        ) : (
          <Box sx={{ height: 260, mt: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="leaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="notMarkedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="date_label" tick={{ fontSize: 11, fill: '#6B7280' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#16A34A" strokeWidth={2} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="leave" name="On Leave" stroke="#F59E0B" strokeWidth={2} fill="url(#leaveGrad)" />
                <Area type="monotone" dataKey="not_marked" name="Not Marked" stroke="#DC2626" strokeWidth={2} fill="url(#notMarkedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      {/* ── Outlets Leaderboard + Drill-down ─────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: selectedOutlet ? '1fr 1fr' : '1fr' }, gap: 2.5 }}>
        <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <SectionLabel>Outlets</SectionLabel>
            <Box sx={{ ml: 'auto' }}>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel>Sort by</InputLabel>
                <Select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="rate_desc">Rate (high→low)</MenuItem>
                  <MenuItem value="rate_asc">Rate (low→high)</MenuItem>
                  <MenuItem value="absent_desc">Most absent</MenuItem>
                  <MenuItem value="size_desc">Largest first</MenuItem>
                  <MenuItem value="name">Name A→Z</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{
            display: 'grid', gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: selectedOutlet ? '1fr 1fr' : 'repeat(3, 1fr)',
            },
          }}>
            {sortedOutlets.map((o) => (
              <OutletCard
                key={o.outlet_id}
                outlet={o}
                selected={selectedOutlet?.outlet_id === o.outlet_id}
                onClick={(sel) => setSelectedOutlet(
                  selectedOutlet?.outlet_id === sel.outlet_id ? null : sel
                )}
              />
            ))}
            {!loading && sortedOutlets.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, gridColumn: '1 / -1', textAlign: 'center' }}>
                No outlets found.
              </Typography>
            )}
          </Box>
        </Box>

        {selectedOutlet && (
          <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2.5, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" fontWeight={700} noWrap>{selectedOutlet.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {selectedOutlet.manager_name || 'No manager'} · {selectedOutlet.address || ''}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedOutlet(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {drillLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <Box sx={{ height: 180 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Breakdown
                    </Typography>
                    {donutData.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">No data</Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} dataKey="value" innerRadius={40} outerRadius={64} paddingAngle={2}>
                            {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <RTooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                  <Box sx={{ height: 180 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Daily Trend
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={outletTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="date_label" tick={{ fontSize: 10, fill: '#6B7280' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                        <RTooltip />
                        <Area type="monotone" dataKey="present" stroke="#2F54A0" strokeWidth={2} fill="#2F54A0" fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Employees ({outletEmployees.length})
                </Typography>
                <Box sx={{ height: 360 }}>
                  <DataGrid
                    rows={outletEmployees}
                    columns={empColumns}
                    getRowId={(r) => r.employee_id}
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  />
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}