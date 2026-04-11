import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
  FormHelperText,
  Typography,
  Divider,
  Grid,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Validation schema
const schema = yup.object({
  fullname: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Username (email) is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  phone_number: yup.string(),
  agency: yup.string().required('Agency is required'),
  date_of_birth: yup.date().required('Date of birth is required'),
  profile_photo: yup.mixed().nullable(),
  password: yup.string().required('Password is required').min(6, 'Min 6 chars'),
  group: yup.string().required('Group is required'),
  role: yup.string().required('Role is required'),
}).required();

const roles = ['Admin', 'Manager', 'Staff', 'Viewer']; // Example role options

const CreateEmployee = () => {
  const [agencies, setAgencies] = useState([]);
  const [groups, setGroups] = useState([]);
  const token = localStorage.getItem('access_token');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    axios
      .get('/api/outlets/', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setAgencies(res.data))
      .catch(() => alert('Failed to load agencies'));

    axios
      .get('/api/groups/', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setGroups(res.data))
      .catch(() => alert('Failed to load groups'));
  }, [token]);

  const onSubmit = (data) => {
    const formData = new FormData();
    for (const key in data) {
      if (key === 'profile_photo' && data.profile_photo) {
        formData.append(key, data.profile_photo); // file
      } else {
        formData.append(key, data[key]);
      }
    }

    axios
      .post('/api/employees/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(() => alert('Employee created successfully!'))
      .catch(() => alert('Failed to create employee'));
  };

  return (
    <Box sx={{ width: '80%', mx: 'auto', p: 3, boxShadow: 2, borderRadius: 2, bgcolor: '#fafafa' }}>
      <Typography variant="h4" mb={4} align="left">
        CREATE EMPLOYEE
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={4}>
          {/* Left Column - Personal Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TextField
              label="Full Name"
              fullWidth
              margin="normal"
              {...register('fullname')}
              error={!!errors.fullname}
              helperText={errors.fullname?.message}
            />
            <TextField
              label="First Name"
              fullWidth
              margin="normal"
              {...register('first_name')}
              error={!!errors.first_name}
              helperText={errors.first_name?.message}
            />
            <TextField
              label="Last Name"
              fullWidth
              margin="normal"
              {...register('last_name')}
              error={!!errors.last_name}
              helperText={errors.last_name?.message}
            />
            <TextField
              label="Phone Number"
              fullWidth
              margin="normal"
              {...register('phone_number')}
              error={!!errors.phone_number}
              helperText={errors.phone_number?.message}
            />
            <TextField
              label="Date of Birth"
              type="date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              {...register('date_of_birth')}
              error={!!errors.date_of_birth}
              helperText={errors.date_of_birth?.message}
            />
          </Grid>

          {/* Right Column - Professional Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Professional Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TextField
              label="Username (Email)"
              fullWidth
              margin="normal"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <FormControl fullWidth margin="normal" error={!!errors.agency}>
              <InputLabel>Agency</InputLabel>
              <Controller
                name="agency"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <Select label="Agency" {...field}>
                    {agencies.map((agency) => (
                      <MenuItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.agency?.message}</FormHelperText>
            </FormControl>

            <FormControl fullWidth margin="normal" error={!!errors.group}>
              <InputLabel>Group</InputLabel>
              <Controller
                name="group"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <Select label="Group" {...field}>
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.group?.message}</FormHelperText>
            </FormControl>

            <FormControl fullWidth margin="normal" error={!!errors.role}>
              <InputLabel>Role</InputLabel>
              <Controller
                name="role"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <Select label="Role" {...field}>
                    {roles.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.role?.message}</FormHelperText>
            </FormControl>

            <FormControl fullWidth margin="normal" error={!!errors.profile_photo}>
              <InputLabel shrink>Profile Photo</InputLabel>
              <Controller
                name="profile_photo"
                control={control}
                defaultValue={null}
                render={({ field }) => (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => field.onChange(e.target.files[0])}
                    style={{ marginTop: 8, display: 'block' }}
                  />
                )}
              />
              <FormHelperText>{errors.profile_photo?.message}</FormHelperText>
            </FormControl>

            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          </Grid>
        </Grid>

        <Button type="submit" variant="contained" fullWidth sx={{ mt: 4 }}>
          Submit
        </Button>
      </form>
    </Box>
  );
};

export default CreateEmployee;
