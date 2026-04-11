import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import axios from "axios";
import EmployeeAttendanceTable from "../../pages/EmployeeAttendanceTable";

const API_BASE = process.env.REACT_APP_API_URL || "http://123.231.60.24:1605";

export default function MANReports() {
  // Default date range: last month to today
  const today = new Date();
  const priorMonth = new Date();
  priorMonth.setMonth(today.getMonth() - 1);

  const [userInfo, setUserInfo] = useState(null);
  const [userReport, setUserReport] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [employeeList, setEmployeeList] = useState([]);
  const [employeeReport, setEmployeeReport] = useState(null);
  const [startDate, setStartDate] = useState(priorMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("No access token found. Please log in first.");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE}/api/user/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserInfo(response.data);
      fetchUserReport(response.data.id, token);
    } catch (err) {
      console.error("Error fetching user info:", err);
      setError(err.response?.data?.detail || err.message);
      setLoading(false);
    }
  };

  const fetchUserReport = async (userId, token) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE}/report/employees/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserReport(response.data);
    } catch (err) {
      console.error("Error fetching user report:", err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOutletChange = (event) => {
    const outletId = event.target.value;
    setSelectedOutlet(outletId);
    setSelectedEmployee("all");
    setEmployeeReport(null);
    setError(null);

    if (outletId === "all") {
      setEmployeeList(
        Object.values(userReport.employees_by_outlet).flatMap((o) => o.employees)
      );
    } else if (userReport?.employees_by_outlet[outletId]) {
      setEmployeeList(userReport.employees_by_outlet[outletId].employees);
    } else {
      setEmployeeList([]);
    }
  };

  const handleFetchEmployee = async () => {
    setLoading(true);
    setError(null);
    setEmployeeReport(null);

    try {
      const token = localStorage.getItem("access_token");
      let employeesToFetch = [];

      if (selectedEmployee === "all") {
        if (selectedOutlet === "all") {
          employeesToFetch = Object.values(userReport.employees_by_outlet)
            .flatMap((o) => o.employees)
            .map((e) => e.employee_id);
        } else {
          employeesToFetch =
            userReport.employees_by_outlet[selectedOutlet]?.employees.map(
              (e) => e.employee_id
            ) || [];
        }
      } else {
        employeesToFetch = [selectedEmployee];
      }

      if (employeesToFetch.length === 0) {
        setError("No employees found for selected outlet.");
        setLoading(false);
        return;
      }

      const allReports = [];

      for (const empId of employeesToFetch) {
        let url = `${API_BASE}/report/employee/${empId}`;
        const params = [];
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        if (params.length > 0) url += `?${params.join("&")}`;

        try {
          const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          allReports.push(response.data);
        } catch (err) {
          console.error(`Error fetching report for employee ${empId}:`, err);
        }
      }

      if (allReports.length === 0) {
        setError("No report data found for selected employee(s).");
      } else {
        setEmployeeReport(allReports.length === 1 ? allReports[0] : allReports);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching employee report:", err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        mt: 3,
        borderRadius: 3,
        boxShadow: 4,
        backgroundColor: "#fafafa",
        textTransform: 'uppercase',
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3, color: "#1976d2" }}>
        Employee Attendance Reports
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2, fontWeight: 500 }}>
          {error}
        </Typography>
      )}

      {userReport && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            mb: 3,
          }}
        >
          {/* Outlet Selector */}
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Outlet</InputLabel>
            <Select value={selectedOutlet} onChange={handleOutletChange} label="Outlet">
              <MenuItem value="all">All Outlets</MenuItem>
              {Object.entries(userReport.employees_by_outlet).map(
                ([outletId, outletData]) => (
                  <MenuItem key={outletId} value={outletId}>
                    {outletData.outlet_name}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>

          {/* Employee Selector */}
          <FormControl sx={{ minWidth: 250 }} size="small" disabled={!selectedOutlet}>
            <InputLabel>Employee</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setEmployeeReport(null);
                setError(null);
              }}
              label="Employee"
            >
              <MenuItem value="all">All Employees</MenuItem>
              {employeeList.map((emp) => (
                <MenuItem key={emp.employee_id} value={emp.employee_id}>
                  {emp.user_first_name} ({emp.fullname})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date Range Inputs */}
          <TextField
            label="Start Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="End Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          />

          {/* Fetch Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleFetchEmployee}
            disabled={loading}
            sx={{ height: 40, px: 3 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Fetch Data"}
          </Button>
        </Box>
      )}

      {/* Loader */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Employee Report Table */}
      {employeeReport && !loading && (
        <>
          <Typography
            variant="h6"
            sx={{
              mt: 4,
              mb: 1,
              color: "#333",
              fontWeight: 600,
            }}
          >
            Attendance Summary
            {startDate && endDate ? ` | ${startDate} → ${endDate}` : ""}
          </Typography>

          <EmployeeAttendanceTable data={employeeReport} />
        </>
      )}
    </Paper>
  );
}
