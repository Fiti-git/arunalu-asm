import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Tooltip, Typography, IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from 'utils/api';
import { DataTable, applyClientFilters } from 'components/ui';

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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

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

  const handleEditClick = (row) => {
    const prefilled = {
      ...row,
      outlets: outlets.filter((outlet) =>
        row.outlets.split(', ').includes(outlet.name)
      ).map((o) => o.id),
      group: groups.find((g) => row.group.includes(g.name))?.id || '',
    };
    reset(prefilled);
    setProfilePhoto(null);
    setEditEmployee(row);
    setOpenDialog(true);
  };

  const columns = useMemo(() => [
    { key: 'fullname', label: 'User Name', width: 180, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text', render: (r) => r.fullname },
    { key: 'first_name', label: 'First Name', width: 150, sortKey: 'first_name', filterKey: 'f_first', filterType: 'text', render: (r) => r.first_name },
    { key: 'last_name', label: 'Last Name', width: 150, sortKey: 'last_name', filterKey: 'f_last', filterType: 'text', render: (r) => r.last_name },
    { key: 'date_of_birth', label: 'DOB', width: 130, sortKey: 'date_of_birth', render: (r) => r.date_of_birth },
    { key: 'group', label: 'Role', width: 150, sortKey: 'group', filterKey: 'f_group', filterType: 'text', render: (r) => r.group },
    {
      key: 'actions', label: 'Edit', width: 80, align: 'center',
      render: (row) => (
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => handleEditClick(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [outlets, groups]);

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
    <Box sx={{ height: 600, width: '90%', mx: 'auto', mt: 5, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>EMPLOYEES</Typography>



      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(row) => row.employee_id}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 25, 50]}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        emptyMessage="No employees"
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
