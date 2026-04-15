import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Drawer, TextField, MenuItem, Typography,
  Alert, Divider, Switch, FormControlLabel, InputAdornment,
  IconButton, Avatar, Chip, Tabs, Tab, Stepper, Step, StepLabel,
  DialogContent, DialogActions, Tooltip, Dialog,
  CircularProgress, Stack, Pagination, InputBase,
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
import SearchIcon from '@mui/icons-material/Search';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from 'utils/api';

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getInitials = (name) =>
  (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const getAvatarColor = (name) => {
  const colors = ['#3b5bdb','#0c8599','#2f9e44','#e67700','#c92a2a','#5f3dc4','#1864ab','#862e9c'];
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

// ─── Employee Card ────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onEdit }) {
  const color = getAvatarColor(emp.fullname);
  const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.fullname;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: '1px solid #ebebeb',
        borderRadius: 3,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'box-shadow 0.18s, transform 0.18s',
        '&:hover': {
          boxShadow: '0 6px 24px rgba(0,0,0,0.09)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Top row: avatar + edit button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Avatar
          src={emp.reference_photo ? `${BASE_URL}${emp.reference_photo}` : undefined}
          sx={{
            width: 48, height: 48, bgcolor: color,
            fontWeight: 700, fontSize: '1.1rem', letterSpacing: 0.5,
          }}
        >
          {getInitials(emp.fullname)}
        </Avatar>
        <Tooltip title="Edit employee">
          <IconButton
            size="small"
            onClick={() => onEdit(emp)}
            sx={{
              border: '1px solid #ebebeb',
              borderRadius: 2,
              color: '#888',
              '&:hover': { bgcolor: '#e3f2fd', color: '#1976d2', borderColor: '#90caf9' },
            }}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Name */}
      <Box>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          color="#111"
          sx={{ lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {name}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
        >
          @{emp.fullname}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#f5f5f5' }} />

      {/* DOB */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
        <CakeOutlinedIcon sx={{ fontSize: 14, color: '#bbb' }} />
        <Typography variant="caption" color="text.secondary">
          {emp.date_of_birth || '—'}
        </Typography>
      </Box>

      {/* Role */}
      {emp.group_name && emp.group_name !== '—' && (
        <Chip
          label={emp.group_name}
          size="small"
          sx={{ alignSelf: 'flex-start', bgcolor: '#e8f4fd', color: '#1565c0', fontWeight: 600, fontSize: '0.72rem', height: 22 }}
        />
      )}

      {/* Outlets */}
      {emp.outlet_names?.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {emp.outlet_names.slice(0, 2).map(n => (
            <Chip key={n} label={n} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20, borderColor: '#ddd', color: '#555' }} />
          ))}
          {emp.outlet_names.length > 2 && (
            <Chip label={`+${emp.outlet_names.length - 2}`} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#f5f5f5', color: '#777' }} />
          )}
        </Box>
      )}

      {/* Primary outlet */}
      {emp.primary_outlet_name && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2e7d32', flexShrink: 0 }} />
          <Typography variant="caption" color="#2e7d32" fontWeight={600}>
            {emp.primary_outlet_name}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminEmployeeEditor() {
  const [employees, setEmployees] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const createForm = useForm({ defaultValues, resolver: yupResolver(step1Schema) });
  const editForm = useForm({ defaultValues, resolver: yupResolver(editSchema) });
  const watchedCreateOutlets = createForm.watch('outlets');
  const watchedEditOutlets = editForm.watch('outlets');

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async (page = 1, q = '') => {
    setLoading(true);
    try {
      const [empRes, outletRes] = await Promise.all([
        api.get('/api/v2/employees/', { params: { page, page_size: 24, ...(q ? { search: q } : {}) } }),
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
      setTotalPages(empRes.data.total_pages || Math.ceil((empRes.data.count || empList.length) / 24));
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111" sx={{ letterSpacing: '-0.3px' }}>
            Employees
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Loading…' : `${totalCount} employees`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {/* Search */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 2,
            px: 1.5, py: 0.6,
            '&:focus-within': { borderColor: '#1976d2', boxShadow: '0 0 0 2px rgba(25,118,210,0.12)' },
          }}>
            <SearchIcon sx={{ fontSize: 18, color: '#bbb' }} />
            <InputBase
              placeholder="Search employees…"
              value={search}
              onChange={handleSearchChange}
              sx={{ fontSize: '0.85rem', width: 200 }}
            />
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: '10px',
              px: 2.5, py: 1, bgcolor: '#1976d2',
              boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
              '&:hover': { bgcolor: '#1565c0' },
            }}
          >
            Add Employee
          </Button>
        </Box>
      </Box>

      {/* ── Card Grid ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={32} sx={{ color: '#1976d2' }} />
        </Box>
      ) : employees.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <PersonOutlineIcon sx={{ fontSize: 52, color: '#ddd', mb: 1 }} />
          <Typography color="text.secondary">No employees found</Typography>
        </Box>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}>
          {employees.map(emp => (
            <EmployeeCard key={emp.employee_id} emp={emp} onEdit={openEdit} />
          ))}
        </Box>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 2 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, p) => { setCurrentPage(p); window.scrollTo(0, 0); }}
            shape="rounded"
            color="primary"
            size="medium"
          />
        </Box>
      )}

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
                  <Typography variant="caption" fontWeight={activeStep === i ? 700 : 400}
                    color={activeStep === i ? '#1976d2' : 'text.secondary'}>
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
            <Button startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(s => s - 1)} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>
              Back
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', color: '#666' }}>Cancel</Button>
          {activeStep < 2 ? (
            <Button endIcon={<ArrowForwardIcon />} onClick={handleNextStep} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3 }}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleCreateSubmit} variant="contained" disabled={createSubmitting}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
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
        <Box sx={{ px: 3, py: 2.5, bgcolor: '#f9fafb', borderBottom: '1px solid #ebebeb', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 44, height: 44, fontWeight: 700, fontSize: '1rem', bgcolor: getAvatarColor(editEmployee?.fullname || '') }}>
              {getInitials(editEmployee?.fullname || '')}
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

        <Tabs
          value={editTab}
          onChange={(_, v) => setEditTab(v)}
          sx={{
            px: 2, borderBottom: '1px solid #ebebeb', flexShrink: 0,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', minWidth: 0, px: 2 },
          }}
        >
          <Tab label="Personal" icon={<PersonOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Work" icon={<WorkOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="EPF & Pay" icon={<AccountBalanceIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {editError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{editError}</Alert>}

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
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: '1px solid #ebebeb', bgcolor: '#f9fafb', flexShrink: 0, display: 'flex', gap: 1.5 }}>
          <Button onClick={() => setEditDrawerOpen(false)} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', flex: 1 }}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSave} variant="contained" disabled={editSaving}
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
