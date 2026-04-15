import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "utils/api";

const isoToHHMM = (iso) => {
  if (!iso) return "-";
  const s = String(iso);
  if (s.includes("T")) return s.slice(s.indexOf("T") + 1, s.indexOf("T") + 6);
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
};

const isoToDate = (iso) => {
  if (!iso) return "-";
  const s = String(iso);
  const dateStr = s.includes("T") ? s.slice(0, s.indexOf("T")) : s.slice(0, 10);
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString();
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return `${isoToDate(iso)} ${isoToHHMM(iso)}`;
};

const STATUS_COLORS = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
};

export default function AttendanceEditRequests() {
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Pending");

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'approve' | 'reject'
  const [processing, setProcessing] = useState(false);

  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const openToast = (msg, severity = "success") => setToast({ open: true, msg, severity });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      });
      if (statusFilter) params.append("status", statusFilter);

      const response = await api.get(`/api/attendance/v2/edit-requests/?${params}`);
      const data = response.data;

      const formatted = (data.results || []).map((req) => ({
        id: req.request_id,
        request_id: req.request_id,
        attendance_id: req.attendance_id,
        employee_name: req.employee_name || "-",
        date: req.date,
        current_check_in: req.current_check_in,
        current_check_out: req.current_check_out,
        proposed_check_in: req.proposed_check_in,
        proposed_check_out: req.proposed_check_out,
        reason: req.reason,
        status: req.status,
        requested_by: req.requested_by || "-",
        reviewed_by: req.reviewed_by || "-",
        reviewed_at: req.reviewed_at,
        created_at: req.created_at,
      }));

      setRows(formatted);
      setRowCount(data.count || 0);
    } catch (err) {
      openToast(err.response?.data?.detail || "Failed to load edit requests.", "error");
    } finally {
      setLoading(false);
    }
  }, [paginationModel, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleFilterChange = (value) => {
    setPaginationModel((m) => ({ ...m, page: 0 }));
    setStatusFilter(value);
  };

  const openConfirm = (row, action) => {
    setConfirmRow(row);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmRow(null);
    setConfirmAction(null);
    setProcessing(false);
  };

  const handleReview = async () => {
    if (!confirmRow || !confirmAction) return;
    try {
      setProcessing(true);
      await api.post("/api/attendance/v2/edit-requests/review/", {
        request_id: confirmRow.request_id,
        action: confirmAction,
      });
      openToast(
        confirmAction === "approve"
          ? "Request approved. Attendance record updated."
          : "Request rejected.",
        confirmAction === "approve" ? "success" : "info"
      );
      closeConfirm();
      fetchRequests();
    } catch (err) {
      openToast(err.response?.data?.error || "Failed to process request.", "error");
      setProcessing(false);
    }
  };

  const columns = [
    { field: "employee_name", headerName: "Employee", width: 180 },
    {
      field: "date",
      headerName: "Date",
      width: 120,
      renderCell: (params) => <span>{isoToDate(params.value)}</span>,
    },
    {
      field: "current_check_in",
      headerName: "Current In",
      width: 115,
      renderCell: (params) => <span style={{ color: "#6b7280" }}>{isoToHHMM(params.value)}</span>,
    },
    {
      field: "current_check_out",
      headerName: "Current Out",
      width: 115,
      renderCell: (params) => <span style={{ color: "#6b7280" }}>{isoToHHMM(params.value)}</span>,
    },
    {
      field: "proposed_check_in",
      headerName: "Proposed In",
      width: 120,
      renderCell: (params) => <span style={{ color: "#1d4ed8", fontWeight: 600 }}>{isoToHHMM(params.value)}</span>,
    },
    {
      field: "proposed_check_out",
      headerName: "Proposed Out",
      width: 120,
      renderCell: (params) => <span style={{ color: "#1d4ed8", fontWeight: 600 }}>{isoToHHMM(params.value)}</span>,
    },
    {
      field: "reason",
      headerName: "Reason",
      width: 220,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {params.value}
          </span>
        </Tooltip>
      ),
    },
    { field: "requested_by", headerName: "Requested By", width: 140 },
    {
      field: "created_at",
      headerName: "Submitted",
      width: 150,
      renderCell: (params) => <span>{formatDateTime(params.value)}</span>,
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={STATUS_COLORS[params.value] || "default"}
          variant="outlined"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        if (params.row.status !== "Pending") return null;
        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Approve">
              <IconButton size="small" color="success" onClick={() => openConfirm(params.row, "approve")}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject">
              <IconButton size="small" color="error" onClick={() => openConfirm(params.row, "reject")}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
          background: "linear-gradient(135deg, #312e81 0%, #7c3aed 100%)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} letterSpacing={0.5}>
            Attendance Edit Requests
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Review and approve manager requests to edit locked attendance records
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={fetchRequests}
            disabled={loading}
            sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Filter */}
      <Paper elevation={2} sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel id="status-filter-label">Filter by Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            label="Filter by Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Data Grid */}
      <Box sx={{ height: 560, width: "100%" }}>
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
            "& .MuiDataGrid-row:hover": { backgroundColor: "#faf5ff" },
            "& .MuiDataGrid-cell:focus": { outline: "none" },
          }}
        />
      </Box>

      {/* Approve / Reject Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={closeConfirm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {confirmAction === "approve" ? "Approve Edit Request" : "Reject Edit Request"}
        </DialogTitle>
        <DialogContent>
          {confirmRow && (
            <Box>
              <Typography mb={1}>
                <strong>Employee:</strong> {confirmRow.employee_name}
              </Typography>
              <Typography mb={1}>
                <strong>Date:</strong> {isoToDate(confirmRow.date)}
              </Typography>
              <Typography mb={1}>
                <strong>Current:</strong> {isoToHHMM(confirmRow.current_check_in)} → {isoToHHMM(confirmRow.current_check_out)}
              </Typography>
              <Typography mb={1}>
                <strong>Proposed:</strong>{" "}
                <span style={{ color: "#1d4ed8", fontWeight: 600 }}>
                  {isoToHHMM(confirmRow.proposed_check_in)} → {isoToHHMM(confirmRow.proposed_check_out)}
                </span>
              </Typography>
              <Typography mb={2}>
                <strong>Reason:</strong> {confirmRow.reason}
              </Typography>
              {confirmAction === "approve" ? (
                <Alert severity="info">
                  Approving will immediately update the attendance record with the proposed times.
                </Alert>
              ) : (
                <Alert severity="warning">
                  Rejecting will close this request. The attendance record will remain unchanged.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeConfirm} disabled={processing}>Cancel</Button>
          <Button
            onClick={handleReview}
            variant="contained"
            color={confirmAction === "approve" ? "success" : "error"}
            disabled={processing}
          >
            {processing ? <CircularProgress size={18} /> : confirmAction === "approve" ? "Approve" : "Reject"}
          </Button>
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
