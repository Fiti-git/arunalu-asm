import React from 'react';
import { Alert, Box } from '@mui/material';
import { getLicenseState, getLicense } from '../utils/auth';

function LicenseBanner() {
  const state = getLicenseState();
  const license = getLicense();

  if (state === 'active' || state === 'unconfigured' || state === 'unknown') {
    return null;
  }

  if (state === 'grace') {
    return (
      <Box sx={{ mb: 2 }}>
        <Alert severity="warning" variant="filled">
          Your subscription has expired. Please pay by {license.grace_until || 'the grace period deadline'} to avoid service interruption.
        </Alert>
      </Box>
    );
  }

  if (state === 'readonly') {
    return (
      <Box sx={{ mb: 2 }}>
        <Alert severity="error" variant="filled">
          Subscription unpaid. The system is in read-only mode. Contact your service provider to restore full access.
        </Alert>
      </Box>
    );
  }

  if (state === 'locked') {
    return (
      <Box sx={{ mb: 2 }}>
        <Alert severity="error" variant="filled">
          Your license has expired. The system is locked. Contact your service provider immediately.
        </Alert>
      </Box>
    );
  }

  return null;
}

export default LicenseBanner;
