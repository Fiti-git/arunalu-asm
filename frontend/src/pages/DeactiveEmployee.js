import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import api from "utils/api";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // snackbar
  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showSnack = (message, severity = "success") => {
    setSnack({ open: true, severity, message });
  };

  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/getallemployees/");
      const d = res.data; setEmployees(Array.isArray(d) ? d : (d.results || []));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const deactivateEmployee = async (employee_id) => {
    if (!window.confirm("Are you sure you want to deactivate this employee?")) return;

    try {
      await api.post(`/api/deactivate-employee/${employee_id}/`, {});
      // local update (no need full refetch, but you can keep fetchEmployees if you prefer)
      setEmployees((prev) =>
        prev.map((e) =>
          e.employee_id === employee_id
            ? { ...e, is_active: false, inactive_date: new Date().toISOString() }
            : e
        )
      );
      showSnack("Employee deactivated successfully.", "success");
    } catch (err) {
      showSnack(err.response?.data?.error || err.message, "error");
    }
  };

  const activateEmployee = async (employee_id) => {
    if (!window.confirm("Are you sure you want to activate this employee?")) return;

    try {
      await api.post(`/api/activate-employee/${employee_id}/`, {});
      setEmployees((prev) =>
        prev.map((e) =>
          e.employee_id === employee_id
            ? { ...e, is_active: true, inactive_date: null }
            : e
        )
      );
      showSnack("Employee activated successfully.", "success");
    } catch (err) {
      showSnack(err.response?.data?.error || err.message, "error");
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  };

  const columns = useMemo(
    () => [
      { field: "fullname", headerName: "User Name", flex: 1.5, minWidth: 150 },
      { field: "first_name", headerName: "Full Name", flex: 1, minWidth: 120 },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: (params) => {
          const isActive = Boolean(params.row.is_active);
          const inactiveDate = params.row.inactive_date;

          return isActive ? (
            <Chip label="Active" color="success" size="small" />
          ) : (
            <Chip
              label={
                inactiveDate
                  ? `Inactive - ${formatDate(inactiveDate)}`
                  : "Inactive"
              }
              color="error"
              size="small"
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: (params) => {
          const isActive = Boolean(params.row.is_active);

          return (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="error"
                size="small"
                disabled={!isActive}
                onClick={() => deactivateEmployee(params.row.employee_id)}
              >
                Deactivate
              </Button>

              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={isActive}
                onClick={() => activateEmployee(params.row.employee_id)}
              >
                Activate
              </Button>
            </Box>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees]
  );

  return (
    <Box
      sx={{
        p: 4,
        mt: 4,
        boxShadow: "none",
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          textTransform: "uppercase",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "#333",
            letterSpacing: 0.5,
            display: "inline-block",
            pb: 0.5,
          }}
        >
          Employee Activation / Deactivation
        </Typography>
      </Box>

      {/* Loading, Error, or DataGrid */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress sx={{ color: "#e6b904" }} />
        </Box>
      ) : error ? (
        <Typography color="error" align="center" sx={{ mt: 4 }}>
          {error}
        </Typography>
      ) : (
        <Box
          sx={{
            height: 500,
            width: "100%",
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          <DataGrid
            rows={employees}
            columns={columns}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            getRowId={(row) => row.employee_id}
            sx={{
              border: "none",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f9fafb",
                fontWeight: 600,
                color: "#333",
                fontSize: "0.95rem",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#fffbe6",
              },
              "& .MuiDataGrid-cell:focus": {
                outline: "none",
              },
              "&::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#ccc",
                borderRadius: "4px",
              },
            }}
          />
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={closeSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={closeSnack} severity={snack.severity} variant="filled">
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
