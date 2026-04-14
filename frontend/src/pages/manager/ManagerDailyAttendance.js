import React, { useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function DailyAttendance() {
  const [attendanceData, setAttendanceData] = useState([
    {
      attendance_id: 1,
      date: '2025-07-06',
      check_in_time: '08:00 AM',
      check_in_lat: '40.712776',
      check_in_long: '-74.005974',
      photo_check_in: 'photo_url',
      check_out_time: '05:00 PM',
      check_out_lat: '40.712776',
      check_out_long: '-74.005974',
      photo_check_out: 'photo_url',
      worked_hours: 8,
      ot_hours: 2,
      status: 'Present',
      created_at: '2025-07-06T08:00:00',
      updated_at: '2025-07-06T17:00:00',
      employee_id: 'E123',
      verification_notes: 'Verified by manager',
      verified: true,
    },
    {
      attendance_id: 2,
      date: '2025-07-05',
      check_in_time: '09:00 AM',
      check_in_lat: '40.712776',
      check_in_long: '-74.005974',
      photo_check_in: 'photo_url',
      check_out_time: '06:00 PM',
      check_out_lat: '40.712776',
      check_out_long: '-74.005974',
      photo_check_out: 'photo_url',
      worked_hours: 9,
      ot_hours: 1,
      status: 'Present',
      created_at: '2025-07-05T09:00:00',
      updated_at: '2025-07-05T18:00:00',
      employee_id: 'E124',
      verification_notes: 'Verified by HR',
      verified: false,
    },
    // More dummy data as needed...
  ]);

  const handleEdit = (id) => {
    console.log(`Edit Attendance with ID: ${id}`);
  };

  const handleDelete = (id) => {
    setAttendanceData(attendanceData.filter((attendance) => attendance.attendance_id !== id));
  };

  const columns = [
    { field: 'attendance_id', headerName: 'Attendance ID', flex: 1 },
    { field: 'date', headerName: 'Date', flex: 1 },
    { field: 'check_in_time', headerName: 'Check-in Time', flex: 1 },
    { field: 'check_out_time', headerName: 'Check-out Time', flex: 1 },
    { field: 'worked_hours', headerName: 'Worked Hours', flex: 1 },
    { field: 'ot_hours', headerName: 'OT Hours', flex: 1 },
    { field: 'status', headerName: 'Status', flex: 1 },
    { field: 'employee_id', headerName: 'Employee ID', flex: 1 },
    { field: 'verification_notes', headerName: 'Verification Notes', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Tooltip title="Edit"><EditIcon /></Tooltip>}
          label="Edit"
          onClick={() => handleEdit(params.id)}
        />,
        <GridActionsCellItem
          icon={<Tooltip title="Delete"><DeleteIcon /></Tooltip>}
          label="Delete"
          onClick={() => handleDelete(params.id)}
        />,
      ],
    },
  ];

  return (
    <Box sx={{ height: 600, width: '90%', mx: 'auto', mt: 5, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>Daily Attendance</Typography>

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
