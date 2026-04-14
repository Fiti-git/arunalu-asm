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
import EmployeeAttendanceTable from "./EmployeeAttendanceTable";

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
  const [startDate, setStartDate] = useState(
    priorMonth.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch logged-in user info first
  useEffect(() => {
    fetchUserInfo();
  }, []);

  // Fetch employee list when userReport loads
  useEffect(() => {
    if (userReport) {
      // Here: Filter employees only from your specific outlet (e.g., outlet_id = 1)
      const outletId = 1; // Change this to your desired outlet id or get dynamically
      if (
        userReport.employees_by_outlet &&
        userReport.employees_by_outlet[outletId]
      ) {
        setEmployeeList(userReport.employees_by_outlet[outletId].employees);
      } else {
        setEmployeeList([]);
      }
    }
  }, [userReport]);

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

  const handleFetchEmployee = async () => {
    setLoading(true);
    setError(null);
    setEmployeeReport(null);

    try {
      const token = localStorage.getItem("access_token");
      let employeesToFetch = [];

      if (selectedEmployee === "all") {
        employeesToFetch = employeeList.map((e) => e.employee_id);
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
          // Continue fetching others even if one fails
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

  // Handle outlet change if you want to allow selecting outlets (optional)
  const handleOutletChange = (event) => {
    const outletId = event.target.value;
    setSelectedOutlet(outletId);
    setSelectedEmployee("all");
    setEmployeeReport(null);
    setError(null);

    if (outletId === "all") {
      // If you want, show all employees from all outlets
      const allEmployees = Object.values(userReport.employees_by_outlet || {})
        .flatMap((o) => o.employees);
      setEmployeeList(allEmployees);
    } else if (userReport?.employees_by_outlet[outletId]) {
      setEmployeeList(userReport.employees_by_outlet[outletId].employees);
    } else {
      setEmployeeList([]);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          mb: 3,
          textTransform: "uppercase",
          borderBottom: "3px solid #1976d2",
          display: "inline-block",
          pb: 0.5,
          color: "#0d0d0ff",
        }}
      >
        Employee Reports
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {userReport && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
            backgroundColor: "#f9fafc",
            p: 2.5,
            borderRadius: 2,
            border: "1px solid #e0e0e0",
          }}
        >
          <FormControl
            sx={{
              minWidth: 200,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                height: 42,
                backgroundColor: "#fff",
                "&:hover fieldset": { borderColor: "#1976d2" },
              },
            }}
          >
            <InputLabel>Outlet</InputLabel>
            <Select
              value={selectedOutlet}
              onChange={handleOutletChange}
              label="Outlet"
            >
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

          <FormControl
            sx={{
              minWidth: 250,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                height: 42,
                backgroundColor: "#fff",
                "&:hover fieldset": { borderColor: "#1976d2" },
              },
            }}
            disabled={!selectedOutlet}
          >
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

          <TextField
            label="Start Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            sx={{
              minWidth: 180,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                height: 42,
                backgroundColor: "#fff",
                "&:hover fieldset": { borderColor: "#1976d2" },
              },
            }}
          />
          <TextField
            label="End Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            sx={{
              minWidth: 180,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                height: 42,
                backgroundColor: "#fff",
                "&:hover fieldset": { borderColor: "#1976d2" },
              },
            }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleFetchEmployee}
            disabled={loading}
            sx={{
              height: 42,
              borderRadius: 2,
              px: 3,
              textTransform: "none",
              fontWeight: "bold",
              boxShadow: "none",
              "&:hover": { boxShadow: "0 2px 8px rgba(25, 118, 210, 0.2)" },
            }}
          >
            {loading ? <CircularProgress size={20} /> : "Fetch Data"}
          </Button>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {employeeReport && !loading && (
        <>
          <Typography
            variant="h6"
            sx={{
              mt: 3,
              mb: 2,
              fontWeight: "bold",
              textTransform: "uppercase",
              color: "#37474f",
            }}
          >
            Employee Report
            {startDate && endDate ? ` | ${startDate} → ${endDate}` : ""}
          </Typography>
          <EmployeeAttendanceTable data={employeeReport} />
        </>
      )}
    </Box>
  );
}
