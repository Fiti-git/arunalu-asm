// src/pages/ModifyReferenceImage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  CircularProgress,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from 'utils/api';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

export default function ModifyReferenceImage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const res = await api.get('/report/employees/'); // trailing slash
      setEmployees(res.data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
      alert('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDeleteImages = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete all images?')) return;

    try {
      const formData = new FormData();
      formData.append('clear_images', 'true');

      await api.put(`/report/employees/${employeeId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Images deleted successfully');
      fetchEmployees();
    } catch (error) {
      console.error('Delete failed', error);
      alert('Failed to delete images');
    }
  };

  // Filter employees by search
  const filteredEmployees = employees.filter((emp) => {
    const query = search.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(query) ||
      emp.fullname.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Modify Reference Image
      </Typography>

      {/* Search Field */}
      <TextField
        label="Search by Name or EMP CODE"
        variant="outlined"
        fullWidth
        sx={{ mb: 4 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Grid container spacing={3}>
        {filteredEmployees.map((emp) => (
          <Grid item xs={12} key={emp.employee_id}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                {/* Header */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {emp.first_name}
                    </Typography>
                    <Typography color="text.secondary">
                      EMP CODE: {emp.fullname}
                    </Typography>
                  </Box>

                  {/* Delete Images */}
                  <Button
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteImages(emp.employee_id)}
                  >
                    Delete Images
                  </Button>
                </Box>

                {/* Images */}
                <Grid container spacing={2}>
                  <ImagePreview title="Reference Photo" src={emp.reference_photo} />
                  <ImagePreview title="Punch In Selfie" src={emp.punchin_selfie} />
                  <ImagePreview title="Punch Out Selfie" src={emp.punchout_selfie} />
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

/* ---------------- Image Component ---------------- */

function ImagePreview({ title, src }) {
  return (
    <Grid item xs={12} sm={4}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          width: '180px',
          height: '180px',
          margin: 'auto',
        }}
      >
        {src ? (
          <CardMedia
            component="img"
            image={`${BASE_URL}${src}`}
            alt={title}
            sx={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <Box
            sx={{
              width: '180px',
              height: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
            }}
          >
            <Typography color="text.secondary" textAlign="center">
              No Image
            </Typography>
          </Box>
        )}
        <CardContent sx={{ textAlign: 'center', p: 1 }}>
          <Typography fontWeight={600} variant="body2">
            {title}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
