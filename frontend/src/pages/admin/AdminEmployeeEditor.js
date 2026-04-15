import React, { useState, useEffect } from 'react';
import {
  Box, Button, Drawer, TextField, MenuItem, Typography, Paper,
  Alert, Divider, Switch, FormControlLabel, InputAdornment,
  IconButton, Avatar, Chip, Tabs, Tab, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  CircularProgress, Stack,
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
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from 'utils/api';

// ─── Validation ──────────────────────────────────────────────────────────────
const step1Schema = yup.object({
  fullname: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Min 8 characters').required('Password is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  date_of_birth: yup.string().required('Date of birth is required'),
});

const step2Schema = yup.object({
  group: yup.mixed().required('Role is required').test('not-empty', 'Role is required', v => !!v),
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const initials = (name) =>
  (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const avatarColor = (name) => {
  const colors = ['#3b5bdb','#0c8599','#2f9e44','#e67700','#c92a2a','#5f3dc4','#1864ab'];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (name.charCodeAt(i) + h * 31) % colors.length;
  return colors[h];
};

function SectionLabel({ icon, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
      <Box sx={{ color: '#1976d2', display: 'flex' }}>{icon}</Box>
      <Typography variant="overline" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.72rem', letterSpacing: 1.5 }}>
        {children}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: '#e8e8e8', ml: 1 }} />
    </Box>
  );
}

function FieldRow({ children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
      {children}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminEmployeeEditor() {
  const [employees, setEmployees] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [paginationModel, setPaginationModel] = useState({ pageSize: 50, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);

  // Create wizard state
  const [createOpen, setCreateOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [createError, setCreateError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Edit drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editTab, setEditTab] = useState(0);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Separate forms for create and edit
  const createForm = useForm({ defaultValues, resolver: yupResolver(step1Schema) });
  const editForm = useForm({ defaultValues, resolver: yupResolver(editSchema) });

  const watchedCreateOutlets = createForm.watch('outlets');
  const watchedEditOutlets = editForm.watch('outlets');

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchEmployees = async (page = 0, pageSize = 50) => {
    setLoading(true);
    try {
      const [empRes, outletRes] = await Promise.all([
        api.get('/api/v2/employees/', { params: { page: page + 1, page_size: pageSize } }),
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
      setTotalRows(empRes.data.count || empList.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.get('/api/outlets/'), api.get('/api/groups/')])
      .then(([o, g]) => { setOutlets(o.data); setGroups(g.data); });
  }, []);

  useEffect(() => {
    fetchEmployees(paginationModel.page, paginationModel.pageSize);
  }, [paginationModel]);

  // ─── Create wizard ────────────────────────────────────────────────────────
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
    else if (activeStep === 1) valid = await createForm.trigger(['group']);
    else valid = true;
    if (valid) setActiveStep(s => s + 1);
  };

  const handleCreateSubmit = async () => {
    setCreateError('');
    const data = createForm.getValues();
    try {
      const formData = new FormData();
      for (const key in data) {
        if (key === 'outlets') {
          (data.outlets || []).forEach(id => formData.append('outlets', id));
        } else if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      }
      await api.post('/api/v2/employees/create/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCreateOpen(false);
      fetchEmployees(paginationModel.page, paginationModel.pageSize);
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([f, m]) => {
          if (f === 'non_field') setCreateError(m);
          else createForm.setError(f, { message: m });
        });
        // Go back to the step that has the error
        const step1Fields = ['fullname','email','password','first_name','last_name','date_of_birth','idnumber'];
        const step2Fields = ['group','outlets','primary_outlet'];
        const errFields = Object.keys(serverErrors);
        if (errFields.some(f => step1Fields.includes(f))) setActiveStep(0);
        else if (errFields.some(f => step2Fields.includes(f))) setActiveStep(1);
      } else {
        setCreateError('An unexpected error occurred. Please try again.');
      }
    }
  };

  // ─── Edit drawer ──────────────────────────────────────────────────────────
  const openEdit = (row) => {
    setEditEmployee(row);
    setEditTab(0);
    setEditError('');
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
        if (key === 'outlets') {
          (data.outlets || []).forEach(id => formData.append('outlets', id));
        } else if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      }
      await api.put(`/api/v2/employees/${editEmployee.employee_id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditDrawerOpen(false);
      fetchEmployees(paginationModel.page, paginationModel.pageSize);
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([f, m]) => {
          if (f === 'non_field') setEditError(m);
          else editForm.setError(f, { message: m });
        });
      } else {
        setEditError('An unexpected error occurred.');
      }
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Table columns ────────────────────────────────────────────────────────
  const columns = [
    {
      field: 'fullname',
      headerName: 'Employee',
      flex: 1.5,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: avatarColor(p.row.fullname), fontSize: '0.8rem', fontWeight: 700 }}>
            {initials(p.row.fullname)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{p.row.fullname}</Typography>
            <Typography variant="caption" color="text.secondary">{p.row.email || '—'}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'group_name',
      headerName: 'Role',
      flex: 0.8,
      renderCell: (p) => (
        p.row.group_name !== '—'
          ? <Chip label={p.row.group_name} size="small" sx={{ bgcolor: '#e8f4fd', color: '#1565c0', fontWeight: 600, fontSize: '0.72rem' }} />
          : <Typography variant="caption" color="text.disabled">—</Typography>
      ),
    },
    {
      field: 'outlet_names',
      headerName: 'Outlets',
      flex: 1.5,
      renderCell: (p) => {
        const names = p.row.outlet_names || [];
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
            {names.slice(0, 2).map(n => (
              <Chip key={n} label={n} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
            ))}
            {names.length > 2 && (
              <Typography variant="caption" color="text.secondary">+{names.length - 2}</Typography>
            )}
            {names.length === 0 && <Typography variant="caption" color="text.disabled">—</Typography>}
          </Box>
        );
      },
    },
    {
      field: 'primary_outlet_name',
      headerName: 'Primary Outlet',
      flex: 1,
      renderCell: (p) => (
        p.row.primary_outlet_name
          ? <Chip label={p.row.primary_outlet_name} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, fontSize: '0.72rem' }} />
          : <Typography variant="caption" color="text.disabled">—</Typography>
      ),
    },
    {
      field: 'date_of_birth',
      headerName: 'DOB',
      flex: 0.8,
      renderCell: (p) => <Typography variant="body2" color="text.secondary">{p.row.date_of_birth || '—'}</Typography>,
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (p) => (
        <Tooltip title="Edit employee">
          <IconButton size="small" onClick={() => openEdit(p.row)} sx={{ color: '#666', '&:hover': { color: '#1976d2', bgcolor: '#e3f2fd' } }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

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

      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111" sx={{ letterSpacing: '-0.3px' }}>
            Employees
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage employee accounts, roles, and outlet assignments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: '10px',
            px: 3, py: 1.1, bgcolor: '#1976d2',
            boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
            '&:hover': { bgcolor: '#1565c0', boxShadow: '0 4px 12px rgba(25,118,210,0.4)' },
          }}
        >
          Add Employee
        </Button>
      </Box>

      {/* ── Table ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #ebebeb', overflow: 'hidden' }}>
        <DataGrid
          rows={employees}
          columns={columns}
          rowCount={totalRows}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[50, 100]}
          getRowId={(r) => r.employee_id}
          loading={loading}
          rowHeight={56}
          autoHeight
          disableColumnMenu
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#f9fafb', borderBottom: '1px solid #ebebeb' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #f5f5f5' },
            '& .MuiDataGrid-row:hover': { bgcolor: '#fafafa' },
            '& .MuiDataGrid-footerContainer': { borderTop: '1px solid #ebebeb' },
          }}
        />
      </Paper>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CREATE — Stepper Dialog                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' } }}
      >
        {/* Dialog Header */}
        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>New Employee</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                Step {activeStep + 1} of 3 — {['Account & Personal', 'Work Assignment', 'EPF & Salary'][activeStep]}
              </Typography>
            </Box>
            <IconButton onClick={() => setCreateOpen(false)} size="small" sx={{ color: '#999', mt: -0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Stepper */}
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
                      bgcolor: activeStep > i ? '#2e7d32' : activeStep === i ? '#1976d2' : '#e8e8e8',
                      color: activeStep >= i ? '#fff' : '#999',
                      transition: 'all 0.2s',
                    }}>
                      {activeStep > i ? <CheckIcon sx={{ fontSize: 16 }} /> : s.icon}
                    </Box>
                  )}
                >
                  <Typography variant="caption" fontWeight={activeStep === i ? 700 : 400} color={activeStep === i ? '#1976d2' : 'text.secondary'}>
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

          {/* Step 1 — Personal */}
          {activeStep === 0 && (
            <Box>
              <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Account</SectionLabel>
              <FieldRow>
                <Controller name="fullname" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Username *" size="small" fullWidth error={!!createErrors.fullname} helperText={createErrors.fullname?.message || 'Used to log in'} autoComplete="off" />
                )} />
                <Controller name="email" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Email *" type="email" size="small" fullWidth error={!!createErrors.email} helperText={createErrors.email?.message} autoComplete="off" />
                )} />
              </FieldRow>
              <Box sx={{ mb: 2 }}>
                <Controller name="password" control={createForm.control} render={({ field }) => (
                  <TextField
                    {...field} label="Password *" type={showPassword ? 'text' : 'password'} size="small" fullWidth
                    error={!!createErrors.password} helperText={createErrors.password?.message || 'Minimum 8 characters'}
                    autoComplete="new-password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(p => !p)} size="small" edge="end" tabIndex={-1}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )} />
              </Box>

              <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Personal Details</SectionLabel>
              <FieldRow>
                <Controller name="first_name" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="First Name *" size="small" fullWidth error={!!createErrors.first_name} helperText={createErrors.first_name?.message} />
                )} />
                <Controller name="last_name" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Last Name *" size="small" fullWidth error={!!createErrors.last_name} helperText={createErrors.last_name?.message} />
                )} />
              </FieldRow>
              <FieldRow>
                <Controller name="phone_number" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Phone Number" size="small" fullWidth />
                )} />
                <Controller name="date_of_birth" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Date of Birth *" type="date" size="small" fullWidth error={!!createErrors.date_of_birth} helperText={createErrors.date_of_birth?.message} InputLabelProps={{ shrink: true }} />
                )} />
              </FieldRow>
              <Box sx={{ mb: 1 }}>
                <Controller name="idnumber" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="ID Number" size="small" sx={{ width: '50%', pr: 1 }} />
                )} />
              </Box>
            </Box>
          )}

          {/* Step 2 — Work */}
          {activeStep === 1 && (
            <Box>
              <SectionLabel icon={<WorkOutlineIcon sx={{ fontSize: 18 }} />}>Work Assignment</SectionLabel>
              <Box sx={{ mb: 2 }}>
                <Controller name="group" control={createForm.control} render={({ field }) => (
                  <TextField {...field} select label="Role *" size="small" fullWidth error={!!createErrors.group} helperText={createErrors.group?.message || 'Assign an access role'}>
                    {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                  </TextField>
                )} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Controller name="outlets" control={createForm.control} render={({ field }) => (
                  <TextField {...field} select label="Outlets" size="small" fullWidth SelectProps={{ multiple: true }} helperText="Employee can attend multiple outlets">
                    {outlets.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                  </TextField>
                )} />
              </Box>
              <Box sx={{ mb: 1 }}>
                <Controller name="primary_outlet" control={createForm.control} render={({ field }) => (
                  <TextField {...field} select label="Primary Outlet" size="small" fullWidth helperText="Main outlet for attendance monitoring">
                    <MenuItem value="">— None —</MenuItem>
                    {primaryOutletOptionsCreate.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                  </TextField>
                )} />
              </Box>
            </Box>
          )}

          {/* Step 3 — EPF */}
          {activeStep === 2 && (
            <Box>
              <SectionLabel icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />}>EPF & Salary</SectionLabel>
              <Box sx={{ mb: 2 }}>
                <Controller name="cal_epf" control={createForm.control} render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} size="small" color="primary" />}
                    label={<Typography variant="body2" fontWeight={500}>Calculate EPF for this employee</Typography>}
                  />
                )} />
              </Box>
              <FieldRow>
                <Controller name="epf_cal_date" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="EPF Calculation Date" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} />
                )} />
                <Controller name="epf_grade" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="EPF Grade" size="small" fullWidth />
                )} />
              </FieldRow>
              <FieldRow>
                <Controller name="epf_number" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="EPF Number" size="small" fullWidth />
                )} />
                <Controller name="employ_number" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Employment Number" type="number" size="small" fullWidth />
                )} />
              </FieldRow>
              <Box sx={{ mb: 2 }}>
                <Controller name="basic_salary" control={createForm.control} render={({ field }) => (
                  <TextField {...field} label="Basic Salary" type="number" size="small" sx={{ width: '50%', pr: 1 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }} />
                )} />
              </Box>
              <FieldRow>
                {[['epf_com_per','EPF Company'],['epf_emp_per','EPF Employee'],['etf_com_per','ETF Company']].map(([n, l]) => (
                  <Controller key={n} name={n} control={createForm.control} render={({ field }) => (
                    <TextField {...field} label={l} type="number" size="small" fullWidth
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
                  )} />
                ))}
              </FieldRow>
            </Box>
          )}
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          {activeStep > 0 && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => setActiveStep(s => s - 1)}
              variant="outlined"
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              Back
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', color: '#666' }}>
            Cancel
          </Button>
          {activeStep < 2 ? (
            <Button
              endIcon={<ArrowForwardIcon />}
              onClick={handleNextStep}
              variant="contained"
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3 }}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleCreateSubmit}
              variant="contained"
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
              startIcon={<CheckIcon />}
            >
              Create Employee
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
        PaperProps={{
          sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' },
        }}
      >
        {/* Drawer Header */}
        <Box sx={{ px: 3, py: 2.5, bgcolor: '#f9fafb', borderBottom: '1px solid #ebebeb', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 44, height: 44, fontWeight: 700, fontSize: '1rem',
                bgcolor: avatarColor(editEmployee?.fullname || ''),
              }}
            >
              {initials(editEmployee?.fullname || '')}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} color="#111">{editEmployee?.fullname}</Typography>
              <Typography variant="caption" color="text.secondary">{editEmployee?.email || 'No email'}</Typography>
            </Box>
            <IconButton onClick={() => setEditDrawerOpen(false)} size="small" sx={{ color: '#999' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={editTab}
          onChange={(_, v) => setEditTab(v)}
          sx={{
            px: 2,
            borderBottom: '1px solid #ebebeb',
            flexShrink: 0,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', minWidth: 0, px: 2 },
          }}
        >
          <Tab label="Personal" icon={<PersonOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Work" icon={<WorkOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="EPF & Pay" icon={<AccountBalanceIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {/* Drawer Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {editError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{editError}</Alert>}

          {/* Tab 0 — Personal */}
          {editTab === 0 && (
            <Box>
              <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Account</SectionLabel>
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Controller name="fullname" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Username *" size="small" fullWidth error={!!editErrors.fullname} helperText={editErrors.fullname?.message} />
                )} />
                <Controller name="email" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Email" type="email" size="small" fullWidth error={!!editErrors.email} helperText={editErrors.email?.message} />
                )} />
                <Controller name="password" control={editForm.control} render={({ field }) => (
                  <TextField
                    {...field} label="New Password" type={showPassword ? 'text' : 'password'} size="small" fullWidth
                    error={!!editErrors.password} helperText={editErrors.password?.message || 'Leave blank to keep current password'}
                    autoComplete="new-password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(p => !p)} size="small" edge="end" tabIndex={-1}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
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

          {/* Tab 1 — Work */}
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

          {/* Tab 2 — EPF */}
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
        </Box>

        {/* Drawer Footer */}
        <Box sx={{ px: 3, py: 2, borderTop: '1px solid #ebebeb', bgcolor: '#f9fafb', flexShrink: 0, display: 'flex', gap: 1.5 }}>
          <Button
            onClick={() => setEditDrawerOpen(false)}
            variant="outlined"
            sx={{ borderRadius: '8px', textTransform: 'none', flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={editSaving}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, flex: 2 }}
            startIcon={editSaving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
          >
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
