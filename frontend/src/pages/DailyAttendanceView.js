import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import api from 'utils/api';
import { DataTable, applyClientFilters } from 'components/ui';

export default function DailyAttendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(0);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

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

  useEffect(() => {
    const fetchAttendance = async () => {
      const params = new URLSearchParams({ outlet_id: selectedOutletId.toString() });
      setLoading(true);
      try {
        const response = await api.get(`/api/attendance/all/?${params.toString()}`);
        const formattedData = response.data.map((item) => ({
          attendance_id: item.attendance_id,
          employee: item.employee,
          employee_name: item.employee_name,
          date: item.date,
          check_in_time: item.check_in_time,
          check_out_time: item.check_out_time,
        }));
        setAttendanceData(formattedData);
        setPage(1);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        alert('Failed to fetch attendance data.');
      } finally {
        setLoading(false);
      }
    };

    if (selectedOutletId !== undefined) {
      fetchAttendance();
    }
  }, [selectedOutletId]);

  const columns = useMemo(() => [
    { key: 'employee_name', label: 'Employee Name', width: 220, sortKey: 'employee_name', filterKey: 'f_emp', filterType: 'text', render: (r) => r.employee_name },
    { key: 'date', label: 'Date', width: 130, sortKey: 'date', render: (r) => r.date },
    { key: 'check_in_time', label: 'Check-in Time', width: 160, render: (r) => r.check_in_time },
    { key: 'check_out_time', label: 'Check-out Time', width: 160, render: (r) => r.check_out_time },
  ], []);

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

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="outlet-select-label">Select Outlet</InputLabel>
        <Select
          labelId="outlet-select-label"
          value={selectedOutletId}
          onChange={(e) => setSelectedOutletId(e.target.value)}
          label="Select Outlet"
        >
          <MenuItem value={0}>All Outlets</MenuItem>
          {outlets.map((outlet) => (
            <MenuItem key={outlet.id} value={outlet.id}>
              {outlet.name} - {outlet.address}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(row) => row.attendance_id}
        loading={loading}
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
