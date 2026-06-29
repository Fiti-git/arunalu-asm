import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert,
  LinearProgress, Chip, Avatar, Divider, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Button, Menu,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Legend, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import api from 'utils/api';
import { PageHeader, SectionLabel, DataTable, applyClientFilters, exportRowsToCsv } from 'components/ui';
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

export default function OutletDetail() {
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drillLoading, setDrillLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

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
      .then((res) => { if (!cancelled) { setEmployees(res.data || []); setPage(1); } })
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

  const empColumns = useMemo(() => [
    {
      key: 'fullname', label: 'Employee', width: 240,
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
    { key: 'username', label: 'Username', width: 140, sortKey: 'username', filterKey: 'f_username', filterType: 'text', render: (row) => row.username },
    { key: 'present_days', label: 'Present', width: 90, align: 'center', sortKey: 'present_days', render: (row) => row.present_days },
    { key: 'leave_days', label: 'Leave', width: 90, align: 'center', sortKey: 'leave_days', render: (row) => row.leave_days },
    { key: 'absent_days', label: 'Absent', width: 90, align: 'center', sortKey: 'absent_days', render: (row) => row.absent_days },
    {
      key: 'absent_dates', label: 'Absent Dates', width: 140,
      render: (row) => <AbsentDatesCell dates={row.absent_dates} />,
    },
    {
      key: 'present_rate', label: 'Rate', width: 140, sortKey: 'present_rate',
      render: (row) => (
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={Math.min(Number(row.present_rate || 0), 100)}
            sx={{
              flex: 1, height: 6, borderRadius: 3, bgcolor: 'grey.100',
              '& .MuiLinearProgress-bar': {
                bgcolor: Number(row.present_rate) >= 80 ? 'success.main' : Number(row.present_rate) >= 60 ? 'warning.main' : 'error.main',
                borderRadius: 3,
              },
            }} />
          <Typography variant="caption" fontWeight={700} sx={{ width: 40, textAlign: 'right' }}>{row.present_rate}%</Typography>
        </Box>
      ),
    },
  ], []);

  const filteredRows = useMemo(
    () => applyClientFilters(employees, empColumns, columnFilters, sortBy),
    [employees, empColumns, columnFilters, sortBy]
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

  const handleDownloadCsv = () => {
    const exportCols = [
      { key: 'fullname', label: 'Employee' },
      { key: 'empcode', label: 'EMP Code' },
      { key: 'username', label: 'Username' },
      { key: 'present_days', label: 'Present' },
      { key: 'leave_days', label: 'Leave' },
      { key: 'absent_days', label: 'Absent' },
      { key: 'present_rate', label: 'Rate %' },
      { key: 'absent_dates', label: 'Absent Dates', csvValue: (e) => (e.absent_dates || []).join('; ') },
    ];
    const name = (selectedOutlet?.name || 'outlet').replace(/[^a-z0-9]+/gi, '_');
    exportRowsToCsv(`outlet_${name}_${startDate}_to_${endDate}.csv`, exportCols, filteredRows);
  };

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
              disabled={!filteredRows.length} onClick={handleDownloadCsv}>
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
              <DataTable
                columns={empColumns}
                rows={pagedRows}
                getRowId={(r) => r.employee_id}
                loading={drillLoading}
                page={page}
                pageSize={pageSize}
                totalCount={filteredRows.length}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                filters={columnFilters}
                onFilterChange={handleFilterChange}
                sortBy={sortBy}
                onSortChange={(s) => { setSortBy(s); setPage(1); }}
                emptyMessage="No employees"
                height={480}
                minHeight={480}
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
