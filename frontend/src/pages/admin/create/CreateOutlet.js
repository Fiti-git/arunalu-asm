import React, { useState, useEffect } from 'react';
import api from 'utils/api';
import { useForm } from 'react-hook-form';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
} from '@mui/material';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const defaultCenter = {
  lat: 7.2906,
  lng: 80.6337,
};


const CreateOutlet = ({ onSuccess }) => {
  const [managers, setManagers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [marker, setMarker] = useState(defaultCenter);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyDZJHqgolRe_S3fjSzvktXaBqLEaMHp4_M',
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    api.get('/api/getemployees').then(res => { const d = res.data; setManagers(Array.isArray(d) ? d : (d.results || [])); });
    api.get('/api/getagencies/').then(res => setAgencies(res.data));
  }, []);

  const onMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    setValue('latitude', lat);
    setValue('longitude', lng);
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      latitude: marker.lat,
      longitude: marker.lng,
    };

    try {
      const response = await api.post('/api/outlets/create', payload);
      alert('Outlet created successfully!');
      if (onSuccess) onSuccess();
      console.log(response.data);
    } catch (err) {
      alert('Failed to create outlet');
      console.error(err.response?.data || err.message);
    }
  };

  return (
    <Paper
      elevation={4}
      sx={{
        maxWidth: '90%',
        mx: 'auto',
        mt: 6,
        p: 4,
        borderRadius: 3,
        bgcolor: '#fff',
      }}
    >
      <Typography variant="h5" gutterBottom align="left" fontWeight="600" mb={3}>
        Create New Outlet
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Outlet Name"
          fullWidth
          margin="normal"
          {...register('name', { required: 'Outlet name is required' })}
          error={!!errors.name}
          helperText={errors.name?.message}
        />

        <TextField
          label="Address"
          fullWidth
          margin="normal"
          {...register('address', { required: 'Address is required' })}
          error={!!errors.address}
          helperText={errors.address?.message}
        />

        <TextField
          label="Radius (meters)"
          fullWidth
          margin="normal"
          type="number"
          {...register('radius_meters', {
            required: 'Radius is required',
            valueAsNumber: true,
          })}
          error={!!errors.radius_meters}
          helperText={errors.radius_meters?.message}
        />

        <TextField
          label="Manager"
          select
          fullWidth
          margin="normal"
          defaultValue=""
          {...register('manager')}
          sx={{ mt: 2 }}
        >
          <MenuItem value="">None</MenuItem>
          {managers.map((m) => (
            <MenuItem key={m.employee_id} value={m.employee_id}>
              {m.fullname}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Agency"
          select
          fullWidth
          margin="normal"
          defaultValue=""
          {...register('agency')}
          sx={{ mt: 2 }}
        >
          <MenuItem value="">None</MenuItem>
          {agencies.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))}
        </TextField>

        <Typography variant="body1" sx={{ mt: 3, fontWeight: '500' }}>
          Select Location on Map
        </Typography>

        {isLoaded ? (
          <Box
            sx={{
              width: '100%',
              height: 320,
              borderRadius: 2,
              mt: 1,
              boxShadow: '0 0 12px rgb(0 0 0 / 0.1)',
            }}
          >
            <GoogleMap
              center={marker}
              zoom={12}
              mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 8 }}
              onClick={onMapClick}
            >
              <Marker position={marker} />
            </GoogleMap>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Loading map...
          </Typography>
        )}

        <Button
          variant="contained"
          type="submit"
          fullWidth
          sx={{ mt: 4, py: 1.8, fontWeight: 600, fontSize: '1rem' }}
        >
          Create Outlet
        </Button>
      </form>
    </Paper>
  );
};

export default CreateOutlet;
