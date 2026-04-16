import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Drawer, TextField, MenuItem, Typography,
  Alert, Divider, InputAdornment, IconButton,
  Tabs, Tab, Dialog, DialogContent, DialogActions,
  CircularProgress, Stack, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
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
import { PageHeader, SectionLabel, SearchInput } from 'components/ui';
import { pickAvatarColor } from 'theme/tokens';

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

const getInitials = (name) => (name || '?').slice(0, 2).toUpperCase();

function OutletCard({ outlet, onEdit, onDelete }) {
  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      borderRadius: 3,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.18s, transform 0.18s',
      '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
    }}>
      {/* Banner — holds the outlet name */}
      <Box sx={{
        position: 'relative',
        px: 2.5,
        pt: 2,
        pb: 2.25,
        color: 'common.white',
        backgroundImage: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, pr: 9 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <StorefrontOutlinedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {outlet.name}
            </Typography>
            {outlet.address && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'rgba(255,255,255,0.8)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {outlet.address}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit outlet">
            <IconButton
              size="small"
              onClick={() => onEdit(outlet)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: 'common.white',
                backdropFilter: 'blur(4px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deactivate outlet">
            <IconButton
              size="small"
              onClick={() => onDelete(outlet)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: 'common.white',
                backdropFilter: 'blur(4px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Meta block */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 0.9 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <LocationOnOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary" noWrap>
            {outlet.latitude?.toFixed(4)}, {outlet.longitude?.toFixed(4)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <RadioButtonCheckedIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">
            {outlet.radius_meters} m radius
          </Typography>
        </Box>

        {outlet.manager_name && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
            <PersonOutlineIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {outlet.manager_name}
            </Typography>
          </Box>
        )}

        {outlet.agency_name && (
          <Box
            sx={{
              mt: 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              alignSelf: 'flex-start',
              bgcolor: 'success.light',
              color: 'success.dark',
              borderRadius: 999,
              px: 1,
              py: 0.25,
            }}
          >
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'success.main' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.68rem' }}>
              {outlet.agency_name}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function OutletManager() {
  const [outlets, setOutlets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const searchTimeout = useRef(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createMapOpen, setCreateMapOpen] = useState(false);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editOutlet, setEditOutlet] = useState(null);
  const [editTab, setEditTab] = useState(0);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editMapOpen, setEditMapOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const createForm = useForm({ defaultValues, resolver: yupResolver(outletSchema) });
  const editForm = useForm({ defaultValues, resolver: yupResolver(outletSchema) });
  const createErrors = createForm.formState.errors;
  const editErrors = editForm.formState.errors;

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

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Outlets"
        subtitle={loading ? 'Loading…' : `${filtered.length} outlets`}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search outlets…"
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add Outlet
            </Button>
          </>
        }
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={32} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <StorefrontOutlinedIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
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

      {/* CREATE Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5">New Outlet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Fill in the outlet details below
            </Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}

          <SectionLabel icon={<StorefrontOutlinedIcon />}>Basic Info</SectionLabel>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Controller name="name" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Outlet Name *" fullWidth error={!!createErrors.name} helperText={createErrors.name?.message} />
            )} />
            <Controller name="address" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Address *" fullWidth error={!!createErrors.address} helperText={createErrors.address?.message} />
            )} />
          </Stack>

          <SectionLabel icon={<LocationOnOutlinedIcon />}>Location</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Controller name="latitude" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Latitude *" fullWidth type="number"
                error={!!createErrors.latitude} helperText={createErrors.latitude?.message} />
            )} />
            <Controller name="longitude" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Longitude *" fullWidth type="number"
                error={!!createErrors.longitude} helperText={createErrors.longitude?.message} />
            )} />
          </Box>
          <Button size="small" startIcon={<MapIcon />} onClick={() => setCreateMapOpen(true)} sx={{ mb: 2 }}>
            Pick on Map
          </Button>
          <Box sx={{ mb: 2 }}>
            <Controller name="radius_meters" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Radius *" type="number"
                sx={{ width: '50%' }} error={!!createErrors.radius_meters} helperText={createErrors.radius_meters?.message}
                InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
            )} />
          </Box>

          <SectionLabel icon={<PersonOutlineIcon />}>Assignment</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Controller name="manager" control={createForm.control} render={({ field }) => (
              <TextField {...field} select label="Manager" fullWidth>
                <MenuItem value="">— None —</MenuItem>
                {employees.map(e => <MenuItem key={e.employee_id} value={e.employee_id}>{e.fullname}</MenuItem>)}
              </TextField>
            )} />
            <Controller name="agency" control={createForm.control} render={({ field }) => (
              <TextField {...field} select label="Agency" fullWidth>
                <MenuItem value="">— None —</MenuItem>
                {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
            )} />
          </Box>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant="contained" disabled={createSaving}
            sx={{ px: 3 }}
            startIcon={createSaving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}>
            {createSaving ? 'Creating…' : 'Create Outlet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT Drawer */}
      <Drawer anchor="right" open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2, bgcolor: pickAvatarColor(editOutlet?.name || ''),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'common.white', fontWeight: 800, fontSize: '1rem',
            }}>
              {getInitials(editOutlet?.name || '')}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>{editOutlet?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{editOutlet?.address || 'No address'}</Typography>
            </Box>
            <IconButton onClick={() => setEditDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Tabs value={editTab} onChange={(_, v) => setEditTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Tab label="Details" icon={<StorefrontOutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Location" icon={<LocationOnOutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Assignment" icon={<PersonOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}

          {editTab === 0 && (
            <Stack spacing={2}>
              <SectionLabel icon={<StorefrontOutlinedIcon />}>Basic Info</SectionLabel>
              <Controller name="name" control={editForm.control} render={({ field }) => (
                <TextField {...field} label="Outlet Name *" fullWidth error={!!editErrors.name} helperText={editErrors.name?.message} />
              )} />
              <Controller name="address" control={editForm.control} render={({ field }) => (
                <TextField {...field} label="Address *" fullWidth error={!!editErrors.address} helperText={editErrors.address?.message} />
              )} />
            </Stack>
          )}

          {editTab === 1 && (
            <Box>
              <SectionLabel icon={<LocationOnOutlinedIcon />}>Location</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Controller name="latitude" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Latitude *" fullWidth type="number"
                    error={!!editErrors.latitude} helperText={editErrors.latitude?.message} />
                )} />
                <Controller name="longitude" control={editForm.control} render={({ field }) => (
                  <TextField {...field} label="Longitude *" fullWidth type="number"
                    error={!!editErrors.longitude} helperText={editErrors.longitude?.message} />
                )} />
              </Box>
              <Button size="small" startIcon={<MapIcon />} onClick={() => setEditMapOpen(true)} sx={{ mb: 2 }}>
                Pick on Map
              </Button>
              <Controller name="radius_meters" control={editForm.control} render={({ field }) => (
                <TextField {...field} label="Radius *" type="number" fullWidth
                  error={!!editErrors.radius_meters} helperText={editErrors.radius_meters?.message}
                  InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
              )} />
            </Box>
          )}

          {editTab === 2 && (
            <Stack spacing={2}>
              <SectionLabel icon={<PersonOutlineIcon />}>Assignment</SectionLabel>
              <Controller name="manager" control={editForm.control} render={({ field }) => (
                <TextField {...field} select label="Manager" fullWidth>
                  <MenuItem value="">— None —</MenuItem>
                  {employees.map(e => <MenuItem key={e.employee_id} value={e.employee_id}>{e.fullname}</MenuItem>)}
                </TextField>
              )} />
              <Controller name="agency" control={editForm.control} render={({ field }) => (
                <TextField {...field} select label="Agency" fullWidth>
                  <MenuItem value="">— None —</MenuItem>
                  {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </TextField>
              )} />
            </Stack>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50', flexShrink: 0, display: 'flex', gap: 1.5 }}>
          <Button onClick={() => setEditDrawerOpen(false)} variant="outlined" sx={{ flex: 1 }}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={editSaving}
            sx={{ flex: 2 }}
            startIcon={editSaving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Box>
      </Drawer>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" mb={1}>Deactivate Outlet?</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            <strong>{deleteTarget?.name}</strong> will be marked inactive and hidden from all lists.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined" sx={{ flex: 1 }}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="contained" disabled={deleteLoading}
              color="error" sx={{ flex: 1 }}
              startIcon={deleteLoading ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
              {deleteLoading ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog open={createMapOpen} onClose={() => setCreateMapOpen(false)} maxWidth="md" fullWidth>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Select Location</Typography>
          <IconButton onClick={() => setCreateMapOpen(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <DialogContent sx={{ p: 0 }}>
          <MapDialog open={createMapOpen} onClose={() => setCreateMapOpen(false)} onSave={handleCreateMapSave}
            initialCoordinates={{ lat: createForm.getValues('latitude') || 7.2906, lng: createForm.getValues('longitude') || 80.6337 }} />
        </DialogContent>
      </Dialog>

      <Dialog open={editMapOpen} onClose={() => setEditMapOpen(false)} maxWidth="md" fullWidth>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Select Location</Typography>
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
