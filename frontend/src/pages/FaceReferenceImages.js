import React, { useState } from 'react';
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
  Pagination,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import api from 'utils/api';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

export default function FaceReferenceImages() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);

      const res = await api.get(`/report/employees/?${params.toString()}`);
      setEmployees(res.data.results || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalCount(res.data.count || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPage(1);
  }, [search]);

  const handleDeleteImages = async (employeeId) => {
    if (!window.confirm('Delete all images for this employee?')) return;
    try {
      const formData = new FormData();
      formData.append('clear_images', 'true');
      await api.put(`/report/employees/${employeeId}/`, formData);
      alert('Images deleted successfully');
      fetchPage(currentPage);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePageChange = (_, page) => {
    fetchPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={700} sx={{ color: '#333', mb: 1 }}>
          Face Reference Images
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage employee face recognition photos
        </Typography>
      </Box>

      {/* Search Bar */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          bgcolor: '#f9f9f9',
          border: '1px solid #e0e0e0',
        }}
      >
        <SearchIcon sx={{ color: '#999' }} />
        <TextField
          placeholder="Search by name or employee code..."
          variant="outlined"
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ bgcolor: 'white' }}
        />
      </Paper>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Paper sx={{ p: 2, bgcolor: '#ffebee', border: '1px solid #f48fb1', mb: 3 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Page Info */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              📊 Page {currentPage} of {totalPages} | Total Employees: {totalCount}
            </Typography>
          </Box>

          {/* Employee Cards Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {employees.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="textSecondary">No employees found</Typography>
                </Paper>
              </Grid>
            ) : (
              employees.map((emp) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={emp.employee_id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      {/* Employee Info */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                          {emp.first_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ID: {emp.employee_id}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          Code: {emp.fullname}
                        </Typography>
                      </Box>

                      {/* Photos Grid */}
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <PhotoBox title="Reference" src={emp.reference_photo} />
                        <PhotoBox title="Punch In" src={emp.punchin_selfie} />
                        <PhotoBox title="Punch Out" src={emp.punchout_selfie} />
                      </Grid>

                      {/* Delete Button */}
                      <Button
                        fullWidth
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteImages(emp.employee_id)}
                        sx={{ mt: 1 }}
                      >
                        Delete All
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}

function PhotoBox({ title, src }) {
  return (
    <Grid item xs={4}>
      <Card
        variant="outlined"
        sx={{
          height: 100,
          overflow: 'hidden',
          border: '2px solid #e0e0e0',
          '&:hover': { borderColor: '#1976d2' },
        }}
      >
        {src ? (
          <CardMedia
            component="img"
            image={`${BASE_URL}${src}`}
            alt={title}
            sx={{ height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f5f5f5',
              flexDirection: 'column',
            }}
          >
            <Typography variant="caption" color="textSecondary" align="center">
              No
            </Typography>
            <Typography variant="caption" color="textSecondary" align="center">
              Photo
            </Typography>
          </Box>
        )}
      </Card>
      <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
        {title}
      </Typography>
    </Grid>
  );
}
