import React, { useEffect, useMemo, useState } from 'react';
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
import { DataTable, applyClientFilters } from 'components/ui';

export default function EmployeeDataReport() {
  const [reportData, setReportData] = useState([]);
  const [userOutlets, setUserOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    const fetchUserOutlets = async () => {
      try {
        const res = await api.get('/api/user/');
        const outlets = res.data.outlets || [];
        setUserOutlets(outlets);
        if (outlets.length > 0) {
          setSelectedOutletId(outlets[0].id);
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
        setPage(1);
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

  const columns = [
    { key: 'employee_id', label: 'Emp ID', width: 90, sortKey: 'employee_id', filterKey: 'f_emp_id', filterType: 'text' },
    { key: 'employ_number', label: 'Emp No.', width: 100, sortKey: 'employ_number', filterKey: 'f_emp_no', filterType: 'text' },
    { key: 'fullname', label: 'Full Name', width: 200, sortKey: 'fullname', filterKey: 'f_fullname', filterType: 'text' },
    { key: 'groups', label: 'Groups', width: 140, sortKey: 'groups', filterKey: 'f_groups', filterType: 'text' },
    { key: 'date', label: 'Date', width: 120, sortKey: 'date', filterKey: 'f_date', filterType: 'text' },
  ];

  const filteredRows = useMemo(
    () => applyClientFilters(reportData, columns, columnFilters, sortBy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reportData, columnFilters, sortBy]
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
        <Typography variant="h4" sx={{ fontWeight: 'bold', borderBottom: 3, borderColor: 'primary.main' }}>
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
        <DataTable
          columns={columns}
          rows={pagedRows}
          getRowId={(r) => r.id}
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
          emptyMessage="No records found"
        />
      )}
    </Paper>
  );
}
