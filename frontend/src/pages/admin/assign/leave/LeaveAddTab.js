import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, TextField, Alert, CircularProgress, Avatar,
  FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText,
  Dialog, DialogContent, DialogActions, IconButton, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import EventIcon from '@mui/icons-material/Event';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import api from 'utils/api';
import { pickAvatarColor } from 'theme/tokens';
import { SectionLabel } from 'components/ui';
import {
  getInitials, useUserOutlets, usePrimaryOutletEmployees, useLeaveTypes,
} from './shared';

export default function LeaveAddTab() {
  const { outlets } = useUserOutlets();
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const { employees, loading: employeesLoading } = usePrimaryOutletEmployees(selectedOutlet);
  const { leaveTypes } = useLeaveTypes();

  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [datePickerValue, setDatePickerValue] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resultDialog, setResultDialog] = useState({ open: false, data: null });

  useEffect(() => {
    if (outlets.length > 0 && !selectedOutlet) setSelectedOutlet(outlets[0].id);
  }, [outlets, selectedOutlet]);

  // Reset employee selection when outlet changes
  useEffect(() => { setSelectedEmployees([]); }, [selectedOutlet]);

  const toggleEmployee = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const selectAllEmployees = () => setSelectedEmployees(employees.map((e) => e.employee_id));
  const clearEmployees = () => setSelectedEmployees([]);

  const addDate = () => {
    if (!datePickerValue) return;
    if (selectedDates.includes(datePickerValue)) return;
    setSelectedDates((prev) => [...prev, datePickerValue].sort());
    setDatePickerValue('');
  };

  const removeDate = (d) => {
    setSelectedDates((prev) => prev.filter((x) => x !== d));
  };

  const canSubmit =
    selectedOutlet && selectedLeaveType && selectedEmployees.length > 0 && selectedDates.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/api/attendance/bulk-addleave/v2/', {
        employee_ids: selectedEmployees,
        leave_dates: selectedDates,
        leave_type: selectedLeaveType,
        remarks,
      });
      setResultDialog({ open: true, data: res.data });
      // Clear form on success
      setSelectedEmployees([]);
      setSelectedDates([]);
      setRemarks('');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to add leaves.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeResult = () => setResultDialog({ open: false, data: null });

  const selectedLeaveTypeObj = useMemo(
    () => leaveTypes.find((t) => t.id === selectedLeaveType),
    [leaveTypes, selectedLeaveType]
  );

  const employeeById = useMemo(() => {
    const m = {};
    employees.forEach((e) => { m[e.employee_id] = e; });
    return m;
  }, [employees]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Left column: outlet + leave type */}
        <Box sx={{
          border: 1, borderColor: 'divider', borderRadius: 2, p: 2.5,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <SectionLabel icon={<CategoryOutlinedIcon />}>Configuration</SectionLabel>

          <FormControl size="small" fullWidth disabled={outlets.length === 0}>
            <InputLabel>Outlet</InputLabel>
            <Select label="Outlet" value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)}>
              {outlets.length === 0 && <MenuItem value="" disabled>No outlets assigned</MenuItem>}
              {outlets.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={leaveTypes.length === 0}>
            <InputLabel>Leave Type</InputLabel>
            <Select label="Leave Type" value={selectedLeaveType} onChange={(e) => setSelectedLeaveType(e.target.value)}>
              {leaveTypes.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.att_type_name}{t.att_type ? ` · ${t.att_type}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Remarks (optional)"
            multiline minRows={2} maxRows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            fullWidth
          />

          {selectedLeaveTypeObj && (
            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {selectedLeaveTypeObj.pay_percentage}% pay ·{' '}
                {selectedLeaveTypeObj.att_type_no_of_days_in_year} days/yr ·{' '}
                {selectedLeaveTypeObj.att_type_per_day_hours} hrs/day
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right column: dates */}
        <Box sx={{
          border: 1, borderColor: 'divider', borderRadius: 2, p: 2.5,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <SectionLabel icon={<EventIcon />}>Leave Dates ({selectedDates.length})</SectionLabel>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              type="date" size="small" fullWidth
              value={datePickerValue}
              onChange={(e) => setDatePickerValue(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              label="Add date"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDate(); } }}
            />
            <Button
              variant="contained"
              onClick={addDate}
              disabled={!datePickerValue || selectedDates.includes(datePickerValue)}
              startIcon={<AddIcon />}
              sx={{ flexShrink: 0 }}
            >
              Add
            </Button>
          </Box>

          <Box sx={{
            minHeight: 100,
            p: 1.5,
            border: 1, borderColor: 'divider', borderRadius: 1.5,
            bgcolor: 'grey.50',
            display: 'flex', flexWrap: 'wrap', gap: 0.75, alignContent: 'flex-start',
          }}>
            {selectedDates.length === 0 ? (
              <Typography variant="caption" color="text.disabled" sx={{ width: '100%', textAlign: 'center', py: 2 }}>
                No dates added yet
              </Typography>
            ) : (
              selectedDates.map((d) => (
                <Chip
                  key={d}
                  label={new Date(d).toLocaleDateString()}
                  onDelete={() => removeDate(d)}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))
            )}
          </Box>
        </Box>
      </Box>

      {/* Employees picker */}
      <Box sx={{
        border: 1, borderColor: 'divider', borderRadius: 2, p: 2.5,
        display: 'flex', flexDirection: 'column', gap: 1.5,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SectionLabel icon={<PersonOutlineIcon />}>
            Employees ({selectedEmployees.length} / {employees.length} selected)
          </SectionLabel>
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto', flexShrink: 0 }}>
            <Button size="small" variant="outlined" onClick={selectAllEmployees}
              disabled={employees.length === 0 || selectedEmployees.length === employees.length}>
              Select All
            </Button>
            <Button size="small" variant="outlined" onClick={clearEmployees}
              disabled={selectedEmployees.length === 0}>
              Clear
            </Button>
          </Box>
        </Box>

        {employeesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={22} />
          </Box>
        ) : employees.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No employees assigned to this outlet as primary.
          </Typography>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 1,
            maxHeight: 320, overflowY: 'auto', pr: 0.5,
          }}>
            {employees.map((emp) => {
              const checked = selectedEmployees.includes(emp.employee_id);
              return (
                <Box
                  key={emp.employee_id}
                  onClick={() => toggleEmployee(emp.employee_id)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: 1, borderRadius: 1.5,
                    border: 1, borderColor: checked ? 'primary.main' : 'divider',
                    bgcolor: checked ? 'action.selected' : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox checked={checked} size="small" sx={{ p: 0.5 }} />
                  <Avatar sx={{
                    width: 28, height: 28, fontSize: 11, fontWeight: 700,
                    bgcolor: pickAvatarColor(emp.fullname),
                  }}>
                    {getInitials(emp.fullname)}
                  </Avatar>
                  <ListItemText
                    primary={emp.fullname}
                    secondary={emp.empcode || '—'}
                    slotProps={{
                      primary: { variant: 'body2', fontWeight: 500, noWrap: true },
                      secondary: { variant: 'caption', noWrap: true },
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2, p: 2,
        bgcolor: 'grey.50', borderRadius: 2,
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Will create up to <strong>{selectedEmployees.length * selectedDates.length}</strong> leave records
          ({selectedEmployees.length} employees × {selectedDates.length} dates).
          Employees who already punched in on a date will be skipped.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={submit}
          disabled={!canSubmit}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
          sx={{ px: 4, flexShrink: 0 }}
        >
          {submitting ? 'Adding…' : 'Add Leaves'}
        </Button>
      </Box>

      {/* Result dialog */}
      <Dialog open={resultDialog.open} onClose={closeResult} maxWidth="sm" fullWidth>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5">Leave Add Result</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {resultDialog.data?.message}
            </Typography>
          </Box>
          <IconButton size="small" onClick={closeResult}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1, p: 2, bgcolor: 'success.light', color: 'success.dark', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700}>
                {resultDialog.data?.successful?.length || 0}
              </Typography>
              <Typography variant="caption">Added</Typography>
            </Box>
            <Box sx={{ flex: 1, p: 2, bgcolor: 'warning.light', color: 'warning.dark', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700}>
                {resultDialog.data?.skipped?.length || 0}
              </Typography>
              <Typography variant="caption">Skipped</Typography>
            </Box>
          </Box>

          {resultDialog.data?.skipped?.length > 0 && (
            <>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Skipped Records
              </Typography>
              <Box sx={{ maxHeight: 280, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
                {resultDialog.data.skipped.map((s, idx) => {
                  const emp = employeeById[s.employee_id];
                  return (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 1.5, py: 1,
                        borderBottom: idx < resultDialog.data.skipped.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                      }}
                    >
                      <Avatar sx={{
                        width: 28, height: 28, fontSize: 11, fontWeight: 700,
                        bgcolor: emp ? pickAvatarColor(emp.fullname) : 'grey.400',
                      }}>
                        {emp ? getInitials(emp.fullname) : '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {emp?.fullname || `Employee #${s.employee_id}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(s.leave_date).toLocaleDateString()} · {s.reason}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" onClick={closeResult}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}