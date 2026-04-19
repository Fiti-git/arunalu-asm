import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar,
  IconButton, Tooltip, Autocomplete, FormControl, InputLabel, Select, MenuItem, Chip,
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

const ALL_EMPLOYEES = { employee_id: '__all__', fullname: 'All employees' };

export default function BlankDatesReport() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const backPath = role === 'admin' ? '/admin/reports' : '/manager/reports';

  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(ALL_EMPLOYEES);

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/user/').then((res) => {
      const list = res.data?.outlets || [];
      setOutlets(list);
      if (list.length > 0) setSelectedOutlet(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedOutlet) { setEmployees([]); return; }
    setSelectedEmployee(ALL_EMPLOYEES);
    api.get('/api/primary-outlet-employees/', { params: { outlet_id: selectedOutlet } })
      .then((res) => setEmployees(res.data || []))
      .catch(() => setEmployees([]));
  }, [selectedOutlet]);

  const fetchData = useCallback(async () => {
    if (!selectedOutlet) { setRows([]); return; }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const params = { start_date: startDate, end_date: endDate, outlet_id: selectedOutlet };
      if (selectedEmployee && selectedEmployee.employee_id !== '__all__') {
        params.employee_id = selectedEmployee.employee_id;
      }
      const res = await api.get('/report/reports/blank-dates/', { params });
      setRows((res.data || []).map((r, i) => ({ id: i, ...r })));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally { setLoading(false); }
  }, [selectedOutlet, selectedEmployee, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      field: 'fullname', headerName: 'Employee', flex: 1.4, minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
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
    {
      field: 'blank_date', headerName: 'Blank Date', flex: 0.8, minWidth: 140,
      renderCell: ({ value, row }) => {
        const d = new Date(value);
        const label = isNaN(d.getTime()) ? value : d.toLocaleDateString();
        return (
          <Box>
            <Typography variant="body2" fontWeight={600}>{label}</Typography>
            <Typography variant="caption" color="text.secondary">{row.weekday}</Typography>
          </Box>
        );
      },
    },
    {
      field: 'status', headerName: 'Status', flex: 0.6, minWidth: 140, sortable: false,
      renderCell: () => <Chip label="No record" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />,
    },
  ];

  const handleExport = () => {
    if (rows.length === 0) return;
    const empPart = selectedEmployee && selectedEmployee.employee_id !== '__all__'
      ? `_${selectedEmployee.fullname.replace(/\s+/g, '_')}`
      : '_all';
    exportCsv(`blank-dates${empPart}_${startDate}_to_${endDate}.csv`, rows, {
      empcode: 'Emp Code',
      fullname: 'Employee',
      primary_outlet_name: 'Outlet',
      blank_date: 'Blank Date',
      weekday: 'Weekday',
    });
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Blank Dates</Typography>
      </Box>

      <PageHeader
        title="Blank Dates"
        subtitle={`${rows.length} day${rows.length === 1 ? '' : 's'} with no attendance and no leave`}
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

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Outlet</InputLabel>
          <Select label="Outlet" value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)}>
            {outlets.length === 0 && <MenuItem value="" disabled>No outlets assigned</MenuItem>}
            {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Autocomplete
          size="small"
          options={[ALL_EMPLOYEES, ...employees]}
          value={selectedEmployee}
          onChange={(_, v) => setSelectedEmployee(v || ALL_EMPLOYEES)}
          isOptionEqualToValue={(a, b) => a?.employee_id === b?.employee_id}
          getOptionLabel={(o) => (o ? `${o.fullname}${o.empcode ? ` · ${o.empcode}` : ''}` : '')}
          sx={{ minWidth: 320 }}
          disableClearable
          renderInput={(params) => <TextField {...params} label="Employee" />}
        />
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ height: 600, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{
            noRowsOverlay: () => (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary" variant="body2">
                  No blank dates in the selected range.
                </Typography>
              </Box>
            ),
          }}
        />
      </Box>
    </Box>
  );
}
