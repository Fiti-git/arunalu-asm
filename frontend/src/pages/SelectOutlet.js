import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  CircularProgress,
} from '@mui/material';
import api from 'utils/api';

function SelectOutlet() {
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await api.get('/api/user/');
        const userOutlets = response.data.outlets || [];
        setOutlets(userOutlets);
      } catch (err) {
        console.error('Failed to fetch user details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  const handleSubmit = () => {
    if (selectedOutlet) {
      const outlet = outlets.find((o) => o.id === selectedOutlet);
      localStorage.setItem('outlet', selectedOutlet);
      localStorage.setItem('outlet_name', outlet?.name || '');
      navigate('/dashboard');
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundImage: 'url("/bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Cal Sans', sans-serif",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          borderRadius: 4,
          width: '1000px',
          height: '600px',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: '0px 20px 40px rgba(0,0,0,0.25)',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Left Side: Logo */}
        <Box
          sx={{
            width: '45%',
            backgroundColor: '#f8f8f8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: 320,
              height: 320,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0px 6px 20px rgba(0,0,0,0.2)',
              backgroundColor: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: '70%', height: '70%', objectFit: 'contain' }}
            />
          </Box>
        </Box>

        {/* Right Side: Form */}
        <Box
          sx={{
            width: '55%',
            p: 6,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h4" gutterBottom align="center" fontWeight="bold">
            Select an Outlet
          </Typography>

          {loading ? (
            <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <FormControl fullWidth sx={{ mt: 4 }}>
                <InputLabel>Outlet</InputLabel>
                <Select
                  value={selectedOutlet}
                  label="Outlet"
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  required
                  sx={{
                    backgroundColor: '#fafafa',
                    borderRadius: 2,
                  }}
                >
                  {outlets.map((outlet) => (
                    <MenuItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                sx={{
                  mt: 4,
                  backgroundColor: '#e6b904',
                  color: '#000',
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: '#d1a803',
                  },
                  borderRadius: 2,
                  py: 1.5,
                }}
                onClick={handleSubmit}
                disabled={!selectedOutlet}
              >
                Continue to Dashboard
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default SelectOutlet;
