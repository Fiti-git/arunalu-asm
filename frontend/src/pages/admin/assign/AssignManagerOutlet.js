// src/pages/admin/assign/AssignManagerOutlet.js
import React from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, MenuItem, InputLabel, FormControl, Select, FormHelperText } from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Dummy data – replace with real data from API or props
const managers = [
  { id: 'm1', name: 'Alice Johnson' },
  { id: 'm2', name: 'Bob Smith' },
];
const outlets = [
  { id: 'o1', name: 'Outlet A' },
  { id: 'o2', name: 'Outlet B' },
];

// Validation schema
const schema = yup.object({
  managerId: yup.string().required('Manager is required'),
  outletId: yup.string().required('Outlet is required'),
});

const AssignManagerOutlet = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    console.log('Assigning manager to outlet:', data);
    // TODO: Send data to backend
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl fullWidth margin="normal" error={!!errors.managerId}>
          <InputLabel id="manager-label">Manager</InputLabel>
          <Select
            labelId="manager-label"
            {...register('managerId')}
            label="Manager"
            defaultValue=""
          >
            {managers.map((manager) => (
              <MenuItem key={manager.id} value={manager.id}>
                {manager.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{errors.managerId?.message}</FormHelperText>
        </FormControl>

        <FormControl fullWidth margin="normal" error={!!errors.outletId}>
          <InputLabel id="outlet-label">Outlet</InputLabel>
          <Select
            labelId="outlet-label"
            {...register('outletId')}
            label="Outlet"
            defaultValue=""
          >
            {outlets.map((outlet) => (
              <MenuItem key={outlet.id} value={outlet.id}>
                {outlet.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{errors.outletId?.message}</FormHelperText>
        </FormControl>

        <Button variant="contained" type="submit" fullWidth sx={{ mt: 2 }}>
          Assign Manager to Outlet
        </Button>
      </form>
    </Box>
  );
};

export default AssignManagerOutlet;
