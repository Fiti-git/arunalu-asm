import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogActions,
  TextField, Typography, Switch, Checkbox, FormControlLabel,
  Tabs, Tab, IconButton, Divider, Stack, CircularProgress, Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useLocation } from 'react-router-dom';
import api from 'utils/api';
import { PageHeader, SectionLabel, DataTable, applyClientFilters } from 'components/ui';

// ═══════════════════════════════════════════════════════════════════════════
// Schemas
// ═══════════════════════════════════════════════════════════════════════════
const holidaySchema = yup.object({
  hcode: yup.string().required('Hcode is required'),
  holiday_type: yup.string().required('Holiday type is required'),
  holiday_type_name: yup.string().required('Holiday type name is required'),
  holiday_name: yup.string().required('Holiday name is required'),
  hdate: yup.date().required('Holiday date is required').typeError('Invalid date'),
  active: yup.boolean(),
  holiday_ot_pay_percentage: yup.number().typeError('OT must be a decimal number').min(0, 'Cannot be negative').required('Holiday OT is required'),
  holiday_regular_pay_percentage: yup.number().typeError('Pay Percentage must be a decimal number').min(0, 'Cannot be negative').required('Pay Percentage is required'),
}).required();

const leaveTypeSchema = yup.object({
  att_type: yup.string().required('Attendance Type is required'),
  att_type_name: yup.string().required('Name is required'),
  active: yup.boolean().required(),
  att_type_group: yup.string().required('Group is required'),
  att_type_per_day_hours: yup.number().typeError('Hours per day must be a number').min(0).required('Hours per day is required'),
  pay_percentage: yup.number().typeError('Pay percentage must be a number').min(0).max(100).required('Pay percentage is required'),
  att_type_no_of_days_in_year: yup.number().typeError('Number of days must be a number').required('Number of days per year is required'),
  year_start_date: yup.date().required('Start Date is required').typeError('Invalid date'),
  year_end_date: yup.date().required('End Date is required').typeError('Invalid date'),
}).required();

const holidayDefaults = {
  hcode: '', holiday_type: '', holiday_type_name: '', holiday_name: '',
  hdate: null, active: true,
  holiday_ot_pay_percentage: '', holiday_regular_pay_percentage: '',
};

const leaveTypeDefaults = {
  att_type: '', att_type_name: '', active: true, att_type_group: '',
  att_type_per_day_hours: '', pay_percentage: '',
  att_type_no_of_days_in_year: '',
  year_start_date: null, year_end_date: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// Holidays Tab
// ═══════════════════════════════════════════════════════════════════════════
function HolidaysTab() {
  const [rows, setRows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(holidaySchema),
    defaultValues: holidayDefaults,
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/holidays/');
      setRows(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openAdd = () => {
    setEditing(null);
    setError('');
    reset(holidayDefaults);
    setDialogOpen(true);
  };

  const openEdit = useCallback((row) => {
    setEditing(row);
    setError('');
    const d = row.hdate instanceof Date ? row.hdate : new Date(row.hdate);
    reset({ ...row, hdate: d });
    setDialogOpen(true);
  }, [reset]);

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const onSubmit = async (data) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...data,
        hdate: new Date(data.hdate).toISOString().split('T')[0],
        holiday_ot_pay_percentage: data.holiday_ot_pay_percentage
          ? Number(data.holiday_ot_pay_percentage).toFixed(2) : null,
        holiday_regular_pay_percentage: data.holiday_regular_pay_percentage
          ? Number(data.holiday_regular_pay_percentage).toFixed(2) : null,
      };

      if (editing) {
        const res = await api.put(`api/holidays/${editing.id}/`, payload);
        setRows((prev) => prev.map((it) => (it.id === editing.id ? res.data : it)));
      } else {
        const res = await api.post('api/holidays/', payload);
        setRows((prev) => [...prev, res.data]);
      }
      closeDialog();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save holiday.');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { key: 'hcode', label: 'Hcode', width: 110, sortKey: 'hcode', filterKey: 'f_hcode', filterType: 'text', render: (r) => r.hcode },
    { key: 'holiday_name', label: 'Holiday Name', width: 220, sortKey: 'holiday_name', filterKey: 'f_name', filterType: 'text', render: (r) => r.holiday_name },
    {
      key: 'hdate', label: 'Date', width: 130, sortKey: 'hdate',
      render: (row) => {
        if (!row.hdate) return '';
        const d = new Date(row.hdate);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
      },
    },
    {
      key: 'active', label: 'Active', width: 90,
      filterKey: 'f_active', filterType: 'bool',
      filterValue: (row) => Boolean(row.active),
      render: (row) => row.active ? 'Yes' : 'No',
    },
    { key: 'holiday_ot_pay_percentage', label: 'Holiday OT', width: 110, sortKey: 'holiday_ot_pay_percentage', render: (r) => r.holiday_ot_pay_percentage },
    { key: 'holiday_regular_pay_percentage', label: 'Pay %', width: 110, sortKey: 'holiday_regular_pay_percentage', render: (r) => r.holiday_regular_pay_percentage },
    {
      key: 'actions', label: 'Actions', width: 90, align: 'center',
      render: (row) => (
        <IconButton size="small" onClick={() => openEdit(row)} title="Edit">
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ], [openEdit]);

  const filteredRows = useMemo(
    () => applyClientFilters(rows, columns, columnFilters, sortBy),
    [rows, columns, columnFilters, sortBy]
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Loading…' : `${rows.length} holidays configured`}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add Holiday
        </Button>
      </Box>

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(r) => r.id}
        loading={loading}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 25]}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        emptyMessage="No holidays"
        height={520}
        minHeight={520}
      />

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5">{editing ? 'Edit Holiday' : 'Add Holiday'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Configure holiday date, code and pay percentages
            </Typography>
          </Box>
          <IconButton onClick={closeDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent sx={{ px: 3, py: 2.5 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <SectionLabel icon={<EventAvailableOutlinedIcon />}>Holiday Details</SectionLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              {[
                ['hcode', 'Hcode *'],
                ['holiday_type', 'Holiday Type *'],
                ['holiday_type_name', 'Holiday Type Name *'],
                ['holiday_name', 'Holiday Name *'],
              ].map(([name, label]) => (
                <Controller
                  key={name}
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={label}
                      fullWidth
                      error={!!errors[name]}
                      helperText={errors[name]?.message}
                      disabled={saving}
                    />
                  )}
                />
              ))}
              <Controller
                name="hdate"
                control={control}
                render={({ field }) => (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Holiday Date *"
                      value={field.value}
                      onChange={(d) => field.onChange(d)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.hdate,
                          helperText: errors.hdate?.message,
                          disabled: saving,
                        },
                      }}
                    />
                  </LocalizationProvider>
                )}
              />
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={saving} />}
                      label="Active"
                    />
                  </Box>
                )}
              />
            </Box>

            <SectionLabel icon={<BeachAccessOutlinedIcon />}>Pay Configuration</SectionLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Controller
                name="holiday_ot_pay_percentage"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Holiday OT (%) *"
                    type="number"
                    fullWidth
                    error={!!errors.holiday_ot_pay_percentage}
                    helperText={errors.holiday_ot_pay_percentage?.message}
                    disabled={saving}
                  />
                )}
              />
              <Controller
                name="holiday_regular_pay_percentage"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Regular Pay (%) *"
                    type="number"
                    fullWidth
                    error={!!errors.holiday_regular_pay_percentage}
                    helperText={errors.holiday_regular_pay_percentage?.message}
                    disabled={saving}
                  />
                )}
              />
            </Box>
          </DialogContent>

          <Divider />
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ px: 3 }}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Holiday'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Leave Types Tab
// ═══════════════════════════════════════════════════════════════════════════
function LeaveTypesTab() {
  const [rows, setRows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(leaveTypeSchema),
    defaultValues: leaveTypeDefaults,
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/leavetypes/');
      setRows(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openAdd = () => {
    setEditing(null);
    setError('');
    reset(leaveTypeDefaults);
    setDialogOpen(true);
  };

  const openEdit = useCallback((row) => {
    setEditing(row);
    setError('');
    const start = row.year_start_date instanceof Date ? row.year_start_date : new Date(row.year_start_date);
    const end = row.year_end_date instanceof Date ? row.year_end_date : new Date(row.year_end_date);
    reset({ ...row, year_start_date: start, year_end_date: end });
    setDialogOpen(true);
  }, [reset]);

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const onSubmit = async (data) => {
    setSaving(true);
    setError('');
    const payload = {
      ...data,
      year_start_date: data.year_start_date ? new Date(data.year_start_date).toISOString().split('T')[0] : '',
      year_end_date: data.year_end_date ? new Date(data.year_end_date).toISOString().split('T')[0] : '',
    };

    try {
      if (editing) {
        await api.put(`/api/leavetypes/${editing.id}/`, payload);
        setRows((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...payload } : it)));
      } else {
        const res = await api.post('/api/leavetypes/', payload);
        setRows((prev) => [...prev, { id: res.data.id, ...payload }]);
      }
      closeDialog();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save leave type.');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { key: 'att_type', label: 'AttType', width: 110, sortKey: 'att_type', filterKey: 'f_atttype', filterType: 'text', render: (r) => r.att_type },
    { key: 'att_type_name', label: 'Name', width: 200, sortKey: 'att_type_name', filterKey: 'f_name', filterType: 'text', render: (r) => r.att_type_name },
    {
      key: 'active', label: 'Active', width: 90,
      filterKey: 'f_active', filterType: 'bool',
      filterValue: (row) => Boolean(row.active),
      render: (row) => row.active ? 'Y' : 'N',
    },
    { key: 'pay_percentage', label: 'Pay %', width: 100, sortKey: 'pay_percentage', render: (r) => r.pay_percentage },
    { key: 'att_type_no_of_days_in_year', label: 'Days/Year', width: 110, sortKey: 'att_type_no_of_days_in_year', render: (r) => r.att_type_no_of_days_in_year },
    { key: 'att_type_per_day_hours', label: 'Hrs/Day', width: 100, sortKey: 'att_type_per_day_hours', render: (r) => r.att_type_per_day_hours },
    {
      key: 'actions', label: 'Actions', width: 90, align: 'center',
      render: (row) => (
        <IconButton size="small" onClick={() => openEdit(row)} title="Edit">
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ], [openEdit]);

  const filteredRows = useMemo(
    () => applyClientFilters(rows, columns, columnFilters, sortBy),
    [rows, columns, columnFilters, sortBy]
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Loading…' : `${rows.length} leave types configured`}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add Leave Type
        </Button>
      </Box>

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(r) => r.id}
        loading={loading}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 25]}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        emptyMessage="No leave types"
        height={520}
        minHeight={520}
      />

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5">{editing ? 'Edit Leave Type' : 'Add Leave Type'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Configure attendance type, pay percentage and yearly entitlement
            </Typography>
          </Box>
          <IconButton onClick={closeDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent sx={{ px: 3, py: 2.5 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <SectionLabel icon={<BeachAccessOutlinedIcon />}>Type Information</SectionLabel>
            <Stack spacing={2} sx={{ mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Controller
                  name="att_type"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Attendance Type *" fullWidth
                      error={!!errors.att_type} helperText={errors.att_type?.message} disabled={saving} />
                  )}
                />
                <Controller
                  name="att_type_name"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Name *" fullWidth
                      error={!!errors.att_type_name} helperText={errors.att_type_name?.message} disabled={saving} />
                  )}
                />
                <Controller
                  name="att_type_group"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Group *" fullWidth
                      error={!!errors.att_type_group} helperText={errors.att_type_group?.message} disabled={saving} />
                  )}
                />
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={saving} />}
                        label="Active"
                      />
                    </Box>
                  )}
                />
              </Box>
            </Stack>

            <SectionLabel icon={<EventAvailableOutlinedIcon />}>Allowance & Pay</SectionLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
              <Controller
                name="att_type_per_day_hours"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Hours per Day *" type="number" fullWidth
                    error={!!errors.att_type_per_day_hours} helperText={errors.att_type_per_day_hours?.message} disabled={saving} />
                )}
              />
              <Controller
                name="pay_percentage"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Pay Percentage *" type="number" fullWidth
                    error={!!errors.pay_percentage} helperText={errors.pay_percentage?.message} disabled={saving} />
                )}
              />
              <Controller
                name="att_type_no_of_days_in_year"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Days per Year *" type="number" fullWidth
                    error={!!errors.att_type_no_of_days_in_year} helperText={errors.att_type_no_of_days_in_year?.message} disabled={saving} />
                )}
              />
            </Box>

            <SectionLabel icon={<EventAvailableOutlinedIcon />}>Validity Window</SectionLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Controller
                name="year_start_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    label="Year Start Date *"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.year_start_date}
                    helperText={errors.year_start_date?.message}
                    disabled={saving}
                  />
                )}
              />
              <Controller
                name="year_end_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    label="Year End Date *"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.year_end_date}
                    helperText={errors.year_end_date?.message}
                    disabled={saving}
                  />
                )}
              />
            </Box>
          </DialogContent>

          <Divider />
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ px: 3 }}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Leave Type'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Combined page with tabs
// ═══════════════════════════════════════════════════════════════════════════
export default function TimeOffManager() {
  const location = useLocation();
  const defaultTab = location.pathname.includes('holiday') ? 0 : 1;
  const [tab, setTab] = useState(defaultTab);

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Leave & Holidays"
        subtitle="Manage company holidays and leave type configuration"
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab
            label="Holidays"
            icon={<EventAvailableOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label="Leave Types"
            icon={<BeachAccessOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <Box hidden={tab !== 0}>{tab === 0 && <HolidaysTab />}</Box>
      <Box hidden={tab !== 1}>{tab === 1 && <LeaveTypesTab />}</Box>
    </Box>
  );
}
