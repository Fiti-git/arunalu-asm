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
  Alert,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const API_BASE = process.env.REACT_APP_API_URL || "http://123.231.60.24:1605";

function ManagerDashboard() {
  const [overviewData, setOverviewData] = useState(null);
  const [leavePresenceData, setLeavePresenceData] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [userOutlets, setUserOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null); // Changed to null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user outlets on mount
  useEffect(() => {
    async function fetchUserOutlets() {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) throw new Error("No access token found");
        
        const response = await fetch(`${API_BASE}/api/user/`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (!response.ok) throw new Error("Failed to fetch user data");
        
        const userData = await response.json();
        setUserOutlets(userData.outlets || []);
        
        // Set first outlet as default if available
        if (userData.outlets && userData.outlets.length > 0) {
          setSelectedOutlet(userData.outlets[0].id.toString());
        }
      } catch (err) {
        setError(err.message || "Failed to fetch user outlets");
      }
    }
    fetchUserOutlets();
  }, []);

  // Fetch dashboard data when outlet selection changes
  useEffect(() => {
    if (!selectedOutlet || selectedOutlet === null) return; // Don't fetch if no outlet selected
    
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) throw new Error("No access token found");
        
        const headers = { Authorization: `Bearer ${accessToken}` };
        
        // Determine API endpoint based on selection
        const outletParam = selectedOutlet === "all" ? "all" : selectedOutlet;
        
        const baseUrl = `${API_BASE}/report/dashboard`;
        
        // Fetch data with outlet filter
        const [overviewRes, leaveRes, employeeRes] = await Promise.all([
          fetch(`${baseUrl}/overview/filter/?outlet_id=${outletParam}`, { headers }),
          fetch(`${baseUrl}/leave-presence-trend/filter/?outlet_id=${outletParam}`, { headers }),
          fetch(`${baseUrl}/employee-attendance-summary/filter/?outlet_id=${outletParam}`, { headers }),
        ]);

        if (!overviewRes.ok) throw new Error("Failed to fetch overview data");
        if (!leaveRes.ok) throw new Error("Failed to fetch leave presence data");
        if (!employeeRes.ok) throw new Error("Failed to fetch employee attendance data");

        const overviewJson = await overviewRes.json();
        const leavePresenceJson = await leaveRes.json();
        const employeeJson = await employeeRes.json();

        setOverviewData(overviewJson);
        setLeavePresenceData(leavePresenceJson);
        setEmployeeData(employeeJson);
        setError(null);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [selectedOutlet]);

  // KPI Cards data
  const statCards = overviewData
    ? [
        { label: "Total Employees", value: overviewData.total_emp, icon: "total" },
        { label: "Active Employees", value: overviewData.active_emp, icon: "active" },
        { label: "Inactive Employees", value: overviewData.inactive_emp, icon: "inactive" },
        { label: "Present Today", value: overviewData.present, icon: "present" },
        { label: "Absent Today", value: overviewData.absentee, icon: "absent" },
      ]
    : [];

  const iconMap = {
    "Total Employees": { icon: <PeopleIcon />, color: "#1976d2" },
    "Active Employees": { icon: <PersonIcon />, color: "#2e7d32" },
    "Inactive Employees": { icon: <CancelIcon />, color: "#d32f2f" },
    "Present Today": { icon: <CheckCircleIcon />, color: "#43a047" },
    "Absent Today": { icon: <CancelIcon />, color: "#f57c00" },
  };

  const handleOutletChange = (event) => {
    setSelectedOutlet(event.target.value);
  };

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

  return (
    <Box sx={{ minHeight: "100vh", py: 1 }}>
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 2 }}>
        
        {/* Global Outlet Filter */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, pt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter Outlet</InputLabel>
            <Select 
              value={selectedOutlet || ""} 
              onChange={handleOutletChange} 
              label="Filter Outlet"
              disabled={loading || !selectedOutlet}
            >
              <MenuItem value="all">All Outlets</MenuItem>
              {userOutlets.map((outlet) => (
                <MenuItem key={outlet.id} value={outlet.id.toString()}>
                  {outlet.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {/* Main Dashboard Grid */}
        <Box sx={{ p: 2, borderRadius: 1, height: "500px", position: 'relative' }}>
          {loading && (
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 10,
              borderRadius: 1
            }}>
              <CircularProgress />
            </Box>
          )}
          
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
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": {
                  display: "none",
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

                        {icon && (
                          <Avatar
                            sx={{
                              bgcolor: `${color}1A`,
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
                        stroke="#2e7d32"
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
                        stroke="#f57c00"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        name="On Leave"
                      />
                      <Line
                        type="basis"
                        dataKey="not_marked"
                        stroke="#ff0000ff"
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

        {/* Employee Table */}
        <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", mb: 3, overflow: "hidden" }}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e0e0e0" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#212121", mb: 0.5 }}>
              Employee Attendance
            </Typography>
            <Typography variant="body2" sx={{ color: "#757575" }}>
              Monthly attendance summary by employee
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 440, overflowY: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#fafafa" }}>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Employee
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    ID
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Outlet
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Present
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Absent
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Leave
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#757575", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    Total Days
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employeeData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No employee data available for the selected outlet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  employeeData.map((emp) => {
                    const totalDays = emp.present_days + emp.absent_days + emp.leave_days;
                    return (
                      <TableRow key={emp.employee_id} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                        <TableCell sx={{ fontWeight: 500, color: "#212121" }}>
                          {emp.fullname || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ color: "#616161" }}>
                          {emp.empcode || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ color: "#616161" }}>
                          {emp.outlet_name || 'N/A'}
                        </TableCell>
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
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
}

export default ManagerDashboard;