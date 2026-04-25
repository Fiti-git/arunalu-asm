import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Avatar, Typography, MenuItem, Select, FormControl, InputLabel,
  Chip, TextField, InputAdornment, CircularProgress, Drawer, IconButton,
  Divider, Button, Alert, Dialog, DialogContent, DialogActions, Tooltip,
  Snackbar, FormControlLabel, Switch,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CloseIcon from '@mui/icons-material/Close';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckIcon from '@mui/icons-material/Check';
import api from 'utils/api';
import { PageHeader } from 'components/ui';
import { pickAvatarColor } from 'theme/tokens';
import EmployeeStatusControl from 'components/EmployeeStatusControl';

const BASE_URL = process.env.REACT_APP_API_URL || '';

const getInitials = (name) =>
  (name || '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

function EmployeeCard({ emp, onOpen }) {
  const color = pickAvatarColor(emp.fullname);
  const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.fullname;
  const role = emp.groups?.[0] || '—';

  return (
    <Box
      onClick={() => onOpen(emp)}
      sx={{
        bgcolor: 'background.paper',
        border: 1, borderColor: emp.is_active ? 'divider' : 'error.light', borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        opacity: emp.is_active ? 1 : 0.75,
        display: 'flex', flexDirection: 'column',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s, transform 0.18s',
        '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
      }}
    >
      {!emp.is_active && (
        <Chip
          label="Inactive" size="small" color="error" variant="outlined"
          sx={{ position: 'absolute', top: 8, right: 8, fontWeight: 700, zIndex: 1, bgcolor: 'background.paper' }}
        />
      )}
      <Box sx={{
        height: 64, position: 'relative',
        bgcolor: 'primary.main',
        backgroundImage: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      }} />
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: '-32px' }}>
        <Avatar
          src={emp.reference_photo ? `${BASE_URL}${emp.reference_photo}` : undefined}
          sx={{
            width: 64, height: 64,
            bgcolor: color,
            fontWeight: 700, fontSize: '1.25rem',
            border: 3, borderColor: 'background.paper',
            boxShadow: 2,
          }}
        >
          {getInitials(emp.fullname)}
        </Avatar>
      </Box>
      <Box sx={{ px: 2, pt: 1, textAlign: 'center' }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>{name}</Typography>
        <Typography variant="caption" color="text.secondary" display="block" noWrap>
          {role !== '—' ? `${role} · ` : ''}@{emp.fullname}
        </Typography>
      </Box>
      <Box sx={{ px: 2.5, pt: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <CakeOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">{emp.date_of_birth || '—'}</Typography>
        </Box>
        {emp.empcode && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <BadgeOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary" noWrap>{emp.empcode}</Typography>
          </Box>
        )}
        {!emp.is_active && (
          <Chip label="Inactive" size="small" variant="outlined" sx={{ alignSelf: 'flex-start', mt: 0.5 }} />
        )}
      </Box>
    </Box>
  );
}

function PhotoSlot({ label, src, tone }) {
  return (
    <Box>
      <Box sx={{
        height: 110, borderRadius: 2, overflow: 'hidden',
        bgcolor: `${tone}.light`, border: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {src ? (
          <Box component="img" src={`${BASE_URL}${src}`} alt={label}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Typography variant="caption" sx={{ color: `${tone}.dark`, fontWeight: 500, opacity: 0.7 }}>
            No Photo
          </Typography>
        )}
      </Box>
      <Typography variant="caption" sx={{
        display: 'block', textAlign: 'center', mt: 0.5,
        fontWeight: 600, color: `${tone}.dark`, fontSize: '0.68rem', letterSpacing: '0.3px',
      }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function ManagerEmployeeList() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [drawer, setDrawer] = useState({ open: false, emp: null });
  const [drawerError, setDrawerError] = useState('');

  const [passwordDialog, setPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [clearPhotosDialog, setClearPhotosDialog] = useState(false);
  const [clearingPhotos, setClearingPhotos] = useState(false);

  const [toast, setToast] = useState({ open: false, severity: 'success', message: '' });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/user/');
        const list = res.data?.outlets || [];
        setOutlets(list);
        if (list.length > 0) setSelectedOutlet(list[0].id);
      } catch {
        setError('Failed to load your outlets.');
      }
    })();
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (!selectedOutlet) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/primary-outlet-employees/', {
        params: { outlet_id: selectedOutlet, detail: 'true' },
      });
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load employees.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    let list = showInactive ? employees : employees.filter((e) => e.is_active);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((e) =>
      (e.fullname || '').toLowerCase().includes(q) ||
      (e.empcode || '').toLowerCase().includes(q) ||
      (e.idnumber || '').toLowerCase().includes(q) ||
      (`${e.first_name || ''} ${e.last_name || ''}`).toLowerCase().includes(q)
    );
  }, [employees, search, showInactive]);

  const openDrawer = (emp) => {
    setDrawer({ open: true, emp });
    setDrawerError('');
  };
  const closeDrawer = () => setDrawer({ open: false, emp: null });

  const openPasswordDialog = () => {
    setNewPassword('');
    setShowPassword(false);
    setPasswordDialog(true);
  };

  const submitPassword = async () => {
    if (newPassword.length < 8) {
      setDrawerError('Password must be at least 8 characters.');
      setPasswordDialog(false);
      return;
    }
    setChangingPassword(true);
    try {
      await api.put(`/api/changepassword/${drawer.emp.employee_id}/`, { password: newPassword });
      setPasswordDialog(false);
      setToast({ open: true, severity: 'success', message: 'Password updated.' });
    } catch (err) {
      setDrawerError(err.response?.data?.error || err.response?.data?.detail || 'Failed to reset password.');
      setPasswordDialog(false);
    } finally {
      setChangingPassword(false);
    }
  };

  const submitClearPhotos = async () => {
    if (!drawer.emp) return;
    setClearingPhotos(true);
    try {
      const formData = new FormData();
      formData.append('clear_images', 'true');
      await api.put(`/report/employees/${drawer.emp.employee_id}/`, formData);
      setDrawer((prev) => prev.emp ? {
        ...prev,
        emp: { ...prev.emp, reference_photo: null, punchin_selfie: null, punchout_selfie: null },
      } : prev);
      setClearPhotosDialog(false);
      setToast({ open: true, severity: 'success', message: 'All photos removed.' });
      fetchEmployees();
    } catch (err) {
      setDrawerError(err.response?.data?.detail || 'Failed to remove photos.');
      setClearPhotosDialog(false);
    } finally {
      setClearingPhotos(false);
    }
  };

  const selectedOutletName = outlets.find((o) => o.id === selectedOutlet)?.name;
  const drawerEmp = drawer.emp;

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Employees"
        subtitle={selectedOutletName
          ? `${filteredEmployees.length} employee${filteredEmployees.length === 1 ? '' : 's'} at ${selectedOutletName}`
          : 'Pick an outlet to begin'}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search employees…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
              sx={{ minWidth: 260 }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
              label={<Typography variant="body2">Show inactive</Typography>}
            />
          </Box>
        }
      />

      <FormControl size="small" sx={{ minWidth: 260, alignSelf: 'flex-start' }} disabled={outlets.length === 0}>
        <InputLabel>Outlet</InputLabel>
        <Select label="Outlet" value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)}>
          {outlets.length === 0 && <MenuItem value="" disabled>No outlets assigned</MenuItem>}
          {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
        </Select>
      </FormControl>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={32} />
        </Box>
      ) : filteredEmployees.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <PersonOutlineIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {search ? 'No employees match your search.' : 'No employees assigned to this outlet.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}>
          {filteredEmployees.map((e) => (
            <EmployeeCard key={e.employee_id} emp={e} onOpen={openDrawer} />
          ))}
        </Box>
      )}

      {/* ── Drawer: read-only details + password / photo actions ── */}
      <Drawer
        anchor="right"
        open={drawer.open}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      >
        {drawerEmp && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{
              position: 'relative', height: 120,
              bgcolor: 'primary.main',
              backgroundImage: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}>
              <IconButton
                size="small" onClick={closeDrawer}
                sx={{
                  position: 'absolute', top: 8, right: 8,
                  bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: '-48px' }}>
              <Avatar
                src={drawerEmp.reference_photo ? `${BASE_URL}${drawerEmp.reference_photo}` : undefined}
                sx={{
                  width: 96, height: 96,
                  bgcolor: pickAvatarColor(drawerEmp.fullname),
                  fontWeight: 700, fontSize: '2rem',
                  border: 4, borderColor: 'background.paper', boxShadow: 3,
                }}
              >
                {getInitials(drawerEmp.fullname)}
              </Avatar>
            </Box>

            <Box sx={{ textAlign: 'center', px: 3, pt: 1.5 }}>
              <Typography variant="h5" fontWeight={700}>
                {`${drawerEmp.first_name || ''} ${drawerEmp.last_name || ''}`.trim() || drawerEmp.fullname}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {drawerEmp.groups?.[0] ? `${drawerEmp.groups[0]} · ` : ''}@{drawerEmp.fullname}
              </Typography>
              {!drawerEmp.is_active && (
                <Chip label="Inactive" size="small" variant="outlined" sx={{ mt: 1 }} />
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {drawerError && (
              <Alert severity="error" onClose={() => setDrawerError('')} sx={{ mx: 3, mb: 2 }}>
                {drawerError}
              </Alert>
            )}

            <Box sx={{ px: 3, flex: 1, overflow: 'auto' }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Details
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BadgeOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Emp Code</Typography>
                    <Typography variant="body2" noWrap>{drawerEmp.empcode || '—'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BadgeOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">NIC</Typography>
                    <Typography variant="body2" noWrap>{drawerEmp.idnumber || '—'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CakeOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">DOB</Typography>
                    <Typography variant="body2" noWrap>{drawerEmp.date_of_birth || '—'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Phone</Typography>
                    <Typography variant="body2" noWrap>{drawerEmp.phone_number || '—'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, gridColumn: '1 / -1' }}>
                  <EmailOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Email</Typography>
                    <Typography variant="body2" noWrap>{drawerEmp.email || '—'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, gridColumn: '1 / -1' }}>
                  <LocationOnOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Primary Outlet</Typography>
                    <Typography variant="body2" noWrap>{selectedOutletName || '—'}</Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Photos
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 3 }}>
                <PhotoSlot label="Reference" src={drawerEmp.reference_photo} tone="primary" />
                <PhotoSlot label="Punch-in" src={drawerEmp.punchin_selfie} tone="success" />
                <PhotoSlot label="Punch-out" src={drawerEmp.punchout_selfie} tone="warning" />
              </Box>
            </Box>

            <Divider />

            <Box sx={{ px: 3, pt: 1.5, pb: 0.5 }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                User Status
              </Typography>
              <EmployeeStatusControl
                employee={drawerEmp}
                onChanged={(updated) => {
                  setDrawer((prev) => prev.emp ? { ...prev, emp: { ...prev.emp, is_active: updated.is_active } } : prev);
                  setEmployees((list) => list.map((e) =>
                    e.employee_id === updated.employee_id ? { ...e, is_active: updated.is_active } : e
                  ));
                  setToast({ open: true, severity: 'success', message: updated.is_active ? 'Employee activated.' : 'Employee deactivated.' });
                }}
                dense
              />
            </Box>

            <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1.5, flexDirection: 'column' }}>
              <Tooltip title="Set a new password for this user">
                <Button
                  variant="contained" startIcon={<KeyOutlinedIcon />}
                  onClick={openPasswordDialog}
                >
                  Reset Password
                </Button>
              </Tooltip>
              <Tooltip title="Delete reference + punch-in + punch-out photos">
                <Button
                  variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
                  onClick={() => setClearPhotosDialog(true)}
                  disabled={!drawerEmp.reference_photo && !drawerEmp.punchin_selfie && !drawerEmp.punchout_selfie}
                >
                  Remove All Photos
                </Button>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ── Password dialog ── */}
      <Dialog open={passwordDialog} onClose={() => !changingPassword && setPasswordDialog(false)} maxWidth="xs" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h5">Reset Password</Typography>
          <IconButton size="small" onClick={() => setPasswordDialog(false)} disabled={changingPassword}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set a new password for <strong>{drawerEmp?.fullname}</strong>. They can change it after logging in.
          </Typography>
          <TextField
            label="New password" fullWidth size="small" autoFocus
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="At least 8 characters"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setPasswordDialog(false)} disabled={changingPassword}>Cancel</Button>
          <Button variant="contained" onClick={submitPassword} disabled={changingPassword || newPassword.length < 8}
            startIcon={changingPassword ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}>
            {changingPassword ? 'Saving…' : 'Save Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Clear photos confirmation ── */}
      <Dialog open={clearPhotosDialog} onClose={() => !clearingPhotos && setClearPhotosDialog(false)} maxWidth="xs" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h5">Remove all photos?</Typography>
          <IconButton size="small" onClick={() => setClearPhotosDialog(false)} disabled={clearingPhotos}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            This deletes the reference photo, last punch-in selfie, and last punch-out selfie
            for <strong>{drawerEmp?.fullname}</strong>. They will need to re-upload a reference photo
            before they can punch in again with face verification. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setClearPhotosDialog(false)} disabled={clearingPhotos}>Cancel</Button>
          <Button variant="contained" color="error" onClick={submitClearPhotos} disabled={clearingPhotos}
            startIcon={clearingPhotos ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
            {clearingPhotos ? 'Removing…' : 'Remove Photos'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}