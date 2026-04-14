import React, { useState, useEffect } from 'react';
import {
  Box,
  Avatar,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  TextField,
} from '@mui/material';
import { DataGrid, GridToolbarContainer } from '@mui/x-data-grid';
import api from 'utils/api';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

function CustomToolbar({ searchText, setSearchText }) {
  return (
    <GridToolbarContainer
      sx={{
        justifyContent: 'flex-end',
        padding: 1,
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f9f9f9',
      }}
    >
      <TextField
        variant="standard"
        size="small"
        placeholder="Search employees..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        sx={{
          width: { xs: '100%', sm: 280 },
          '& .MuiInputBase-root': {
            borderBottom: '1px solid #bdbdbd',
            fontSize: 14,
          },
          '& .MuiInputBase-input': {
            padding: '4px 8px',
          },
        }}
        InputProps={{ disableUnderline: false }}
      />
    </GridToolbarContainer>
  );
}

export default function EmployeeDataGrid() {
  const [userOutlets, setUserOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/api/user/');
        setUserOutlets(res.data.outlets);
        if (res.data.outlets.length === 1) {
          setSelectedOutlet(res.data.outlets[0].id);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedOutlet) return;

      try {
        const [employeesRes, outletsRes] = await Promise.all([
          api.get('/api/getoutletemployees', { params: { outlet_id: selectedOutlet } }),
          api.get('/api/outlets/'),
        ]);

        const outletsMap = outletsRes.data.reduce((acc, outlet) => {
          acc[outlet.id] = outlet.name;
          return acc;
        }, {});

        const empList = Array.isArray(employeesRes.data) ? employeesRes.data : (employeesRes.data.results || []);
        const updated = empList.map((employee) => {
          const outletNames = employee.outlets?.map((id) => outletsMap[id]) || ['Unknown'];
          const photo = employee.reference_photo
            ? `${BASE_URL}${employee.reference_photo}`
            : null;

          return {
            id: employee.employee_id,
            employee_id: employee.employee_id,
            first_name: employee.first_name,
            fullname: employee.fullname,
            idnumber: employee.idnumber,
            group: employee.groups.join(', '),
            outlets: outletNames.join(', '),
            is_active: employee.is_active,
            photo,
          };
        });

        setEmployees(updated);
        setFilteredEmployees(updated);
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };
    fetchEmployees();
  }, [selectedOutlet]);

  useEffect(() => {
    if (!searchText) {
      setFilteredEmployees(employees);
      return;
    }
    const lower = searchText.toLowerCase();
    const filtered = employees.filter((emp) =>
      Object.values(emp).some(
        (val) => val && val.toString().toLowerCase().includes(lower)
      )
    );
    setFilteredEmployees(filtered);
  }, [searchText, employees]);

  const columns = [
    {
      field: 'photo',
      headerName: 'Photo',
      flex: 0.4,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Avatar
          alt={params.row.fullname}
          src={params.value}
          sx={{
            width: 36,
            height: 36,
            border: '1px solid #ccc',
            bgcolor: '#f0f0f0',
          }}
          variant="circular"
        />
      ),
    },
    { field: 'first_name', headerName: 'First Name', flex: 1.2, minWidth: 130 },
    { field: 'fullname', headerName: 'Username', flex: 1.6, minWidth: 180 },
    { field: 'idnumber', headerName: 'NIC No', flex: 1.1, minWidth: 140 },
    { field: 'group', headerName: 'Role', flex: 1.2, minWidth: 150 },
    {
      field: 'is_active',
      headerName: 'Status',
      flex: 0.7,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        width: '95%',
        maxWidth: 1200,
        mx: 'auto',
        mt: 6,
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        height:520,
        overflow: 'hidden',
        bgcolor: 'transparent'
      }}
    >
      {/* Header & Outlet Selector */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            letterSpacing: 0.5,
            color: '#333',
            userSelect: 'none',
            textTransform: 'uppercase'
          }}
        >
          Employee Info
        </Typography>

        {userOutlets.length > 1 && (
          <FormControl
            variant="standard"
            size="small"
            sx={{ minWidth: 200 }}
          >
            <InputLabel id="outlet-select-label" sx={{ color: '#666' }}>
              Select Outlet
            </InputLabel>
            <Select
              labelId="outlet-select-label"
              value={selectedOutlet || ''}
              label="Select Outlet"
              onChange={(e) => setSelectedOutlet(e.target.value)}
              sx={{
                color: '#111',
                '& .MuiSelect-select': {
                  paddingY: 0.7,
                },
              }}
            >
              {userOutlets.map((outlet) => (
                <MenuItem key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* DataGrid */}
      <Box
        sx={{
          height: 600,
          width: '100%',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #e0e0e0',
          bgcolor: '#fafafa',
        }}
      >
        <DataGrid
          rows={filteredEmployees}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          getRowId={(row) => row.employee_id}
          components={{ Toolbar: () => <CustomToolbar searchText={searchText} setSearchText={setSearchText} /> }}
          sx={{
            border: 'none',
            fontSize: 14,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#e0e0e0',
              color: '#222',
              fontWeight: 600,
              minHeight: 40,
              maxHeight: 40,
              userSelect: 'none',
            },
            '& .MuiDataGrid-cell': {
              py: 1,
              borderBottom: '1px solid #eee',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'transparent', // No hover effect
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid #e0e0e0',
              backgroundColor: '#f9f9f9',
            },
          }}
          disableSelectionOnClick
          autoHeight={false}
        />
      </Box>
    </Paper>
  );
}
