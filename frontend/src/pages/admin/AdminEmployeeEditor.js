import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Drawer, TextField, MenuItem, Typography,
  Alert, Divider, Switch, FormControlLabel, InputAdornment,
  IconButton, Avatar, Tabs, Tab, Stepper, Step, StepLabel,
  DialogContent, DialogActions, Tooltip, Dialog,
  CircularProgress, Stack, Chip, Checkbox, FormGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import FaceIcon from '@mui/icons-material/Face';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from 'utils/api';
import { PageHeader, SectionLabel, SearchInput, DataTable } from 'components/ui';
import { pickAvatarColor } from 'theme/tokens';
import EmployeeStatusControl from 'components/EmployeeStatusControl';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

// ─── Validation ──────────────────────────────────────────────────────────────
const step1Schema = yup.object({
  fullname: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Min 8 characters').required('Password is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  date_of_birth: yup.string().required('Date of birth is required'),
});

const editSchema = yup.object({
  fullname: yup.string().required('Username is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  date_of_birth: yup.string().required('Date of birth is required'),
  email: yup.string().email('Invalid email').optional(),
  password: yup.string().optional().test('min-len', 'Min 8 characters', v => !v || v.length >= 8),
});

const defaultValues = {
  fullname: '', email: '', first_name: '', last_name: '',
  phone_number: '', date_of_birth: '', idnumber: '',
  outlets: [], primary_outlet: '', group: '', password: '',
  cal_epf: true, epf_cal_date: '', epf_grade: '', epf_number: '',
  employ_number: '', basic_salary: '',
  epf_com_per: 12.0, epf_emp_per: 8.0, etf_com_per: 3.0,
};

const getInitials = (name) =>
  (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

function OutletCheckboxGroup({ value, onChange, outlets }) {
  const selected = Array.isArray(value) ? value.map(Number) : [];
  const toggle = (id) => {
    const n = Number(id);
    const next = selected.includes(n) ? selected.filter(x => x !== n) : [...selected, n];
    onChange(next);
  };
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, maxHeight: 200, overflowY: 'auto', bgcolor: 'grey.50' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Employee can attend multiple outlets — tick all that apply.
      </Typography>
      <FormGroup>
        {outlets.length === 0 && <Typography variant="caption" color="text.disabled">No outlets available</Typography>}
        {outlets.map(o => (
          <FormControlLabel
            key={o.id}
            control={<Checkbox size="small" checked={selected.includes(Number(o.id))} onChange={() => toggle(o.id)} />}
            label={<Typography variant="body2">{o.name}</Typography>}
            sx={{ ml: 0 }}
          />
        ))}
      </FormGroup>
    </Box>
  );
}

function PunchPhotoSlot({ label, src, tone }) {
  return (
    <Box>
      <Box
        sx={{
          height: 110,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: `${tone}.light`,
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {src ? (
          <Box
            component="img"
            src={`${BASE_URL}${src}`}
            alt={label}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Typography variant="caption" sx={{ color: `${tone}.dark`, fontWeight: 500, opacity: 0.7 }}>
            No Photo
          </Typography>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          mt: 0.5,
          fontWeight: 600,
          color: `${tone}.dark`,
          fontSize: '0.68rem',
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

const Dash = () => <Typography variant="caption" color="text.disabled">—</Typography>;

const buildColumns = (onEdit) => [
  {
    key: 'name', label: 'Employee', width: 260, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text',
    render: (row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          src={row.reference_photo ? `${BASE_URL}${row.reference_photo}` : undefined}
          sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: pickAvatarColor(row.fullname), fontWeight: 700, fontSize: '0.85rem' }}
        >
          {getInitials(row.fullname)}
        </Avatar>
        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {`${row.first_name || ''} ${row.last_name || ''}`.trim() || row.fullname}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>@{row.fullname}</Typography>
        </Box>
      </Box>
    ),
  },
  {
    key: 'group_name', label: 'Role', width: 140, filterKey: 'f_group', filterType: 'text',
    render: (row) => row.group_name && row.group_name !== '—'
      ? <Chip label={row.group_name} size="small" variant="outlined" />
      : <Dash />,
  },
  {
    key: 'email', label: 'Email', width: 200, sortKey: 'email', filterKey: 'f_email', filterType: 'text',
    render: (row) => <Typography variant="body2" color="text.secondary" noWrap>{row.email || '—'}</Typography>,
  },
  {
    key: 'phone_number', label: 'Phone', width: 140, sortKey: 'phone_number', filterKey: 'f_phone', filterType: 'text',
    render: (row) => <Typography variant="body2" color="text.secondary" noWrap>{row.phone_number || '—'}</Typography>,
  },
  {
    key: 'date_of_birth', label: 'Date of Birth', width: 140, sortKey: 'date_of_birth', filterKey: 'f_dob', filterType: 'text',
    render: (row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <CakeOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.secondary">{row.date_of_birth || '—'}</Typography>
      </Box>
    ),
  },
  {
    key: 'idnumber', label: 'ID Number', width: 140, sortKey: 'idnumber', filterKey: 'f_idnumber', filterType: 'text',
    render: (row) => <Typography variant="caption" color="text.secondary">{row.idnumber || '—'}</Typography>,
  },
  {
    key: 'outlet_names', label: 'Outlets', width: 200, filterKey: 'f_outlet', filterType: 'text',
    render: (row) => row.outlet_names?.length > 0 ? (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
        <LocationOnOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" noWrap>
          {row.outlet_names.slice(0, 2).join(', ')}
          {row.outlet_names.length > 2 && ` +${row.outlet_names.length - 2}`}
        </Typography>
      </Box>
    ) : <Dash />,
  },
  {
    key: 'primary_outlet_name', label: 'Primary Outlet', width: 160, sortKey: 'primary_outlet', filterKey: 'f_primary_outlet', filterType: 'text',
    render: (row) => row.primary_outlet_name ? (
      <Chip label={row.primary_outlet_name} size="small" sx={{ bgcolor: 'success.light', color: 'success.dark', fontWeight: 600 }} />
    ) : <Dash />,
  },
  {
    key: 'employ_number', label: 'Emp. No.', width: 110, sortKey: 'employ_number', filterKey: 'f_employ_number', filterType: 'text',
    render: (row) => <Typography variant="caption" color="text.secondary">{row.employ_number || '—'}</Typography>,
  },
  {
    key: 'epf_number', label: 'EPF No.', width: 120, sortKey: 'epf_number', filterKey: 'f_epf_number', filterType: 'text',
    render: (row) => <Typography variant="caption" color="text.secondary">{row.epf_number || '—'}</Typography>,
  },
  {
    key: 'basic_salary', label: 'Basic Salary', width: 140, align: 'right', sortKey: 'basic_salary', filterKey: 'f_basic_salary', filterType: 'text',
    render: (row) => (
      <Typography variant="caption" color="text.secondary">
        {row.basic_salary ? `Rs. ${Number(row.basic_salary).toLocaleString()}` : '—'}
      </Typography>
    ),
  },
  {
    key: 'is_active', label: 'Status', width: 120, align: 'center', sortKey: 'is_active',
    filterKey: 'f_is_active', filterType: 'bool', boolLabels: { true: 'Active', false: 'Inactive' },
    render: (row) => (
      <Chip
        label={row.is_active ? 'Active' : 'Inactive'}
        size="small"
        color={row.is_active ? 'success' : 'error'}
        variant={row.is_active ? 'filled' : 'outlined'}
        sx={{ fontWeight: 600 }}
      />
    ),
  },
  {
    key: 'cal_epf', label: 'Calc EPF', width: 110, align: 'center', sortKey: 'cal_epf',
    filterKey: 'f_cal_epf', filterType: 'bool',
    render: (row) => (
      <Chip
        label={row.cal_epf ? 'Yes' : 'No'}
        size="small"
        color={row.cal_epf ? 'success' : 'default'}
        variant="outlined"
      />
    ),
  },
  {
    key: 'actions', label: '', width: 70, align: 'center',
    render: (row) => (
      <Tooltip title="Edit employee">
        <IconButton size="small" onClick={() => onEdit(row)} color="primary">
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    ),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminEmployeeEditor() {
  const [employees, setEmployees] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });
  const searchTimeout = useRef(null);

  // Create wizard
  const [createOpen, setCreateOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [createError, setCreateError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editTab, setEditTab] = useState(0);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [clearingPhotos, setClearingPhotos] = useState(false);

  const createForm = useForm({ defaultValues, resolver: yupResolver(step1Schema) });
  const editForm = useForm({ defaultValues, resolver: yupResolver(editSchema) });
  const watchedCreateOutlets = createForm.watch('outlets');
  const watchedEditOutlets = editForm.watch('outlets');

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async (
    page = 1,
    q = '',
    inactive = includeInactive,
    filters = columnFilters,
    sort = sortBy,
    size = pageSize,
  ) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: size,
        ...(q ? { search: q } : {}),
        ...(inactive ? { include_inactive: 'true' } : {}),
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null)),
      };
      if (sort.key) params.ordering = (sort.dir === 'desc' ? '-' : '') + sort.key;

      const [empRes, outletRes] = await Promise.all([
        api.get('/api/v2/employees/', { params }),
        api.get('/api/outlets/'),
      ]);
      const outletsMap = outletRes.data.reduce((a, o) => ({ ...a, [o.id]: o.name }), {});
      const empList = empRes.data.results || (Array.isArray(empRes.data) ? empRes.data : []);
      setEmployees(empList.map(emp => ({
        ...emp,
        outlet_names: emp.outlets?.map(id => outletsMap[id] || 'Unknown') || [],
        primary_outlet_name: emp.primary_outlet ? (outletsMap[emp.primary_outlet] || 'Unknown') : null,
        group_name: emp.groups?.[0] || '—',
      })));
      setTotalCount(empRes.data.count || empList.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([api.get('/api/outlets/'), api.get('/api/groups/')])
      .then(([o, g]) => { setOutlets(o.data); setGroups(g.data); });
  }, []);

  useEffect(() => {
    fetchEmployees(currentPage, search, includeInactive, columnFilters, sortBy, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, includeInactive, sortBy, pageSize, fetchEmployees]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      fetchEmployees(1, val, includeInactive, columnFilters, sortBy, pageSize);
    }, 300);
  };

  const handleFilterChange = (filterKey, value) => {
    const next = { ...columnFilters, [filterKey]: value };
    if (value === '' || value == null) delete next[filterKey];
    setColumnFilters(next);
    setCurrentPage(1);
    fetchEmployees(1, search, includeInactive, next, sortBy, pageSize);
  };

  const handleSortChange = (next) => {
    setSortBy(next);
    setCurrentPage(1);
  };

  // ─── Create ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    createForm.reset({ ...defaultValues });
    setActiveStep(0);
    setCreateError('');
    setShowPassword(false);
    setCreateOpen(true);
  };

  const handleNextStep = async () => {
    let valid = false;
    if (activeStep === 0) valid = await createForm.trigger(['fullname','email','password','first_name','last_name','date_of_birth']);
    else valid = true;
    if (valid) setActiveStep(s => s + 1);
  };

  const handleCreateSubmit = async () => {
    setCreateError('');
    const data = createForm.getValues();
    if (!data.employ_number || `${data.employ_number}`.trim() === '') {
      createForm.setError('employ_number', { message: 'Employment number is required' });
      setActiveStep(2);
      return;
    }
    setCreateSubmitting(true);
    try {
      const formData = new FormData();
      for (const key in data) {
        if (key === 'outlets') (data.outlets || []).forEach(id => formData.append('outlets', id));
        else if (data[key] !== '' && data[key] !== null && data[key] !== undefined) formData.append(key, data[key]);
      }
      await api.post('/api/v2/employees/create/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCreateOpen(false);
      fetchEmployees(currentPage, search);
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([f, m]) => {
          if (f === 'non_field') setCreateError(m);
          else createForm.setError(f, { message: m });
        });
        const step1Fields = ['fullname','email','password','first_name','last_name','date_of_birth','idnumber'];
        const step3Fields = ['employ_number','basic_salary','epf_number','epf_grade','epf_cal_date','cal_epf','epf_com_per','epf_emp_per','etf_com_per'];
        if (Object.keys(serverErrors).some(f => step1Fields.includes(f))) setActiveStep(0);
        else if (Object.keys(serverErrors).some(f => step3Fields.includes(f))) setActiveStep(2);
        else setActiveStep(1);
      } else {
        setCreateError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ─── Edit ────────────────────────────────────────────────────────────────
  const openEdit = (row) => {
    setEditEmployee(row);
    setEditTab(0);
    setEditError('');
    setShowPassword(false);
    editForm.reset({
      ...defaultValues,
      fullname: row.fullname || '',
      email: row.email || '',
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      phone_number: row.phone_number || '',
      date_of_birth: row.date_of_birth || '',
      outlets: Array.isArray(row.outlets) ? row.outlets : [],
      primary_outlet: row.primary_outlet || '',
      group: groups.find(g => row.group_name?.includes(g.name))?.id || '',
      cal_epf: row.cal_epf ?? true,
      epf_cal_date: row.epf_cal_date || '',
      epf_grade: row.epf_grade || '',
      epf_number: row.epf_number || '',
      employ_number: row.employ_number ?? '',
      basic_salary: row.basic_salary ?? '',
      epf_com_per: row.epf_com_per ?? 12.0,
      epf_emp_per: row.epf_emp_per ?? 8.0,
      etf_com_per: row.etf_com_per ?? 3.0,
      idnumber: row.idnumber || '',
    });
    setEditDrawerOpen(true);
  };

  const handleEditSave = async () => {
    const valid = await editForm.trigger(['fullname','first_name','last_name','date_of_birth']);
    if (!valid) { setEditTab(0); return; }
    setEditSaving(true);
    setEditError('');
    const data = editForm.getValues();
    try {
      const formData = new FormData();
      for (const key in data) {
        if (key === 'outlets') (data.outlets || []).forEach(id => formData.append('outlets', id));
        else if (data[key] !== '' && data[key] !== null && data[key] !== undefined) formData.append(key, data[key]);
      }
      await api.put(`/api/v2/employees/${editEmployee.employee_id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditDrawerOpen(false);
      fetchEmployees(currentPage, search);
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) Object.entries(serverErrors).forEach(([f, m]) => {
        if (f === 'non_field') setEditError(m); else editForm.setError(f, { message: m });
      });
      else setEditError('An unexpected error occurred.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleClearPhotos = async () => {
    if (!editEmployee) return;
    if (!window.confirm('Delete all photos (reference, punch-in, punch-out) for this employee?')) return;
    setClearingPhotos(true);
    setEditError('');
    try {
      const formData = new FormData();
      formData.append('clear_images', 'true');
      await api.put(`/report/employees/${editEmployee.employee_id}/`, formData);
      setEditEmployee((prev) =>
        prev ? { ...prev, reference_photo: null, punchin_selfie: null, punchout_selfie: null } : prev
      );
      fetchEmployees(currentPage, search);
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to clear photos.');
    } finally {
      setClearingPhotos(false);
    }
  };

  const primaryOutletOptionsCreate = outlets.filter(o =>
    Array.isArray(watchedCreateOutlets) && watchedCreateOutlets.map(Number).includes(o.id)
  );
  const primaryOutletOptionsEdit = outlets.filter(o =>
    Array.isArray(watchedEditOutlets) && watchedEditOutlets.map(Number).includes(o.id)
  );
  const createErrors = createForm.formState.errors;
  const editErrors = editForm.formState.errors;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>

      <PageHeader
        title="Employees"
        subtitle={loading ? 'Loading…' : `${totalCount} employees`}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search employees…"
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={includeInactive}
                  onChange={(e) => { setCurrentPage(1); setIncludeInactive(e.target.checked); }}
                />
              }
              label={<Typography variant="body2">Show inactive</Typography>}
              sx={{ mr: 0 }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add Employee
            </Button>
          </>
        }
      />

      <DataTable
        columns={buildColumns(openEdit)}
        rows={employees}
        getRowId={(row) => row.employee_id}
        loading={loading}
        page={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onRowClassName={(row) => row.is_active ? '' : 'row-inactive'}
        emptyIcon={<PersonOutlineIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />}
        emptyMessage="No employees found"
      />
      <style>{`.row-inactive { background-color: rgba(244,67,54,0.04); opacity: 0.75; }`}</style>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CREATE — Stepper Dialog                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h5">New Employee</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                Step {activeStep + 1} of 3 — {['Account & Personal', 'Work Assignment', 'EPF & Salary'][activeStep]}
              </Typography>
            </Box>
            <IconButton onClick={() => setCreateOpen(false)} size="small" sx={{ mt: -0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mt: 2.5 }}>
            {[
              { label: 'Personal', icon: <PersonOutlineIcon sx={{ fontSize: 18 }} /> },
              { label: 'Work', icon: <WorkOutlineIcon sx={{ fontSize: 18 }} /> },
              { label: 'EPF & Pay', icon: <AccountBalanceIcon sx={{ fontSize: 18 }} /> },
            ].map((s, i) => (
              <Step key={s.label} completed={activeStep > i}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box sx={{
                      width: 30, height: 30, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      bgcolor: activeStep > i ? 'success.main' : activeStep === i ? 'primary.main' : 'grey.200',
                      color: activeStep >= i ? 'common.white' : 'text.disabled',
                      transition: 'all 0.2s',
                    }}>
                      {activeStep > i ? <CheckIcon sx={{ fontSize: 16 }} /> : s.icon}
                    </Box>
                  )}
                >
                  <Typography variant="caption" fontWeight={activeStep === i ? 700 : 400}
                    color={activeStep === i ? 'primary.main' : 'text.secondary'}>
                    {s.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Divider />

        <DialogContent sx={{ px: 3, py: 2.5, minHeight: 340 }}>
          {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{createError}</Alert>}

          {/* Step 1 */}
          {activeStep === 0 && (
            <Box>
              <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Account</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Controller name="fullname" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Username *" size="small" fullWidth error={!!createErrors.fullname} helperText={createErrors.fullname?.message || 'Used to log in'} autoComplete="off" />
                )} />
                <Controller name="email" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Email *" type="email" size="small" fullWidth error={!!createErrors.email} helperText={createErrors.email?.message} autoComplete="off" />
                )} />
              </Box>
              <Box sx={{ mb: 3 }}>
                <Controller name="password" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Password *" type={showPassword ? 'text' : 'password'} size="small" fullWidth
                    error={!!createErrors.password} helperText={createErrors.password?.message || 'Minimum 8 characters'}
                    autoComplete="new-password"
                    InputProps={{ endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(p => !p)} size="small" edge="end" tabIndex={-1}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )}}
                  />
                )} />
              </Box>
              <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Personal Details</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Controller name="first_name" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="First Name *" size="small" fullWidth error={!!createErrors.first_name} helperText={createErrors.first_name?.message} />
                )} />
                <Controller name="last_name" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Last Name *" size="small" fullWidth error={!!createErrors.last_name} helperText={createErrors.last_name?.message} />
                )} />
                <Controller name="phone_number" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Phone Number" size="small" fullWidth />
                )} />
                <Controller name="date_of_birth" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Date of Birth *" type="date" size="small" fullWidth error={!!createErrors.date_of_birth} helperText={createErrors.date_of_birth?.message} InputLabelProps={{ shrink: true }} />
                )} />
              </Box>
              <Controller name="idnumber" control={createForm.control} render={({ field }) => (
                <TextField {...field} label="ID Number" size="small" sx={{ width: '50%' }} />
              )} />
            </Box>
          )}

          {/* Step 2 */}
          {activeStep === 1 && (
            <Box>
              <SectionLabel icon={<WorkOutlineIcon sx={{ fontSize: 18 }} />}>Work Assignment</SectionLabel>
              <Stack spacing={2}>
                <Controller name="group" control={createForm.control} render={({ field }) => (
                  <TextField {...field} select label="Role *" size="small" fullWidth error={!!createErrors.group} helperText={createErrors.group?.message}>
                    {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                  </TextField>
                )} />
                <Controller name="outlets" control={createForm.control} render={({ field }) => (
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Outlets</Typography>
                    <OutletCheckboxGroup value={field.value} onChange={field.onChange} outlets={outlets} />
                  </Box>
                )} />
                <Controller name="primary_outlet" control={createForm.control} render={({ field }) => (
                  <TextField {...field} select label="Primary Outlet" size="small" fullWidth helperText="Main outlet for attendance monitoring">
                    <MenuItem value="">— None —</MenuItem>
                    {primaryOutletOptionsCreate.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                  </TextField>
                )} />
              </Stack>
            </Box>
          )}

          {/* Step 3 */}
          {activeStep === 2 && (
            <Box>
              <SectionLabel icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />}>EPF & Salary</SectionLabel>
              <Stack spacing={2}>
                <Controller name="cal_epf" control={createForm.control} render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} size="small" color="primary" />}
                    label={<Typography variant="body2" fontWeight={500}>Calculate EPF for this employee</Typography>}
                  />
                )} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Controller name="epf_cal_date" control={createForm.control} render={({ field }) => (
                    <TextField {...field} label="EPF Calculation Date" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} />
                  )} />
                  <Controller name="epf_grade" control={createForm.control} render={({ field }) => (
                    <TextField {...field} label="EPF Grade" size="small" fullWidth />
                  )} />
                  <Controller name="epf_number" control={createForm.control} render={({ field }) => (
                    <TextField {...field} label="EPF Number" size="small" fullWidth />
                  )} />
                  <Controller name="employ_number" control={createForm.control} render={({ field }) => (
                    <TextField {...field} label="Employment Number *" type="number" size="small" fullWidth
                      error={!!createErrors.employ_number}
                      helperText={createErrors.employ_number?.message || 'Required'} />
                  )} />
                </Box>
                <Controller name="basic_salary" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Basic Salary" type="number" size="small" sx={{ width: '50%' }}
                    InputProps={{ startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }} />
                )} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                  {[['epf_com_per','EPF Company'],['epf_emp_per','EPF Employee'],['etf_com_per','ETF Company']].map(([n, l]) => (
                    <Controller key={n} name={n} control={createForm.control} render={({ field }) => (
                      <TextField {...field} label={l} type="number" size="small" fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
                    )} />
                  ))}
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          {activeStep > 0 && (
            <Button startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(s => s - 1)} variant="outlined">
              Back
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          {activeStep < 2 ? (
            <Button endIcon={<ArrowForwardIcon />} onClick={handleNextStep} variant="contained" sx={{ px: 3 }}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleCreateSubmit} variant="contained" color="success" disabled={createSubmitting}
              sx={{ px: 3 }}
              startIcon={createSubmitting ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
            >
              {createSubmitting ? 'Creating…' : 'Create Employee'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* EDIT — Side Drawer                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Drawer
        anchor="right"
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ px: 3, py: 2.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 44, height: 44, fontWeight: 700, fontSize: '1rem', bgcolor: pickAvatarColor(editEmployee?.fullname || '') }}>
              {getInitials(editEmployee?.fullname || '')}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>{editEmployee?.fullname}</Typography>
              <Typography variant="caption" color="text.secondary">{editEmployee?.email || 'No email'}</Typography>
            </Box>
            <IconButton onClick={() => setEditDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Tabs
          value={editTab}
          onChange={(_, v) => setEditTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
        >
          <Tab label="Personal" icon={<PersonOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Work" icon={<WorkOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="EPF & Pay" icon={<AccountBalanceIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Photos" icon={<FaceIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {editError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{editError}</Alert>}

          {editTab === 0 && (
            <Box>
              <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Account</SectionLabel>
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Controller name="fullname" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Full Name *" size="small" fullWidth
                    error={!!editErrors.fullname}
                    helperText={editErrors.fullname?.message || 'Also used as the login username'} />
                )} />
                <Controller name="email" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Email" type="email" size="small" fullWidth error={!!editErrors.email} helperText={editErrors.email?.message} />
                )} />
                <Controller name="password" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="New Password" type={showPassword ? 'text' : 'password'} size="small" fullWidth
                    error={!!editErrors.password} helperText={editErrors.password?.message || 'Leave blank to keep current password'}
                    autoComplete="new-password"
                    InputProps={{ endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(p => !p)} size="small" edge="end" tabIndex={-1}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )}}
                  />
                )} />
              </Stack>
              <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Personal Details</SectionLabel>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Controller name="first_name" control={editForm.control} render={({ field }) => (
                    <TextField {...field} label="First Name *" size="small" fullWidth error={!!editErrors.first_name} helperText={editErrors.first_name?.message} />
                  )} />
                  <Controller name="last_name" control={editForm.control} render={({ field }) => (
                    <TextField {...field} label="Last Name *" size="small" fullWidth error={!!editErrors.last_name} helperText={editErrors.last_name?.message} />
                  )} />
                </Box>
                <Controller name="phone_number" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Phone Number" size="small" fullWidth />
                )} />
                <Controller name="date_of_birth" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Date of Birth *" type="date" size="small" fullWidth error={!!editErrors.date_of_birth} helperText={editErrors.date_of_birth?.message} InputLabelProps={{ shrink: true }} />
                )} />
              </Stack>
            </Box>
          )}

          {editTab === 1 && (
            <Box>
              <SectionLabel icon={<WorkOutlineIcon sx={{ fontSize: 18 }} />}>Work Assignment</SectionLabel>
              <Stack spacing={2}>
                <Controller name="group" control={editForm.control} render={({ field }) => (
                  <TextField {...field} select label="Role" size="small" fullWidth>
                    {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                  </TextField>
                )} />
                <Controller name="outlets" control={editForm.control} render={({ field }) => (
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Outlets</Typography>
                    <OutletCheckboxGroup value={field.value} onChange={field.onChange} outlets={outlets} />
                  </Box>
                )} />
                <Controller name="primary_outlet" control={editForm.control} render={({ field }) => (
                  <TextField {...field} select label="Primary Outlet" size="small" fullWidth helperText="Main outlet for attendance monitoring">
                    <MenuItem value="">— None —</MenuItem>
                    {primaryOutletOptionsEdit.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                  </TextField>
                )} />
              </Stack>
            </Box>
          )}

          {editTab === 2 && (
            <Box>
              <SectionLabel icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />}>EPF & Salary</SectionLabel>
              <Stack spacing={2}>
                <Controller name="cal_epf" control={editForm.control} render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} size="small" color="primary" />}
                    label={<Typography variant="body2" fontWeight={500}>Calculate EPF</Typography>}
                  />
                )} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Controller name="epf_cal_date" control={editForm.control} render={({ field }) => (
                    <TextField {...field} label="EPF Date" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} />
                  )} />
                  <Controller name="epf_grade" control={editForm.control} render={({ field }) => (
                    <TextField {...field} label="EPF Grade" size="small" fullWidth />
                  )} />
                  <Controller name="epf_number" control={editForm.control} render={({ field }) => (
                    <TextField {...field} label="EPF Number" size="small" fullWidth />
                  )} />
                  <Controller name="employ_number" control={editForm.control} render={({ field }) => (
                    <TextField {...field} label="Employment No." type="number" size="small" fullWidth />
                  )} />
                </Box>
                <Controller name="basic_salary" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Basic Salary" type="number" size="small" fullWidth
                    InputProps={{ startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }} />
                )} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                  {[['epf_com_per','EPF Co.'],['epf_emp_per','EPF Emp.'],['etf_com_per','ETF Co.']].map(([n, l]) => (
                    <Controller key={n} name={n} control={editForm.control} render={({ field }) => (
                      <TextField {...field} label={l} type="number" size="small" fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
                    )} />
                  ))}
                </Box>
              </Stack>
            </Box>
          )}

          {editTab === 3 && (
            <Box>
              <SectionLabel icon={<FaceIcon />}>Reference Photo</SectionLabel>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                {editEmployee?.reference_photo ? (
                  <Avatar
                    src={`${BASE_URL}${editEmployee.reference_photo}`}
                    alt={editEmployee.fullname}
                    sx={{
                      width: 140,
                      height: 140,
                      border: 3,
                      borderColor: 'primary.light',
                      boxShadow: 3,
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 140,
                      height: 140,
                      bgcolor: 'grey.100',
                      color: 'text.disabled',
                      fontSize: '2.5rem',
                      border: 3,
                      borderColor: 'divider',
                    }}
                  >
                    <FaceIcon sx={{ fontSize: 48 }} />
                  </Avatar>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 3 }}>
                Used for face recognition at punch-in/out
              </Typography>

              <SectionLabel icon={<FaceIcon />}>Recent Punch Photos</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <PunchPhotoSlot
                  label="Punch In"
                  src={editEmployee?.punchin_selfie}
                  tone="success"
                />
                <PunchPhotoSlot
                  label="Punch Out"
                  src={editEmployee?.punchout_selfie}
                  tone="warning"
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                onClick={handleClearPhotos}
                variant="outlined"
                color="error"
                fullWidth
                disabled={clearingPhotos}
                startIcon={clearingPhotos ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}
              >
                {clearingPhotos ? 'Clearing…' : 'Clear All Photos'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                Removes reference photo and both punch selfies. Employee will need to re-register.
              </Typography>
            </Box>
          )}
        </Box>

        {editEmployee && (
          <Box sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              User Status
            </Typography>
            <EmployeeStatusControl
              employee={editEmployee}
              onChanged={(updated) => {
                setEditEmployee((prev) => prev ? { ...prev, is_active: updated.is_active } : prev);
                fetchEmployees(currentPage, search, includeInactive);
              }}
              dense
            />
          </Box>
        )}

        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50', flexShrink: 0, display: 'flex', gap: 1.5 }}>
          <Button onClick={() => setEditDrawerOpen(false)} variant="outlined" sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSave} variant="contained" disabled={editSaving}
            sx={{ flex: 2 }}
            startIcon={editSaving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
          >
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
