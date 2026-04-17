import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';

const API_BASE = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const loginUser = async (username, password, deviceType) => {
    try {
      const response = await axios.post(`${API_BASE}/api/token/`, {
        username,
        password,
        device_type: deviceType,
      });
      return response.data;
    } catch (err) {
      throw new Error('Login failed. Please check your credentials.');
    }
  };

  const fetchUserDetails = async (token) => {
    try {
      const response = await axios.get(`${API_BASE}/api/user/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (err) {
      throw new Error('Failed to get user details');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const deviceType = "web";

    if (!username || !password) {
      setError('Both fields are required.');
      setLoading(false);
      return;
    }

    try {
      const { access, refresh } = await loginUser(username, password, deviceType);
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      const decoded = jwtDecode(access);
      const { role } = decoded;

      // ServiceProvider has no Employee profile — skip user details
      if (role !== 'ServiceProvider') {
        const userDetails = await fetchUserDetails(access);
        const { outlets } = userDetails;
        if (outlets && outlets.length > 0) {
          localStorage.setItem('outlet', outlets[0].id);
          localStorage.setItem('outlet_name', outlets[0].name);
        }
      }

      // Fetch license status after login
      try {
        const licRes = await axios.get(`${API_BASE}/api/license/status/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        localStorage.setItem('license', JSON.stringify(licRes.data));
      } catch {
        // License fetch is non-blocking — may fail on unconfigured instances
      }

      handleRoleBasedNavigation(role);
      window.location.reload();

    } catch (err) {
      setError(err.message);
      console.error(err);
    }
    setLoading(false);
  };

  const handleRoleBasedNavigation = (role) => {
    const roleBasedRedirect = {
      Admin: '/admin/reports/outlet-summary',
      Manager: '/manager/dashboard',
      ServiceProvider: '/admin/reports/outlet-summary',
    };

    const navigateToRolePage = roleBasedRedirect[role] || '/';
    navigate(navigateToRolePage);
  };

  // Adjust dimensions based on screen size
  const getPaperWidth = () => {
    if (isMobile) return '95vw';
    if (isTablet) return '85vw';
    return '1000px';
  };

  const getPaperHeight = () => {
    if (isMobile) return 'auto';
    if (isTablet) return '550px';
    return '600px';
  };

  const getLogoContainerSize = () => {
    if (isMobile) return 200;
    if (isTablet) return 250;
    return 320;
  };

  const getLogoSize = () => {
    if (isMobile) return '60%';
    if (isTablet) return '65%';
    return '70%';
  };

  const getContentPadding = () => {
    if (isMobile) return 3;
    if (isTablet) return 4;
    return 6;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: 'url("/bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        //fontFamily: "'Cal Sans', sans-serif',
        p: isMobile ? 1 : 2,
      }}
    >
      <Paper
        sx={{
          borderRadius: isMobile ? 2 : 4,
          width: getPaperWidth(),
          height: getPaperHeight(),
          display: 'flex',
          overflow: 'hidden',
          boxShadow: (theme) => theme.shadows[6],
          bgcolor: 'background.paper',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        {/* Logo Section */}
        <Box
          sx={{
            width: isMobile ? '100%' : '45%',
            bgcolor: 'grey.50',
            display: 'flex',
            justifyContent: 'center',
            alignItems: isMobile ? 'flex-start' : 'center',
            pt: isMobile ? 3 : 0,
            pb: isMobile ? 2 : 0,
          }}
        >
          <Box
            sx={{
              width: getLogoContainerSize(),
              height: getLogoContainerSize(),
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: (theme) => theme.shadows[3],
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mx: isMobile ? 0 : 'auto',
            }}
          >
            <img
              src="/logo.png"
              alt="Logo"
              style={{ 
                width: getLogoSize(), 
                height: getLogoSize(), 
                objectFit: 'fill' 
              }}
            />
          </Box>
        </Box>

        {/* Login Form Section */}
        <Box 
          sx={{ 
            width: isMobile ? '100%' : '55%', 
            p: getContentPadding(), 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            minHeight: isMobile ? '300px' : 'auto',
          }}
        >
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            align="center" 
            fontWeight="bold"
            sx={{ mb: 2 }}
          >
            Welcome!
          </Typography>

          {error && (
            <Typography color="error" align="center" sx={{ mt: 1, mb: 2 }}>
              {error}
            </Typography>
          )}

          <Box component="form" onSubmit={handleLogin} noValidate>
            <TextField
              label="Username"
              fullWidth
              margin="normal"
              variant="outlined"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              variant="outlined"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              size={isMobile ? "small" : "medium"}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                mt: 3,
                py: isMobile ? 1 : 1.5,
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
