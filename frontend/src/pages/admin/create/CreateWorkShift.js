// src/pages/admin/create/CreateWorkShift.js
import React from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, TextField} from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Validation schema
const schema = yup.object({
  shiftName: yup.string().required('Shift name is required'),
  startTime: yup.string().required('Start time is required'),
  endTime: yup.string().required('End time is required'),
}).required();

const CreateWorkShift = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    console.log('Creating work shift:', data);
    // TODO: Send to backend API
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Shift Name"
          fullWidth
          margin="normal"
          {...register('shiftName')}
          error={!!errors.shiftName}
          helperText={errors.shiftName?.message}
        />

        <TextField
          label="Start Time"
          type="time"
          fullWidth
          margin="normal"
          {...register('startTime')}
          error={!!errors.startTime}
          helperText={errors.startTime?.message}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="End Time"
          type="time"
          fullWidth
          margin="normal"
          {...register('endTime')}
          error={!!errors.endTime}
          helperText={errors.endTime?.message}
          InputLabelProps={{ shrink: true }}
        />

        <Button variant="contained" type="submit" fullWidth sx={{ mt: 2 }}>
          Create Work Shift
        </Button>
      </form>
    </Box>
  );
};

export default CreateWorkShift;
