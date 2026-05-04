import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert,
  IconButton, Tooltip, Paper, TablePagination,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from 'utils/api';
import { PageHeader } from 'components/ui';
import { firstOfMonth, today, exportCsv, rangeFieldSx } from './shared';
import { getUserRole } from 'utils/auth';

const CODE_META = {
  P:  { label: 'Present',   bg: '#DCFCE7', color: '#15803D' },
  L:  { label: 'Late',      bg: '#FEF3C7', color: '#B45309' },
  H:  { label: 'Half Day',  bg: '#E0F2FE', color: '#0369A1' },
  V:  { label: 'On Leave',  bg: '#F3E8FF', color: '#7E22CE' },
  A:  { label: 'Absent',    bg: '#FEE2E2', color: '#B91C1C' },
  HOL:{ label: 'Holiday',   bg: '#FDE68A', color: '#92400E' },
  '-':{ label: '—',         bg: 'transparent', color: '#9CA3AF' },
};

function Cell({ code, isHoliday }) {
  const render = isHoliday && code === '-' ? 'HOL' : (code || '-');
  const m = CODE_META[render] || CODE_META['-'];
  return (
    <Box sx={{
      minWidth: 28, height: 28, borderRadius: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.7rem', fontWeight: 700,
      bgcolor: m.bg, color: m.color,
    }}>
      {render === '-' ? '' : render}
    </Box>
  );
}

export default function MonthlySheetReport() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const backPath = role === 'admin' ? '/admin/reports' : '/manager/reports';

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get('/report/reports/monthly-sheet/', {
        params: { start_date: startDate, end_date: endDate },
      });
      setData(res.data);
      setPage(0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const holidaySet = useMemo(() => new Set(data?.holidays || []), [data]);

  const pagedEmployees = useMemo(
    () => (data?.employees || []).slice(page * pageSize, page * pageSize + pageSize),
    [data, page, pageSize],
  );

  const dateLabels = useMemo(() => (data?.dates || []).map((d) => {
    const dd = new Date(d);
    return { full: d, label: String(dd.getDate()).padStart(2, '0'), weekday: dd.toLocaleDateString([], { weekday: 'short' }) };
  }), [data]);

  const handleExport = () => {
    if (!data) return;
    const rows = data.employees.map((e) => {
      const cellsByDate = data.cells[e.employee_id] || {};
      const row = {
        empcode: e.empcode || '',
        fullname: e.fullname,
        outlet: e.primary_outlet_name || '',
      };
      data.dates.forEach((d) => {
        row[d] = cellsByDate[d] || (holidaySet.has(d) ? 'HOL' : '-');
      });
      const codes = Object.values(row).filter((v) => typeof v === 'string');
      row.present = codes.filter((c) => c === 'P').length;
      row.late = codes.filter((c) => c === 'L').length;
      row.leave = codes.filter((c) => c === 'V').length;
      row.absent = codes.filter((c) => c === 'A').length;
      return row;
    });
    exportCsv(`monthly-sheet_${startDate}_to_${endDate}.csv`, rows);
  };

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Reports / Monthly Sheet</Typography>
      </Box>

      <PageHeader
        title="Monthly Attendance Sheet"
        subtitle={data ? `${data.employees.length} employees · ${data.dates.length} days` : 'Pick a range'}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="From" type="date" size="small" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <TextField label="To" type="date" size="small" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={rangeFieldSx} />
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchData} disabled={loading} color="primary">
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={!data}>
              Export CSV
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {['P', 'L', 'H', 'V', 'A', 'HOL'].map((k) => {
          const m = CODE_META[k];
          return (
            <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
              <Box sx={{ px: 0.8, py: 0.2, borderRadius: 0.7, bgcolor: m.bg, color: m.color, fontSize: '0.7rem', fontWeight: 700 }}>
                {k}
              </Box>
              <Typography variant="caption" color="text.secondary">{m.label}</Typography>
            </Box>
          );
        })}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !data || data.employees.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No employees in range.
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'auto', borderRadius: 2 }}>
          <Box component="table" sx={{
            borderCollapse: 'separate', borderSpacing: 0,
            minWidth: 200 + (dateLabels.length * 34),
            '& th, & td': { p: 0.6, verticalAlign: 'middle' },
          }}>
            <Box component="thead" sx={{ position: 'sticky', top: 0, bgcolor: 'grey.50', zIndex: 2 }}>
              <Box component="tr">
                <Box component="th" sx={{ position: 'sticky', left: 0, bgcolor: 'grey.50', zIndex: 3, textAlign: 'left', minWidth: 200, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="overline" color="text.secondary">Employee</Typography>
                </Box>
                {dateLabels.map((d) => (
                  <Box component="th" key={d.full} sx={{
                    textAlign: 'center', fontSize: '0.65rem', color: holidaySet.has(d.full) ? 'warning.dark' : 'text.secondary',
                    borderBottom: 1, borderColor: 'divider',
                  }}>
                    <div style={{ fontWeight: 700 }}>{d.label}</div>
                    <div style={{ opacity: 0.7 }}>{d.weekday}</div>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {pagedEmployees.map((e, i) => (
                <Box component="tr" key={e.employee_id} sx={{ bgcolor: i % 2 === 0 ? 'background.paper' : 'grey.50' }}>
                  <Box component="td" sx={{
                    position: 'sticky', left: 0, bgcolor: 'inherit', zIndex: 1,
                    minWidth: 200, borderBottom: 1, borderColor: 'divider',
                  }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{e.fullname}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {e.empcode ? `${e.empcode} · ` : ''}{e.primary_outlet_name}
                    </Typography>
                  </Box>
                  {dateLabels.map((d) => (
                    <Box component="td" key={d.full} sx={{ textAlign: 'center', borderBottom: 1, borderColor: 'divider' }}>
                      <Cell code={(data.cells[e.employee_id] || {})[d.full]} isHoliday={holidaySet.has(d.full)} />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
          <TablePagination
            component="div"
            count={data.employees.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}
    </Box>
  );
}