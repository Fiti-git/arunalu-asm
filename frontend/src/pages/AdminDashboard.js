import React, { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Button,
  CircularProgress,
  Avatar,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import StoreIcon from "@mui/icons-material/Store";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const API_BASE = process.env.REACT_APP_API_URL || "http://123.231.60.24:1605";

function AdminDashboard() {
  const [overviewData, setOverviewData] = useState(null);
  const [leavePresenceData, setLeavePresenceData] = useState([]);
  const [outletData, setOutletData] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animKey, setAnimKey] = useState(0);


  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoading(true);
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) throw new Error("No access token found");
        const headers = { Authorization: `Bearer ${accessToken}` };

        const [overviewRes, leaveRes, outletRes, employeeRes] = await Promise.all([
          fetch(`${API_BASE}/report/dashboard/overview/`, { headers }),
          fetch(`${API_BASE}/report/dashboard/leave-presence-trend/`, { headers }),
          fetch(`${API_BASE}/report/dashboard/outlet-summary/`, { headers }),
          fetch(`${API_BASE}/report/dashboard/employee-attendance-summary/`, { headers }),
        ]);

        if (!overviewRes.ok) throw new Error("Failed to fetch overview data");
        if (!leaveRes.ok) throw new Error("Failed to fetch leave presence data");
        if (!outletRes.ok) throw new Error("Failed to fetch outlet data");
        if (!employeeRes.ok) throw new Error("Failed to fetch employee attendance data");

        const overviewJson = await overviewRes.json();
        const leavePresenceJson = await leaveRes.json();
        const outletJson = await outletRes.json();
        const employeeJson = await employeeRes.json();

        setOverviewData(overviewJson);
        setLeavePresenceData(leavePresenceJson);
        setOutletData(outletJson);
        setEmployeeData(employeeJson);
        setError(null);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);
  

  const filteredEmployees =
    selectedOutlet === "All"
      ? employeeData
      : employeeData.filter((emp) => emp.outlet_name === selectedOutlet);

  const statCards = overviewData
    ? [
        { label: "Total Employees", value: overviewData.total_emp },
        { label: "Active Employees", value: overviewData.active_emp },
        { label: "Inactive Employees", value: overviewData.inactive_emp },
        { label: "Total Outlets", value: overviewData.outlets },
        { label: "Present Today", value: overviewData.present },
        { label: "Absent Today", value: overviewData.absentee },
      ]
    : [];
  

  // Conditional rendering for loading and error states
  if (loading && !overviewData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Dashboard Data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 1400, mx: "auto", py: 3, px: 4 }}>
        <Alert severity="error">
          Error: {error}. Please check your network connection or access token.
        </Alert>
      </Box>
    );
  }

const iconMap = {
  "Total Employees": { icon: <PeopleIcon />, color: "#1976d2" },
  "Active Employees": { icon: <PersonIcon />, color: "#2e7d32" },
  "Inactive Employees": { icon: <CancelIcon />, color: "#d32f2f" },
  "Total Outlets": { icon: <StoreIcon />, color: "#0288d1" },
  "Present Today": { icon: <CheckCircleIcon />, color: "#43a047" },
  "Absent Today": { icon: <CancelIcon />, color: "#f57c00" },
};



  return (
    <Box sx={{ minHeight: "100vh", py: 1}}>
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 2 }}>
        
        {/* === MAIN DASHBOARD GRID (KPIs & TRENDS) === */}
        <Box sx={{  p: 2, borderRadius: 1, height: "500px", }}>
          <Grid container spacing={3} sx={{ height: "100%" }}>
            
            {/* Left Side: KPI Cards */}
<Grid
  item
  xs={12}
  lg={7}
  sx={{
    height: "100%",
    width: "40%",
    overflowY: "auto",
    /* Hide scrollbar */
    scrollbarWidth: "none", // For Firefox
    msOverflowStyle: "none", // For Internet Explorer and Edge
    "&::-webkit-scrollbar": {
      display: "none", // For Chrome, Safari, and Opera
    },
  }}
>
<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
  {statCards.map((stat, index) => {
    const { icon, color } = iconMap[stat.label] || {};
    return (
      <Card
        key={index}
        elevation={2}
        sx={{
          borderRadius: 2,
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: "0px 4px 20px rgba(0,0,0,0.08)",
          },
        }}
      >
        <CardContent
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 2,
            px: 2.5,
          }}
        >
          {/* Left side - Text */}
          <Box>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              {stat.label}
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "text.primary", mt: 0.5 }}
            >
              {stat.value}
            </Typography>
          </Box>

          {/* Right side - Icon */}
          {icon && (
            <Avatar
              sx={{
                bgcolor: `${color}1A`, // transparent tint background
                color: color,
                width: 48,
                height: 48,
                boxShadow: `0 0 0 2px ${color}20`,
              }}
            >
              {icon}
            </Avatar>
          )}
        </CardContent>
      </Card>
    );
  })}
</Box>
</Grid>


            {/* Right Side: Attendance Trends Chart */}
            <Grid item xs={12} lg={5} sx={{ height: "100%", width: "58%", display: "flex" }}>
              <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", p: 2, width: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#212121", mb: 0.5, fontSize: "1rem" }}>
                  Attendance Trends
                </Typography>
                <Typography variant="body2" sx={{ color: "#757575", mb: 1.5, fontSize: "0.75rem" }}>
                  Employee presence, leave, and not-marked patterns over the last 7 days
                </Typography>
                <Box sx={{ width: "100%", flex: 1, minHeight: 0, position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={leavePresenceData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                      <XAxis
                        dataKey="date_label"
                        stroke="#9e9e9e"
                        tick={{ fontSize: 11, fill: "#757575" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e0e0e0" }}
                      />
                      <YAxis
                        stroke="#9e9e9e"
                        tick={{ fontSize: 11, fill: "#757575" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e0e0e0" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e0e0e0",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                        cursor={{ stroke: "#e0e0e0", strokeWidth: 1 }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                        iconType="circle"
                        iconSize={7}
                      />
                      <Line
                        type="basis"
                        dataKey="present"
                        stroke="#2e7d32" // Green for Present
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        name="Present"
                        isAnimationActive={true}
animationDuration={800}
                      />
                      <Line
                        type="basis"
                        dataKey="leave"
                        stroke="#f57c00" // Orange for On Leave
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        name="On Leave"
                      />
                      {/* === NEW LINE FOR NOT MARKED ATTENDANCE === */}
                      <Line
                        type="basis"
                        dataKey="not_marked" // Key from the API response
                        stroke="#ff0000ff" // Grey color
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        name="Not Marked"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* --- */}

        {/* === Outlet Table === */}
        <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", mb: 3, overflow: "hidden" }}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e0e0e0" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#212121", mb: 0.5 }}>
              Outlet Overview
            </Typography>
            <Typography variant="body2" sx={{ color: "#757575" }}>
              Current attendance status across all locations
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 440, overflowY: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#fafafa" }}>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Outlet
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Total Staff
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Present
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Absent
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    On Leave
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Attendance Rate
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {outletData.map((outlet) => {
                  const attendanceRate = ((outlet.presentemp / outlet.totalemp) * 100).toFixed(0);
                  return (
                    <TableRow key={outlet.outlet_id} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                      <TableCell sx={{ fontWeight: 500, color: "#212121" }}>{outlet.name}</TableCell>
                      <TableCell sx={{ color: "#616161" }}>{outlet.totalemp}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#2e7d32", fontWeight: 600 }}>
                          {outlet.presentemp}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#d32f2f", fontWeight: 600 }}>
                          {outlet.absentemp}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#f57c00", fontWeight: 600 }}>
                          {outlet.onleave}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 80, mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Number(attendanceRate)}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: "#e0e0e0",
                                "& .MuiLinearProgress-bar": { bgcolor: "#2e7d32", borderRadius: 3 },
                              }}
                            />
                          </Box>
                          <Typography variant="body2" sx={{ color: "#616161" }}>
                            {attendanceRate}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* --- */}
        
        {/* === Employee Table === */}
        <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", mb: 3, overflow: "hidden" }}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#212121", mb: 0.5 }}>
                Employee Attendance
              </Typography>
              <Typography variant="body2" sx={{ color: "#757575" }}>
                Monthly attendance summary by employee
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by Outlet</InputLabel>
              <Select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)} label="Filter by Outlet">
                <MenuItem value="All">All Outlets</MenuItem>
                {outletData.map((outlet) => (
                  <MenuItem key={outlet.outlet_id} value={outlet.name}>
                    {outlet.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TableContainer sx={{ maxHeight: 440, overflowY: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#fafafa" }}>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Employee
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Present
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Absent
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>Leave</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Total Days
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const totalDays = emp.present_days + emp.absent_days + emp.leave_days;
                  return (
                    <TableRow key={emp.employee_id} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                      <TableCell sx={{ fontWeight: 500, color: "#212121" }}>{emp.fullname}</TableCell>
                      <TableCell sx={{ color: "#616161" }}>{emp.empcode}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#2e7d32", fontWeight: 600 }}>
                          {emp.present_days}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#d32f2f", fontWeight: 600 }}>
                          {emp.absent_days}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#f57c00", fontWeight: 600 }}>
                          {emp.leave_days}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#616161" }}>{totalDays}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
}

export default AdminDashboard;