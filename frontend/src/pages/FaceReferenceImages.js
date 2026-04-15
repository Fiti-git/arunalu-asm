import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CircularProgress,
  TextField,
  Container,
  Pagination,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import api from 'utils/api';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

// Consistent card dimensions
const CARD_WIDTH = 260;
const CARD_HEIGHT = 360;

export default function FaceReferenceImages() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const searchTimeoutRef = useRef(null);

  const fetchPage = async (page = 1, searchTerm = '') => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('page', page);
      if (searchTerm) params.append('search', searchTerm);

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

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchPage(1, value);
    }, 300);
  }, []);

  React.useEffect(() => {
    fetchPage(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteImages = async (employeeId) => {
    if (!window.confirm('Delete all images for this employee?')) return;
    try {
      const formData = new FormData();
      formData.append('clear_images', 'true');
      await api.put(`/report/employees/${employeeId}/`, formData);
      fetchPage(currentPage, search);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePageChange = (_, page) => {
    fetchPage(page, search);
    window.scrollTo(0, 0);
  };

  return (
    <Box sx={{ bgcolor: '#f7f8fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">

        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#111', letterSpacing: '-0.5px' }}>
              Face Reference Images
            </Typography>
            <Typography variant="body2" sx={{ color: '#888', mt: 0.5 }}>
              Manage employee face recognition photos
            </Typography>
          </Box>
          {!loading && (
            <Chip
              label={`${totalCount} Employees`}
              size="small"
              sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, fontSize: '0.8rem' }}
            />
          )}
        </Box>

        {/* Search Bar */}
        <Box sx={{ mb: 3, maxWidth: 480 }}>
          <TextField
            placeholder="Search by name, username, or employee ID..."
            variant="outlined"
            fullWidth
            size="small"
            value={search}
            onChange={handleSearchChange}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ color: '#bbb', mr: 1, fontSize: '1.1rem' }} />,
              },
            }}
            sx={{
              bgcolor: 'white',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': { borderColor: '#e8e8e8' },
                '&:hover fieldset': { borderColor: '#ccc' },
              },
            }}
          />
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} thickness={4} sx={{ color: '#555' }} />
          </Box>
        )}

        {/* Error */}
        {error && (
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffebee', border: '1px solid #ffcdd2', mb: 3, borderRadius: 2 }}>
            <Typography color="error" variant="body2">{error}</Typography>
          </Paper>
        )}

        {/* Cards Grid */}
        {!loading && !error && (
          <>
            {employees.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <PersonIcon sx={{ fontSize: 48, color: '#ddd', mb: 1 }} />
                <Typography color="textSecondary" variant="body2">No employees found</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2.5,
                  mb: 4,
                }}
              >
                {employees.map((emp) => (
                  <EmployeeCard
                    key={emp.employee_id}
                    emp={emp}
                    onDelete={handleDeleteImages}
                  />
                ))}
              </Box>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2, pb: 4 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  shape="rounded"
                  color="primary"
                  size="medium"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 500,
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

/* ─── Employee Card ────────────────────────────────────────────── */
function EmployeeCard({ emp, onDelete }) {
  const initials = (emp.fullname || emp.first_name || '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card
      elevation={0}
      sx={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        border: '1px solid #ebebeb',
        bgcolor: 'white',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': {
          boxShadow: '0 6px 24px rgba(0,0,0,0.09)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Top actions row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1.5 }}>
        <Chip
          label={`#EMP${String(emp.employee_id).padStart(3, '0')}`}
          size="small"
          sx={{
            bgcolor: '#f0f4ff',
            color: '#3b5bdb',
            fontWeight: 700,
            fontSize: '0.7rem',
            height: 22,
            letterSpacing: '0.3px',
          }}
        />
        <Tooltip title="Delete all images">
          <IconButton
            size="small"
            onClick={() => onDelete(emp.employee_id)}
            sx={{
              color: '#bbb',
              '&:hover': { color: '#e53935', bgcolor: '#ffebee' },
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Profile photo (reference_photo) */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 1.5 }}>
        {emp.reference_photo ? (
          <Avatar
            src={`${BASE_URL}${emp.reference_photo}`}
            alt={emp.fullname}
            sx={{
              width: 80,
              height: 80,
              border: '3px solid #f0f0f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          />
        ) : (
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: '#e8eaf6',
              color: '#7986cb',
              fontWeight: 700,
              fontSize: '1.5rem',
              border: '3px solid #f0f0f0',
            }}
          >
            {initials}
          </Avatar>
        )}
      </Box>

      {/* Name & info */}
      <Box sx={{ textAlign: 'center', px: 2 }}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{
            color: '#111',
            lineHeight: 1.2,
            mb: 0.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {emp.fullname}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#999',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          @{emp.username}
        </Typography>
      </Box>

      {/* Divider */}
      <Box sx={{ mx: 2, my: 1.5, borderTop: '1px solid #f0f0f0' }} />

      {/* Punch In / Punch Out thumbnails */}
      <Box sx={{ px: 2, flex: 1 }}>
        <Grid container spacing={1}>
          <PunchPhoto label="Punch In" src={emp.punchin_selfie} color="#e8f5e9" textColor="#2e7d32" />
          <PunchPhoto label="Punch Out" src={emp.punchout_selfie} color="#fff3e0" textColor="#e65100" />
        </Grid>
      </Box>

      {/* Spacer */}
      <Box sx={{ pb: 2 }} />
    </Card>
  );
}

/* ─── Punch Photo Thumbnail ────────────────────────────────────── */
function PunchPhoto({ label, src, color, textColor }) {
  return (
    <Grid item xs={6}>
      <Box>
        <Box
          sx={{
            height: 90,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: color,
            border: '1px solid',
            borderColor: `${textColor}22`,
          }}
        >
          {src ? (
            <CardMedia
              component="img"
              image={`${BASE_URL}${src}`}
              alt={label}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: textColor, fontWeight: 500, opacity: 0.6 }}>
                No Photo
              </Typography>
            </Box>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 0.5,
            fontWeight: 600,
            color: textColor,
            fontSize: '0.68rem',
            letterSpacing: '0.3px',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Grid>
  );
}
