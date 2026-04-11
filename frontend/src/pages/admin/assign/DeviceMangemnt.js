import React, { useState, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tooltip, Typography, Paper
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from 'utils/api';

const passwordSchema = yup.object({
  password: yup.string().required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

export default function EmployeeGrid() {
  const [employees, setEmployees] = useState([]);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
  });

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/getemployees');
      const d = response.data; setEmployees(Array.isArray(d) ? d : (d.results || []));
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleClosePasswordDialog = () => {
    setOpenPasswordDialog(false);
    setSelectedEmployee(null);
    resetPasswordForm();
  };

  const onPasswordSubmit = async (data) => {
    if (!selectedEmployee) return;
    try {
      await api.put(`/api/changepassword/${selectedEmployee.employee_id}/`, {
        password: data.password,
      });
      alert('Password updated successfully!');
      handleClosePasswordDialog();
    } catch (err) {
      console.error('Error updating password:', err);
      alert('Error updating password');
    }
  };

  const columns = [
    { field: 'fullname', headerName: 'User Name', flex: 1 },
    { field: 'first_name', headerName: 'Name', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Tooltip title="Change Password"><LockResetIcon /></Tooltip>}
          label="Change Password"
          onClick={() => {
            setSelectedEmployee(params.row);
            setOpenPasswordDialog(true);
          }}
        />,
      ],
    },
  ];

return (
  <Box
    sx={{
      width: '90%',
      mx: 'auto',
      mt: 5,
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
        Change Password
      </Typography>
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
        rowsPerPageOptions={[5]}
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

    {/* Password Change Dialog */}
    <Dialog
      open={openPasswordDialog}
      onClose={handleClosePasswordDialog}
      maxWidth="xs"
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
        Change Password for {selectedEmployee?.fullname}
      </DialogTitle>

      <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} noValidate>
        <DialogContent
          dividers
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            py: 3,
          }}
        >
          <Controller
            name="password"
            control={passwordControl}
            render={({ field }) => (
              <TextField
                {...field}
                label="New Password"
                type="password"
                fullWidth
                autoFocus
                error={!!passwordErrors.password}
                helperText={passwordErrors.password?.message}
              />
            )}
          />
          <Controller
            name="confirmPassword"
            control={passwordControl}
            render={({ field }) => (
              <TextField
                {...field}
                label="Confirm New Password"
                type="password"
                fullWidth
                error={!!passwordErrors.confirmPassword}
                helperText={passwordErrors.confirmPassword?.message}
              />
            )}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClosePasswordDialog}
            sx={{
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
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
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  </Box>
);

}
