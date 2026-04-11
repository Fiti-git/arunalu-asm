import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  TextField,
  Paper,

} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import api from 'utils/api';

export default function DailyOutletAttendance() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [outletData, setOutletData] = useState(null);
  const [loading, setLoading] = useState(true); // Set initial loading to true
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await api.get("/api/user/");
        const userOutlets = response.data.outlets || [];
        setOutlets(userOutlets);
        if (userOutlets.length > 0) {
          setSelectedOutletId(userOutlets[0].id);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchOutlets();
  }, []);

  useEffect(() => {
    if (!selectedOutletId) return;

    const fetchOutletData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/outletsalldata/${selectedOutletId}/`);
        setOutletData(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setOutletData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOutletData();
  }, [selectedOutletId, selectedDate]);

  const transformOutletData = (data) => {
    const today = selectedDate;

    const formatTime = (isoString) => {
      if (!isoString) return "-";
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return data.employees.map((emp) => {
      const todaysAttendance = emp.attendances.find(
        (att) => att.date === today
      );
      const todaysLeave = emp.leaves.find(
        (lv) => lv.leave_date === today && lv.status === "approved"
      );

      let status = "Absent";
      let checkIn = "-";
      let checkOut = "-";

      if (todaysAttendance) {
        status = "Present";
        checkIn = formatTime(todaysAttendance.check_in_time);
        checkOut = formatTime(todaysAttendance.check_out_time);
      } else if (todaysLeave) {
        status = `On Leave (${todaysLeave.leave_type_name})`;
      }

      return {
        id: emp.employee_id,
        employee_id: emp.employee_id,
        fullname: `${emp.first_name} `,
        check_in_time: checkIn,
        check_out_time: checkOut,
        status,
      };
    });
  };

  const rows = outletData ? transformOutletData(outletData) : [];

  const columns = [
    { field: "employee_id", headerName: "ID", width: 90 },
    { field: "fullname", headerName: "Full Name", flex: 1.5, minWidth: 150 },
    {
      field: "check_in_time",
      headerName: "Check In",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "check_out_time",
      headerName: "Check Out",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        let color = "red"; // Default for Absent
        if (params.value.startsWith("On Leave")) color = "orange";
        if (params.value === "Present") color = "green";
        return <span style={{ color }}>{params.value}</span>;
      },
    },
  ];

return (
  <Box sx={{ p: 4 }}>
    {/* Page Title */}
    <Typography
      variant="h4"
      sx={{
        mb: 3,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        display: 'inline-block',
        pb: 0.5,
      }}
    >
      Outlet Log
    </Typography>

    {/* Filter Section */}
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
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {outlets.length > 1 && (
          <FormControl
            variant="outlined"
            sx={{
              minWidth: 220,
              '& .MuiInputLabel-root': { fontWeight: 600, color: '#444' },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#fafafa',
                '& fieldset': { borderColor: '#ccc' },
                '&:hover fieldset': { borderColor: '#1976d2' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 },
              },
            }}
          >
            <InputLabel>Select Outlet</InputLabel>
            <Select
              value={selectedOutletId}
              label="Select Outlet"
              onChange={(e) => setSelectedOutletId(e.target.value)}
            >
              {outlets.map((outlet) => (
                <MenuItem key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          label="Select Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            minWidth: 220,
            '& .MuiInputBase-root': {
              borderRadius: 2,
              backgroundColor: '#fafafa',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#ccc',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1976d2',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1976d2',
              borderWidth: 2,
            },
          }}
        />
      </Box>
    </Box>

    {/* Data / Loader / Error Section */}
    {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    ) : error ? (
      <Typography color="error" align="center" sx={{ mt: 4 }}>
        {error}
      </Typography>
    ) : (
      <Box sx={{ height: 500, width: '100%', overflowX: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns.map((col) => ({
            ...col,
            flex: col.flex || 1,
            minWidth: col.minWidth || 120,
          }))}
          pageSize={5}
          rowsPerPageOptions={[5, 10, 20]}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f7fa',
              fontWeight: 'bold',
            },
            '& .MuiDataGrid-row:hover': { backgroundColor: '#f9f9f9' },
            '& .MuiDataGrid-cell:focus': { outline: 'none' },
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        />
      </Box>
    )}
  </Box>
);


}