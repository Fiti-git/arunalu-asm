import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Divider, Card, CardContent,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../../utils/api';

function LicenseConfiguration() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    instance_id: '',
    instance_secret: '',
    license_server_url: '',
    license_public_key_pem: '',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/api/license/config/');
      if (res.data.configured === false) {
        setConfig(null);
        setEditing(true);
      } else {
        setConfig(res.data);
        setForm({
          instance_id: res.data.instance_id || '',
          instance_secret: '',
          license_server_url: res.data.license_server_url || '',
          license_public_key_pem: res.data.license_public_key_pem || '',
        });
      }
    } catch (err) {
      setError('Failed to load license configuration.');
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.instance_secret) payload.instance_secret = '********';
      const res = await api.post('/api/license/config/test/', payload);
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || err.message });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { ...form };
      if (!payload.instance_secret) payload.instance_secret = '********';
      await api.put('/api/license/config/', payload);
      setSuccess('License configuration saved successfully.');
      setEditing(false);
      fetchConfig();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save configuration.');
    }
    setSaving(false);
  };

  const fetchAudit = async () => {
    try {
      const res = await api.get('/api/license/config/audit/');
      setAuditLogs(res.data);
      setShowAudit(true);
    } catch {
      setError('Failed to load audit log.');
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        License Configuration
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Current config display */}
      {config && !editing && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Current Configuration</Typography>
              <Chip label="Configured" color="success" size="small" icon={<CheckCircleIcon />} />
            </Box>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 200 }}>Instance ID</TableCell>
                  <TableCell><code>{config.instance_id}</code></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Instance Secret</TableCell>
                  <TableCell>********</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>License Server</TableCell>
                  <TableCell>{config.license_server_url}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Configured At</TableCell>
                  <TableCell>{new Date(config.configured_at).toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Configured By</TableCell>
                  <TableCell>{config.configured_by_name || '—'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => setEditing(true)}>Update</Button>
              <Button variant="outlined" onClick={handleTest} disabled={testing}>
                {testing ? <CircularProgress size={20} /> : 'Test Connection'}
              </Button>
              <Button variant="text" onClick={fetchAudit}>View Audit Log</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Test result */}
      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          icon={testResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
          sx={{ mb: 2 }}
        >
          {testResult.success
            ? `Connected! Client: ${testResult.client_name}, State: ${testResult.state}, Features: ${testResult.features?.length || 0}`
            : `Connection failed: ${testResult.error}`
          }
        </Alert>
      )}

      {/* Setup / Edit form */}
      {editing && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {config ? 'Update License Configuration' : 'Set Up License'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {config
              ? 'Leave the secret blank to keep the current value.'
              : 'Enter the credentials provided by your service provider.'}
          </Typography>

          <TextField
            label="Instance ID"
            fullWidth
            value={form.instance_id}
            onChange={handleChange('instance_id')}
            sx={{ mb: 2 }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <TextField
            label="Instance Secret"
            fullWidth
            value={form.instance_secret}
            onChange={handleChange('instance_secret')}
            sx={{ mb: 2 }}
            type="password"
            placeholder={config ? 'Leave blank to keep current' : 'Paste your instance secret'}
          />
          <TextField
            label="License Server URL"
            fullWidth
            value={form.license_server_url}
            onChange={handleChange('license_server_url')}
            sx={{ mb: 2 }}
            placeholder="https://licenses.fiti.solutions"
          />
          <TextField
            label="License Public Key (PEM)"
            fullWidth
            multiline
            rows={6}
            value={form.license_public_key_pem}
            onChange={handleChange('license_public_key_pem')}
            sx={{ mb: 3 }}
            placeholder="-----BEGIN PUBLIC KEY-----"
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={handleTest} disabled={testing}>
              {testing ? <CircularProgress size={20} /> : 'Test Connection'}
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Save Configuration'}
            </Button>
            {config && (
              <Button variant="text" onClick={() => setEditing(false)}>Cancel</Button>
            )}
          </Box>
        </Paper>
      )}

      {/* Audit log */}
      {showAudit && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>Audit Log</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Fields Changed</TableCell>
                  <TableCell>Success</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell><Chip label={log.action} size="small" /></TableCell>
                    <TableCell>{log.actor_name || '—'}</TableCell>
                    <TableCell>{log.fields_changed?.join(', ') || '—'}</TableCell>
                    <TableCell>{log.success ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{log.ip_address}</TableCell>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {auditLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No audit entries.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}

export default LicenseConfiguration;
