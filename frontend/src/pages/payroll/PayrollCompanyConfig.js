import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert, Divider, CircularProgress,
  Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

const EMPTY_ORG = {
  company_name: '', employer_epf_number: '', employer_etf_number: '',
  epf_zone_code: 'A', data_submission_number: 1,
  company_bank_name: '', company_bank_code: '',
  company_bank_branch_code: '', company_bank_account_no: '',
};

const EMPTY_AGENCY_FORM = {
  company_name: '', employer_epf_number: '', employer_etf_number: '',
  epf_zone_code: '', data_submission_number: 1,
  company_bank_name: '', company_bank_code: '',
  company_bank_branch_code: '', company_bank_account_no: '',
};

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>{title}</Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        {children}
      </Box>
    </Paper>
  );
}

function OrgDefaultTab() {
  const [form, setForm] = useState(EMPTY_ORG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/payroll/company-config/');
        setForm({ ...EMPTY_ORG, ...res.data });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load company config.');
      } finally { setLoading(false); }
    })();
  }, []);

  const onChange = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const save = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const { id, updated_at, ...payload } = form;
      payload.data_submission_number = Number(payload.data_submission_number) || 1;
      const res = await api.patch('/payroll/company-config/', payload);
      setForm({ ...EMPTY_ORG, ...res.data });
      setSuccess('Saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed. Admin only.');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <Section title="Company Identity">
        <TextField label="Company Name" fullWidth value={form.company_name} onChange={onChange('company_name')} />
        <TextField label="EPF Zone Code" fullWidth value={form.epf_zone_code} onChange={onChange('epf_zone_code')} helperText="Usually 'A'" />
      </Section>
      <Section title="EPF / ETF Employer Identity">
        <TextField label="Employer EPF Number" fullWidth value={form.employer_epf_number} onChange={onChange('employer_epf_number')} />
        <TextField label="Employer ETF Number" fullWidth value={form.employer_etf_number} onChange={onChange('employer_etf_number')} />
        <TextField label="Next EPF Data Submission #" fullWidth type="number"
          value={form.data_submission_number} onChange={onChange('data_submission_number')}
          helperText="Auto-increments each month after export" />
      </Section>
      <Section title="Default Disbursement Bank Account">
        <TextField label="Bank Name" fullWidth value={form.company_bank_name} onChange={onChange('company_bank_name')} />
        <TextField label="Bank Code" fullWidth value={form.company_bank_code} onChange={onChange('company_bank_code')} />
        <TextField label="Branch Code" fullWidth value={form.company_bank_branch_code} onChange={onChange('company_bank_branch_code')} />
        <TextField label="Account Number" fullWidth value={form.company_bank_account_no} onChange={onChange('company_bank_account_no')} />
      </Section>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={saving} onClick={save}>Save</Button>
      </Box>
    </Box>
  );
}

function AgencyTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // row being edited
  const [form, setForm] = useState(EMPTY_AGENCY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/payroll/agency-profiles/');
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load agency profiles.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      company_name: row.company_name || '',
      employer_epf_number: row.employer_epf_number || '',
      employer_etf_number: row.employer_etf_number || '',
      epf_zone_code: row.epf_zone_code || '',
      data_submission_number: row.data_submission_number || 1,
      company_bank_name: row.company_bank_name || '',
      company_bank_code: row.company_bank_code || '',
      company_bank_branch_code: row.company_bank_branch_code || '',
      company_bank_account_no: row.company_bank_account_no || '',
    });
  };

  const closeEdit = () => { setEditing(null); setForm(EMPTY_AGENCY_FORM); };

  const onChange = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        agency: editing.agency,
        data_submission_number: Number(form.data_submission_number) || 1,
      };
      if (editing.id) {
        await api.patch(`/payroll/agency-profiles/${editing.id}/`, payload);
      } else {
        await api.post('/payroll/agency-profiles/', payload);
      }
      closeEdit();
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Agency</TableCell>
              <TableCell>Employer EPF #</TableCell>
              <TableCell>Employer ETF #</TableCell>
              <TableCell>Zone</TableCell>
              <TableCell>Bank</TableCell>
              <TableCell>Account</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.agency} hover>
                <TableCell>
                  {r.agency_name}
                  {!r.id && <Chip size="small" label="No profile" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell>{r.employer_epf_number || '—'}</TableCell>
                <TableCell>{r.employer_etf_number || '—'}</TableCell>
                <TableCell>{r.epf_zone_code || '—'}</TableCell>
                <TableCell>{r.company_bank_name || '—'}</TableCell>
                <TableCell>{r.company_bank_account_no || '—'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">No agencies defined.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!editing} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>{editing?.agency_name} — Payroll Profile</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
            <TextField label="Company Name" value={form.company_name} onChange={onChange('company_name')} />
            <TextField label="EPF Zone Code" value={form.epf_zone_code} onChange={onChange('epf_zone_code')} />
            <TextField label="Employer EPF #" value={form.employer_epf_number} onChange={onChange('employer_epf_number')} />
            <TextField label="Employer ETF #" value={form.employer_etf_number} onChange={onChange('employer_etf_number')} />
            <TextField label="Next Submission #" type="number"
              value={form.data_submission_number} onChange={onChange('data_submission_number')} />
            <TextField label="Bank Name" value={form.company_bank_name} onChange={onChange('company_bank_name')} />
            <TextField label="Bank Code" value={form.company_bank_code} onChange={onChange('company_bank_code')} />
            <TextField label="Branch Code" value={form.company_bank_branch_code} onChange={onChange('company_bank_branch_code')} />
            <TextField label="Account Number" sx={{ gridColumn: '1 / -1' }}
              value={form.company_bank_account_no} onChange={onChange('company_bank_account_no')} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button variant="contained" onClick={saveProfile} disabled={saving}>
            {saving ? <CircularProgress size={16} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function PayrollCompanyConfig() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ width: 1000, maxWidth: '95%', mx: 'auto', mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Payroll Company Config"
        subtitle="Organization-wide defaults and per-agency overrides for EPF / ETF / Bank exports."
      />
      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Organization Default" />
          <Tab label="Per-Agency" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 ? <OrgDefaultTab /> : <AgencyTab />}
        </Box>
      </Paper>
    </Box>
  );
}
