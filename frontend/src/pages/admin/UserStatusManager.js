import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, CircularProgress, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import HistoryIcon from '@mui/icons-material/History';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import api from 'utils/api';

export default function UserStatusManager() {
  const [employees, setEmployees] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ pageSize: 50, page: 0 });
  const [loading, setLoading] = useState(false);

  // Toggle dialog
  const [toggleDialog, setToggleDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [note, setNote] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);

  // History dialog
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchEmployees = useCallback(async (page = 0, pageSize = 50) => {
    setLoading(true);
    try {
      const response = await api.get('/api/getallemployees/', {
        params: { page: page + 1, page_size: pageSize },
      });
      const d = response.data;
      const empList = Array.isArray(d) ? d : (d.results || []);
      const total = Array.isArray(d) ? d.length : (d.count || empList.length);
      setEmployees(empList);
      setTotalRows(total);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees(paginationModel.page, paginationModel.pageSize);
  }, [paginationModel, fetchEmployees]);

  const openToggleDialog = (employee) => {
    setSelectedEmployee(employee);
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
      fetchEmployees(paginationModel.page, paginationModel.pageSize);
    } catch (err) {
      console.error('Error toggling employee status:', err);
    } finally {
      setToggleLoading(false);
    }
  };

  const openHistoryDialog = async (employee) => {
    setHistoryEmployee(employee);
    setHistory([]);
    setHistoryDialog(true);
    setHistoryLoading(true);
    try {
      const response = await api.get(`/api/employee-status-history/${employee.employee_id}/`);
      setHistory(response.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns = [
    { field: 'fullname', headerName: 'Name', flex: 1 },
    { field: 'empcode', headerName: 'Employee Code', flex: 1 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <Chip label="Active" color="success" size="small" />
        ) : (
          <Chip label="Inactive" color="error" size="small" />
        ),
    },
    {
      field: 'inactive_date',
      headerName: 'Inactive Since',
      width: 150,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          <Tooltip title={params.row.is_active ? 'Deactivate' : 'Activate'}>
            <Button
              size="small"
              variant="outlined"
              color={params.row.is_active ? 'error' : 'success'}
              startIcon={params.row.is_active ? <PersonOffIcon /> : <PersonIcon />}
              onClick={() => openToggleDialog(params.row)}
            >
              {params.row.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </Tooltip>
          <Tooltip title="View History">
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={() => openHistoryDialog(params.row)}
            >
              <HistoryIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        User Status Management
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <DataGrid
          rows={employees}
          columns={columns}
          getRowId={(row) => row.employee_id}
          rowCount={totalRows}
          loading={loading}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[50, 100]}
          disableRowSelectionOnClick
          autoHeight
          getRowClassName={(params) =>
            !params.row.is_active ? 'inactive-row' : ''
          }
          sx={{
            '& .inactive-row': {
              backgroundColor: '#fff5f5',
              '&:hover': { backgroundColor: '#ffe8e8' },
            },
          }}
        />
      </Paper>

      {/* Activate / Deactivate Confirmation Dialog */}
      <Dialog open={toggleDialog} onClose={() => setToggleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEmployee?.is_active ? 'Deactivate User' : 'Activate User'}
        </DialogTitle>
        <DialogContent>
          <Typography mb={2}>
            {selectedEmployee?.is_active
              ? `You are about to deactivate ${selectedEmployee?.fullname}. This will prevent them from logging in.`
              : `You are about to activate ${selectedEmployee?.fullname}. They will be able to log in again.`}
          </Typography>
          <TextField
            label="Reason (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToggleDialog(false)} disabled={toggleLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleToggleConfirm}
            variant="contained"
            color={selectedEmployee?.is_active ? 'error' : 'success'}
            disabled={toggleLoading}
          >
            {toggleLoading ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Status History — {historyEmployee?.fullname}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : history.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No history found.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Action</strong></TableCell>
                  <TableCell><strong>Date &amp; Time</strong></TableCell>
                  <TableCell><strong>Performed By</strong></TableCell>
                  <TableCell><strong>Note</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((log, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Chip
                        label={log.action}
                        color={log.action === 'ACTIVATED' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(log.action_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.action_by}</TableCell>
                    <TableCell>{log.note || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
