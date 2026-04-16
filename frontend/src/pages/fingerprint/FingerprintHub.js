import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  IconButton, Tooltip, Snackbar,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { PageHeader } from 'components/ui';
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

  const fetchUploads = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/fingerprint/uploads/');
      setRows(res.data || []);
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

  const columns = [
    { field: 'filename', headerName: 'File', flex: 1.6, minWidth: 220 },
    {
      field: 'period', headerName: 'Period', flex: 1.1, minWidth: 160,
      valueGetter: (_, row) => row.period_start && row.period_end
        ? `${row.period_start} → ${row.period_end}` : '—',
    },
    { field: 'total_rows', headerName: 'Rows', flex: 0.4, minWidth: 80, align: 'center', headerAlign: 'center' },
    {
      field: 'status', headerName: 'Status', flex: 0.6, minWidth: 110,
      renderCell: ({ value }) => <Chip label={value} size="small" color={statusColor(value)} sx={{ fontWeight: 600 }} />,
    },
    {
      field: 'breakdown', headerName: 'Matched · Amb · Unm · Conflict', flex: 1.2, minWidth: 230,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.6 }}>
          <Chip size="small" label={row.matched_rows} color="success" sx={{ fontWeight: 700, minWidth: 42 }} />
          <Chip size="small" label={row.ambiguous_rows} color="warning" sx={{ fontWeight: 700, minWidth: 42 }} />
          <Chip size="small" label={row.unmatched_rows} color="error" sx={{ fontWeight: 700, minWidth: 42 }} />
          <Chip size="small" label={row.conflict_rows} color="info" sx={{ fontWeight: 700, minWidth: 42 }} />
        </Box>
      ),
    },
    { field: 'uploaded_by_name', headerName: 'By', flex: 0.7, minWidth: 110 },
    {
      field: 'uploaded_at', headerName: 'Uploaded', flex: 0.9, minWidth: 150,
      renderCell: ({ value }) => value ? new Date(value).toLocaleString() : '',
    },
    {
      field: 'actions', headerName: '', flex: 0.5, minWidth: 110, sortable: false, filterable: false,
      renderCell: ({ row }) => (
        <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`${base}/${row.id}`)}>Open</Button>
      ),
    },
  ];

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

      <Box sx={{ height: 640, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <DataGrid
          rows={rows} columns={columns} getRowId={(r) => r.id}
          loading={loading}
          disableRowSelectionOnClick
          onRowDoubleClick={(p) => navigate(`${base}/${p.row.id}`)}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

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