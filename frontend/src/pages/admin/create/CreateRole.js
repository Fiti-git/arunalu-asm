import React, { useState } from 'react';
import { TextField, Button, Typography, Box, Snackbar } from '@mui/material';
import axios from 'axios';
import api from 'utils/api';

const CreateRolePage = () => {
  const [roleName, setRoleName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleInputChange = (event) => {
    setRoleName(event.target.value);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!roleName.trim()) {
      setError('Role name is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const response = await api.post('/api/create-role/', { name: roleName });
      setSuccessMessage(response.data.message);
      setRoleName('');
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('Failed to create role. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5, padding: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Create New Role</Typography>

      <form onSubmit={handleSubmit}>
        <TextField
          label="Role Name"
          variant="outlined"
          fullWidth
          value={roleName}
          onChange={handleInputChange}
          error={!!error}
          helperText={error || ''}
          sx={{ mb: 2 }}
          required
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mb: 2 }}
          disabled={loading}
        >
          {loading ? 'Creating Role...' : 'Create Role'}
        </Button>
      </form>

      {successMessage && (
        <Snackbar
          open={true}
          autoHideDuration={4000}
          onClose={() => setSuccessMessage('')}
          message={successMessage}
        />
      )}
    </Box>
  );
};

export default CreateRolePage;
