import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Stack,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "utils/api";

const API_TZ_OFFSET = "+05:30"; // Sri Lanka

const formatDate = (yyyyMmDd) => {
  if (!yyyyMmDd) return "-";
  const s = String(yyyyMmDd);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return s;
  return new Date(y, m - 1, d).toLocaleDateString();
};

const isoToHHMM = (iso) => {
  if (!iso) return "-";
  const s = String(iso);
  if (s.includes("T") && s.length >= s.indexOf("T") + 6) {
    return s.slice(s.indexOf("T") + 1, s.indexOf("T") + 6);
  }
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
};

const isoToDate = (iso) => {
  if (!iso) return "";
  const s = String(iso);
  if (s.includes("T")) return s.slice(0, s.indexOf("T"));
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
};

const buildLocalIsoWithOffset = (dateStr, hhmm, offset = API_TZ_OFFSET) => {
  if (!dateStr || !hhmm) return null;
  return `${dateStr}T${hhmm}:00${offset}`;
};

export default function AttendanceHistory() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [pageLoading, setPageLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const [userDetails, setUserDetails] = useState(null);

  const today = new Date();
  const prior = new Date();
  prior.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(prior.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  // Bulk add
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkCheckIn, setBulkCheckIn] = useState("");
  const [bulkCheckOut, setBulkCheckOut] = useState("");

  // Edit dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editCheckInDate, setEditCheckInDate] = useState("");
  const [editCheckOutDate, setEditCheckOutDate] = useState("");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const openToast = (msg, severity = "success") => setToast({ open: true, msg, severity });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  // Load outlets + user info on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setPageLoading(true);
      try {
        const response = await api.get("/api/user/");
        const data = response.data;
        setUserDetails(data);
        const userOutlets = data.outlets || [];
        setOutlets(userOutlets);
        if (userOutlets.length > 0) setSelectedOutletId(userOutlets[0].id);
      } catch (err) {
        setError(err.message);
      } finally {
        setPageLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Load employee list for dropdown (no attendances — lightweight)
  useEffect(() => {
    if (!selectedOutletId) return;
    const fetchEmployees = async () => {
      try {
        const response = await api.get(`/api/getoutletemployees?outlet_id=${selectedOutletId}`);
        const data = response.data;
        // Handle both paginated and plain array responses
        const list = Array.isArray(data) ? data : (data.results || []);
        setEmployees(list);
        if (list.length > 0) setSelectedEmployeeId(list[0].employee_id);
        else setSelectedEmployeeId("");
      } catch (err) {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, [selectedOutletId]);

  // Load paginated attendance records from server
  const fetchAttendance = useCallback(async () => {
    if (!selectedOutletId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        outlet_id: selectedOutletId,
        page: paginationModel.page + 1,           // DRF is 1-indexed
        page_size: paginationModel.pageSize,
      });
      if (selectedEmployeeId) params.append("employee_id", selectedEmployeeId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await api.get(`/api/attendance/all/?${params}`);
      const data = response.data;

      const formatted = (data.results || []).map((att) => ({
        id: att.attendance_id,
        attendance_id: att.attendance_id,
        date: att.date,
        check_in_time: att.check_in_time,
        check_out_time: att.check_out_time,
        status: att.status,
        updated_by: userDetails?.username || "",
      }));

      setRows(formatted);
      setRowCount(data.count || 0);
      setError(null);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedOutletId, selectedEmployeeId, startDate, endDate, paginationModel, userDetails]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Reset to page 0 when filters change
  const handleFilterChange = (setter) => (value) => {
    setPaginationModel((m) => ({ ...m, page: 0 }));
    setter(value);
  };

  const handleAttendanceUpdate = async (attendanceId, checkInDateStr, checkOutDateStr, checkInHHMM, checkOutHHMM) => {
    const payload = {
      attendance_id: attendanceId,
      date: checkInDateStr,
      check_in_time: buildLocalIsoWithOffset(checkInDateStr, checkInHHMM),
      check_out_time: buildLocalIsoWithOffset(checkOutDateStr, checkOutHHMM),
    };
    await api.post("/api/attendance/update/", payload);
    await fetchAttendance();
  };

  const handleOpenEdit = (row) => {
    setEditRow(row);
    setEditCheckInDate(row?.check_in_time ? isoToDate(row.check_in_time) : row?.date || "");
    setEditCheckOutDate(row?.check_out_time ? isoToDate(row.check_out_time) : row?.date || "");
    setEditCheckIn(row?.check_in_time ? isoToHHMM(row.check_in_time) : "");
    setEditCheckOut(row?.check_out_time ? isoToHHMM(row.check_out_time) : "");
    setIsEditOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditRow(null);
    setEditCheckInDate("");
    setEditCheckOutDate("");
    setEditCheckIn("");
    setEditCheckOut("");
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    if (!editCheckInDate || !editCheckOutDate || !editCheckIn || !editCheckOut) {
      openToast("Please fill in all date and time fields.", "warning");
      return;
    }
    const checkInDT = `${editCheckInDate}T${editCheckIn}`;
    const checkOutDT = `${editCheckOutDate}T${editCheckOut}`;
    if (checkOutDT < checkInDT) {
      openToast("Check-out date/time cannot be earlier than check-in date/time.", "warning");
      return;
    }
    try {
      setSaving(true);
      await handleAttendanceUpdate(
        editRow.attendance_id,
        editCheckInDate,
        editCheckOutDate,
        editCheckIn,
        editCheckOut
      );
      openToast("Attendance updated successfully.", "success");
      handleCloseEdit();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Failed to update attendance";
      openToast(msg, "error");
      setSaving(false);
    }
  };

  const handleOpenBulkDialog = () => setIsBulkAddOpen(true);

  const handleCloseBulkDialog = () => {
    setIsBulkAddOpen(false);
    setBulkSelectedEmployees([]);
    setBulkDate("");
    setBulkCheckIn("");
    setBulkCheckOut("");
  };

  const handleBulkSubmit = async () => {
    if (bulkSelectedEmployees.length === 0 || !bulkDate || !bulkCheckIn || !bulkCheckOut) {
      openToast("Please select employees and fill in all date/time fields.", "warning");
      return;
    }
    const payload = {
      employee_ids: bulkSelectedEmployees,
      date: bulkDate,
      check_in_time: bulkCheckIn,
      check_out_time: bulkCheckOut,
      outlet_id: selectedOutletId,
    };
    try {
      const response = await api.post("/api/attendance/bulk-add/", payload);
      openToast(response.data.message || "Bulk add done.", "success");
      handleCloseBulkDialog();
      await fetchAttendance();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "An error occurred during the bulk add.";
      openToast(errorMessage, "error");
    }
  };

  const columns = [
    {
      field: "date",
      headerName: "Date",
      width: 140,
      renderCell: (params) => <span>{formatDate(params.value)}</span>,
    },
    {
      field: "check_in_time",
      headerName: "Check-in",
      width: 140,
      renderCell: (params) => <span>{isoToHHMM(params.value)}</span>,
    },
    {
      field: "check_out_time",
      headerName: "Check-out",
      width: 140,
      renderCell: (params) => <span>{isoToHHMM(params.value)}</span>,
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => {
        const v = params.value || "";
        const color =
          v === "Present" ? "success" : v === "Absent" ? "error" : v === "Late" ? "warning" : "default";
        return <Chip size="small" label={v || "-"} color={color} variant="outlined" />;
      },
    },
    { field: "updated_by", headerName: "Updated By", width: 160 },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="Edit attendance">
          <IconButton onClick={() => handleOpenEdit(params.row)} size="small">
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
          Attendance History
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAttendance} disabled={!selectedOutletId || loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" onClick={handleOpenBulkDialog} disabled={!selectedOutletId}>
            Bulk Add Attendance
          </Button>
        </Stack>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" mb={2}>
        <FormControl sx={{ minWidth: 220, height: 48 }}>
          <InputLabel id="outlet-label">Outlet</InputLabel>
          <Select
            labelId="outlet-label"
            value={selectedOutletId}
            onChange={(e) => handleFilterChange(setSelectedOutletId)(e.target.value)}
            label="Outlet"
          >
            {outlets.map((outlet) => (
              <MenuItem key={outlet.id} value={outlet.id}>
                {outlet.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 320, height: 48 }} disabled={!employees.length}>
          <InputLabel id="employee-label">Employee (all if blank)</InputLabel>
          <Select
            labelId="employee-label"
            value={selectedEmployeeId}
            onChange={(e) => handleFilterChange(setSelectedEmployeeId)(e.target.value)}
            label="Employee (all if blank)"
          >
            <MenuItem value="">All Employees</MenuItem>
            {employees.map((emp) => (
  <MenuItem key={emp.employee_id} value={emp.employee_id}>
    {`${emp.fullname ? emp.fullname + " || " : ""}${emp.first_name || ""}`}
  </MenuItem>
))}
          </Select>
        </FormControl>

        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => handleFilterChange(setStartDate)(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => handleFilterChange(setEndDate)(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
      </Box>

      <Box mt={2} sx={{ height: 520, width: "100%" }}>
        {pageLoading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={rowCount}
            loading={loading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              borderRadius: 2,
              border: "1px solid #e5e7eb",
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f9fafb", fontWeight: 800 },
              "& .MuiDataGrid-row:hover": { backgroundColor: "#fffbe6" },
              "& .MuiDataGrid-cell:focus": { outline: "none" },
            }}
          />
        )}
      </Box>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit Attendance</DialogTitle>
        <DialogContent>
          {editRow && (
            <Box sx={{ mt: 1 }}>
              <TextField
                label="Check-in Date"
                type="date"
                fullWidth
                margin="normal"
                value={editCheckInDate}
                onChange={(e) => setEditCheckInDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Check-in Time"
                type="time"
                fullWidth
                margin="normal"
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Check-out Date"
                type="date"
                fullWidth
                margin="normal"
                value={editCheckOutDate}
                onChange={(e) => setEditCheckOutDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Check-out Time"
                type="time"
                fullWidth
                margin="normal"
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={18} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={isBulkAddOpen} onClose={handleCloseBulkDialog} fullWidth maxWidth="sm">
        <DialogTitle>Bulk Add Attendance Records</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Employees</InputLabel>
            <Select
              multiple
              value={bulkSelectedEmployees}
              onChange={(e) => setBulkSelectedEmployees(e.target.value)}
              renderValue={(selected) =>
                selected
                  .map((id) => {
                    const emp = employees.find((e) => e.employee_id === id);
                    return emp
  ? `${emp.fullname ? emp.fullname + " || " : ""}${emp.first_name || ""}`
  : id;
                  })
                  .join(", ")
              }
            >
              {employees.map((emp) => (
                <MenuItem key={emp.employee_id} value={emp.employee_id}>
                  {`${emp.fullname ? emp.fullname + " || " : ""}${emp.first_name || ""}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            fullWidth
            margin="normal"
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Check-in Time"
            type="time"
            fullWidth
            margin="normal"
            value={bulkCheckIn}
            onChange={(e) => setBulkCheckIn(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Check-out Time"
            type="time"
            fullWidth
            margin="normal"
            value={bulkCheckOut}
            onChange={(e) => setBulkCheckOut(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBulkDialog}>Cancel</Button>
          <Button onClick={handleBulkSubmit} variant="contained">Submit</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => closeToast()}>
        <Alert onClose={() => closeToast()} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
