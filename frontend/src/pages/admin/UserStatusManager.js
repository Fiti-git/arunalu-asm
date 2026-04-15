import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Chip, Dialog, DialogContent, DialogActions,
  TextField, Typography, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, CircularProgress, Tooltip, Avatar, IconButton, InputAdornment,
  Drawer, Divider, Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import api from 'utils/api';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

const COLORS = ['#3b5bdb', '#1098ad', '#37b24d', '#f59f00', '#e64980', '#7048e8', '#d6336c', '#0ca678'];
const getColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};
const getInitials = (name = '') => name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

function EmployeeStatusCard({ emp, onToggle, onHistory }) {
  const color = getColor(emp.fullname);
  const initials = getInitials(emp.fullname);
  const photoUrl = emp.reference_photo ? `${BASE_URL}${emp.reference_photo}` : undefined;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: emp.is_active ? 'divider' : '#ffd6d6',
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: emp.is_active ? 'background.paper' : '#fff8f8',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
      }}
    >
      {/* Avatar */}
      <Avatar
        src={photoUrl}
        sx={{ width: 42, height: 42, bgcolor: color, fontSize: 14, fontWeight: 700, flexShrink: 0 }}
      >
        {initials}
      </Avatar>

      {/* Name + code + inactive date */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap sx={{ fontSize: 13 }}>
          {emp.fullname}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {emp.empcode || '—'}
          {!emp.is_active && emp.inactive_date ? ` · ${emp.inactive_date}` : ''}
        </Typography>
      </Box>

      {/* Status chip */}
      <Chip
        label={emp.is_active ? 'Active' : 'Inactive'}
        color={emp.is_active ? 'success' : 'error'}
        size="small"
        sx={{ fontWeight: 600, flexShrink: 0 }}
      />

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title={emp.is_active ? 'Deactivate' : 'Activate'}>
          <IconButton
            size="small"
            onClick={() => onToggle(emp)}
            sx={{ color: emp.is_active ? 'error.main' : 'success.main', border: '1px solid', borderColor: emp.is_active ? 'error.light' : 'success.light', borderRadius: 1.5 }}
          >
            {emp.is_active ? <PersonOffIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="View history">
          <IconButton size="small" onClick={() => onHistory(emp)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}

const PAGE_SIZE = 15;

export default function UserStatusManager() {
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const searchTimer = useRef(null);

  // Toggle dialog
  const [toggleDialog, setToggleDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [note, setNote] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/getallemployees/', {
        params: { page: 1, page_size: 200 },
      });
      const d = response.data;
      const empList = Array.isArray(d) ? d : (d.results || []);
      setEmployees(empList);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Filter logic
  useEffect(() => {
    const q = search.toLowerCase();
    let result = employees;
    if (statusFilter === 'active') result = result.filter(e => e.is_active);
    else if (statusFilter === 'inactive') result = result.filter(e => !e.is_active);
    if (q) result = result.filter(e =>
      (e.fullname || '').toLowerCase().includes(q) ||
      (e.empcode || '').toLowerCase().includes(q)
    );
    setFiltered(result);
    setPage(1); // reset to first page on filter change
  }, [employees, search, statusFilter]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 300);
  };

  const openToggleDialog = (emp) => {
    setSelectedEmployee(emp);
    setNote('');
    setToggleDialog(true);
  };

  const handleToggleConfirm = async () => {
    if (!selectedEmployee) return;
    setToggleLoading(true);
    const endpoint = selectedEmployee.is_active
      ? `/api/deactivate-employee/${selectedEmployee.employee_id}/`
      : `/api/activate-employee/${selectedEmployee.employee_id}/`;
    try {
      await api.post(endpoint, { note });
      setToggleDialog(false);
      fetchEmployees();
    } catch (err) {
      console.error('Error toggling employee status:', err);
    } finally {
      setToggleLoading(false);
    }
  };

  const openHistory = async (emp) => {
    setHistoryEmployee(emp);
    setHistory([]);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const response = await api.get(`/api/employee-status-history/${emp.employee_id}/`);
      setHistory(response.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>User Status Management</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Activate or deactivate employee accounts
          </Typography>
        </Box>
        {/* Summary chips */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={`${activeCount} Active`} color="success" variant="outlined" sx={{ fontWeight: 600 }} />
          <Chip label={`${inactiveCount} Inactive`} color="error" variant="outlined" sx={{ fontWeight: 600 }} />
        </Box>
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search by name or code…"
          onChange={handleSearchChange}
          size="small"
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
          }}
        />
        {/* Status filter pills */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {['all', 'active', 'inactive'].map(f => (
            <Button
              key={f}
              size="small"
              variant={statusFilter === f ? 'contained' : 'outlined'}
              onClick={() => setStatusFilter(f)}
              sx={{ borderRadius: 5, textTransform: 'capitalize', px: 2 }}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Card Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No employees found.</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
            gap: 1.5,
            mb: 3,
          }}>
            {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(emp => (
              <EmployeeStatusCard
                key={emp.employee_id}
                emp={emp}
                onToggle={openToggleDialog}
                onHistory={openHistory}
              />
            ))}
          </Box>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </Typography>
            <Pagination
              count={Math.ceil(filtered.length / PAGE_SIZE)}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
              shape="rounded"
              size="small"
            />
          </Box>
        </>
      )}

      {/* Activate / Deactivate Confirmation Dialog */}
      <Dialog open={toggleDialog} onClose={() => setToggleDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              {selectedEmployee?.is_active ? 'Deactivate Employee' : 'Activate Employee'}
            </Typography>
            <IconButton size="small" onClick={() => setToggleDialog(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: selectedEmployee?.is_active ? '#fff5f5' : '#f0fdf4', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: getColor(selectedEmployee?.fullname || ''), width: 44, height: 44, fontWeight: 700 }}>
                {getInitials(selectedEmployee?.fullname || '')}
              </Avatar>
              <Box>
                <Typography fontWeight={600}>{selectedEmployee?.fullname}</Typography>
                <Typography variant="caption" color="text.secondary">{selectedEmployee?.empcode}</Typography>
              </Box>
            </Box>
            <Typography color="text.secondary" mb={2} variant="body2">
              {selectedEmployee?.is_active
                ? 'This will prevent the employee from logging in to the system.'
                : 'This will restore the employee\'s access to the system.'}
            </Typography>
            <TextField
              label="Reason (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </DialogContent>
          <DialogActions sx={{ pt: 2, px: 0 }}>
            <Button onClick={() => setToggleDialog(false)} disabled={toggleLoading} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              onClick={handleToggleConfirm}
              variant="contained"
              color={selectedEmployee?.is_active ? 'error' : 'success'}
              disabled={toggleLoading}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              {toggleLoading ? <CircularProgress size={20} /> : (selectedEmployee?.is_active ? 'Deactivate' : 'Activate')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* History Drawer */}
      <Drawer
        anchor="right"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Status History</Typography>
            <Typography variant="body2" color="text.secondary">{historyEmployee?.fullname}</Typography>
          </Box>
          <IconButton onClick={() => setHistoryOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No history found.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {history.map((log, idx) => (
              <Paper
                key={idx}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: log.action === 'ACTIVATED' ? '#b2dfdb' : '#ffcdd2',
                  borderRadius: 2,
                  p: 2,
                  bgcolor: log.action === 'ACTIVATED' ? '#f0fdf4' : '#fff8f8',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Chip
                    label={log.action}
                    color={log.action === 'ACTIVATED' ? 'success' : 'error'}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(log.action_at).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  By: <strong>{log.action_by}</strong>
                </Typography>
                {log.note && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    Note: {log.note}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
