import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert, Divider, CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

const EMPTY = {
  company_name: '',
  employer_epf_number: '',
  employer_etf_number: '',
  epf_zone_code: 'A',
  data_submission_number: 1,
  company_bank_name: '',
  company_bank_code: '',
  company_bank_branch_code: '',
  company_bank_account_no: '',
};

export default function PayrollCompanyConfig() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/payroll/company-config/');
        setForm({ ...EMPTY, ...res.data });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load company config.');
      } finally { setLoading(false); }
    })();
  }, []);

  const onChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const { id, updated_at, ...payload } = form;
      payload.data_submission_number = Number(payload.data_submission_number) || 1;
      const res = await api.patch('/payroll/company-config/', payload);
      setForm({ ...EMPTY, ...res.data });
      setSuccess('Saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed. Admin only.');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  const Section = ({ title, children }) => (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>{title}</Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        {children}
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ width: 780, maxWidth: '95%', mx: 'auto', mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Payroll Company Config"
        subtitle="One-time company-level constants used in EPF / ETF / Bank export files."
        actions={
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            disabled={saving}
            onClick={save}
          >
            Save
          </Button>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <Section title="Company Identity">
        <TextField label="Company Name" fullWidth value={form.company_name} onChange={onChange('company_name')} />
        <TextField label="EPF Zone Code" fullWidth value={form.epf_zone_code} onChange={onChange('epf_zone_code')}
          helperText="Usually 'A'" />
      </Section>

      <Section title="EPF / ETF Employer Identity">
        <TextField label="Employer EPF Number" fullWidth value={form.employer_epf_number} onChange={onChange('employer_epf_number')} />
        <TextField label="Employer ETF Number" fullWidth value={form.employer_etf_number} onChange={onChange('employer_etf_number')} />
        <TextField label="Next EPF Data Submission #" fullWidth type="number"
          value={form.data_submission_number} onChange={onChange('data_submission_number')}
          helperText="Auto-increments each month after export" />
      </Section>

      <Section title="Company Disbursement Bank Account">
        <TextField label="Bank Name" fullWidth value={form.company_bank_name} onChange={onChange('company_bank_name')} />
        <TextField label="Bank Code" fullWidth value={form.company_bank_code} onChange={onChange('company_bank_code')}
          helperText="e.g. 7135 = People's Bank" />
        <TextField label="Branch Code" fullWidth value={form.company_bank_branch_code} onChange={onChange('company_bank_branch_code')} />
        <TextField label="Account Number" fullWidth value={form.company_bank_account_no} onChange={onChange('company_bank_account_no')} />
      </Section>
    </Box>
  );
}
