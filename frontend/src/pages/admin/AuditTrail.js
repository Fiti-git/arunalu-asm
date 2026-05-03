import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, MenuItem, Chip, Table,
  TableHead, TableBody, TableRow, TableCell, IconButton, Collapse,
  CircularProgress, Alert, FormControlLabel, Checkbox, TablePagination,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

const SOURCE_COLOR = {
  payroll: 'primary',
  employee: 'secondary',
  attendance: 'warning',
};

function Row({ row }) {
  const [open, setOpen] = useState(false);
  const hasDetails = row.details && Object.keys(row.details).length > 0;
  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          {hasDetails && (
            <IconButton size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>{new Date(row.when).toLocaleString()}</TableCell>
        <TableCell>
          <Chip size="small" color={SOURCE_COLOR[row.source] || 'default'} label={row.source} />
        </TableCell>
        <TableCell>{row.action}</TableCell>
        <TableCell>{row.actor || '—'}</TableCell>
        <TableCell>{row.subject}</TableCell>
      </TableRow>
      {hasDetails && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
            <Collapse in={open}>
              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(row.details, null, 2)}
                </pre>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AuditTrail() {
  const [filters, setFilters] = useState({
    sources: { payroll: true, employee: true, attendance: true },
    user: '',
    employee_id: '',
    action: '',
    start_date: '',
    end_date: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {
        sources: Object.entries(filters.sources).filter(([, v]) => v).map(([k]) => k).join(','),
        user: filters.user || undefined,
        employee_id: filters.employee_id || undefined,
        action: filters.action || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        page: page + 1,
        page_size: pageSize,
      };
      const res = await api.get('/api/audit-trail/', { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit trail.');
    } finally { setLoading(false); }
  }, [filters, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const setSource = (s) => (e) =>
    setFilters({ ...filters, sources: { ...filters.sources, [s]: e.target.checked } });

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Audit Trail"
        subtitle="Unified history of payroll mutations, employee status changes, and attendance edits."
        actions={
          <IconButton onClick={load} disabled={loading} color="primary">
            {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
          </IconButton>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' }, gap: 2, alignItems: 'center' }}>
          <TextField size="small" label="Actor (username)" value={filters.user}
            onChange={(e) => setFilters({ ...filters, user: e.target.value })} />
          <TextField size="small" label="Employee ID" value={filters.employee_id}
            onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })} />
          <TextField size="small" label="Action" value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            helperText="e.g. edit / DEACTIVATED / Approved" />
          <TextField size="small" label="From" type="date" InputLabelProps={{ shrink: true }}
            value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
          <TextField size="small" label="To" type="date" InputLabelProps={{ shrink: true }}
            value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
          <Button variant="contained" onClick={() => { setPage(0); load(); }}>Apply</Button>
        </Box>
        <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
          {Object.keys(filters.sources).map((s) => (
            <FormControlLabel key={s} control={
              <Checkbox checked={filters.sources[s]} onChange={setSource(s)} size="small" />
            } label={s} />
          ))}
        </Box>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>When</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Subject</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.results.map((r, i) => <Row key={`${r.source}-${r.when}-${i}`} row={r} />)}
            {data.results.length === 0 && !loading && (
              <TableRow><TableCell colSpan={6} align="center">No entries.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={data.count}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100, 200]}
        />
      </Paper>
    </Box>
  );
}
