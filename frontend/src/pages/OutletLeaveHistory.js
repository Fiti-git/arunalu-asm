import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
} from '@mui/material';
import api from 'utils/api';
import { DataTable, applyClientFilters } from 'components/ui';

export default function LeaveSummary() {
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [userOutlets, setUserOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    const fetchUserOutlets = async () => {
      try {
        const res = await api.get('/api/user/');
        const userOutlets = res.data.outlets || [];
        setUserOutlets(userOutlets);

        if (userOutlets.length > 0) {
          setSelectedOutlet(userOutlets[0].id);
        }
      } catch (err) {
        setError('Failed to fetch user outlets.');
        console.error('Error fetching user outlets:', err);
      }
    };
    fetchUserOutlets();
  }, []);

  useEffect(() => {
    if (!selectedOutlet) return;

    const fetchLeaveHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/api/attendance/outletleaverequests/', {
          params: { outlet_id: selectedOutlet },
        });

        const formattedData = response.data.map(item => ({
          ...item,
          id: item.leave_refno,
        }));
        setLeaveHistory(formattedData);
        setPage(1);
      } catch (err) {
        setError('Failed to fetch leave history.');
        console.error('Error fetching leave history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveHistory();
  }, [selectedOutlet]);

  const columns = useMemo(() => [
    { key: 'leave_refno', label: 'Reference No', width: 120, sortKey: 'leave_refno', filterKey: 'f_ref', filterType: 'text', render: (r) => r.leave_refno },
    { key: 'employee_name', label: 'Employee Name', width: 200, sortKey: 'employee_name', filterKey: 'f_emp', filterType: 'text', render: (r) => r.employee_name },
    { key: 'leave_type_name', label: 'Leave Type', width: 150, sortKey: 'leave_type_name', filterKey: 'f_type', filterType: 'text', render: (r) => r.leave_type_name },
    { key: 'leave_date', label: 'Leave Date', width: 130, sortKey: 'leave_date', render: (r) => r.leave_date },
    { key: 'remarks', label: 'Remarks', width: 240, filterKey: 'f_remarks', filterType: 'text', render: (r) => r.remarks },
    {
      key: 'status', label: 'Status', width: 130,
      sortKey: 'status',
      filterKey: 'f_status', filterType: 'select',
      filterOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
      render: (row) => {
        let color = 'default';
        if (row.status === 'approved') color = 'success';
        if (row.status === 'rejected') color = 'error';
        if (row.status === 'pending') color = 'warning';
        return (
          <Chip
            label={(row.status || '').toUpperCase()}
            color={color}
            size="small"
            sx={{ fontWeight: 600, borderRadius: '4px' }}
          />
        );
      },
    },
    { key: 'action_date', label: 'Action Date', width: 130, sortKey: 'action_date', render: (r) => r.action_date },
  ], []);

  const filteredRows = useMemo(
    () => applyClientFilters(leaveHistory, columns, columnFilters, sortBy),
    [leaveHistory, columns, columnFilters, sortBy]
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
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        mt: 4,
        maxWidth: 1200,
        mx: 'auto',
        bgcolor: 'transparent',
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 'bold',
            display: 'inline-block',
            pb: 0.5,
          }}
        >
          LEAVE SUMMARY
        </Typography>

        {userOutlets.length > 1 && (
          <FormControl
            size="medium"
            variant="outlined"
            sx={{ minWidth: 220, maxWidth: 300 }}
          >
            <InputLabel id="leave-summary-outlet-label">Select Outlet</InputLabel>
            <Select
              labelId="leave-summary-outlet-label"
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              label="Select Outlet"
            >
              {userOutlets.map((o) => (
                <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {error ? (
        <Typography color="error" align="center" sx={{ mt: 4 }}>
          {error}
        </Typography>
      ) : (
        <DataTable
          columns={columns}
          rows={pagedRows}
          getRowId={(r) => r.id}
          loading={loading}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20]}
          totalCount={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          filters={columnFilters}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          onSortChange={(s) => { setSortBy(s); setPage(1); }}
          emptyMessage="No leave records"
          height={500}
          minHeight={500}
        />
      )}
    </Paper>
  );
}
