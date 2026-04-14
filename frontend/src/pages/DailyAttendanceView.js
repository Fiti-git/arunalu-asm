import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import api from 'utils/api'; // Assuming you have a utility to handle API calls

export default function DailyAttendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(0); // Default to 0

  // Fetch outlets data
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await api.get('/api/outlets/');
        const outletsData = response.data || [];

        setOutlets(outletsData);

        if (outletsData.length > 0) {
          setSelectedOutletId(outletsData[0].id);
        } else {
          setSelectedOutletId(0);
        }
      } catch (error) {
        console.error('Error fetching outlets data:', error);
      }
    };

    fetchOutlets();
  }, []);

  // Fetch attendance data when the component mounts or when selectedOutletId changes
  useEffect(() => {
    const fetchAttendance = async () => {
      const params = new URLSearchParams({
        outlet_id: selectedOutletId.toString(),  // Use selected outlet ID (default to 0)
      });

      try {
        const response = await api.get(`/api/attendance/all/?${params.toString()}`);

        // Map the response to extract only the necessary fields
        const formattedData = response.data.map(item => ({
          attendance_id: item.attendance_id,
          employee: item.employee,
          employee_name: item.employee_name,
          date: item.date,
          check_in_time: item.check_in_time,
          check_out_time: item.check_out_time,  // This can be null, and will be displayed as it is
        }));

        setAttendanceData(formattedData);  // Update the state with formatted data
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        alert('Failed to fetch attendance data.');
      }
    };

    if (selectedOutletId !== undefined) {
      fetchAttendance();  // Trigger the fetch when the outlet_id is ready
    }
  }, [selectedOutletId]);  // Refetch attendance whenever the outlet ID changes

  const columns = [
    { field: 'employee_name', headerName: 'Employee Name', flex: 1 },
    { field: 'date', headerName: 'Date', flex: 1 },
    { field: 'check_in_time', headerName: 'Check-in Time', flex: 1 },
    { field: 'check_out_time', headerName: 'Check-out Time', flex: 1 },
  ];

  return (
    <Box sx={{ height: 600, width: '90%', mx: 'auto', mt: 5, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>Daily Attendance</Typography>

      {/* Outlet Dropdown Filter */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="outlet-select-label">Select Outlet</InputLabel>
        <Select
          labelId="outlet-select-label"
          value={selectedOutletId}
          onChange={(e) => setSelectedOutletId(e.target.value)}
          label="Select Outlet"
        >
          {/* Add a default option for "All Outlets" or for any special case */}
          <MenuItem value={0}>All Outlets</MenuItem>

          {outlets.map((outlet) => (
            <MenuItem key={outlet.id} value={outlet.id}>
              {outlet.name} - {outlet.address}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <DataGrid
        rows={attendanceData}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5]}
        getRowId={(row) => row.attendance_id}
      />
    </Box>
  );
}
