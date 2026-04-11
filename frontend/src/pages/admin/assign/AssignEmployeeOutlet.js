// src/pages/admin/assign/AssignEmployeeOutlet.js

import { useForm } from 'react-hook-form';
import { Box, Button,MenuItem, InputLabel, FormControl, Select, FormHelperText } from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  employeeId: yup.string().required('Employee ID is required'),
  outlet: yup.string().required('Outlet is required'),
}).required();

const outlets = ['Outlet 1', 'Outlet 2', 'Outlet 3']; // Replace with actual outlet data
const employees = ['Employee 1', 'Employee 2', 'Employee 3']; // Replace with actual employee data

const AssignEmployeeOutlet = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    console.log(data);
    // Handle form submission logic here
  };

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto', padding: 2 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl fullWidth margin="normal" error={!!errors.employeeId}>
          <InputLabel>Employee</InputLabel>
          <Select
            {...register('employeeId')}
            label="Employee"
          >
            {employees.map((employee, index) => (
              <MenuItem key={index} value={employee}>{employee}</MenuItem>
            ))}
          </Select>
          <FormHelperText>{errors.employeeId?.message}</FormHelperText>
        </FormControl>
        <FormControl fullWidth margin="normal" error={!!errors.outlet}>
          <InputLabel>Outlet</InputLabel>
          <Select
            {...register('outlet')}
            label="Outlet"
          >
            {outlets.map((outlet, index) => (
              <MenuItem key={index} value={outlet}>{outlet}</MenuItem>
            ))}
          </Select>
          <FormHelperText>{errors.outlet?.message}</FormHelperText>
        </FormControl>
        <Button type="submit" variant="contained" fullWidth sx={{ marginTop: 2 }}>
          Assign Employee to Outlet
        </Button>
      </form>
    </Box>
  );
};

export default AssignEmployeeOutlet;
