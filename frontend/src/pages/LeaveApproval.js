import React, { useEffect, useState } from "react";
import api from "utils/api";
import {
  Box,
  Button,
  MenuItem,
  Select,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import useManagerProfile from "../hooks/useManagerProfile.js";

export default function OutletLeavePage() {
  const { user, loading: userLoading } = useManagerProfile();
  const outlets = user?.outlets || [];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [outletId, setOutletId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLeaves = async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const res = await api.get("report/leaves/outlet/", {
        params: {
          outlet_id: outletId,
          start_date: startDate,
          end_date: endDate,
        },
      });

      setRows(
        res.data.results.map((r) => ({
          id: r.leave_refno, 
          ...r,
        }))
      );
    } catch (err) {
      console.error("Error fetching leaves:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (outletId) {
      fetchLeaves();
    }
  }, [outletId]);

  const updateStatus = async (leaveRefno, status) => {
    try {
      await api.patch(`/report/leaves/${leaveRefno}/status/`, { status });
      fetchLeaves();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const getStatusChip = (status) => {
    const colors = {
      pending: "warning",
      approved: "success",
      rejected: "error",
      cancelled: "default",
    };
    return (
      <Chip
        label={status?.toUpperCase() || "UNKNOWN"}
        color={colors[status] || "default"}
        size="small"
        variant="outlined"
      />
    );
  };

  if (userLoading) return <Typography p={3}>Loading profile...</Typography>;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3} fontWeight="bold">
        Outlet Leave Management
      </Typography>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Select
          value={outletId}
          onChange={(e) => setOutletId(e.target.value)}
          size="small"
          displayEmpty
          sx={{ width: 200 }}
        >
          <MenuItem value="">Select Outlet</MenuItem>
          {outlets.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name}
            </MenuItem>
          ))}
        </Select>

        <TextField
          type="date"
          size="small"
          label="Start Date"
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <TextField
          type="date"
          size="small"
          label="End Date"
          InputLabelProps={{ shrink: true }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <Button variant="contained" onClick={fetchLeaves} disabled={!outletId}>
          Search
        </Button>
      </Box>

      <Box sx={{ height: 700, width: "100%" }}>
        <DataGrid
          showToolbar
          rows={rows}
          columns={[
            { field: "leave_refno", headerName: "Ref No", width: 90 },
            { field: "employee_id", headerName: "Emp ID", width: 90 },
            { field: "username", headerName: "Emp Code", width: 100 },
            { 
              field: "first_name", 
              headerName: "Name", 
              width: 200,
              renderCell: (params) => params.value?.trim() || ""
            },
            { field: "att_type_name", headerName: "Leave Type", width: 130 },
            { field: "leave_date", headerName: "Leave Date", width: 110 },
            { field: "att_type", headerName: "Leave Type Code", width: 110 },
            { 
              field: "action_date", 
              headerName: "Action Date", 
              width: 110,
              // Fixed: Removed .value access that was causing the crash
              renderCell: (params) => params.value ? params.value : "-"
            },
            { 
              field: "remarks", 
              headerName: "Remarks", 
              width: 150,
              renderCell: (params) => params.value || "-"
            },
            { 
              field: "status", 
              headerName: "Status", 
              width: 120,
              renderCell: (params) => getStatusChip(params.value)
            },
            {
              field: "actions",
              headerName: "Actions",
              width: 180,
              sortable: false,
              renderCell: (params) => {
                if (params.row?.status === "pending") {
                  return (
                    <Box display="flex" gap={1} alignItems="center" height="100%">
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        onClick={() => updateStatus(params.row.id, "approved")}
                        sx={{ fontSize: '0.7rem' }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        color="error"
                        onClick={() => updateStatus(params.row.id, "rejected")}
                        sx={{ fontSize: '0.7rem' }}
                      >
                        Reject
                      </Button>
                    </Box>
                  );
                }
                return null;
              },
            },
          ]}
          loading={loading}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
        />
      </Box>
    </Box>
  );
}