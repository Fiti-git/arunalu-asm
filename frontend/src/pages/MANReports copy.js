import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper,
  Chip,
  Grid,
  Tooltip,
  TextField,
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import api from 'utils/api';

// Helper function to get the start of the current month
const getStartOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0];
};

// Helper function to get today's date
const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

// Detail Panel Component: Renders the individual records when a row is expanded.
const DetailPanelContent = ({ row }) => {
  const { subRows } = row;
  if (!subRows || subRows.length === 0) return null;
  const formatTime = (isoString) => isoString ? new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

  return (
    <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
      <Typography variant="h6" gutterBottom component="div">
        Individual Records
      </Typography>
      {subRows.map((record, index) => (
        <Paper key={`detail-${record.attendance_id}-${index}`} variant="outlined" sx={{ p: 2, mb: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={3}><Typography variant="body2"><strong>Status:</strong> {record.status}</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2"><strong>Check In:</strong> {formatTime(record.check_in_time)}</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2"><strong>Check Out:</strong> {formatTime(record.check_out_time)}</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2"><strong>Worked Hrs:</strong> {Number(record.worked_hours || 0).toFixed(2)}</Typography></Grid>
          </Grid>
        </Paper>
      ))}
    </Box>
  );
};

export default function EmployeeActivityLog() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState(getStartOfMonth());
  const [endDate, setEndDate] = useState(getToday());

useEffect(() => {
  const fetchOutlets = async () => {
    try {
      const response = await api.get("/api/user/");
      const fetchedOutlets = response.data.outlets || [];
      setOutlets(fetchedOutlets);

      // ✅ Automatically select the first outlet as default
      if (fetchedOutlets.length > 0) {
        setSelectedOutletId(fetchedOutlets[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  };
  fetchOutlets();
}, []);


  useEffect(() => {
    const fetchActivityData = async () => {
      setLoading(true);
      setError(null);
      setActivityData([]);

      if (!startDate || !endDate || !selectedOutletId) {
  setLoading(false);
  return;
}


      try {
        let combinedData = { employees: [] };

        if (selectedOutletId === "all") {
          // --- FETCH FOR ALL OUTLETS ---
          const allOutletPromises = outlets.map(outlet => {
            const url = `/outletsalldata/${outlet.id}/`;
            const params = { start_date: startDate, end_date: endDate };
            return api.get(url, { params })
              .then(res => res.data)
              .catch(err => {
                console.error(`Failed to fetch data for outlet: ${outlet.name}`, err);
                return null;
              });
          });

          const allResults = await Promise.all(allOutletPromises);
          const successfulResults = allResults.filter(data => data !== null);
          const allEmployees = successfulResults.flatMap(data => data.employees || []);

          const employeeMap = new Map();
          allEmployees.forEach(emp => {
            if (employeeMap.has(emp.employee_id)) {
              const existingEmp = employeeMap.get(emp.employee_id);
              existingEmp.attendances = [...(existingEmp.attendances || []), ...(emp.attendances || [])];
              existingEmp.leaves = [...(existingEmp.leaves || []), ...(emp.leaves || [])];
            } else {
              employeeMap.set(emp.employee_id, { ...emp });
            }
          });

          combinedData.employees = Array.from(employeeMap.values());

        } else {
          // --- FETCH FOR A SINGLE OUTLET ---
          const url = `/outletsalldata/${selectedOutletId}/`;
          const params = { start_date: startDate, end_date: endDate };
          const response = await api.get(url, { params });
          combinedData = response.data;
        }
        console.log("Fetched combinedData:", combinedData);

        const transformedData = transformDataForActivityLog(combinedData);
        setActivityData(transformedData);
      } catch (err) {
        setError(err.message);
        setActivityData([]);
      } finally {
        setLoading(false);
      }
    };

    if (selectedOutletId !== 'all' || (selectedOutletId === 'all' && outlets.length > 0)) {
      fetchActivityData();
    }

  }, [selectedOutletId, startDate, endDate, outlets]);


  const formatTime = (isoString) => isoString ? new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

  const formatVerificationNotes = (notesObj) => {
    if (!notesObj || Object.keys(notesObj).length === 0) return "-";
    const notes = [];
    if (notesObj.checkin_update) notes.push(`Check-in updated by ${notesObj.checkin_update.updated_by}`);
    if (notesObj.checkout_update) notes.push(`Check-out updated by ${notesObj.checkout_update.updated_by}`);
    return notes.join('; ') || "-";
  };

const transformDataForActivityLog = (data) => {
  if (!data || !data.employees) return [];

  const activityLog = [];
  const groupedAttendance = {};
  const parseTime = (isoString) => isoString ? new Date(isoString) : null;

  // Helper to check if a date is within selected range
  const isWithinRange = (dateStr) => {
    if (!dateStr) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  data.employees.forEach((emp) => {
    const employeeName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    const empcode_display = emp.fullname || "-";

    // --- Filter attendances by date range ---
    const attendances = (emp.attendances || []).filter(att => isWithinRange(att.date));
    attendances.forEach((att) => {
      const key = `${emp.employee_id}-${att.date}`;
      if (!groupedAttendance[key]) {
        groupedAttendance[key] = {
          employee_id: emp.employee_id,
          fullname: employeeName,
          empcode_display,
          date: new Date(att.date), // keep as string for DataGrid
          records: []
        };
      }
      groupedAttendance[key].records.push(att);
    });

    // --- Filter leaves by date range ---
    const leaves = (emp.leaves || []).filter(lv => isWithinRange(lv.leave_date));
    leaves.forEach((lv) => {
      activityLog.push({
        id: `leave-${lv.leave_refno}`,
        employee_id: emp.employee_id,
        fullname: employeeName,
        date: new Date(lv.leave_date),
        empcode_display,
        eventType: "Leave",
        status: lv.status,
        details: lv.leave_type_name,
        leave_type: lv.leave_type_name,
        check_in_time: "-",
        check_out_time: "-",
        worked_hours: "-",
        verification_notes: "-",
        consolidation_summary: "Single Event",
      });
    });
  });

  // --- Process grouped attendances ---
  for (const key in groupedAttendance) {
    const group = groupedAttendance[key];
    const { records } = group;

    if (records.length === 1) {
      const att = records[0];
      activityLog.push({
        id: `att-${att.attendance_id}`,
        employee_id: group.employee_id,
        fullname: group.fullname,
        empcode_display: group.empcode_display,
        date: group.date,
        eventType: "Attendance",
        status: att.punchin_verification,
        details: att.status,
        check_in_time: formatTime(att.check_in_time),
        check_out_time: formatTime(att.check_out_time),
        worked_hours: att.worked_hours ? Number(att.worked_hours).toFixed(2) : "-",
        verification_notes: formatVerificationNotes(att.verification_notes),
        consolidation_summary: "Single Event",
      });
    } else if (records.length > 1) {
      const checkInTimes = records.map(r => parseTime(r.check_in_time)).filter(Boolean);
      const checkOutTimes = records.map(r => parseTime(r.check_out_time)).filter(Boolean);
      const earliestCheckIn = checkInTimes.length ? new Date(Math.min(...checkInTimes)) : null;
      const latestCheckOut = checkOutTimes.length ? new Date(Math.max(...checkOutTimes)) : null;
      const totalWorkedHours = records.reduce((sum, r) => sum + (Number(r.worked_hours) || 0), 0);
      const allDetails = records.map(r => r.status).join(', ');
      const allVerificationNotes = records.map(r => formatVerificationNotes(r.verification_notes)).filter(n => n !== '-').join('; ');
      const summaryParts = [
        `Consolidated ${records.length} records.`,
        `Earliest Check-in: ${formatTime(earliestCheckIn)}.`,
        `Latest Check-out: ${formatTime(latestCheckOut)}.`,
        `Sum of Worked Hours: ${totalWorkedHours.toFixed(2)} hrs.`
      ];

      activityLog.push({
        id: `group-${key}`,
        employee_id: group.employee_id,
        fullname: group.fullname,
        empcode_display: group.empcode_display,
        date: group.date,
        eventType: "Attendance",
        status: "Multiple",
        details: allDetails,
        check_in_time: formatTime(earliestCheckIn),
        check_out_time: formatTime(latestCheckOut),
        worked_hours: totalWorkedHours.toFixed(2),
        verification_notes: allVerificationNotes || "-",
        consolidation_summary: summaryParts.join(' '),
        subRows: records,
      });
    }
  }

  // Sort by date descending
  return activityLog.sort((a, b) => new Date(b.date) - new Date(a.date));
};


  // *** UPDATED COLUMNS ***
  const columns = [
    { field: "employee_id", headerName: "Emp ID", width: 90 },
    { field: "empcode_display", headerName: "Emp Code", width: 120 },
    { field: "fullname", headerName: "Full Name", flex: 1.5, minWidth: 180 },
    { field: "date", headerName: "Date", type: "date", minWidth: 120 },
    {
      field: "eventType",
      headerName: "Event Type",
      minWidth: 130,
      renderCell: (params) => (<Chip label={params.value} color={params.value === "Attendance" ? "primary" : "warning"} variant="outlined" size="small" />)
    },
    { field: "details", headerName: "Details / Statuses", flex: 1.5, minWidth: 200 },
    { field: "check_in_time", headerName: "Time In", flex: 1, minWidth: 120 },
    { field: "check_out_time", headerName: "Time Out", flex: 1, minWidth: 120 },
    { field: "worked_hours", headerName: "Total Worked Hrs", type: "number", flex: 1, minWidth: 150 },
    { field: "leave_type", headerName: "Leave Type", minWidth: 130, flex: 1 },

  ];

  return (
    <Paper sx={{ p: 3, mt: 3, borderRadius: 3, boxShadow: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", mb: 3, gap: 2, }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>Standed Report </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <TextField label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 200 }} />
          <TextField label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 200 }} />
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>Select Outlet</InputLabel>
            <Select value={selectedOutletId} label="Select Outlet" onChange={(e) => setSelectedOutletId(e.target.value)}>
              {outlets.map((outlet) => (<MenuItem key={outlet.id} value={outlet.id}>{outlet.name}</MenuItem>))}
            </Select>
          </FormControl>
        </Box>

      </Box>
      {error && <Typography color="error" align="center" sx={{ my: 4 }}>{error}</Typography>}
      <Box sx={{ height: 650, width: "100%" }}>
        <DataGrid
          rows={activityData}
          columns={columns}
          loading={loading}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          getDetailPanelHeight={({ row }) => row.subRows ? 'auto' : 0}
          getDetailPanelContent={({ row }) => <DetailPanelContent row={row} />}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          sx={{ borderRadius: 2, "& .MuiDataGrid-cell:focus": { outline: "none" } }}
          showToolbar
        />
      </Box>
    </Paper>
  );
}