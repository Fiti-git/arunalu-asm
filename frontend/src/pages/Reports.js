import React, { useEffect, useState } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import api from 'utils/api';

// Define which fields should be visible by default
const VISIBLE_FIELDS = [
  'employee_id',
  'employ_number',
  'fullname',
  'groups',
  'date',
];

export default function EmployeeDataReport() {
  const [reportData, setReportData] = useState([]);
  const [userOutlets, setUserOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    const fetchUserOutlets = async () => {
      try {
        const res = await api.get('/api/user/');
        const userOutlets = res.data.outlets || [];
        setUserOutlets(userOutlets);
        if (userOutlets.length > 0) {
          setSelectedOutletId(userOutlets[0].id);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchUserOutlets();
  }, []);

  useEffect(() => {
    if (!selectedOutletId) return;

    const fetchOutletData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/outletsalldata/${selectedOutletId}/`);
        setReportData(transformData(res.data));
      } catch (err) {
        setError(err.message);
        setReportData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOutletData();
  }, [selectedOutletId]);

  const getAttendancePlaceholders = () => ({
    check_in_time: '-',
    check_out_time: '-',
    worked_hours: '-',
    ot_hours: '-',
    punchin_verification: '-',
    punchout_verification: '-',
    check_in_location: '-',
    check_out_location: '-',
    attendance_id: '-',
  });

  const getLeavePlaceholders = () => ({
    leave_type_name: '-',
    remarks: '-',
    leave_refno: '-',
    add_date: '-',
    action_date: '-',
  });

  const transformData = (data) => {
    const result = [];
    let id = 0;

    if (!data || !data.employees) return result;

    data.employees.forEach((emp) => {
      const employeeInfo = {
        employee_id: emp.employee_id,
        employ_number: emp.employ_number,
        fullname: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        phone_number: emp.phone_number,
        idnumber: emp.idnumber,
        date_of_birth: emp.date_of_birth,
        is_active: emp.is_active,
        groups: emp.groups.join(', '),
        basic_salary: emp.basic_salary,
        epf_number: emp.epf_number,
        epf_grade: emp.epf_grade,
      };

      if (emp.attendances.length === 0 && emp.leaves.length === 0) {
        result.push({
          id: id++,
          ...employeeInfo,
          record_type: 'Employee Info',
          date: '-',
          ...getAttendancePlaceholders(),
          ...getLeavePlaceholders(),
        });
      }

      emp.attendances.forEach((att) => {
        result.push({
          id: id++,
          ...employeeInfo,
          record_type: 'Attendance',
          date: att.date,
          status: att.status,
          check_in_time: att.check_in_time,
          check_out_time: att.check_out_time,
          worked_hours: att.worked_hours,
          ot_hours: att.ot_hours,
          punchin_verification: att.punchin_verification,
          punchout_verification: att.punchout_verification,
          check_in_location: `${att.check_in_lat}, ${att.check_in_long}`,
          check_out_location: att.check_out_lat ? `${att.check_out_lat}, ${att.check_out_long}` : '-',
          attendance_id: att.attendance_id,
          ...getLeavePlaceholders(),
        });
      });

      emp.leaves.forEach((leave) => {
        result.push({
          id: id++,
          ...employeeInfo,
          record_type: 'Leave',
          date: leave.leave_date,
          status: leave.status,
          leave_type_name: leave.leave_type_name,
          remarks: leave.remarks,
          leave_refno: leave.leave_refno,
          add_date: leave.add_date,
          action_date: leave.action_date,
          ...getAttendancePlaceholders(),
        });
      });
    });

    return result;
  };

  const allColumns = [
    { field: 'employee_id', headerName: 'Emp ID', width: 90 },
    { field: 'employ_number', headerName: 'Emp No.', width: 90 },
    { field: 'fullname', headerName: 'Full Name', flex: 1.5, minWidth: 180 },
    { field: 'groups', headerName: 'Groups', width: 120 },
    { field: 'date', headerName: 'Date', width: 120 },
    // Other columns are now part of the grid and can be toggled
    { field: 'is_active', headerName: 'Active', width: 90, type: 'boolean' },
    { field: 'basic_salary', headerName: 'Basic Salary', width: 120, type: 'number' },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'check_in_time', headerName: 'Check In', width: 180 },
    { field: 'check_out_time', headerName: 'Check Out', width: 180 },
    { field: 'worked_hours', headerName: 'Worked Hrs', width: 110, type: 'number' },
    { field: 'ot_hours', headerName: 'OT Hrs', width: 90, type: 'number' },
    { field: 'punchin_verification', headerName: 'Punch-In Verified', width: 150 },
    { field: 'punchout_verification', headerName: 'Punch-Out Verified', width: 160 },
    { field: 'check_in_location', headerName: 'Check-In Location', width: 160 },
    { field: 'check_out_location', headerName: 'Check-Out Location', width: 160 },
    { field: 'attendance_id', headerName: 'Attendance ID', width: 120 },
    { field: 'leave_type_name', headerName: 'Leave Type', width: 130 },
    { field: 'remarks', headerName: 'Remarks', flex: 1, minWidth: 150 },
    { field: 'leave_refno', headerName: 'Leave Ref No', width: 120 },
    { field: 'add_date', headerName: 'Leave Add Date', width: 130 },
    { field: 'action_date', headerName: 'Leave Action Date', width: 150 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    { field: 'phone_number', headerName: 'Phone', width: 130 },
    { field: 'idnumber', headerName: 'ID Number', width: 150 },
    { field: 'date_of_birth', headerName: 'DOB', width: 120 },
    { field: 'epf_number', headerName: 'EPF Number', width: 130 },
    { field: 'epf_grade', headerName: 'EPF Grade', width: 100 },
  ];

  // Create an object for initial column visibility
  const initialColumnVisibility = {};
  allColumns.forEach(col => {
    initialColumnVisibility[col.field] = VISIBLE_FIELDS.includes(col.field);
  });

  return (
    <Paper sx={{ p: 3, mt: 3, borderRadius: 3, boxShadow: 3 }}>
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
        <Typography variant="h4" sx={{ fontWeight: 'bold', borderBottom: '3px solid #1976d2' }}>
          EMPLOYEE REPORT
        </Typography>

        {userOutlets.length > 0 && (
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Select Outlet</InputLabel>
            <Select
              value={selectedOutletId}
              label="Select Outlet"
              onChange={(e) => setSelectedOutletId(e.target.value)}
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
        <div style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={reportData}
            columns={allColumns} // Pass all columns
            loading={loading}
            components={{ Toolbar: GridToolbar }}
            initialState={{
              columns: {
                columnVisibilityModel: initialColumnVisibility,
              },
            }}
            showToolbar
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              borderRadius: 2,
              '& .MuiDataGrid-row:hover': { backgroundColor: '#f5f5f5' },
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
              '& .record-type-cell': { fontWeight: 'bold' },
            }}
          />
        </div>
      )}
    </Paper>
  );
}