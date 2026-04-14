import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  Autocomplete,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Stack,
  LinearProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PeopleIcon from "@mui/icons-material/People";
import api from "utils/api";


// ✅ format fullname + first_name
const formatEmployeeName = (emp) =>
  `${emp.fullname ? emp.fullname + " || " : ""}${emp.first_name || ""}`;

export default function BulkLeaveAddPage() {
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // API Data
  const [outlets, setOutlets] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // Form State
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentDateInput, setCurrentDateInput] = useState(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [remarks, setRemarks] = useState("");

  /* ---------------- FETCH OUTLETS + LEAVE TYPES ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get("report/leaves/outlet-data/");
        setOutlets(res.data.outlets || []);
        setLeaveTypes(res.data.leave_types || []);
      } catch (err) {
        setMessage({ type: "error", text: "Failed to load initial data." });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  /* ---------------- FETCH EMPLOYEES FOR SELECTED OUTLET ---------------- */
  useEffect(() => {
    if (!selectedOutlet) {
      setFilteredEmployees([]);
      return;
    }
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        // page_size=500 scoped to one outlet — safe upper bound
        const res = await api.get(`/api/getoutletemployees?outlet_id=${selectedOutlet}&page_size=500`);
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.results || []);
        setFilteredEmployees(list);
        setSelectedEmployees([]);
      } catch (err) {
        setFilteredEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, [selectedOutlet]);

  /* ---------------- DATE HANDLING ---------------- */
  const addDate = () => {
    if (!currentDateInput) return;
    // const dateStr = currentDateInput.toISOString().split("T")[0];
    const dateStr = `${currentDateInput.getFullYear()}-${String(currentDateInput.getMonth() + 1).padStart(2, "0")}-${String(currentDateInput.getDate()).padStart(2, "0")}`;
    if (!selectedDates.includes(dateStr)) {
      setSelectedDates((prev) => [...prev, dateStr]);
    }
    setCurrentDateInput(null);
  };

  const removeDate = (date) => {
    setSelectedDates((prev) => prev.filter((d) => d !== date));
  };

  /* ---------------- SUBMIT ---------------- */
  const isFormValid =
    selectedOutlet &&
    selectedEmployees.length > 0 &&
    selectedDates.length > 0 &&
    selectedLeaveType;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitLoading(true);
    const payload = {
      outlet_id: selectedOutlet,
      employee_ids: selectedEmployees.map((e) => e.employee_id),
      leave_dates: selectedDates,
      leave_type_id: selectedLeaveType,
      remarks,
    };

    try {
      await api.post("report/leaves/bulk_create/", payload);
      setMessage({ type: "success", text: "Bulk leaves created successfully!" });
      setSelectedEmployees([]);
      setSelectedDates([]);
      setRemarks("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Error creating bulk leaves.",
      });
    }
    setSubmitLoading(false);
  };

  if (loading) {
    return (
      <Box p={5} textAlign="center">
        <CircularProgress size={60} />
      </Box>
    );
  }

  /* ======================== UI ======================== */
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box p={{ xs: 2, md: 5 }} maxWidth={900} mx="auto">
        <Paper elevation={4} sx={{ borderRadius: 3, overflow: "hidden" }}>
          {submitLoading && <LinearProgress />}

          <Box p={4}>
            <Typography variant="h4" fontWeight={800} gutterBottom color="primary">
              Bulk Leave Application
            </Typography>
            <Typography color="text.secondary" mb={4}>
              Manage multiple leave requests easily.
            </Typography>

            {message.text && (
              <Alert
                severity={message.type}
                sx={{ mb: 4 }}
                onClose={() => setMessage({ type: "", text: "" })}
              >
                {message.text}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={4}>

                {/* STEP 1: EMPLOYEES */}
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                    <PeopleIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Step 1: Select Employees
                    </Typography>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={5}>
                      <TextField
                        select
                        fullWidth
                        label="Select Outlet"
                        value={selectedOutlet}
                        onChange={(e) => setSelectedOutlet(e.target.value)}
                        required
                        helperText="Choose the outlet"
                      >
                        {outlets.map((o) => (
                          <MenuItem key={o.id} value={o.id}>
                            {o.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={7}>
                      <Autocomplete
                        multiple
                        options={filteredEmployees}
                        value={selectedEmployees}
                        disabled={!selectedOutlet}
                        isOptionEqualToValue={(opt, val) =>
                          opt.employee_id === val.employee_id
                        }
                        getOptionLabel={(option) => formatEmployeeName(option)}
                        onChange={(e, val) => setSelectedEmployees(val)}
                        loading={employeesLoading}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Box>
                              <Typography fontWeight={600}>
  {formatEmployeeName(option)}
</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.empcode || ""}
                              </Typography>
                            </Box>
                          </li>
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              {...getTagProps({ index })}
                              label={formatEmployeeName(option)}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Employees"
                            placeholder="Search username..."
                            helperText={
                              !selectedOutlet
                                ? "Select an outlet to load employees"
                                : employeesLoading
                                ? "Loading employees…"
                                : "You can select multiple employees"
                            }
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12}><Divider /></Grid>

                {/* STEP 2: DATES */}
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                    <CalendarMonthIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Step 2: Select Dates
                    </Typography>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <DatePicker
                        label="Leave Date"
                        value={currentDateInput}
                        onChange={setCurrentDateInput}
                        renderInput={(params) => (
                          <TextField {...params} fullWidth />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{ height: 56 }}
                        onClick={addDate}
                        disabled={!currentDateInput}
                      >
                        Add Date
                      </Button>
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {[...selectedDates].sort().map((date) => (
                          <Chip
                            key={date}
                            label={date}
                            onDelete={() => removeDate(date)}
                            color="info"
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12}><Divider /></Grid>

                {/* STEP 3: DETAILS */}
                <Grid item xs={12}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        label="Leave Type"
                        value={selectedLeaveType}
                        onChange={(e) => setSelectedLeaveType(e.target.value)}
                        required
                      >
                        {leaveTypes.map((lt) => (
                          <MenuItem key={lt.id} value={lt.id}>
                            {lt.att_type_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Remarks (Optional)"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12} mt={2}>
                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    variant="contained"
                    disabled={!isFormValid || submitLoading}
                    sx={{ py: 2, fontWeight: "bold" }}
                  >
                    {submitLoading
                      ? "Submitting..."
                      : "Confirm Bulk Leave Request"}
                  </Button>
                </Grid>

              </Grid>
            </form>
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}
