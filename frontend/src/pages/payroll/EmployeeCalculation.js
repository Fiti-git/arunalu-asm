import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar, Chip,
  IconButton, Tooltip, Divider, Paper, Snackbar, Table, TableBody, TableCell,
  TableHead, TableRow, MenuItem, Stack, LinearProgress,
} from '@mui/material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import api from 'utils/api';
import { PageHeader } from 'components/ui';

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function EmployeeCalculation() {
  const { employeeId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const periodStart = search.get('start');
  const periodEnd = search.get('end');

  const [preview, setPreview] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [allowances, setAllowances] = useState([]); // [{allowance_type, label, amount}]
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const locked = payroll?.status === 'Locked';

  // Load preview + possible existing payroll + allowance catalog
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [previewRes, listRes, catalogRes] = await Promise.all([
        api.get(`/payroll/preview/${employeeId}/`, { params: { period_start: periodStart, period_end: periodEnd } }),
        api.get('/payroll/payrolls/', { params: { employee_id: employeeId } }),
        api.get('/payroll/allowance-types/', { params: { active_only: 1 } }),
      ]);
      setPreview(previewRes.data);
      setAllowanceTypes(catalogRes.data || []);

      const existing = (listRes.data || []).find(p =>
        p.period_start === periodStart && p.period_end === periodEnd);
      if (existing) {
        setPayroll(existing);
        setAllowances(existing.allowances.map(a => ({
          allowance_type: a.allowance_type, label: a.label, amount: a.amount,
        })));
        setDeductions(existing.deductions.map(d => ({ label: d.label, amount: d.amount })));
      } else {
        setPayroll(null);
        // Auto-seed suggested bonus
        if (previewRes.data?.suggested_bonus?.amount > 0) {
          setAllowances([{
            allowance_type: null,
            label: previewRes.data.suggested_bonus.tier_label || 'Attendance Bonus',
            amount: previewRes.data.suggested_bonus.amount,
          }]);
        } else { setAllowances([]); }
        setDeductions([]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load.');
    } finally { setLoading(false); }
  }, [employeeId, periodStart, periodEnd]);

  useEffect(() => { load(); }, [load]);

  const snap = preview?.snapshot;

  // Totals
  const allowanceTotal = allowances.reduce((a, x) => a + Number(x.amount || 0), 0);
  const deductionTotal = deductions.reduce((a, x) => a + Number(x.amount || 0), 0);

  const baseForEpf = Number(preview?.employee?.basic_salary || 0);
  const epfEmp = baseForEpf * 0.08;
  const epfCom = baseForEpf * 0.12;
  const etf = baseForEpf * 0.03;

  const gross = (snap?.regular_pay || 0) + (snap?.ot_pay || 0)
              + (snap?.holiday_pay || 0) + (snap?.leave_pay || 0)
              + allowanceTotal;
  const taxAmount = Number(payroll?.tax_amount || 0);
  const taxLabel = payroll?.tax_slab_label || '';
  const net = gross - deductionTotal - epfEmp - taxAmount;

  // Mutators
  const addAllowance = () => setAllowances(a => [...a, { allowance_type: null, label: '', amount: 0 }]);
  const removeAllowance = (i) => setAllowances(a => a.filter((_, idx) => idx !== i));
  const updateAllowance = (i, patch) => setAllowances(a =>
    a.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  const pickAllowanceType = (i, atId) => {
    const at = allowanceTypes.find(t => t.id === atId);
    if (!at) { updateAllowance(i, { allowance_type: null }); return; }
    let amt = at.calc_mode === 'PERCENT'
      ? (baseForEpf * Number(at.default_amount) / 100)
      : Number(at.default_amount);
    if (Number(at.max_cap_amount) > 0 && amt > Number(at.max_cap_amount)) amt = Number(at.max_cap_amount);
    updateAllowance(i, { allowance_type: at.id, label: at.name, amount: Number(amt.toFixed(2)) });
  };

  const addDeduction = () => setDeductions(d => [...d, { label: '', amount: 0 }]);
  const removeDeduction = (i) => setDeductions(d => d.filter((_, idx) => idx !== i));
  const updateDeduction = (i, patch) => setDeductions(d =>
    d.map((row, idx) => idx === i ? { ...row, ...patch } : row));

  // Validate caps client-side before sending
  const validateCaps = () => {
    for (const a of allowances) {
      if (!a.allowance_type) continue;
      const at = allowanceTypes.find(t => t.id === a.allowance_type);
      if (at?.max_cap_amount > 0 && Number(a.amount) > Number(at.max_cap_amount)) {
        return `"${at.name}" exceeds max cap ${fmt(at.max_cap_amount)}.`;
      }
    }
    return null;
  };

  const createPayroll = async () => {
    setSaving(true); setError('');
    try {
      const res = await api.post('/payroll/payrolls/', {
        employee_id: employeeId, period_start: periodStart, period_end: periodEnd,
      });
      setPayroll(res.data);
      setAllowances(res.data.allowances.map(a => ({
        allowance_type: a.allowance_type, label: a.label, amount: a.amount,
      })));
      setDeductions(res.data.deductions.map(d => ({ label: d.label, amount: d.amount })));
      setToast('Draft payroll generated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create.');
    } finally { setSaving(false); }
  };

  const saveDraft = async () => {
    const capErr = validateCaps();
    if (capErr) { setError(capErr); return; }
    if (!payroll) return;
    setSaving(true); setError('');
    try {
      const res = await api.patch(`/payroll/payrolls/${payroll.id}/`, {
        allowances, deductions,
      });
      setPayroll(res.data);
      setToast('Saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  };

  const lock = async () => {
    if (!window.confirm('Lock this payroll? Allowances/deductions will be frozen.')) return;
    await saveDraft();
    try {
      const res = await api.post(`/payroll/payrolls/${payroll.id}/lock/`);
      setPayroll(res.data);
      setToast('Locked.');
    } catch { setError('Lock failed.'); }
  };

  const downloadPayslip = async () => {
    try {
      const res = await api.get(`/payroll/payrolls/${payroll.id}/payslip/`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${emp.empcode || emp.employee_id}_${periodStart}_${periodEnd}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Failed to download payslip.'); }
  };

  const unlock = async () => {
    try {
      const res = await api.post(`/payroll/payrolls/${payroll.id}/unlock/`);
      setPayroll(res.data);
      setToast('Unlocked.');
    } catch (err) { setError(err.response?.data?.error || 'Unlock failed.'); }
  };

  if (loading) return (
    <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
  );
  if (!preview) return <Box sx={{ p: 4 }}><Alert severity="error">{error || 'Failed to load.'}</Alert></Box>;

  const emp = preview.employee;

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Payroll Calculation"
        subtitle={`${emp.fullname} • ${periodStart} .. ${periodEnd}`}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/payroll')}>Back</Button>
            {!payroll && (
              <Button variant="contained" onClick={createPayroll} disabled={saving}>
                {saving ? <CircularProgress size={18} /> : 'Generate Draft'}
              </Button>
            )}
            {payroll && !locked && (
              <>
                <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveDraft} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </Button>
                <Button variant="contained" color="success" startIcon={<LockOutlinedIcon />} onClick={lock} disabled={saving}>
                  Lock
                </Button>
              </>
            )}
            {locked && (
              <Button variant="outlined" color="warning" startIcon={<LockOpenOutlinedIcon />} onClick={unlock}>
                Unlock
              </Button>
            )}
            {payroll && (
              <Button variant="contained" color="info" startIcon={<DownloadIcon />} onClick={downloadPayslip}>
                Payslip PDF
              </Button>
            )}
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {locked && <Alert severity="info">This payroll is <b>Locked</b> — unlock to edit.</Alert>}

      {/* Attendance / score summary */}
      <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ width: 48, height: 48 }}>{emp.fullname?.[0]}</Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>{emp.fullname}</Typography>
            <Typography variant="caption" color="text.secondary">
              {emp.empcode} • Basic Rs. {fmt(emp.basic_salary)} • Per-day Rs. {fmt(snap?.per_day_rate)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 2 }}>
          <Metric label="Scheduled Hrs" value={fmt(snap?.scheduled_hours)} />
          <Metric label="Worked Hrs" value={fmt(snap?.worked_hours)} />
          <Metric label="OT Hrs" value={fmt(snap?.ot_hours)} />
          <Metric label="Holiday Hrs" value={fmt(snap?.holiday_hours)} />
          <Metric label="Leave Days" value={snap?.days_leave} />
          <Metric label="Absent Days" value={snap?.days_absent} accent={Number(snap?.days_absent) > 0 ? 'error' : undefined} />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">Attendance Score</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress variant="determinate"
                value={Math.min(100, Number(snap?.attendance_score || 0))}
                color={Number(snap?.attendance_score) >= 90 ? 'success'
                  : Number(snap?.attendance_score) >= 75 ? 'warning' : 'error'}
                sx={{ height: 10, borderRadius: 1 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>{Number(snap?.attendance_score || 0).toFixed(0)}%</Typography>
          </Box>
          {preview?.suggested_bonus?.amount > 0 && (
            <Typography variant="caption" color="success.main">
              Suggested bonus: <b>{preview.suggested_bonus.tier_label}</b> — Rs. {fmt(preview.suggested_bonus.amount)}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Daily breakdown */}
      <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Daily Breakdown</Typography>
        <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Day</TableCell>
                <TableCell align="right">Scheduled</TableCell>
                <TableCell align="right">Worked</TableCell>
                <TableCell align="right">OT</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Note</TableCell>
                <TableCell align="right">Pay</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(snap?.daily_breakdown || []).map((row) => {
                const isHolidayWorked = row.note?.startsWith('Worked on holiday');
                return (
                  <TableRow key={row.date} sx={{
                    bgcolor: isHolidayWorked ? 'warning.50'
                      : row.holiday && !isHolidayWorked ? 'info.50'
                      : row.status === 'Absent' ? 'error.50' : undefined,
                  }}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.weekday}</TableCell>
                    <TableCell align="right">{row.scheduled_hours}</TableCell>
                    <TableCell align="right">{row.worked_hours}</TableCell>
                    <TableCell align="right">{row.ot_hours}</TableCell>
                    <TableCell>
                      {row.status && <Chip size="small" label={row.status}
                        color={row.status === 'Absent' ? 'error'
                          : row.status === 'On Leave' ? 'info'
                          : row.status === 'Half Day' ? 'warning'
                          : row.status === 'Late' ? 'warning'
                          : row.status === 'Present' ? 'success' : 'default'} />}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{row.note}</Typography>
                      {row.holiday && <Chip size="small" label={row.holiday} color="info" sx={{ ml: 0.5 }} />}
                    </TableCell>
                    <TableCell align="right">{fmt(row.pay)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Allowances */}
      <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>Allowances</Typography>
          {!locked && (
            <Button size="small" startIcon={<AddIcon />} onClick={addAllowance}>Add</Button>
          )}
        </Box>
        <Stack spacing={1}>
          {allowances.length === 0 && (
            <Typography variant="caption" color="text.secondary">No allowances.</Typography>
          )}
          {allowances.map((a, i) => {
            const at = allowanceTypes.find(t => t.id === a.allowance_type);
            const cap = at?.max_cap_amount > 0 ? Number(at.max_cap_amount) : null;
            const overCap = cap && Number(a.amount) > cap;
            return (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField select size="small" label="Type" sx={{ width: 180 }}
                  value={a.allowance_type || ''}
                  onChange={(e) => pickAllowanceType(i, Number(e.target.value))}
                  disabled={locked}>
                  <MenuItem value="">— Custom —</MenuItem>
                  {allowanceTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Label" value={a.label} sx={{ flex: 1 }}
                  onChange={(e) => updateAllowance(i, { label: e.target.value })}
                  disabled={locked} />
                <TextField size="small" label="Amount" type="number" value={a.amount} sx={{ width: 140 }}
                  error={overCap}
                  helperText={overCap ? `Cap: ${fmt(cap)}` : (cap ? `Max: ${fmt(cap)}` : '')}
                  onChange={(e) => updateAllowance(i, { amount: e.target.value })}
                  disabled={locked} />
                {!locked && (
                  <IconButton size="small" color="error" onClick={() => removeAllowance(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Stack>
      </Paper>

      {/* Deductions */}
      <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>Deductions</Typography>
          {!locked && (
            <Button size="small" startIcon={<AddIcon />} onClick={addDeduction}>Add</Button>
          )}
        </Box>
        <Stack spacing={1}>
          {deductions.length === 0 && (
            <Typography variant="caption" color="text.secondary">No deductions.</Typography>
          )}
          {deductions.map((d, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField size="small" label="Label" value={d.label} sx={{ flex: 1 }}
                onChange={(e) => updateDeduction(i, { label: e.target.value })}
                disabled={locked} />
              <TextField size="small" label="Amount" type="number" value={d.amount} sx={{ width: 140 }}
                onChange={(e) => updateDeduction(i, { amount: e.target.value })}
                disabled={locked} />
              {!locked && (
                <IconButton size="small" color="error" onClick={() => removeDeduction(i)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Totals */}
      <Paper sx={{ p: 2.5, borderRadius: 2.5, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Summary</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
          <Line label="Regular Pay" value={fmt(snap?.regular_pay)} />
          <Line label="OT Pay" value={fmt(snap?.ot_pay)} />
          <Line label="Holiday Pay" value={fmt(snap?.holiday_pay)} />
          <Line label="Leave Pay" value={fmt(snap?.leave_pay)} />
          <Line label="Allowances" value={fmt(allowanceTotal)} />
          <Line label="Deductions" value={`− ${fmt(deductionTotal)}`} negative />
          <Line label="EPF (Employee 8%)" value={`− ${fmt(epfEmp)}`} negative />
          {taxAmount > 0 && (
            <Line label={`APIT${taxLabel ? ` (${taxLabel})` : ''}`} value={`− ${fmt(taxAmount)}`} negative />
          )}
          <Line label="EPF (Company 12%)" value={fmt(epfCom)} muted />
          <Line label="ETF (Company 3%)" value={fmt(etf)} muted />
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
          <Line label="Gross" value={fmt(gross)} big />
          <Line label="Net Pay" value={fmt(net)} big highlight />
        </Box>
      </Paper>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast('')}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
    </Box>
  );
}

function Metric({ label, value, accent }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700} color={accent}>{value ?? '—'}</Typography>
    </Box>
  );
}

function Line({ label, value, big, highlight, negative, muted }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography variant={big ? 'body1' : 'body2'} fontWeight={big ? 700 : 500}
        color={muted ? 'text.secondary' : 'text.primary'}>
        {label}
      </Typography>
      <Typography variant={big ? 'h6' : 'body2'}
        fontWeight={big ? 700 : 500}
        color={negative ? 'error.main' : highlight ? 'success.main' : muted ? 'text.secondary' : 'text.primary'}>
        {value}
      </Typography>
    </Box>
  );
}
