import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import api from 'utils/api';

export default function LeaveSummary() {
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [userOutlets, setUserOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserOutlets = async () => {
      try {
        const res = await api.get('/api/user/');
        const userOutlets = res.data.outlets || [];
        setUserOutlets(userOutlets);

        if (userOutlets.length > 0) {
          setSelectedOutlet(userOutlets[0].id);
        }
      } catch (err) {
        setError('Failed to fetch user outlets.');
        console.error('Error fetching user outlets:', err);
      }
    };
    fetchUserOutlets();
  }, []);

  useEffect(() => {
    if (!selectedOutlet) return;

    const fetchLeaveHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/api/attendance/outletleaverequests/', {
          params: { outlet_id: selectedOutlet },
        });

        const formattedData = response.data.map(item => ({
          ...item,
          id: item.leave_refno,
        }));
        setLeaveHistory(formattedData);
      } catch (err) {
        setError('Failed to fetch leave history.');
        console.error('Error fetching leave history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveHistory();
  }, [selectedOutlet]);

  const columns = [
    { field: 'leave_refno', headerName: 'Reference No', flex: 1, minWidth: 120 },
    { field: 'employee_name', headerName: 'Employee Name', flex: 1.5, minWidth: 180 },
    { field: 'leave_type_name', headerName: 'Leave Type', flex: 1, minWidth: 120 },
    { field: 'leave_date', headerName: 'Leave Date', flex: 1, minWidth: 120 },
    { field: 'remarks', headerName: 'Remarks', flex: 2, minWidth: 200 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        let color = 'default';
        if (params.value === 'approved') color = 'success';
        if (params.value === 'rejected') color = 'error';
        if (params.value === 'pending') color = 'warning';

        return (
          <Chip
            label={params.value.toUpperCase()}
            color={color}
            size="small"
            sx={{ fontWeight: 600, borderRadius: '4px' }} 
          />
        );
      },
    },
    { field: 'action_date', headerName: 'Action Date', flex: 1, minWidth: 120 },
  ];

  return (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mt: 4,
            maxWidth: 1200,
            mx: 'auto',
            bgcolor: 'transparent',
            boxSizing: 'border-box',
          }}
        >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 'bold',
            
            display: 'inline-block',
            pb: 0.5,
          }}
        >
          LEAVE SUMMARY
        </Typography>

        {userOutlets.length > 1 && (
          <FormControl
            size="medium"
            variant="outlined"
            sx={{
              minWidth: 220,
              maxWidth: 300,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: "0 2px 6px rgb(0 0 0 / 0.1)",
              height: 48,  // fixed height
              "& .MuiOutlinedInput-root": {
                height: "100%",
                "& fieldset": {
                  borderColor: "rgba(25, 118, 210, 0.5)",
                },
                "&:hover fieldset": {
                  borderColor: "primary.main",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                  borderWidth: 2,
                },
                "& .MuiSelect-select": {
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  fontWeight: 600,
                  fontSize: "1rem",
                },
              },
            }}
          >
            <InputLabel id="leave-summary-outlet-label">Select Outlet</InputLabel>
            <Select
              labelId="leave-summary-outlet-label"
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              label="Select Outlet"
              MenuProps={{
                PaperProps: {
                  sx: { borderRadius: 2 },
                },
              }}
            >
              {userOutlets.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" align="center" sx={{ mt: 4 }}>
          {error}
        </Typography>
      ) : (
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={leaveHistory}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5, 10, 20]}
            disableRowSelectionOnClick
            sx={{
              borderRadius: 2,
              '& .MuiDataGrid-row:hover': { backgroundColor: '#f5f5f5' },
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
            }}
          />
        </Box>
      )}
    </Paper>
  );
}
