import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import api from 'utils/api';

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [userOutlets, setUserOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchEmployeeName, setSearchEmployeeName] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [openDialog, setOpenDialog] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);

  // Fetch user outlets and employees
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUser = await api.get('/api/user/'); // get user outlets
        const resEmp = await api.get('/api/getemployees/'); // get all employees

        setUserOutlets(resUser.data.outlets || []);
        if (resUser.data.outlets?.length > 0) setSelectedOutlet(resUser.data.outlets[0].id);

        const d = resEmp.data; setEmployees(Array.isArray(d) ? d : (d.results || []));
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch leave requests when filters change
  useEffect(() => {
    if (!selectedOutlet) return; // outlet_id is required

    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/simple-leave-requests/', {
          params: {
            outlet_id: selectedOutlet, // required
            employee_id: selectedEmployee || '',
            employee_name: searchEmployeeName || '',
            status: statusFilter !== 'all' ? statusFilter : '',
          },
        });
        const d = res.data; setRequests(Array.isArray(d) ? d : (d.results || []));
      } catch (err) {
        console.error('Error fetching leave requests:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [selectedOutlet, selectedEmployee, searchEmployeeName, statusFilter]);

  // Map employee names
  const mappedRequests = useMemo(() => {
    if (!requests.length || !employees.length) return [];
    return requests.map((req) => {
      const emp = employees.find((e) => e.employee_id === req.employee_name);
      return { ...req, employeeName: emp ? emp.first_name : 'Unknown' };
    });
  }, [requests, employees]);

  // Approve / Reject logic
  const handleApprove = (id) => {
    setCurrentRequest({ id, action: 'approved' });
    setOpenDialog(true);
  };
  const handleReject = (id) => {
    setCurrentRequest({ id, action: 'rejected' });
    setOpenDialog(true);
  };
  const confirmAction = async () => {
    if (!currentRequest) return;
    try {
      await api.put(`/api/attendance/updateleavestatus/${currentRequest.id}/`, {
        status: currentRequest.action,
      });
      setRequests((prev) =>
        prev.map((req) =>
          req.leave_refno === currentRequest.id
            ? { ...req, status: currentRequest.action }
            : req
        )
      );
    } catch (err) {
      console.error('Error updating leave status:', err);
    } finally {
      setOpenDialog(false);
      setCurrentRequest(null);
    }
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentRequest(null);
  };

  const columns = [
    { field: 'leave_refno', headerName: 'Ref No', flex: 0.6, minWidth: 100 },
    { field: 'leave_date', headerName: 'Leave Date', flex: 0.8, minWidth: 120 },
    { field: 'remarks', headerName: 'Remarks', flex: 1.2, minWidth: 160 },
    { field: 'employee_name', headerName: 'Emp ID', flex: 0.7, minWidth: 100 },
    { field: 'employeeName', headerName: 'Name', flex: 1, minWidth: 140 },
    { field: 'leave_type_name', headerName: 'Leave Type', flex: 1, minWidth: 140 }, // placeholder
    {
      field: 'actions',
      headerName: 'Status / Action',
      flex: 1,
      minWidth: 160,
      renderCell: (params) =>
        params.row.status === 'pending' ? (
          <>
            <GridActionsCellItem
              icon={<CheckCircleIcon color="success" />}
              label="Approve"
              onClick={() => handleApprove(params.row.leave_refno)}
            />
            <GridActionsCellItem
              icon={<CancelIcon color="error" />}
              label="Reject"
              onClick={() => handleReject(params.row.leave_refno)}
            />
          </>
        ) : (
          <Typography
            sx={{
              textTransform: 'capitalize',
              color: params.row.status === 'approved' ? 'green' : 'red',
              fontWeight: 600,
            }}
          >
            {params.row.status}
          </Typography>
        ),
    },
  ];

  if (loading)
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    );

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', textTransform: 'uppercase' }}>
        Leave Management
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Outlet</InputLabel>
          <Select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)}>
            {userOutlets.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Employee</InputLabel>
          <Select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.employee_id} value={emp.employee_id}>
                {emp.first_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Employee Name"
          value={searchEmployeeName}
          onChange={(e) => setSearchEmployeeName(e.target.value)}
        />

        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* DataGrid */}
      <Box sx={{ height: 460, width: '100%' }}>
        <DataGrid
          rows={mappedRequests}
          columns={columns}
          pageSize={7}
          rowsPerPageOptions={[5, 10]}
          disableRowSelectionOnClick
          getRowId={(row) => row.leave_refno}
        />
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          Are you sure you want to <strong>{currentRequest?.action}</strong> this leave request?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={confirmAction}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
