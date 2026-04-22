import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Drawer, TextField, MenuItem, Typography,
  Alert, Divider, Switch, FormControlLabel, InputAdornment,
  IconButton, Avatar, Tabs, Tab, Stepper, Step, StepLabel,
  DialogContent, DialogActions, Tooltip, Dialog,
  CircularProgress, Stack, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
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
import { PageHeader, SectionLabel, SearchInput } from 'components/ui';
import { pickAvatarColor } from 'theme/tokens';

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
    field: 'name',
    headerName: 'Employee',
    flex: 1.6,
    minWidth: 240,
    sortable: true,
    valueGetter: (_, row) =>
      `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.fullname,
    renderCell: ({ row, value }) => (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
          height: '100%',
          py: 1,
        }}
      >
        <Avatar
          src={row.reference_photo ? `${BASE_URL}${row.reference_photo}` : undefined}
          sx={{
            width: 40, height: 40, flexShrink: 0,
            bgcolor: pickAvatarColor(row.fullname),
            fontWeight: 700, fontSize: '0.9rem',
          }}
        >
          {getInitials(row.fullname)}
        </Avatar>
        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.3 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ lineHeight: 1.3 }}
            title={value}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ lineHeight: 1.3 }}
          >
            @{row.fullname}
          </Typography>
        </Box>
      </Box>
    ),
  },
  {
    field: 'group_name',
    headerName: 'Role',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ value }) =>
      value && value !== '—'
        ? <Chip label={value} size="small" variant="outlined" />
        : <Dash />,
  },
  {
    field: 'email',
    headerName: 'Email',
    flex: 1.2,
    minWidth: 180,
    renderCell: ({ value }) => (
      <Typography variant="body2" color="text.secondary" noWrap>{value || '—'}</Typography>
    ),
  },
  {
    field: 'phone_number',
    headerName: 'Phone',
    flex: 0.8,
    minWidth: 130,
    renderCell: ({ value }) => (
      <Typography variant="body2" color="text.secondary" noWrap>{value || '—'}</Typography>
    ),
  },
  {
    field: 'date_of_birth',
    headerName: 'Date of Birth',
    flex: 0.8,
    minWidth: 130,
    renderCell: ({ value }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, height: '100%' }}>
        <CakeOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.secondary">{value || '—'}</Typography>
      </Box>
    ),
  },
  {
    field: 'idnumber',
    headerName: 'ID Number',
    flex: 0.8,
    minWidth: 130,
    renderCell: ({ value }) => (
      <Typography variant="caption" color="text.secondary">{value || '—'}</Typography>
    ),
  },
  {
    field: 'outlet_names',
    headerName: 'Outlets',
    flex: 1.2,
    minWidth: 180,
    sortable: false,
    renderCell: ({ value }) =>
      value?.length > 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, height: '100%', minWidth: 0 }}>
          <LocationOnOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary" noWrap>
            {value.slice(0, 2).join(', ')}
            {value.length > 2 && ` +${value.length - 2}`}
          </Typography>
        </Box>
      ) : <Dash />,
  },
  {
    field: 'primary_outlet_name',
    headerName: 'Primary Outlet',
    flex: 1,
    minWidth: 150,
    renderCell: ({ value }) =>
      value ? (
        <Chip
          label={value}
          size="small"
          sx={{ bgcolor: 'success.light', color: 'success.dark', fontWeight: 600 }}
        />
      ) : <Dash />,
  },
  {
    field: 'employ_number',
    headerName: 'Emp. No.',
    flex: 0.6,
    minWidth: 100,
    renderCell: ({ value }) => (
      <Typography variant="caption" color="text.secondary">{value || '—'}</Typography>
    ),
  },
  {
    field: 'epf_number',
    headerName: 'EPF No.',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ value }) => (
      <Typography variant="caption" color="text.secondary">{value || '—'}</Typography>
    ),
  },
  {
    field: 'basic_salary',
    headerName: 'Basic Salary',
    flex: 0.8,
    minWidth: 130,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ value }) => (
      <Typography variant="caption" color="text.secondary">
        {value ? `Rs. ${Number(value).toLocaleString()}` : '—'}
      </Typography>
    ),
  },
  {
    field: 'cal_epf',
    headerName: 'Calc EPF',
    flex: 0.6,
    minWidth: 100,
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ value }) => (
      <Chip
        label={value ? 'Yes' : 'No'}
        size="small"
        color={value ? 'success' : 'default'}
        variant="outlined"
      />
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    flex: 0.5,
    minWidth: 80,
    sortable: false,
    filterable: false,
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ row }) => (
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
  const [totalCount, setTotalCount] = useState(0);
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
  const fetchEmployees = useCallback(async (page = 1, q = '') => {
    setLoading(true);
    try {
      const [empRes, outletRes] = await Promise.all([
        api.get('/api/v2/employees/', { params: { page, page_size: 25, ...(q ? { search: q } : {}) } }),
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
    fetchEmployees(currentPage, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search is debounced via handleSearchChange; pagination must preserve current search value
  }, [currentPage, fetchEmployees]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      fetchEmployees(1, val);
    }, 300);
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
    setCreateSubmitting(true);
    const data = createForm.getValues();
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
        if (Object.keys(serverErrors).some(f => step1Fields.includes(f))) setActiveStep(0);
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
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add Employee
            </Button>
          </>
        }
      />

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          height: 'calc(100vh - 220px)',
          minHeight: 560,
        }}
      >
        <DataGrid
          rows={employees}
          columns={buildColumns(openEdit)}
          getRowId={(row) => row.employee_id}
          loading={loading}
          rowHeight={72}
          columnHeaderHeight={52}
          disableRowSelectionOnClick
          paginationMode="server"
          rowCount={totalCount}
          paginationModel={{ page: currentPage - 1, pageSize: 25 }}
          onPaginationModelChange={(model) => setCurrentPage(model.page + 1)}
          pageSizeOptions={[25]}
          sx={{
            border: 0,
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'grey.50' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
              py: 0.5,
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
            '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
            '& .MuiDataGrid-row': { alignItems: 'center' },
          }}
          slots={{
            noRowsOverlay: () => (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <PersonOutlineIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">No employees found</Typography>
              </Box>
            ),
          }}
        />
      </Box>

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
                  <TextField {...field} select label="Outlets" size="small" fullWidth SelectProps={{ multiple: true }} helperText="Employee can attend multiple outlets">
                    {outlets.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                  </TextField>
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
                    <TextField {...field} label="Employment Number" type="number" size="small" fullWidth />
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
                  <TextField {...field} select label="Outlets" size="small" fullWidth SelectProps={{ multiple: true }} helperText="Select all outlets this employee can attend">
                    {outlets.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                  </TextField>
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
