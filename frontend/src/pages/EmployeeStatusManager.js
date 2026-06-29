import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "utils/api";
import { DataTable, applyClientFilters } from "components/ui";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

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
      setPage(1);
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

  const columns = useMemo(() => [
    { key: "fullname", label: "User Name", width: 200, sortKey: "fullname", filterKey: "f_fullname", filterType: "text", render: (r) => r.fullname },
    { key: "first_name", label: "Full Name", width: 180, sortKey: "first_name", filterKey: "f_first", filterType: "text", render: (r) => r.first_name },
    {
      key: "status", label: "Status", width: 200,
      filterKey: 'f_status', filterType: 'bool',
      filterValue: (row) => Boolean(row.is_active),
      boolLabels: { true: 'Active', false: 'Inactive' },
      render: (row) => {
        const isActive = Boolean(row.is_active);
        const inactiveDate = row.inactive_date;
        return isActive ? (
          <Chip label="Active" color="success" size="small" />
        ) : (
          <Chip
            label={inactiveDate ? `Inactive - ${formatDate(inactiveDate)}` : "Inactive"}
            color="error"
            size="small"
          />
        );
      },
    },
    {
      key: "actions", label: "Actions", width: 220,
      render: (row) => {
        const isActive = Boolean(row.is_active);
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              color="error"
              size="small"
              disabled={!isActive}
              onClick={() => deactivateEmployee(row.employee_id)}
            >
              Deactivate
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={isActive}
              onClick={() => activateEmployee(row.employee_id)}
            >
              Activate
            </Button>
          </Box>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const filteredRows = useMemo(
    () => applyClientFilters(employees, columns, columnFilters, sortBy),
    [employees, columns, columnFilters, sortBy]
  );
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize]
  );
  const handleFilterChange = (filterKey, value) => {
    const next = { ...columnFilters, [filterKey]: value };
    if (value === '' || value == null) delete next[filterKey];
    setColumnFilters(next);
    setPage(1);
  };

  return (
    <Box sx={{ p: 4, mt: 4, boxShadow: "none" }}>
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

      {error ? (
        <Typography color="error" align="center" sx={{ mt: 4 }}>
          {error}
        </Typography>
      ) : (
        <DataTable
          columns={columns}
          rows={pagedRows}
          getRowId={(r) => r.employee_id}
          loading={loading}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          totalCount={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          filters={columnFilters}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          onSortChange={(s) => { setSortBy(s); setPage(1); }}
          emptyMessage="No employees"
        />
      )}

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
