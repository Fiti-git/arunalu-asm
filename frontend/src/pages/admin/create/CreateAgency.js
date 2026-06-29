import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Tooltip,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import api from 'utils/api';
import { DataTable, applyClientFilters } from 'components/ui';

const MAX_LENGTH = 255;

export default function AgencyGrid() {
  const [agencies, setAgencies] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editAgency, setEditAgency] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    api.get('/api/getagencies/').then(res => setAgencies(res.data));
  }, []);

  // Open dialog for add or edit
  const openAddDialog = () => {
    setEditAgency(null);
    setForm({ name: '', address: '' });
    setError('');
    setOpenDialog(true);
  };

  const openEditDialog = (agency) => {
    setEditAgency(agency);
    setForm({ name: agency.name, address: agency.address });
    setError('');
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setEditAgency(null);
    setError('');
    setForm({ name: '', address: '' });
  };

  const handleChange = (e) => {
    if (e.target.value.length <= MAX_LENGTH) {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
      if (error) setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.address.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {

      if (editAgency) {
        // Edit existing agency — include the ID
        const response = await api.put(`api/agencies/${editAgency.id}/`, form);
        const updatedAgency = response.data;

        setAgencies((prev) =>
          prev.map((a) => (a.id === editAgency.id ? updatedAgency : a))
        );
      } else {
        // Add new agency
        const response = await api.post('api/agencies/', form); // Also changed to use `api` instead of `axios`
        const newAgency = response.data;

        setAgencies((prev) => [...prev, newAgency]);
      }
      closeDialog();
    } catch (err) {
      console.error('API error:', err);
      setError('Failed to save agency. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const columns = useMemo(() => [
    { key: 'name', label: 'Agency Name', width: 240, sortKey: 'name', filterKey: 'f_name', filterType: 'text', render: (r) => r.name },
    { key: 'address', label: 'Address', width: 320, sortKey: 'address', filterKey: 'f_addr', filterType: 'text', render: (r) => r.address },
    {
      key: 'actions', label: 'Actions', width: 90, align: 'center',
      render: (row) => (
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => openEditDialog(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const filteredRows = useMemo(
    () => applyClientFilters(agencies, columns, columnFilters, sortBy),
    [agencies, columns, columnFilters, sortBy]
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
    <Box sx={{ height: 500, width: '90%', mx: 'auto', mt: 5, position: 'relative' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
        Agencies
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        sx={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}
        onClick={openAddDialog}
      >
        Add Agency
      </Button>

      <Box sx={{ mt: 4 }}>
        <DataTable
          columns={columns}
          rows={pagedRows}
          getRowId={(r) => r.id}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={[5, 7, 10, 25]}
          totalCount={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          filters={columnFilters}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          onSortChange={(s) => { setSortBy(s); setPage(1); }}
          emptyMessage="No agencies"
        />
      </Box>

      <Dialog open={openDialog} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editAgency ? 'Edit Agency' : 'Add New Agency'}</DialogTitle>
        <form onSubmit={handleSubmit} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Agency Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              helperText={`${form.name.length}/${MAX_LENGTH}`}
              inputProps={{ maxLength: MAX_LENGTH }}
              error={!!error && !form.name.trim()}
            />
            <TextField
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              fullWidth
              required
              helperText={`${form.address.length}/${MAX_LENGTH}`}
              inputProps={{ maxLength: MAX_LENGTH }}
              error={!!error && !form.address.trim()}
            />
            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? (editAgency ? 'Saving...' : 'Creating...') : editAgency ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
