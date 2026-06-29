import React, { useMemo, useState } from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataTable, applyClientFilters } from 'components/ui';

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
  ]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const handleEdit = (id) => {
    console.log(`Edit Attendance with ID: ${id}`);
  };

  const handleDelete = (id) => {
    setAttendanceData(attendanceData.filter((attendance) => attendance.attendance_id !== id));
  };

  const columns = useMemo(() => [
    { key: 'attendance_id', label: 'Attendance ID', width: 130, sortKey: 'attendance_id', render: (r) => r.attendance_id },
    { key: 'date', label: 'Date', width: 130, sortKey: 'date', render: (r) => r.date },
    { key: 'check_in_time', label: 'Check-in Time', width: 140, render: (r) => r.check_in_time },
    { key: 'check_out_time', label: 'Check-out Time', width: 140, render: (r) => r.check_out_time },
    { key: 'worked_hours', label: 'Worked Hours', width: 130, align: 'center', sortKey: 'worked_hours', render: (r) => r.worked_hours },
    { key: 'ot_hours', label: 'OT Hours', width: 110, align: 'center', sortKey: 'ot_hours', render: (r) => r.ot_hours },
    { key: 'status', label: 'Status', width: 110, sortKey: 'status', filterKey: 'f_status', filterType: 'text', render: (r) => r.status },
    { key: 'employee_id', label: 'Employee ID', width: 120, sortKey: 'employee_id', filterKey: 'f_emp', filterType: 'text', render: (r) => r.employee_id },
    { key: 'verification_notes', label: 'Verification Notes', width: 220, render: (r) => r.verification_notes },
    {
      key: 'actions', label: 'Actions', width: 130, align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleEdit(row.attendance_id)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(row.attendance_id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [attendanceData]);

  const filteredRows = useMemo(
    () => applyClientFilters(attendanceData, columns, columnFilters, sortBy),
    [attendanceData, columns, columnFilters, sortBy]
  );
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize]
  );
  const handleFilterChange = (filterKey, value) => {
    const next = { ...columnFilters, [filterKey]: value };
    if (value === '' || value == null) delete next[filterKey];
    setColumnFilters(next);
    setPage(1);
  };

  return (
    <Box sx={{ width: '90%', mx: 'auto', mt: 5, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>Daily Attendance</Typography>

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(row) => row.attendance_id}
        page={page}
        pageSize={pageSize}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        emptyMessage="No attendance"
      />
    </Box>
  );
}
