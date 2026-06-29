import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, Alert, Chip,
  IconButton, Tooltip, Snackbar,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { PageHeader, DataTable, applyClientFilters } from 'components/ui';
import { getUserRole } from 'utils/auth';

const statusColor = (s) => {
  if (s === 'Committed') return 'success';
  if (s === 'Staged') return 'warning';
  if (s === 'Reverted') return 'default';
  return 'default';
};

export default function FingerprintHub() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const base = role === 'admin' ? '/admin/fingerprint' : '/manager/fingerprint';

  const fileInput = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, severity: 'success', message: '' });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const fetchUploads = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/fingerprint/uploads/');
      setRows(res.data || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load uploads.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const handleUpload = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await api.post('/fingerprint/uploads/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setToast({ open: true, severity: 'success', message: `Uploaded. ${res.data.total_rows} rows staged.` });
      fetchUploads();
      navigate(`${base}/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally { setUploading(false); }
  };

  const columns = useMemo(() => [
    { key: 'filename', label: 'File', width: 240, sortKey: 'filename', filterKey: 'f_file', filterType: 'text', render: (r) => r.filename },
    {
      key: 'period', label: 'Period', width: 180,
      render: (row) => row.period_start && row.period_end
        ? `${row.period_start} → ${row.period_end}` : '—',
    },
    { key: 'total_rows', label: 'Rows', width: 90, align: 'center', sortKey: 'total_rows', render: (r) => r.total_rows },
    {
      key: 'status', label: 'Status', width: 120, sortKey: 'status',
      filterKey: 'f_status', filterType: 'select',
      filterOptions: [
        { value: 'Staged', label: 'Staged' },
        { value: 'Committed', label: 'Committed' },
        { value: 'Reverted', label: 'Reverted' },
      ],
      render: (row) => <Chip label={row.status} size="small" color={statusColor(row.status)} sx={{ fontWeight: 600 }} />,
    },
    {
      key: 'breakdown', label: 'Matched · Amb · Unm · Conflict', width: 250,
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.6 }}>
          <Chip size="small" label={row.matched_rows} color="success" sx={{ fontWeight: 700, minWidth: 42 }} />
          <Chip size="small" label={row.ambiguous_rows} color="warning" sx={{ fontWeight: 700, minWidth: 42 }} />
          <Chip size="small" label={row.unmatched_rows} color="error" sx={{ fontWeight: 700, minWidth: 42 }} />
          <Chip size="small" label={row.conflict_rows} color="info" sx={{ fontWeight: 700, minWidth: 42 }} />
        </Box>
      ),
    },
    { key: 'uploaded_by_name', label: 'By', width: 120, sortKey: 'uploaded_by_name', filterKey: 'f_by', filterType: 'text', render: (r) => r.uploaded_by_name },
    {
      key: 'uploaded_at', label: 'Uploaded', width: 170, sortKey: 'uploaded_at',
      render: (row) => row.uploaded_at ? new Date(row.uploaded_at).toLocaleString() : '',
    },
    {
      key: 'actions', label: '', width: 110,
      render: (row) => (
        <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`${base}/${row.id}`)}>Open</Button>
      ),
    },
  ], [navigate, base]);

  const filteredRows = useMemo(
    () => applyClientFilters(rows, columns, columnFilters, sortBy),
    [rows, columns, columnFilters, sortBy]
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
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Fingerprint Import"
        subtitle="Upload attendance sheets from the fingerprint machine. Review mappings, fix conflicts, then commit to attendance."
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xlsm"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            <Button
              variant="contained"
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload XLSX'}
            </Button>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchUploads} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(r) => r.id}
        loading={loading}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        emptyMessage="No uploads yet"
        height={640}
        minHeight={640}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}