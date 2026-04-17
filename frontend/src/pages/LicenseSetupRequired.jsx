import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { isServiceProvider, isAuthenticated } from '../utils/auth';

function LicenseSetupRequired() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'grey.50',
        p: 2,
      }}
    >
      <Paper sx={{ p: 6, maxWidth: 500, textAlign: 'center', borderRadius: 3 }}>
        <SettingsIcon sx={{ fontSize: 72, color: 'warning.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom fontWeight="bold">
          License Setup Required
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          This system has not been configured with a license yet.
          A ServiceProvider administrator needs to complete the initial setup.
        </Typography>

        {isAuthenticated() && isServiceProvider() ? (
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/admin/license-configuration')}
          >
            Go to License Setup
          </Button>
        ) : isAuthenticated() ? (
          <Typography variant="body2" color="text.disabled">
            You do not have permission to configure the license.
            Please contact your service provider.
          </Typography>
        ) : (
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/')}
          >
            Go to Login
          </Button>
        )}
      </Paper>
    </Box>
  );
}

export default LicenseSetupRequired;
