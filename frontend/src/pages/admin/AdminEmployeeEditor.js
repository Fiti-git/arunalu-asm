import React, { useState, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Tooltip, Typography,Paper
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useForm, Controller } from 'react-hook-form';
import api from 'utils/api';
import { useNavigate } from 'react-router-dom';


const initialEmployees = [];

export default function EmployeeGrid() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [openDialog, setOpenDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    try {
      const [employeesRes, outletsRes] = await Promise.all([
        api.get('/api/getemployees'),
        api.get('/api/outlets/')
      ]);

      const outletsMap = outletsRes.data.reduce((acc, outlet) => {
        acc[outlet.id] = outlet.name;
        return acc;
      }, {});

      const empList = Array.isArray(employeesRes.data) ? employeesRes.data : (employeesRes.data.results || []);
      const updatedEmployees = empList.map((employee) => {
        const outletNames = employee.outlets?.map((id) => outletsMap[id]) || ['Unknown'];
        return {
          ...employee,
          outlets: outletNames.join(', '),
          group: employee.groups.join(', ')
        };
      });

      setEmployees(updatedEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchEmployees();
        const [outletRes, groupsRes] = await Promise.all([
          api.get('/api/outlets/'),
          api.get('/api/groups/'),
        ]);
        setOutlets(outletRes.data);
        setGroups(groupsRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        alert('Error fetching employees, outlets, or groups');
      }
    };
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    reset({
      fullname: '',
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      date_of_birth: '',
      outlets: [],  // Empty outlet list for new employees
      group: '',    // Empty group for new employees
      password: '',
      cal_epf: true,    // Default value
      epf_cal_date: '',
      epf_grade: '',
      epf_number: '',
      employ_number: '',
      basic_salary: 0.0,
      epf_com_per: 12.0,
      epf_emp_per: 8.0,
      etf_com_per: 3.0,
      idnumber: ''
    });
    setEditEmployee(null);
    setOpenDialog(true); // Open the dialog
  };

  const { control, handleSubmit, reset, formState: { errors } } = useForm();

  const handleClose = () => {
    setOpenDialog(false);
    setEditEmployee(null);
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();

      // Add basic fields
      for (const key in data) {
        if (key === 'outlets') {
          data.outlets.forEach((id) => {
            formData.append('outlets', id); // Append each outlet ID to the form data
          });
        } else {
          formData.append(key, data[key]);
        }
      }

  

      // Submit the form data
      if (editEmployee) {
        // Update existing employee
        await api.put(`/api/editemployees/${editEmployee.employee_id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alert('Employee updated successfully!');
      } else {
        // Create new employee
        await api.post('/api/employees/create', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alert('Employee created successfully!');
      }

      // Re-fetch employees list after the operation
      await fetchEmployees();

      // Close the dialog after submission
      handleClose();
    } catch (err) {
      console.error('Error during employee creation/updating:', err);
      alert('There was an error while processing your request. Please try again.');
    }
  };

  const columns = [
    { field: 'fullname', headerName: 'User Name', flex: 1 },
    { field: 'first_name', headerName: 'Name', flex: 1 },
    { field: 'date_of_birth', headerName: 'DOB', flex: 1 },
    { field: 'outlets', headerName: 'Outlets', flex: 1 },
    { field: 'group', headerName: 'Role', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Edit',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Tooltip title="Edit"><EditIcon /></Tooltip>}
          label="Edit"
          onClick={() => {
            const prefilled = {
              ...params.row,
              outlets: outlets.filter(outlet =>
                params.row.outlets.split(', ').includes(outlet.name)
              ).map(o => o.id),
              group: groups.find(g => params.row.group.includes(g.name))?.id || '',
            };
            reset(prefilled);
            setEditEmployee(params.row);
            setOpenDialog(true);
            setPasswordError('');
          }}
        />,
      ],
    },
  ];

return (
  <Box
    sx={{
      width: '95%',
      mx: 'auto',
      mt: 4,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      textTransform: 'uppercase',
    }}
  >
    {/* Header Row */}
    <Box
  sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}
>
  <Typography
    variant="h4"
    sx={{
      fontWeight: 700,
      letterSpacing: 0.5,
      color: '#333',
    }}
  >
    Employees
  </Typography>

  {/* Buttons */}
  <Box sx={{ display: 'flex', gap: 2 }}>
    <Button
  variant="outlined"
  onClick={() => navigate('/employees/modify-reference-image')}
  sx={{
    textTransform: 'none',
    fontWeight: 600,
    borderRadius: '8px',
  }}
>
  Modify
</Button>


    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={handleOpenAdd}
      sx={{
        backgroundColor: '#1976d2',
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: '8px',
        '&:hover': {
          backgroundColor: '#1565c0',
        },
      }}
    >
      Add Employee
    </Button>
  </Box>
</Box>


    {/* Employee Table */}
    <Paper
      elevation={2}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <DataGrid
        rows={employees}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5, 10]}
        getRowId={(row) => row.employee_id}
        autoHeight
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f9fafb',
            fontWeight: 600,
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f5f5f5',
          },
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      />
    </Paper>

    {/* Dialog */}
    <Dialog
      open={openDialog}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #eee',
        }}
      >
        {editEmployee ? 'Edit Employee' : 'Add New Employee'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off">
        <DialogContent
          dividers
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            backgroundColor: '#fff',
          }}
        >
          {/* Core Fields */}
          {[
            ['fullname', 'User Name'],
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
                />
              )}
            />
          ))}

          {/* Conditional Password */}
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
                  error={!!passwordError || !!errors.password}
                  helperText={passwordError || errors.password?.message}
                  autoComplete="new-password"
                />
              )}
            />
          )}

          {/* Role & Outlets */}
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
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

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
                {outlets.map((outlet) => (
                  <MenuItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* EPF & Other Fields */}
          {[
            ['cal_epf', 'Calculate EPF', 'checkbox'],
            ['epf_cal_date', 'EPF Calculation Date', 'date'],
            ['epf_grade', 'EPF Grade'],
            ['epf_number', 'EPF Number'],
            ['employ_number', 'Employment Number'],
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
                />
              )}
            />
          ))}

          {!editEmployee && (
            <Controller
              name="idnumber"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="ID Number" fullWidth />
              )}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {editEmployee ? 'Save Changes' : 'Add Employee'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  </Box>
);

}
