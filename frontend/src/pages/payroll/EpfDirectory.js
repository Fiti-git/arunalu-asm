import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Tabs, Tab, Table, TableHead, TableBody, TableRow,
  TableCell, IconButton, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, CircularProgress, Chip,
  FormControlLabel, Switch, Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

function ZonesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', is_active: true });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/lookups/epf-zones/');
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load zones.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (row = null) => {
    setEditing(row);
    setForm(row ? { code: row.code, name: row.name || '', is_active: row.is_active } : { code: '', name: '', is_active: true });
  };
  const close = () => setEditing(null);

  const save = async () => {
    try {
      if (editing && editing.id) await api.patch(`/payroll/lookups/epf-zones/${editing.id}/`, form);
      else await api.post('/payroll/lookups/epf-zones/', form);
      close(); load();
    } catch (err) { setError(err.response?.data?.error || 'Save failed.'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this zone?')) return;
    await api.delete(`/payroll/lookups/epf-zones/${id}/`);
    load();
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add Zone</Button>
      </Box>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell><TableCell>Name</TableCell>
              <TableCell>Active</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.code}</TableCell>
                <TableCell>{r.name || '—'}</TableCell>
                <TableCell>{r.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => open(r)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => remove(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} align="center">No zones defined.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!editing || editing === null && form.code !== ''} onClose={close}>
        <DialogTitle>{editing?.id ? 'Edit' : 'Add'} EPF Zone</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, minWidth: 320 }}>
          <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Active" />
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function BanksTab() {
  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [editingBank, setEditingBank] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [bankForm, setBankForm] = useState({ code: '', name: '', is_active: true });
  const [branchForm, setBranchForm] = useState({ code: '', name: '', is_active: true });
  const [error, setError] = useState('');

  const loadBanks = useCallback(async () => {
    const res = await api.get('/payroll/lookups/banks/');
    setBanks(res.data || []);
  }, []);
  useEffect(() => { loadBanks(); }, [loadBanks]);

  const loadBranches = useCallback(async (bankId) => {
    if (!bankId) { setBranches([]); return; }
    const res = await api.get(`/payroll/lookups/bank-branches/?bank=${bankId}`);
    setBranches(res.data || []);
  }, []);
  useEffect(() => { loadBranches(selectedBank); }, [selectedBank, loadBranches]);

  const openBank = (b = null) => {
    setEditingBank(b || { isNew: true });
    setBankForm(b ? { code: b.code, name: b.name, is_active: b.is_active } : { code: '', name: '', is_active: true });
  };
  const saveBank = async () => {
    try {
      if (editingBank?.id) await api.patch(`/payroll/lookups/banks/${editingBank.id}/`, bankForm);
      else await api.post('/payroll/lookups/banks/', bankForm);
      setEditingBank(null); loadBanks();
    } catch (err) { setError(err.response?.data?.error || 'Save failed.'); }
  };
  const deleteBank = async (id) => {
    if (!window.confirm('Delete bank and all its branches?')) return;
    await api.delete(`/payroll/lookups/banks/${id}/`);
    if (selectedBank === id) setSelectedBank(null);
    loadBanks();
  };

  const openBranch = (br = null) => {
    setEditingBranch(br || { isNew: true });
    setBranchForm(br ? { code: br.code, name: br.name, is_active: br.is_active } : { code: '', name: '', is_active: true });
  };
  const saveBranch = async () => {
    try {
      const payload = { ...branchForm, bank: selectedBank };
      if (editingBranch?.id) await api.patch(`/payroll/lookups/bank-branches/${editingBranch.id}/`, payload);
      else await api.post('/payroll/lookups/bank-branches/', payload);
      setEditingBranch(null); loadBranches(selectedBank);
    } catch (err) { setError(err.response?.data?.error || 'Save failed.'); }
  };
  const deleteBranch = async (id) => {
    if (!window.confirm('Delete branch?')) return;
    await api.delete(`/payroll/lookups/bank-branches/${id}/`);
    loadBranches(selectedBank);
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      {error && <Alert severity="error" sx={{ gridColumn: '1 / -1' }} onClose={() => setError('')}>{error}</Alert>}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Banks</Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openBank()}>Add</Button>
        </Box>
        <Paper variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Code</TableCell><TableCell>Name</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>
              {banks.map((b) => (
                <TableRow key={b.id} hover selected={selectedBank === b.id}
                  onClick={() => setSelectedBank(b.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>{b.code}</TableCell>
                  <TableCell>{b.name}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openBank(b); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteBank(b.id); }}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {banks.length === 0 && <TableRow><TableCell colSpan={3} align="center">No banks.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Branches {selectedBank && <Chip size="small" label={banks.find((b) => b.id === selectedBank)?.name} />}
          </Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon />}
            disabled={!selectedBank} onClick={() => openBranch()}>Add</Button>
        </Box>
        <Paper variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>Code</TableCell><TableCell>Name</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>
              {branches.map((br) => (
                <TableRow key={br.id} hover>
                  <TableCell>{br.code}</TableCell>
                  <TableCell>{br.name}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openBranch(br)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => deleteBranch(br.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {branches.length === 0 && <TableRow><TableCell colSpan={3} align="center">{selectedBank ? 'No branches.' : 'Select a bank.'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Dialog open={!!editingBank} onClose={() => setEditingBank(null)}>
        <DialogTitle>{editingBank?.id ? 'Edit' : 'Add'} Bank</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, minWidth: 320 }}>
          <TextField label="Code" value={bankForm.code} onChange={(e) => setBankForm({ ...bankForm, code: e.target.value })} />
          <TextField label="Name" value={bankForm.name} onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })} />
          <FormControlLabel control={<Switch checked={bankForm.is_active} onChange={(e) => setBankForm({ ...bankForm, is_active: e.target.checked })} />} label="Active" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingBank(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveBank}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingBranch} onClose={() => setEditingBranch(null)}>
        <DialogTitle>{editingBranch?.id ? 'Edit' : 'Add'} Branch</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, minWidth: 320 }}>
          <TextField label="Code" value={branchForm.code} onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })} />
          <TextField label="Name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
          <FormControlLabel control={<Switch checked={branchForm.is_active} onChange={(e) => setBranchForm({ ...branchForm, is_active: e.target.checked })} />} label="Active" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingBranch(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveBranch}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PatternsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ prefix: '', suffix: '', padding: 4, next_seq: 1, is_active: true });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/outlet-epf-patterns/');
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load patterns.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (row) => {
    setEditing(row);
    setForm({
      prefix: row.prefix || '', suffix: row.suffix || '',
      padding: row.padding || 4, next_seq: row.next_seq || 1,
      is_active: row.is_active !== false,
    });
  };
  const close = () => setEditing(null);

  const save = async () => {
    try {
      const payload = {
        ...form, outlet: editing.outlet,
        padding: Number(form.padding) || 4,
        next_seq: Number(form.next_seq) || 1,
      };
      if (editing.id) await api.patch(`/payroll/outlet-epf-patterns/${editing.id}/`, payload);
      else await api.post('/payroll/outlet-epf-patterns/', payload);
      close(); load();
    } catch (err) { setError(err.response?.data?.error || 'Save failed.'); }
  };

  const generate = async (row, overwrite = false) => {
    if (!row.id) { setError('Define and save a pattern first.'); return; }
    if (!window.confirm(`Generate EPF numbers for ${overwrite ? 'ALL' : 'unassigned'} employees in ${row.outlet_name}?`)) return;
    try {
      const url = `/payroll/outlet-epf-patterns/outlet/${row.outlet}/generate/${overwrite ? '?overwrite=1' : ''}`;
      const res = await api.post(url);
      setInfo(`Issued ${res.data.count} EPF numbers in ${row.outlet_name}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed.');
    }
  };

  const renderPreview = () => {
    const seq = String(form.next_seq).padStart(Number(form.padding) || 0, '0');
    return `${form.prefix}${seq}${form.suffix}`;
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo('')}>{info}</Alert>}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Outlet</TableCell><TableCell>Pattern</TableCell>
              <TableCell>Next Sample</TableCell><TableCell>Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.outlet} hover>
                <TableCell>{r.outlet_name}</TableCell>
                <TableCell>
                  {r.id
                    ? <code>{r.prefix}{'#'.repeat(r.padding)}{r.suffix}</code>
                    : <Chip size="small" label="Not configured" />}
                </TableCell>
                <TableCell><code>{r.sample}</code></TableCell>
                <TableCell>{r.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => open(r)}><EditIcon fontSize="small" /></IconButton>
                  <Button size="small" startIcon={<PlayArrowIcon />} disabled={!r.id || !r.is_active}
                    onClick={() => generate(r, false)}>Generate</Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center">No outlets.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!editing} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>{editing?.outlet_name} — EPF Pattern</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Prefix" value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} />
          <TextField label="Suffix" value={form.suffix} onChange={(e) => setForm({ ...form, suffix: e.target.value })} />
          <TextField label="Padding (digits)" type="number" value={form.padding}
            onChange={(e) => setForm({ ...form, padding: e.target.value })} />
          <TextField label="Next Sequence #" type="number" value={form.next_seq}
            onChange={(e) => setForm({ ...form, next_seq: e.target.value })}
            helperText="The next employee will receive this number; counter advances after each issue." />
          <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label="Active" />
          <Divider />
          <Typography variant="caption" color="text.secondary">Preview next: <code>{renderPreview()}</code></Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function EpfDirectory() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ width: 1100, maxWidth: '95%', mx: 'auto', mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="EPF / Bank Directory"
        subtitle="Managed lookups (zones, banks, branches) and per-outlet EPF member-number patterns with bulk generator."
      />
      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="EPF Zones" />
          <Tab label="Banks & Branches" />
          <Tab label="Outlet EPF Patterns" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <ZonesTab />}
          {tab === 1 && <BanksTab />}
          {tab === 2 && <PatternsTab />}
        </Box>
      </Paper>
    </Box>
  );
}
