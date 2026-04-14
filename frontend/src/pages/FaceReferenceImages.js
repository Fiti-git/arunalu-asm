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
  Container,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from 'utils/api';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

export default function FaceReferenceImages() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/report/employees/');

        // Extract results from paginated response
        const empData = res.data.results || res.data;
        setEmployees(Array.isArray(empData) ? empData : []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleDeleteImages = async (employeeId) => {
    if (!window.confirm('Delete all images for this employee?')) return;
    try {
      const formData = new FormData();
      formData.append('clear_images', 'true');
      await api.put(`/report/employees/${employeeId}/`, formData);
      alert('Images deleted');
      // Refetch
      window.location.reload();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.first_name?.toLowerCase().includes(q) ||
      emp.fullname?.toLowerCase().includes(q) ||
      emp.username?.toLowerCase().includes(q)
    );
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Face Reference Images
      </Typography>

      {loading && <CircularProgress />}

      {error && (
        <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1, mb: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {!loading && !error && (
        <>
          <TextField
            label="Search employees..."
            variant="outlined"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Showing {filtered.length} of {employees.length} employees
          </Typography>

          {filtered.length === 0 ? (
            <Typography>No employees found</Typography>
          ) : (
            <Grid container spacing={2}>
              {filtered.map((emp) => (
                <Grid item xs={12} key={emp.employee_id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="h6">{emp.first_name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            ID: {emp.employee_id} | Code: {emp.fullname}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteImages(emp.employee_id)}
                        >
                          Delete
                        </Button>
                      </Box>

                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <PhotoBox title="Reference" src={emp.reference_photo} />
                        <PhotoBox title="Punch In" src={emp.punchin_selfie} />
                        <PhotoBox title="Punch Out" src={emp.punchout_selfie} />
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Container>
  );
}

function PhotoBox({ title, src }) {
  return (
    <Grid item xs={4}>
      <Card variant="outlined">
        {src ? (
          <CardMedia component="img" image={`${BASE_URL}${src}`} alt={title} sx={{ height: 150 }} />
        ) : (
          <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="caption" color="textSecondary">
              No Photo
            </Typography>
          </Box>
        )}
        <CardContent sx={{ p: 1 }}>
          <Typography variant="caption" fontWeight={600}>
            {title}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
