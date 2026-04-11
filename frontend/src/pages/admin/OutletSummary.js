import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Chip,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://123.231.60.24:1605";

const formatDateOnly = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString();
};

const toDateOnly = (yyyyMmDd) => {
  if (!yyyyMmDd) return null;
  const d = new Date(yyyyMmDd);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function MANReports() {
  // Default date range: last month to today
  const today = new Date();
  const priorMonth = new Date();
  priorMonth.setMonth(today.getMonth() - 1);

  const [userReport, setUserReport] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [employeeList, setEmployeeList] = useState([]);

  const [startDate, setStartDate] = useState(priorMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // summaries grouped by outlet
  const [summaryByOutlet, setSummaryByOutlet] = useState({});
  const [expanded, setExpanded] = useState(null); // { employeeId, type }

  useEffect(() => {
    loadManagerOutletsAndEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadManagerOutletsAndEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("No access token found. Please log in first.");
        setLoading(false);
        return;
      }

      const userRes = await axios.get(`${API_BASE}/api/user/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const reportRes = await axios.get(`${API_BASE}/report/employees/user/${userRes.data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserReport(reportRes.data);

      const allEmps = Object.values(reportRes.data.employees_by_outlet || {}).flatMap(
        (o) => o.employees || []
      );
      setEmployeeList(allEmps);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to load user report.");
    } finally {
      setLoading(false);
    }
  };

  const handleOutletChange = (event) => {
    const outletId = event.target.value;
    setSelectedOutlet(outletId);
    setSelectedEmployee("all");
    setSummaryByOutlet({});
    setExpanded(null);
    setError(null);

    if (!userReport?.employees_by_outlet) {
      setEmployeeList([]);
      return;
    }

    if (outletId === "all") {
      setEmployeeList(
        Object.values(userReport.employees_by_outlet).flatMap((o) => o.employees || [])
      );
    } else {
      setEmployeeList(userReport.employees_by_outlet[outletId]?.employees || []);
    }
  };

  const buildReportUrl = (empId) => {
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    return `${API_BASE}/report/employee/${empId}${params.length ? `?${params.join("&")}` : ""}`;
  };

  const toggleExpand = (employeeId, type) => {
    setExpanded((prev) => {
      if (prev?.employeeId === employeeId && prev?.type === type) return null;
      return { employeeId, type };
    });
  };

  const handleFetchSummary = async () => {
    setLoading(true);
    setError(null);
    setSummaryByOutlet({});
    setExpanded(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("No access token found. Please log in first.");
        setLoading(false);
        return;
      }

      if (!userReport?.employees_by_outlet) {
        setError("Employees list not loaded yet.");
        setLoading(false);
        return;
      }

      let employeesToFetch = [];

      if (selectedEmployee === "all") {
        if (selectedOutlet === "all") {
          employeesToFetch = Object.values(userReport.employees_by_outlet)
            .flatMap((o) => o.employees || [])
            .map((e) => e.employee_id);
        } else {
          employeesToFetch =
            userReport.employees_by_outlet[selectedOutlet]?.employees?.map((e) => e.employee_id) ||
            [];
        }
      } else {
        employeesToFetch = [selectedEmployee];
      }

      if (!employeesToFetch.length) {
        setError("No employees found for selection.");
        setLoading(false);
        return;
      }

      const requests = employeesToFetch.map((empId) =>
        axios
          .get(buildReportUrl(empId), {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => res.data)
          .catch((err) => {
            console.error(`Report fetch failed for ${empId}`, err);
            return null;
          })
      );

      const results = (await Promise.all(requests)).filter(Boolean);

      if (!results.length) {
        setError("No report data returned for selected employees.");
        setLoading(false);
        return;
      }

      // employee_id -> outletId
      const empToOutletIds = {};
      Object.entries(userReport.employees_by_outlet).forEach(([outletId, outletData]) => {
        (outletData.employees || []).forEach((e) => {
          empToOutletIds[e.employee_id] = outletId;
        });
      });

      const grouped = {};
      const ensureOutlet = (outletId, outletName) => {
        if (!grouped[outletId]) {
          grouped[outletId] = { outlet_name: outletName || `Outlet ${outletId}`, employees: [] };
        }
      };

      const start = toDateOnly(startDate); // ✅ used for inactive filter

      for (const rep of results) {
        const employeeId = rep.employee_details?.employee_id;

        // ✅ REQUIRED RULE:
        // show if active for ANY part of the range
        // hide ONLY if inactive before the range starts
        const inactiveDateStr = rep.employee_details?.inactive_date; // null or YYYY-MM-DD
        if (inactiveDateStr && start) {
          const inactive = toDateOnly(inactiveDateStr);
          if (inactive && inactive < start) {
            continue; // inactive before range -> skip employee
          }
        }

        const fullname = rep.employee_details?.fullname || "";
        const userFirstName = rep.employee_details?.user_first_name || "";
        const displayName = `${fullname} - ${userFirstName}`;

        const counts = { Present: 0, Absent: 0, "Blank Day": 0 };
        const dates = { Present: [], Absent: [], "Blank Day": [] };

        (rep.daily_report || []).forEach((day) => {
          const status = day.attendance_status || "Blank Day";
          if (counts[status] !== undefined) {
            counts[status] += 1;
            dates[status].push(day.work_date);
          }
        });

        const sortAsc = (a, b) => new Date(a) - new Date(b);
        dates.Present.sort(sortAsc);
        dates.Absent.sort(sortAsc);
        dates["Blank Day"].sort(sortAsc);

        const outletId =
          selectedOutlet !== "all" ? selectedOutlet : empToOutletIds[employeeId] || "unknown";

        const outletName =
          outletId !== "unknown"
            ? userReport.employees_by_outlet[outletId]?.outlet_name
            : "Unknown Outlet";

        ensureOutlet(outletId, outletName);

        grouped[outletId].employees.push({
          employeeId,
          name: displayName,
          inactive_date: inactiveDateStr, // keep for display
          counts,
          dates,
        });
      }

      Object.values(grouped).forEach((g) => {
        g.employees.sort((a, b) => (b.counts.Absent || 0) - (a.counts.Absent || 0));
      });

      setSummaryByOutlet(grouped);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to fetch summary.");
    } finally {
      setLoading(false);
    }
  };

  const outletEntries = useMemo(() => Object.entries(userReport?.employees_by_outlet || {}), [
    userReport,
  ]);

  const summaryOutletEntries = useMemo(() => {
    return Object.entries(summaryByOutlet).sort((a, b) => {
      const an = a[1]?.outlet_name || "";
      const bn = b[1]?.outlet_name || "";
      return an.localeCompare(bn);
    });
  }, [summaryByOutlet]);

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
          color: "#0d0d0dff",
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
              "& .MuiOutlinedInput-root": { borderRadius: 2, height: 42, backgroundColor: "#fff" },
            }}
          >
            <InputLabel>Outlet</InputLabel>
            <Select value={selectedOutlet} onChange={handleOutletChange} label="Outlet">
              <MenuItem value="all">All Outlets</MenuItem>
              {outletEntries.map(([outletId, outletData]) => (
                <MenuItem key={outletId} value={outletId}>
                  {outletData.outlet_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            sx={{
              minWidth: 250,
              "& .MuiOutlinedInput-root": { borderRadius: 2, height: 42, backgroundColor: "#fff" },
            }}
          >
            <InputLabel>Employee</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setSummaryByOutlet({});
                setExpanded(null);
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
              "& .MuiOutlinedInput-root": { borderRadius: 2, height: 42, backgroundColor: "#fff" },
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
              "& .MuiOutlinedInput-root": { borderRadius: 2, height: 42, backgroundColor: "#fff" },
            }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleFetchSummary}
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

      {!loading && summaryOutletEntries.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {summaryOutletEntries.map(([outletId, outletBlock]) => (
            <Paper key={outletId} sx={{ p: 2.5, borderRadius: 2, border: "1px solid #e0e0e0" }}>
              <Typography sx={{ fontWeight: 900, mb: 2, textTransform: "uppercase" }}>
                Outlet: {outletBlock.outlet_name}
              </Typography>

              {outletBlock.employees.map((emp) => (
                <Box
                  key={emp.employeeId}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 2,
                    border: "1px solid #eee",
                    backgroundColor: "#fff",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 800 }}>{emp.name}</Typography>

                    {/* Optional: show inactive date always */}
                    {emp.inactive_date && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Inactive on: ${formatDateOnly(emp.inactive_date)}`}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                    {["Present", "Absent", "Blank Day"].map((type) => (
                      <Chip
                        key={type}
                        label={`${type} = ${emp.counts[type]}`}
                        color={type === "Present" ? "success" : type === "Absent" ? "error" : "warning"}
                        clickable
                        onClick={() => toggleExpand(emp.employeeId, type)}
                        sx={{ fontWeight: 800 }}
                      />
                    ))}
                  </Box>

                  {["Present", "Absent", "Blank Day"].map((type) => (
                    <Collapse
                      key={type}
                      in={expanded?.employeeId === emp.employeeId && expanded?.type === type}
                      timeout="auto"
                      unmountOnExit
                    >
                      <Divider sx={{ my: 1.5 }} />
                      <Typography sx={{ fontWeight: 800, mb: 1 }}>
                        {type} Dates
                      </Typography>

                      {emp.dates[type]?.length ? (
                        <List dense sx={{ maxHeight: 220, overflow: "auto" }}>
                          {emp.dates[type].map((d, idx) => (
                            <ListItem key={`${emp.employeeId}-${type}-${idx}`} disableGutters>
                              <ListItemText primary={formatDateOnly(d)} />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography sx={{ color: "text.secondary" }}>No dates found.</Typography>
                      )}
                    </Collapse>
                  ))}
                </Box>
              ))}
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
