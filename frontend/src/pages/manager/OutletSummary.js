import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert, Chip, Avatar,
  IconButton, Tooltip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, ToggleButton, ToggleButtonGroup, List, ListItem,
  ListItemText, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from 'utils/api';
import { PageHeader, SectionLabel, DataTable, applyClientFilters } from 'components/ui';
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

const CATEGORIES = [
  { key: 'present', label: 'Present', color: 'success', datesField: 'present_dates', countField: 'present_days' },
  { key: 'leave', label: 'Leave', color: 'warning', datesField: 'leave_dates', countField: 'leave_days' },
  { key: 'not_marked', label: 'Not Marked', color: 'error', datesField: 'absent_dates', countField: 'absent_days' },
];

function DatesViewDialog({ open, employee, dateRange, onClose }) {
  const [category, setCategory] = useState('present');
  useEffect(() => { if (open) setCategory('present'); }, [open]);

  if (!employee) return null;
  const current = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];
  const dates = employee[current.datesField] || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>{employee.fullname}</Typography>
        <Typography variant="caption" color="text.secondary">
          {employee.empcode || `#${employee.employee_id}`} · {dateRange.start} → {dateRange.end}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, v) => v && setCategory(v)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        >
          {CATEGORIES.map((c) => (
            <ToggleButton key={c.key} value={c.key} sx={{ textTransform: 'none', fontWeight: 600 }}>
              {c.label} ({employee[c.countField] ?? 0})
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {dates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CalendarMonthIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No {current.label.toLowerCase()} dates in this range.
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 360, overflow: 'auto', p: 0 }}>
            {dates.map((d) => (
              <ListItem key={d} sx={{ py: 0.25 }}>
                <ListItemText
                  primary={d}
                  primaryTypographyProps={{ variant: 'body2', sx: { fontFamily: 'monospace' } }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OutletSummary() {
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [empLoading, setEmpLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewDialog, setViewDialog] = useState({ open: false, employee: null });

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
      const list = res.data || [];
      setOutlets(list);
      if (list.length === 0) {
        setOutletId('');
      } else if (!list.find((o) => o.outlet_id === outletId)) {
        setOutletId(list[0].outlet_id);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load outlet.');
      setOutlets([]);
    } finally { setLoading(false); }
  }, [startDate, endDate, outletId]);

  useEffect(() => { fetchOutlets(); }, [fetchOutlets]);

  useEffect(() => {
    if (!outletId) { setEmployees([]); return; }
    let cancelled = false;
    setEmpLoading(true);
    api.get(`/report/outlet-summary/outlets/${outletId}/employees/`, {
      params: { start_date: startDate, end_date: endDate },
    })
      .then((res) => { if (!cancelled) { setEmployees(res.data || []); setPage(1); } })
      .catch(() => { if (!cancelled) setEmployees([]); })
      .finally(() => { if (!cancelled) setEmpLoading(false); });
    return () => { cancelled = true; };
  }, [outletId, startDate, endDate]);

  const selectedOutlet = outlets.find((o) => o.outlet_id === outletId) || null;
  const totalDays = employees[0]?.total_days ?? 0;

  const openViewDialog = (employee) => setViewDialog({ open: true, employee });
  const closeViewDialog = () => setViewDialog({ open: false, employee: null });

  const columns = useMemo(() => [
    {
      key: 'fullname', label: 'Employee', width: 260,
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
    { key: 'present_days', label: 'Present', width: 100, align: 'center', sortKey: 'present_days', render: (row) => row.present_days },
    { key: 'leave_days', label: 'Leave', width: 100, align: 'center', sortKey: 'leave_days', render: (row) => row.leave_days },
    { key: 'absent_days', label: 'Not Marked', width: 120, align: 'center', sortKey: 'absent_days', render: (row) => row.absent_days },
    {
      key: 'actions', label: 'Dates', width: 110, align: 'center',
      render: (row) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<VisibilityIcon fontSize="small" />}
          onClick={() => openViewDialog(row)}
          sx={{ textTransform: 'none' }}
        >
          View
        </Button>
      ),
    },
  ], []);

  const filteredRows = useMemo(
    () => applyClientFilters(employees, columns, columnFilters, sortBy),
    [employees, columns, columnFilters, sortBy]
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

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Outlet Summary"
        subtitle="Present, leave, and unmarked days for your outlet across a date range"
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {outlets.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Outlet</InputLabel>
                <Select label="Outlet" value={outletId || ''}
                  onChange={(e) => setOutletId(e.target.value)}>
                  {outlets.map((o) => (
                    <MenuItem key={o.outlet_id} value={o.outlet_id}>{o.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {outlets.length === 0 && !loading && !error && (
        <Alert severity="info">No outlet assigned to your account for this range.</Alert>
      )}

      {selectedOutlet && (
        <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, p: 2.5 }}>
          <SectionLabel>{selectedOutlet.name}</SectionLabel>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, my: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>Total employees</Typography>
              <Typography variant="h5" fontWeight={800}>{employees.length}</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">Total days</Typography>
              <Typography variant="h5" fontWeight={800}>{totalDays}</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">Date range</Typography>
              <Typography variant="body2" fontWeight={600} noWrap>{startDate}</Typography>
              <Typography variant="body2" fontWeight={600} noWrap>→ {endDate}</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">Present · Leave · Not Marked</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip size="small" label={selectedOutlet.present_days} color="success" sx={{ fontWeight: 700 }} />
                <Chip size="small" label={selectedOutlet.leave_days} color="warning" sx={{ fontWeight: 700 }} />
                <Chip size="small" label={selectedOutlet.absent_days} color="error" sx={{ fontWeight: 700 }} />
              </Box>
            </Box>
          </Box>

          <DataTable
            columns={columns}
            rows={pagedRows}
            getRowId={(r) => r.employee_id}
            loading={empLoading}
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
          />
        </Box>
      )}

      <DatesViewDialog
        open={viewDialog.open}
        employee={viewDialog.employee}
        dateRange={{ start: startDate, end: endDate }}
        onClose={closeViewDialog}
      />
    </Box>
  );
}
