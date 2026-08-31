import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "utils/api";
import { DataTable } from "components/ui";

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const openToast = (msg, severity = "success") => setToast({ open: true, msg, severity });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const fetchRequests = useCallback(async (
    pageArg = page,
    pageSizeArg = pageSize,
    filters = columnFilters,
    sort = sortBy,
  ) => {
    setLoading(true);
    try {
      const params = {
        page: pageArg,
        page_size: pageSizeArg,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null)),
      };
      if (sort.key) params.ordering = (sort.dir === 'desc' ? '-' : '') + sort.key;

      const response = await api.get('/api/attendance/v2/edit-requests/', { params });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRequests(page, pageSize, columnFilters, sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, columnFilters, fetchRequests]);

  const handleFilterChange = (filterKey, value) => {
    const next = { ...columnFilters, [filterKey]: value };
    if (value === '' || value == null) delete next[filterKey];
    setColumnFilters(next);
    setPage(1);
    fetchRequests(1, pageSize, next, sortBy);
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
      fetchRequests(page, pageSize, columnFilters, sortBy);
    } catch (err) {
      openToast(err.response?.data?.error || "Failed to process request.", "error");
      setProcessing(false);
    }
  };

  const columns = [
    {
      key: "employee_name", label: "Employee", width: 180,
      sortKey: 'employee', filterKey: 'f_employee', filterType: 'text',
      render: (row) => <span>{row.employee_name}</span>,
    },
    {
      key: "date", label: "Date", width: 130,
      sortKey: 'date', filterKey: 'f_date', filterType: 'date',
      render: (row) => <span>{isoToDate(row.date)}</span>,
    },
    {
      key: "current_check_in", label: "Current In", width: 115,
      render: (row) => <span style={{ color: "#6b7280" }}>{isoToHHMM(row.current_check_in)}</span>,
    },
    {
      key: "current_check_out", label: "Current Out", width: 115,
      render: (row) => <span style={{ color: "#6b7280" }}>{isoToHHMM(row.current_check_out)}</span>,
    },
    {
      key: "proposed_check_in", label: "Proposed In", width: 120,
      render: (row) => <span style={{ color: "#1d4ed8", fontWeight: 600 }}>{isoToHHMM(row.proposed_check_in)}</span>,
    },
    {
      key: "proposed_check_out", label: "Proposed Out", width: 120,
      render: (row) => <span style={{ color: "#1d4ed8", fontWeight: 600 }}>{isoToHHMM(row.proposed_check_out)}</span>,
    },
    {
      key: "reason", label: "Reason", width: 220,
      filterKey: 'f_reason', filterType: 'text',
      render: (row) => (
        <Tooltip title={row.reason}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: 'block' }}>
            {row.reason}
          </span>
        </Tooltip>
      ),
    },
    {
      key: "requested_by", label: "Requested By", width: 140,
      sortKey: 'requested_by', filterKey: 'f_requested_by', filterType: 'text',
      render: (row) => <span>{row.requested_by}</span>,
    },
    {
      key: "created_at", label: "Submitted", width: 160,
      sortKey: 'created_at',
      render: (row) => <span>{formatDateTime(row.created_at)}</span>,
    },
    {
      key: "status", label: "Status", width: 130,
      sortKey: 'status',
      filterKey: 'f_status', filterType: 'select',
      filterOptions: [
        { value: 'Pending', label: 'Pending' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Rejected', label: 'Rejected' },
      ],
      render: (row) => (
        <Chip
          label={row.status}
          size="small"
          color={STATUS_COLORS[row.status] || "default"}
          variant="outlined"
        />
      ),
    },
    {
      key: "actions", label: "Actions", width: 110, align: 'center',
      render: (row) => {
        if (row.status !== "Pending") return null;
        return (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="Approve">
              <IconButton size="small" color="success" onClick={() => openConfirm(row, "approve")}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject">
              <IconButton size="small" color="error" onClick={() => openConfirm(row, "reject")}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  // Default to showing Pending requests when the screen opens
  useEffect(() => {
    if (Object.keys(columnFilters).length === 0) {
      handleFilterChange('f_status', 'Pending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box p={3}>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 3,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
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
            onClick={() => fetchRequests(page, pageSize, columnFilters, sortBy)}
            disabled={loading}
            sx={{ color: 'primary.contrastText', bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.request_id}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalCount={rowCount}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        emptyMessage="No edit requests"
      />

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
