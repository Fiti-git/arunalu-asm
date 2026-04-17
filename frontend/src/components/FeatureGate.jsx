import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { hasFeature } from '../utils/auth';

function FeatureGate({ feature, children, fallback }) {
  if (hasFeature(feature)) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        textAlign: 'center',
        p: 4,
      }}
    >
      <LockOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" gutterBottom color="text.secondary">
        Feature Not Available
      </Typography>
      <Typography variant="body1" color="text.disabled" sx={{ maxWidth: 400, mb: 3 }}>
        This feature is not included in your current subscription.
        Contact your service provider to enable it.
      </Typography>
    </Box>
  );
}

export default FeatureGate;
