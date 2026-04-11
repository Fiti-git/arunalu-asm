import React, { useState, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Tooltip, Typography
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from 'utils/api';

// Validation schema
const schema = yup.object({
  fullname: yup.string().required('Full name is required'),
  email: yup.string().email().required('Email is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  phone_number: yup.string(),
  date_of_birth: yup.string().required('Date of birth is required'),
  password: yup.string().required('Password is required'),
  outlets: yup.array().of(yup.string()).required('At least one outlet is required'),
  group: yup.string().required('Group is required'),
});

const initialEmployees = [];

export default function EmployeeGrid() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [openDialog, setOpenDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [groups, setGroups] = useState([]);

  const {
    control, handleSubmit, reset, formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fullname: '',
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      date_of_birth: '',
      outlets: [],
      group: '',
      password: '',
    },
  });

  const fetchEmployees = async () => {
    try {
      // Retrieve the outlet ID from localStorage
      const outletId = localStorage.getItem('outlet');

      if (!outletId) {
        console.error('Outlet ID not found in localStorage');
        return;
      }

      const [employeesRes, outletsRes] = await Promise.all([
        api.get('/api/getoutletemployees', {
          params: {
            outlet_id: outletId // Use the outletId from localStorage
          }
        }),
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
        const [outletsRes, groupsRes] = await Promise.all([
          api.get('/api/outlets/'),
          api.get('/api/groups/'),
        ]);
        setOutlets(outletsRes.data);
        setGroups(groupsRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        alert('Error fetching employees, outlets, or groups');
      }
    };
    fetchData();
  }, []);


  const handleClose = () => {
    setOpenDialog(false);
    setEditEmployee(null);
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'outlets') {
        value.forEach(outletId => formData.append('outlets[]', outletId));
      } else {
        formData.append(key, value);
      }
    });
    if (profilePhoto) {
      formData.append('profile_photo', profilePhoto);
    }

    try {
      if (editEmployee) {
        await api.put(`/api/editemployees/${editEmployee.employee_id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/api/employees/create', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      await fetchEmployees();
      handleClose();
    } catch (err) {
      console.error(err);
      alert('Error creating/updating employee');
    }
  };

  const columns = [
    { field: 'fullname', headerName: 'User Name', flex: 1 },
    { field: 'first_name', headerName: 'First Name', flex: 1 },
    { field: 'last_name', headerName: 'Last Name', flex: 1 },
    { field: 'date_of_birth', headerName: 'DOB', flex: 1 },
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
            setProfilePhoto(null);
            setEditEmployee(params.row);
            setOpenDialog(true);
          }}
        />,
      ],
    },


    /*{
      field: 'profile_photo',
      headerName: 'Photo',
      width: 100,
      renderCell: (params) =>
        typeof params.value === 'string' ? (
          <img src={params.value} alt="Profile" width={40} height={40} style={{ borderRadius: '50%' }} />
        ) : (
          'No Photo'
        ),
    },*/

  ];

  return (
    <Box sx={{ height: 600, width: '90%', mx: 'auto', mt: 5, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>EMPLOYEES</Typography>



      <DataGrid
        rows={employees}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5]}
        getRowId={(row) => row.employee_id}
      />

      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[['fullname', 'User Name'],
            ['email', 'Email'],
            ['first_name', 'First Name'],
            ['last_name', 'Last Name'],
            ['phone_number', 'Phone Number'],
            ['date_of_birth', 'Date of Birth', 'date'],
            ['password', 'Password', 'password']].map(([name, label, type = 'text']) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <TextField
                    label={label}
                    type={type}
                    fullWidth
                    error={!!errors[name]}
                    helperText={errors[name]?.message}
                    {...field}
                  />
                )}
              />
            ))}

            {/* Outlets Multi-Select */}
            <Controller
              name="outlets"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Outlets"
                  fullWidth
                  SelectProps={{
                    multiple: true
                  }}
                  error={!!errors.outlets}
                  helperText={errors.outlets?.message}
                  {...field}
                >
                  {outlets.map((outlet) => (
                    <MenuItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="group"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Role"
                  fullWidth
                  error={!!errors.group}
                  helperText={errors.group?.message}
                  {...field}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePhoto(e.target.files[0])}
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editEmployee ? 'Save' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
