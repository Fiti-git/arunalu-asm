import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert,
  IconButton, Tooltip, Button,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Link as RouterLink } from 'react-router-dom';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import StoreMallDirectoryOutlinedIcon from '@mui/icons-material/StoreMallDirectoryOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from 'utils/api';
import { PageHeader, SectionLabel, StatCard } from 'components/ui';

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AdminOutletSummary() {
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());

  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const params = { start_date: startDate, end_date: endDate };
      const [ovRes, trRes] = await Promise.all([
        api.get('/report/outlet-summary/overview/', { params }),
        api.get('/report/outlet-summary/trend/', { params }),
      ]);
      setOverview(ovRes.data);
      setTrend(trRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
          trend={Number.isFinite(Number(overview?.present_rate)) ? `${overview.present_rate}% rate` : ''} color="success" />
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

      {/* ── Pointer to Outlets Detail page ─────────── */}
      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <SectionLabel>Outlets</SectionLabel>
          <Typography variant="body2" color="text.secondary">
            Per-outlet breakdown, employees, and absent-date drilldown moved to its own page.
          </Typography>
        </Box>
        <Button component={RouterLink} to="/admin/outlets-detail" variant="contained">
          Open Outlets Detail
        </Button>
      </Box>

    </Box>
  );
}