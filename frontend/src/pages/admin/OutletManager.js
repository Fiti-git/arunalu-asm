import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Drawer, TextField, MenuItem, Typography,
  Alert, Divider, InputAdornment, IconButton, Chip,
  Tabs, Tab, Dialog, DialogContent, DialogActions,
  CircularProgress, Stack, InputBase, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import MapIcon from '@mui/icons-material/Map';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from 'utils/api';
import MapDialog from 'components/MapDialog';

// ─── Validation ──────────────────────────────────────────────────────────────
const outletSchema = yup.object({
  name: yup.string().required('Outlet name is required'),
  address: yup.string().required('Address is required'),
  latitude: yup.number().required('Latitude is required').typeError('Must be a number'),
  longitude: yup.number().required('Longitude is required').typeError('Must be a number'),
  radius_meters: yup.number().required('Radius is required').min(1, 'Min 1 meter').typeError('Must be a number'),
});

const defaultValues = {
  name: '', address: '',
  latitude: '', longitude: '', radius_meters: 100,
  manager: '', agency: '',
};

// ─── Color palette for outlet avatars ────────────────────────────────────────
const COLORS = ['#3b5bdb','#0c8599','#2f9e44','#e67700','#c92a2a','#5f3dc4','#1864ab','#862e9c'];
const getColor = (name) => {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (name.charCodeAt(i) + h * 31) % COLORS.length;
  return COLORS[h];
};
const getInitials = (name) => (name || '?').slice(0, 2).toUpperCase();

function SectionLabel({ icon, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
      <Box sx={{ color: '#1976d2', display: 'flex' }}>{icon}</Box>
      <Typography variant="overline" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.72rem', letterSpacing: 1.5 }}>
        {children}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: '#e8e8e8', ml: 1 }} />
    </Box>
  );
}

// ─── Outlet Card ──────────────────────────────────────────────────────────────
function OutletCard({ outlet, onEdit, onDelete }) {
  const color = getColor(outlet.name);
  return (
    <Box sx={{
      bgcolor: '#fff', border: '1px solid #ebebeb', borderRadius: 3, p: 2.5,
      display: 'flex', flexDirection: 'column', gap: 1.5,
      transition: 'box-shadow 0.18s, transform 0.18s',
      '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.09)', transform: 'translateY(-2px)' },
    }}>
      {/* Top row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2,
          bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: '1rem', letterSpacing: 1,
          flexShrink: 0,
        }}>
          {getInitials(outlet.name)}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit outlet">
            <IconButton size="small" onClick={() => onEdit(outlet)}
              sx={{ border: '1px solid #ebebeb', borderRadius: 2, color: '#888',
                '&:hover': { bgcolor: '#e3f2fd', color: '#1976d2', borderColor: '#90caf9' } }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deactivate outlet">
            <IconButton size="small" onClick={() => onDelete(outlet)}
              sx={{ border: '1px solid #ebebeb', borderRadius: 2, color: '#888',
                '&:hover': { bgcolor: '#ffebee', color: '#c62828', borderColor: '#ef9a9a' } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Name */}
      <Box>
        <Typography variant="subtitle2" fontWeight={700} color="#111"
          sx={{ lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {outlet.name}
        </Typography>
        {outlet.address && (
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {outlet.address}
          </Typography>
        )}
      </Box>

      <Divider sx={{ borderColor: '#f5f5f5' }} />

      {/* Coordinates */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
        <LocationOnOutlinedIcon sx={{ fontSize: 14, color: '#bbb' }} />
        <Typography variant="caption" color="text.secondary">
          {outlet.latitude?.toFixed(4)}, {outlet.longitude?.toFixed(4)}
        </Typography>
      </Box>

      {/* Radius */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
        <RadioButtonCheckedIcon sx={{ fontSize: 14, color: '#bbb' }} />
        <Typography variant="caption" color="text.secondary">
          {outlet.radius_meters} m radius
        </Typography>
      </Box>

      {/* Manager chip */}
      {outlet.manager_name && (
        <Chip label={outlet.manager_name} size="small" icon={<PersonOutlineIcon sx={{ fontSize: '14px !important' }} />}
          sx={{ alignSelf: 'flex-start', bgcolor: '#e8f4fd', color: '#1565c0', fontWeight: 600, fontSize: '0.72rem', height: 22 }} />
      )}

      {/* Agency */}
      {outlet.agency_name && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2e7d32', flexShrink: 0 }} />
          <Typography variant="caption" color="#2e7d32" fontWeight={600}>{outlet.agency_name}</Typography>
        </Box>
      )}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OutletManager() {
  const [outlets, setOutlets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const searchTimeout = useRef(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createMapOpen, setCreateMapOpen] = useState(false);

  // Edit drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editOutlet, setEditOutlet] = useState(null);
  const [editTab, setEditTab] = useState(0);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editMapOpen, setEditMapOpen] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const createForm = useForm({ defaultValues, resolver: yupResolver(outletSchema) });
  const editForm = useForm({ defaultValues, resolver: yupResolver(outletSchema) });
  const createErrors = createForm.formState.errors;
  const editErrors = editForm.formState.errors;

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchOutlets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v2/outlets/');
      setOutlets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutlets();
    Promise.all([
      api.get('/api/getemployees').catch(() => ({ data: [] })),
      api.get('/api/getagencies/').catch(() => ({ data: [] })),
    ]).then(([emp, ag]) => {
      const d = emp.data;
      setEmployees(Array.isArray(d) ? d : (d.results || []));
      setAgencies(ag.data);
    });
  }, [fetchOutlets]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {}, 300);
  };

  const filtered = outlets.filter(o =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.address?.toLowerCase().includes(search.toLowerCase()) ||
    o.manager_name?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Create ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    createForm.reset({ ...defaultValues });
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
    const valid = await createForm.trigger();
    if (!valid) return;
    setCreateSaving(true);
    setCreateError('');
    const data = createForm.getValues();
    try {
      await api.post('/api/v2/outlets/create/', data);
      setCreateOpen(false);
      fetchOutlets();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([f, m]) => {
          if (f === 'non_field') setCreateError(m);
          else createForm.setError(f, { message: m });
        });
      } else {
        setCreateError('An unexpected error occurred.');
      }
    } finally {
      setCreateSaving(false);
    }
  };

  // ─── Edit ────────────────────────────────────────────────────────────────
  const openEdit = (outlet) => {
    setEditOutlet(outlet);
    setEditTab(0);
    setEditError('');
    editForm.reset({
      name: outlet.name || '',
      address: outlet.address || '',
      latitude: outlet.latitude ?? '',
      longitude: outlet.longitude ?? '',
      radius_meters: outlet.radius_meters ?? 100,
      manager: outlet.manager || '',
      agency: outlet.agency || '',
    });
    setEditDrawerOpen(true);
  };

  const handleEditSave = async () => {
    const valid = await editForm.trigger();
    if (!valid) { setEditTab(0); return; }
    setEditSaving(true);
    setEditError('');
    const data = editForm.getValues();
    try {
      await api.put(`/api/v2/outlets/${editOutlet.id}/`, data);
      setEditDrawerOpen(false);
      fetchOutlets();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) Object.entries(serverErrors).forEach(([f, m]) => {
        if (f === 'non_field') setEditError(m); else editForm.setError(f, { message: m });
      });
      else setEditError('An unexpected error occurred.');
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const promptDelete = (outlet) => {
    setDeleteTarget(outlet);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/v2/outlets/${deleteTarget.id}/delete/`);
      setDeleteConfirmOpen(false);
      fetchOutlets();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Map helpers ─────────────────────────────────────────────────────────
  const handleCreateMapSave = ({ lat, lng }) => {
    createForm.setValue('latitude', lat);
    createForm.setValue('longitude', lng);
    setCreateMapOpen(false);
  };

  const handleEditMapSave = ({ lat, lng }) => {
    editForm.setValue('latitude', lat);
    editForm.setValue('longitude', lng);
    setEditMapOpen(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111" sx={{ letterSpacing: '-0.3px' }}>Outlets</Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Loading…' : `${filtered.length} outlets`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 2, px: 1.5, py: 0.6,
            '&:focus-within': { borderColor: '#1976d2', boxShadow: '0 0 0 2px rgba(25,118,210,0.12)' },
          }}>
            <SearchIcon sx={{ fontSize: 18, color: '#bbb' }} />
            <InputBase placeholder="Search outlets…" value={search} onChange={handleSearchChange}
              sx={{ fontSize: '0.85rem', width: 200 }} />
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', px: 2.5, py: 1,
              bgcolor: '#1976d2', boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
              '&:hover': { bgcolor: '#1565c0' } }}>
            Add Outlet
          </Button>
        </Box>
      </Box>

      {/* ── Card Grid ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={32} sx={{ color: '#1976d2' }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <StorefrontOutlinedIcon sx={{ fontSize: 52, color: '#ddd', mb: 1 }} />
          <Typography color="text.secondary">No outlets found</Typography>
        </Box>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}>
          {filtered.map(o => (
            <OutletCard key={o.id} outlet={o} onEdit={openEdit} onDelete={promptDelete} />
          ))}
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CREATE — Dialog                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' } }}>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>New Outlet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Fill in the outlet details below
            </Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)} size="small" sx={{ color: '#999' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{createError}</Alert>}

          <SectionLabel icon={<StorefrontOutlinedIcon sx={{ fontSize: 18 }} />}>Basic Info</SectionLabel>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Controller name="name" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Outlet Name *" size="small" fullWidth error={!!createErrors.name} helperText={createErrors.name?.message} />
            )} />
            <Controller name="address" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Address *" size="small" fullWidth error={!!createErrors.address} helperText={createErrors.address?.message} />
            )} />
          </Stack>

          <SectionLabel icon={<LocationOnOutlinedIcon sx={{ fontSize: 18 }} />}>Location</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Controller name="latitude" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Latitude *" size="small" fullWidth type="number"
                error={!!createErrors.latitude} helperText={createErrors.latitude?.message} />
            )} />
            <Controller name="longitude" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Longitude *" size="small" fullWidth type="number"
                error={!!createErrors.longitude} helperText={createErrors.longitude?.message} />
            )} />
          </Box>
          <Button size="small" startIcon={<MapIcon />} onClick={() => setCreateMapOpen(true)}
            sx={{ textTransform: 'none', mb: 2, color: '#1976d2' }}>
            Pick on Map
          </Button>
          <Box sx={{ mb: 2 }}>
            <Controller name="radius_meters" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Radius *" size="small" type="number"
                sx={{ width: '50%' }} error={!!createErrors.radius_meters} helperText={createErrors.radius_meters?.message}
                InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
            )} />
          </Box>

          <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Assignment</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Controller name="manager" control={createForm.control} render={({ field }) => (
              <TextField {...field} select label="Manager" size="small" fullWidth>
                <MenuItem value="">— None —</MenuItem>
                {employees.map(e => <MenuItem key={e.employee_id} value={e.employee_id}>{e.fullname}</MenuItem>)}
              </TextField>
            )} />
            <Controller name="agency" control={createForm.control} render={({ field }) => (
              <TextField {...field} select label="Agency" size="small" fullWidth>
                <MenuItem value="">— None —</MenuItem>
                {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
            )} />
          </Box>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', color: '#666' }}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant="contained" disabled={createSaving}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3 }}
            startIcon={createSaving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}>
            {createSaving ? 'Creating…' : 'Create Outlet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* EDIT — Side Drawer                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Drawer anchor="right" open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2.5, bgcolor: '#f9fafb', borderBottom: '1px solid #ebebeb', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2, bgcolor: getColor(editOutlet?.name || ''),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '1rem',
            }}>
              {getInitials(editOutlet?.name || '')}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} color="#111">{editOutlet?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{editOutlet?.address || 'No address'}</Typography>
            </Box>
            <IconButton onClick={() => setEditDrawerOpen(false)} size="small" sx={{ color: '#999' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Tabs value={editTab} onChange={(_, v) => setEditTab(v)}
          sx={{ px: 2, borderBottom: '1px solid #ebebeb', flexShrink: 0,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', minWidth: 0, px: 2 } }}>
          <Tab label="Details" icon={<StorefrontOutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Location" icon={<LocationOnOutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Assignment" icon={<PersonOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {editError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{editError}</Alert>}

          {editTab === 0 && (
            <Stack spacing={2}>
              <SectionLabel icon={<StorefrontOutlinedIcon sx={{ fontSize: 18 }} />}>Basic Info</SectionLabel>
              <Controller name="name" control={editForm.control} render={({ field }) => (
                <TextField {...field} label="Outlet Name *" size="small" fullWidth error={!!editErrors.name} helperText={editErrors.name?.message} />
              )} />
              <Controller name="address" control={editForm.control} render={({ field }) => (
                <TextField {...field} label="Address *" size="small" fullWidth error={!!editErrors.address} helperText={editErrors.address?.message} />
              )} />
            </Stack>
          )}

          {editTab === 1 && (
            <Box>
              <SectionLabel icon={<LocationOnOutlinedIcon sx={{ fontSize: 18 }} />}>Location</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Controller name="latitude" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Latitude *" size="small" fullWidth type="number"
                    error={!!editErrors.latitude} helperText={editErrors.latitude?.message} />
                )} />
                <Controller name="longitude" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Longitude *" size="small" fullWidth type="number"
                    error={!!editErrors.longitude} helperText={editErrors.longitude?.message} />
                )} />
              </Box>
              <Button size="small" startIcon={<MapIcon />} onClick={() => setEditMapOpen(true)}
                sx={{ textTransform: 'none', mb: 2, color: '#1976d2' }}>
                Pick on Map
              </Button>
              <Controller name="radius_meters" control={editForm.control} render={({ field }) => (
                <TextField {...field} label="Radius *" size="small" type="number" fullWidth
                  error={!!editErrors.radius_meters} helperText={editErrors.radius_meters?.message}
                  InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
              )} />
            </Box>
          )}

          {editTab === 2 && (
            <Stack spacing={2}>
              <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />}>Assignment</SectionLabel>
              <Controller name="manager" control={editForm.control} render={({ field }) => (
                <TextField {...field} select label="Manager" size="small" fullWidth>
                  <MenuItem value="">— None —</MenuItem>
                  {employees.map(e => <MenuItem key={e.employee_id} value={e.employee_id}>{e.fullname}</MenuItem>)}
                </TextField>
              )} />
              <Controller name="agency" control={editForm.control} render={({ field }) => (
                <TextField {...field} select label="Agency" size="small" fullWidth>
                  <MenuItem value="">— None —</MenuItem>
                  {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </TextField>
              )} />
            </Stack>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: '1px solid #ebebeb', bgcolor: '#f9fafb', flexShrink: 0, display: 'flex', gap: 1.5 }}>
          <Button onClick={() => setEditDrawerOpen(false)} variant="outlined"
            sx={{ borderRadius: '8px', textTransform: 'none', flex: 1 }}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={editSaving}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, flex: 2 }}
            startIcon={editSaving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Box>
      </Drawer>

      {/* ── Delete Confirm ── */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} mb={1}>Deactivate Outlet?</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            <strong>{deleteTarget?.name}</strong> will be marked inactive and hidden from all lists.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined" sx={{ flex: 1, borderRadius: '8px', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="contained" disabled={deleteLoading}
              color="error" sx={{ flex: 1, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              startIcon={deleteLoading ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
              {deleteLoading ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* ── Map Dialogs ── */}
      <Dialog open={createMapOpen} onClose={() => setCreateMapOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>Select Location</Typography>
          <IconButton onClick={() => setCreateMapOpen(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <DialogContent sx={{ p: 0 }}>
          <MapDialog open={createMapOpen} onClose={() => setCreateMapOpen(false)} onSave={handleCreateMapSave}
            initialCoordinates={{ lat: createForm.getValues('latitude') || 7.2906, lng: createForm.getValues('longitude') || 80.6337 }} />
        </DialogContent>
      </Dialog>

      <Dialog open={editMapOpen} onClose={() => setEditMapOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>Select Location</Typography>
          <IconButton onClick={() => setEditMapOpen(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <DialogContent sx={{ p: 0 }}>
          <MapDialog open={editMapOpen} onClose={() => setEditMapOpen(false)} onSave={handleEditMapSave}
            initialCoordinates={{ lat: editForm.getValues('latitude') || editOutlet?.latitude || 7.2906, lng: editForm.getValues('longitude') || editOutlet?.longitude || 80.6337 }} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
