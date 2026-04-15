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
  Paper,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import LockIcon from "@mui/icons-material/Lock";
import EditNoteIcon from "@mui/icons-material/EditNote";
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

  const today = new Date();
  const prior = new Date();
  prior.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(prior.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  // Edit dialog (unlocked records)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editCheckInDate, setEditCheckInDate] = useState("");
  const [editCheckOutDate, setEditCheckOutDate] = useState("");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Edit request dialog (locked records)
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [editRequestRow, setEditRequestRow] = useState(null);
  const [reqCheckInDate, setReqCheckInDate] = useState("");
  const [reqCheckOutDate, setReqCheckOutDate] = useState("");
  const [reqCheckIn, setReqCheckIn] = useState("");
  const [reqCheckOut, setReqCheckOut] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Bulk add
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkCheckIn, setBulkCheckIn] = useState("");
  const [bulkCheckOut, setBulkCheckOut] = useState("");

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

  // Load employee list for selected outlet (including inactive)
  useEffect(() => {
    if (!selectedOutletId) return;
    const fetchEmployees = async () => {
      try {
        const response = await api.get(`/api/getoutletemployees?outlet_id=${selectedOutletId}`);
        const data = response.data;
        const list = Array.isArray(data) ? data : (data.results || []);
        setEmployees(list);
        setSelectedEmployeeId("");
      } catch {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, [selectedOutletId]);

  // Load paginated attendance from v2 API
  const fetchAttendance = useCallback(async () => {
    if (!selectedOutletId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        outlet_id: selectedOutletId,
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      });
      if (selectedEmployeeId) params.append("employee_id", selectedEmployeeId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await api.get(`/api/attendance/v2/?${params}`);
      const data = response.data;

      const formatted = (data.results || []).map((att) => ({
        id: att.attendance_id,
        attendance_id: att.attendance_id,
        employee_name: att.employee_name || "-",
        is_active: att.is_active,
        date: att.date,
        check_in_time: att.check_in_time,
        check_out_time: att.check_out_time,
        status: att.status,
        is_locked: att.is_locked,
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
  }, [selectedOutletId, selectedEmployeeId, startDate, endDate, paginationModel]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleFilterChange = (setter) => (value) => {
    setPaginationModel((m) => ({ ...m, page: 0 }));
    setter(value);
  };

  // --- Edit (unlocked) ---
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
      openToast("Check-out cannot be earlier than check-in.", "warning");
      return;
    }
    try {
      setSaving(true);
      await api.post("/api/attendance/v2/update/", {
        attendance_id: editRow.attendance_id,
        check_in_time: buildLocalIsoWithOffset(editCheckInDate, editCheckIn),
        check_out_time: buildLocalIsoWithOffset(editCheckOutDate, editCheckOut),
      });
      openToast("Attendance updated successfully.");
      handleCloseEdit();
      fetchAttendance();
    } catch (err) {
      openToast(err.response?.data?.error || err.message || "Failed to update.", "error");
      setSaving(false);
    }
  };

  // --- Delete ---
  const handleOpenDelete = (row) => {
    setDeleteRow(row);
    setIsDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    setDeleteRow(null);
    setDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteRow) return;
    try {
      setDeleting(true);
      await api.delete("/api/attendance/v2/delete/", {
        data: { attendance_id: deleteRow.attendance_id },
      });
      openToast("Attendance record deleted.");
      handleCloseDelete();
      fetchAttendance();
    } catch (err) {
      openToast(err.response?.data?.error || "Failed to delete.", "error");
      setDeleting(false);
    }
  };

  // --- Edit Request (locked records) ---
  const handleOpenEditRequest = (row) => {
    setEditRequestRow(row);
    setReqCheckInDate(row?.check_in_time ? isoToDate(row.check_in_time) : row?.date || "");
    setReqCheckOutDate(row?.check_out_time ? isoToDate(row.check_out_time) : row?.date || "");
    setReqCheckIn(row?.check_in_time ? isoToHHMM(row.check_in_time) : "");
    setReqCheckOut(row?.check_out_time ? isoToHHMM(row.check_out_time) : "");
    setReqReason("");
    setIsEditRequestOpen(true);
  };

  const handleCloseEditRequest = () => {
    setIsEditRequestOpen(false);
    setEditRequestRow(null);
    setSubmittingRequest(false);
  };

  const handleSubmitEditRequest = async () => {
    if (!reqCheckInDate || !reqCheckOutDate || !reqCheckIn || !reqCheckOut) {
      openToast("Please fill in all proposed date and time fields.", "warning");
      return;
    }
    if (!reqReason.trim()) {
      openToast("Please provide a reason for the edit request.", "warning");
      return;
    }
    const checkInDT = `${reqCheckInDate}T${reqCheckIn}`;
    const checkOutDT = `${reqCheckOutDate}T${reqCheckOut}`;
    if (checkOutDT <= checkInDT) {
      openToast("Proposed check-out must be after check-in.", "warning");
      return;
    }
    try {
      setSubmittingRequest(true);
      await api.post("/api/attendance/v2/edit-request/", {
        attendance_id: editRequestRow.attendance_id,
        proposed_check_in: buildLocalIsoWithOffset(reqCheckInDate, reqCheckIn),
        proposed_check_out: buildLocalIsoWithOffset(reqCheckOutDate, reqCheckOut),
        reason: reqReason.trim(),
      });
      openToast("Edit request submitted. Awaiting admin approval.");
      handleCloseEditRequest();
    } catch (err) {
      openToast(err.response?.data?.error || "Failed to submit request.", "error");
      setSubmittingRequest(false);
    }
  };

  // --- Bulk Add ---
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
    try {
      const response = await api.post("/api/attendance/v2/bulk-add/", {
        employee_ids: bulkSelectedEmployees,
        date: bulkDate,
        check_in_time: bulkCheckIn,
        check_out_time: bulkCheckOut,
        outlet_id: selectedOutletId,
      });
      openToast(response.data.message || "Bulk add done.");
      handleCloseBulkDialog();
      fetchAttendance();
    } catch (err) {
      openToast(err.response?.data?.error || "An error occurred during bulk add.", "error");
    }
  };

  const columns = [
    {
      field: "employee_name",
      headerName: "Employee",
      width: 180,
      renderCell: (params) => {
        const isInactive = params.row.is_active === false;
        return (
          <Box display="flex" alignItems="center" gap={0.5}>
            <span style={{ color: isInactive ? "#9ca3af" : "inherit" }}>
              {params.value}
            </span>
            {isInactive && (
              <Chip label="Inactive" size="small" sx={{ fontSize: 10, height: 18, bgcolor: "#f3f4f6", color: "#6b7280" }} />
            )}
          </Box>
        );
      },
    },
    {
      field: "date",
      headerName: "Date",
      width: 130,
      renderCell: (params) => <span>{formatDate(params.value)}</span>,
    },
    {
      field: "check_in_time",
      headerName: "Check-in",
      width: 110,
      renderCell: (params) => <span>{isoToHHMM(params.value)}</span>,
    },
    {
      field: "check_out_time",
      headerName: "Check-out",
      width: 110,
      renderCell: (params) => <span>{isoToHHMM(params.value)}</span>,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => {
        const v = params.value || "";
        const color =
          v === "Present" ? "success" : v === "Absent" ? "error" : v === "Late" ? "warning" :
          v === "Half Day" ? "info" : "default";
        return <Chip size="small" label={v || "-"} color={color} variant="outlined" />;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const locked = params.row.is_locked;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {locked ? (
              <>
                <Tooltip title="Locked — submit an edit request">
                  <span>
                    <IconButton size="small" disabled sx={{ color: "#d1d5db" }}>
                      <LockIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Request edit (admin approval required)">
                  <IconButton size="small" color="warning" onClick={() => handleOpenEditRequest(params.row)}>
                    <EditNoteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Edit attendance">
                  <IconButton size="small" color="primary" onClick={() => handleOpenEdit(params.row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete record">
                  <IconButton size="small" color="error" onClick={() => handleOpenDelete(params.row)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box p={3}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} letterSpacing={0.5}>
            Attendance Editor
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            View and manage employee attendance records
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton
              onClick={fetchAttendance}
              disabled={!selectedOutletId || loading}
              sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            onClick={() => setIsBulkAddOpen(true)}
            disabled={!selectedOutletId}
            sx={{ bgcolor: "#fff", color: "#1e3a5f", fontWeight: 600, "&:hover": { bgcolor: "#f1f5f9" } }}
          >
            Bulk Add
          </Button>
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel id="outlet-label">Outlet</InputLabel>
            <Select
              labelId="outlet-label"
              value={selectedOutletId}
              onChange={(e) => handleFilterChange(setSelectedOutletId)(e.target.value)}
              label="Outlet"
              size="small"
            >
              {outlets.map((outlet) => (
                <MenuItem key={outlet.id} value={outlet.id}>{outlet.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 280 }} disabled={!employees.length}>
            <InputLabel id="employee-label">Employee</InputLabel>
            <Select
              labelId="employee-label"
              value={selectedEmployeeId}
              onChange={(e) => handleFilterChange(setSelectedEmployeeId)(e.target.value)}
              label="Employee"
              size="small"
            >
              <MenuItem value="">All Employees</MenuItem>
              {employees.map((emp) => {
                const isInactive = emp.is_active === false;
                const name = emp.fullname || emp.first_name || `ID ${emp.employee_id}`;
                return (
                  <MenuItem
                    key={emp.employee_id}
                    value={emp.employee_id}
                    sx={{ color: isInactive ? "text.disabled" : "inherit" }}
                  >
                    {isInactive ? `${name} [Inactive]` : name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => handleFilterChange(setStartDate)(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => handleFilterChange(setEndDate)(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ minWidth: 160 }}
          />
        </Box>
      </Paper>

      {/* Data Grid */}
      <Box sx={{ height: 520, width: "100%" }}>
        {pageLoading ? (
          <Box display="flex" justifyContent="center" pt={6}><CircularProgress /></Box>
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
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f8fafc", fontWeight: 700 },
              "& .MuiDataGrid-row:hover": { backgroundColor: "#f0f9ff" },
              "& .MuiDataGrid-cell:focus": { outline: "none" },
            }}
          />
        )}
      </Box>

      {/* Edit Dialog (unlocked) */}
      <Dialog open={isEditOpen} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Attendance</DialogTitle>
        <DialogContent>
          {editRow && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Employee: <strong>{editRow.employee_name}</strong> &nbsp;|&nbsp; Date: <strong>{formatDate(editRow.date)}</strong>
              </Typography>
              <TextField label="Check-in Date" type="date" fullWidth margin="normal" value={editCheckInDate}
                onChange={(e) => setEditCheckInDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Check-in Time" type="time" fullWidth margin="normal" value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Check-out Date" type="date" fullWidth margin="normal" value={editCheckOutDate}
                onChange={(e) => setEditCheckOutDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Check-out Time" type="time" fullWidth margin="normal" value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEdit} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={18} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onClose={handleCloseDelete} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Attendance Record</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this attendance record for{" "}
            <strong>{deleteRow?.employee_name}</strong> on{" "}
            <strong>{formatDate(deleteRow?.date)}</strong>?
          </Typography>
          <Typography variant="body2" color="error" mt={1}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDelete} disabled={deleting}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Request Dialog (locked records) */}
      <Dialog open={isEditRequestOpen} onClose={handleCloseEditRequest} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Request Attendance Edit</DialogTitle>
        <DialogContent>
          {editRequestRow && (
            <Box sx={{ mt: 1 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                This record is <strong>locked</strong> (older than 45 days). Your request will be reviewed by an admin before changes are applied.
              </Alert>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Employee: <strong>{editRequestRow.employee_name}</strong> &nbsp;|&nbsp; Date: <strong>{formatDate(editRequestRow.date)}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current: Check-in {isoToHHMM(editRequestRow.check_in_time)} — Check-out {isoToHHMM(editRequestRow.check_out_time)}
              </Typography>

              <TextField label="Proposed Check-in Date" type="date" fullWidth margin="normal" value={reqCheckInDate}
                onChange={(e) => setReqCheckInDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Proposed Check-in Time" type="time" fullWidth margin="normal" value={reqCheckIn}
                onChange={(e) => setReqCheckIn(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Proposed Check-out Date" type="date" fullWidth margin="normal" value={reqCheckOutDate}
                onChange={(e) => setReqCheckOutDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Proposed Check-out Time" type="time" fullWidth margin="normal" value={reqCheckOut}
                onChange={(e) => setReqCheckOut(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField
                label="Reason for edit request"
                multiline
                rows={3}
                fullWidth
                margin="normal"
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder="Explain why this record needs to be corrected..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEditRequest} disabled={submittingRequest}>Cancel</Button>
          <Button onClick={handleSubmitEditRequest} variant="contained" color="warning" disabled={submittingRequest}>
            {submittingRequest ? <CircularProgress size={18} /> : "Submit Request"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={isBulkAddOpen} onClose={handleCloseBulkDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Bulk Add Attendance</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Employees</InputLabel>
            <Select
              multiple
              value={bulkSelectedEmployees}
              onChange={(e) => setBulkSelectedEmployees(e.target.value)}
              label="Employees"
              renderValue={(selected) =>
                selected.map((id) => {
                  const emp = employees.find((e) => e.employee_id === id);
                  return emp ? (emp.fullname || emp.first_name || id) : id;
                }).join(", ")
              }
            >
              {employees.map((emp) => {
                const isInactive = emp.is_active === false;
                const name = emp.fullname || emp.first_name || `ID ${emp.employee_id}`;
                return (
                  <MenuItem key={emp.employee_id} value={emp.employee_id}
                    sx={{ color: isInactive ? "text.disabled" : "inherit" }}>
                    {isInactive ? `${name} [Inactive]` : name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <TextField label="Date" type="date" fullWidth margin="normal" value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Check-in Time" type="time" fullWidth margin="normal" value={bulkCheckIn}
            onChange={(e) => setBulkCheckIn(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Check-out Time" type="time" fullWidth margin="normal" value={bulkCheckOut}
            onChange={(e) => setBulkCheckOut(e.target.value)} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseBulkDialog}>Cancel</Button>
          <Button onClick={handleBulkSubmit} variant="contained">Submit</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={closeToast}>
        <Alert onClose={closeToast} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
