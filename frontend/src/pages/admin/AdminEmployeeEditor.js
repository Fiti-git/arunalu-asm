import React, { useState, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Typography, Paper, Alert,
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from 'utils/api';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createSchema = yup.object({
  fullname: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  date_of_birth: yup.string().required('Date of birth is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  group: yup.mixed().required('Role is required').test('not-empty', 'Role is required', v => v !== '' && v !== null && v !== undefined),
});

const editSchema = yup.object({
  fullname: yup.string().required('Username is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  date_of_birth: yup.string().required('Date of birth is required'),
  email: yup.string().email('Invalid email address').optional(),
  password: yup.string().optional().test('min-len', 'Password must be at least 8 characters', v => !v || v.length >= 8),
});

// ---------------------------------------------------------------------------
// Default form values
// ---------------------------------------------------------------------------
const defaultValues = {
  fullname: '',
  email: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  date_of_birth: '',
  outlets: [],
  primary_outlet: '',
  group: '',
  password: '',
  cal_epf: true,
  epf_cal_date: '',
  epf_grade: '',
  epf_number: '',
  employ_number: '',
  basic_salary: '',
  epf_com_per: 12.0,
  epf_emp_per: 8.0,
  etf_com_per: 3.0,
  idnumber: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminEmployeeEditor() {
  const [employees, setEmployees] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [paginationModel, setPaginationModel] = useState({ pageSize: 50, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [serverError, setServerError] = useState('');

  // Resolve schema based on mode
  const schema = editEmployee ? editSchema : createSchema;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues, resolver: yupResolver(schema) });

  // Watch outlets selection to filter primary_outlet dropdown
  const watchedOutlets = watch('outlets');

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchEmployees = async (page = 0, pageSize = 50) => {
    try {
      const [empRes, outletRes] = await Promise.all([
        api.get('/api/v2/employees/', { params: { page: page + 1, page_size: pageSize } }),
        api.get('/api/outlets/'),
      ]);

      const outletsMap = outletRes.data.reduce((acc, o) => { acc[o.id] = o.name; return acc; }, {});

      let empList = [];
      let total = 0;
      if (Array.isArray(empRes.data)) {
        empList = empRes.data;
        total = empRes.data.length;
      } else if (empRes.data.results) {
        empList = empRes.data.results;
        total = empRes.data.count || empRes.data.results.length;
      }

      const mapped = empList.map(emp => ({
        ...emp,
        outlet_names: emp.outlets?.map(id => outletsMap[id] || 'Unknown').join(', ') || '—',
        primary_outlet_name: emp.primary_outlet ? (outletsMap[emp.primary_outlet] || 'Unknown') : '—',
        group: emp.groups?.join(', ') || '—',
      }));

      setEmployees(mapped);
      setTotalRows(total);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [outletRes, groupsRes] = await Promise.all([
          api.get('/api/outlets/'),
          api.get('/api/groups/'),
        ]);
        setOutlets(outletRes.data);
        setGroups(groupsRes.data);
      } catch (err) {
        console.error('Failed to fetch outlets/groups:', err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchEmployees(paginationModel.page, paginationModel.pageSize);
  }, [paginationModel]);

  // ---------------------------------------------------------------------------
  // Dialog handlers
  // ---------------------------------------------------------------------------
  const handleOpenAdd = () => {
    setEditEmployee(null);
    setServerError('');
    reset({ ...defaultValues });
    setOpenDialog(true);
  };

  const handleOpenEdit = (row) => {
    setEditEmployee(row);
    setServerError('');
    reset({
      ...defaultValues,
      fullname: row.fullname || '',
      email: row.email || '',
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      phone_number: row.phone_number || '',
      date_of_birth: row.date_of_birth || '',
      outlets: Array.isArray(row.outlets) ? row.outlets : [],
      primary_outlet: row.primary_outlet || '',
      group: groups.find(g => row.group?.includes(g.name))?.id || '',
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
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setEditEmployee(null);
    setServerError('');
  };

  // ---------------------------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------------------------
  const onSubmit = async (data) => {
    setServerError('');
    try {
      const formData = new FormData();

      for (const key in data) {
        if (key === 'outlets') {
          (data.outlets || []).forEach(id => formData.append('outlets', id));
        } else if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      }

      if (editEmployee) {
        await api.put(`/api/v2/employees/${editEmployee.employee_id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/api/v2/employees/create/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await fetchEmployees(paginationModel.page, paginationModel.pageSize);
      handleClose();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([field, msg]) => {
          if (field === 'non_field') {
            setServerError(msg);
          } else {
            setError(field, { message: msg });
          }
        });
      } else {
        setServerError('An unexpected error occurred. Please try again.');
        console.error('Employee save error:', err);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // DataGrid columns
  // ---------------------------------------------------------------------------
  const columns = [
    { field: 'fullname', headerName: 'Username', flex: 1 },
    { field: 'first_name', headerName: 'First Name', flex: 1 },
    { field: 'date_of_birth', headerName: 'DOB', flex: 1 },
    { field: 'outlet_names', headerName: 'Outlets', flex: 1.5 },
    { field: 'primary_outlet_name', headerName: 'Primary Outlet', flex: 1 },
    { field: 'group', headerName: 'Role', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Edit',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpenEdit(params.row)}
        />,
      ],
    },
  ];

  // Outlets available for primary_outlet — only those currently selected
  const primaryOutletOptions = outlets.filter(o =>
    Array.isArray(watchedOutlets) && watchedOutlets.map(Number).includes(o.id)
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: 0.5, color: '#333', textTransform: 'uppercase' }}>
          Employees
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{
            backgroundColor: '#1976d2',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '8px',
            '&:hover': { backgroundColor: '#1565c0' },
          }}
        >
          Add Employee
        </Button>
      </Box>

      {/* Table */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <DataGrid
          rows={employees}
          columns={columns}
          rowCount={totalRows}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[50, 100]}
          getRowId={(row) => row.employee_id}
          autoHeight
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f9fafb', fontWeight: 600 },
            '& .MuiDataGrid-row:hover': { backgroundColor: '#f5f5f5' },
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        />
      </Paper>

      {/* Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, backgroundColor: '#f9fafb', borderBottom: '1px solid #eee' }}>
          {editEmployee ? 'Edit Employee' : 'Add New Employee'}
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off">
          <DialogContent
            dividers
            sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, backgroundColor: '#fff' }}
          >
            {serverError && (
              <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{serverError}</Alert>
            )}

            {/* Core text fields */}
            {[
              ['fullname', 'Username'],
              ['email', 'Email'],
              ['first_name', 'First Name'],
              ['last_name', 'Last Name'],
              ['phone_number', 'Phone Number'],
              ['date_of_birth', 'Date of Birth', 'date'],
            ].map(([name, label, type = 'text']) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={label}
                    type={type}
                    variant="outlined"
                    fullWidth
                    error={!!errors[name]}
                    helperText={errors[name]?.message}
                    autoComplete="off"
                    InputLabelProps={type === 'date' ? { shrink: true } : undefined}
                  />
                )}
              />
            ))}

            {/* Password — create only */}
            {!editEmployee && (
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    autoComplete="new-password"
                  />
                )}
              />
            )}

            {/* Role */}
            <Controller
              name="group"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Role"
                  fullWidth
                  variant="outlined"
                  error={!!errors.group}
                  helperText={errors.group?.message}
                >
                  {groups.map(g => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Outlets (multi-select) */}
            <Controller
              name="outlets"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Outlets"
                  fullWidth
                  variant="outlined"
                  SelectProps={{ multiple: true }}
                  error={!!errors.outlets}
                  helperText={errors.outlets?.message}
                >
                  {outlets.map(o => (
                    <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Primary Outlet — filtered to selected outlets */}
            <Controller
              name="primary_outlet"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Primary Outlet"
                  fullWidth
                  variant="outlined"
                  error={!!errors.primary_outlet}
                  helperText={errors.primary_outlet?.message || 'Main outlet for attendance monitoring'}
                >
                  <MenuItem value="">— None —</MenuItem>
                  {primaryOutletOptions.map(o => (
                    <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* EPF & salary fields */}
            {[
              ['cal_epf', 'Calculate EPF', 'checkbox'],
              ['epf_cal_date', 'EPF Calculation Date', 'date'],
              ['epf_grade', 'EPF Grade'],
              ['epf_number', 'EPF Number'],
              ['employ_number', 'Employment Number', 'number'],
              ['basic_salary', 'Basic Salary', 'number'],
              ['epf_com_per', 'EPF Company %', 'number'],
              ['epf_emp_per', 'EPF Employee %', 'number'],
              ['etf_com_per', 'ETF Company %', 'number'],
            ].map(([name, label, type = 'text']) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={label}
                    type={type}
                    fullWidth
                    variant="outlined"
                    error={!!errors[name]}
                    helperText={errors[name]?.message}
                    InputLabelProps={type === 'date' ? { shrink: true } : undefined}
                  />
                )}
              />
            ))}

            {/* ID Number — create only */}
            {!editEmployee && (
              <Controller
                name="idnumber"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="ID Number" fullWidth variant="outlined" />
                )}
              />
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: '8px' }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {isSubmitting ? 'Saving…' : editEmployee ? 'Save Changes' : 'Add Employee'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
