import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert, Avatar, Chip,
  IconButton, Tooltip, Divider, Grid, Paper, Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from 'utils/api';
import { PageHeader } from 'components/ui';
import { pickAvatarColor } from 'theme/tokens';
import { getUserRole } from 'utils/auth';

const BASE_URL = process.env.REACT_APP_API_URL || '';
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const endOfMonth = () => {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
};
const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const fmt = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function MoneyField({ label, value, onChange, disabled, helper }) {
  return (
    <TextField
      label={label} size="small" fullWidth type="number"
      value={value ?? ''} onChange={(e) => onChange(e.target.value)}
      disabled={disabled} helperText={helper}
      inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }}
    />
  );
}

export default function EmployeeCalculation() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isAdmin = (getUserRole() || '').toLowerCase() === 'admin';

  const [periodStart, setPeriodStart] = useState(params.get('start') || firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(params.get('end') || endOfMonth());

  const [preview, setPreview] = useState(null);
  const [salary, setSalary] = useState(null);
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, severity: 'success', message: '' });

  // Editable form fields (populated from voucher if exists, else preview)
  const [perDay, setPerDay] = useState('');
  const [perHourOt, setPerHourOt] = useState('');
  const [expectedHours, setExpectedHours] = useState('');
  const [daysPresent, setDaysPresent] = useState('');
  const [daysLate, setDaysLate] = useState('');
  const [daysHalf, setDaysHalf] = useState('');
  const [daysLeave, setDaysLeave] = useState('');
  const [daysAbsent, setDaysAbsent] = useState('');
  const [holidayWorkDays, setHolidayWorkDays] = useState('');
  const [otHours, setOtHours] = useState('');
  const [regularPay, setRegularPay] = useState('');
  const [otPay, setOtPay] = useState('');
  const [holidayPay, setHolidayPay] = useState('');
  const [leavePay, setLeavePay] = useState('');
  const [basicForEpf, setBasicForEpf] = useState('');
  const [epfEmployeePct, setEpfEmployeePct] = useState('');
  const [epfCompanyPct, setEpfCompanyPct] = useState('');
  const [etfCompanyPct, setEtfCompanyPct] = useState('');
  const [allowances, setAllowances] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [notes, setNotes] = useState('');

  const locked = voucher?.status === 'Locked';

  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // Preview (always fresh from attendance) + salary profile
      const [prevRes, salRes] = await Promise.all([
        api.get(`/calculation/preview/${employeeId}/`, { params: { start_date: periodStart, end_date: periodEnd } }),
        api.get(`/calculation/salary/${employeeId}/`),
      ]);
      setPreview(prevRes.data);
      setSalary(salRes.data);

      // Existing voucher for this exact period
      const vRes = await api.get('/calculation/vouchers/', {
        params: { employee_id: employeeId, status: 'all' },
      });
      const match = (vRes.data || []).find(
        (v) => v.period_start === periodStart && v.period_end === periodEnd
      );
      setVoucher(match || null);

      if (match) {
        applyVoucherToForm(match);
      } else {
        applyPreviewToForm(prevRes.data, salRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load.');
    } finally { setLoading(false); }
  }, [employeeId, periodStart, periodEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll(); }, [loadAll]);

  const applyPreviewToForm = (prev, sal) => {
    const s = prev.summary;
    const emp = prev.employee;
    setPerDay(s.per_day_rate);
    setPerHourOt(s.per_hour_ot_rate);
    setExpectedHours(s.expected_hours_per_day);
    setDaysPresent(s.days_present);
    setDaysLate(s.days_late);
    setDaysHalf(s.days_half);
    setDaysLeave(s.days_leave);
    setDaysAbsent(s.days_absent);
    setHolidayWorkDays(s.holiday_work_days);
    setOtHours(s.ot_hours);
    setRegularPay(s.regular_pay);
    setOtPay(s.ot_pay);
    setHolidayPay(s.holiday_pay);
    setLeavePay(s.leave_pay);
    setBasicForEpf(emp.basic_salary);
    setEpfEmployeePct(emp.epf_emp_per);
    setEpfCompanyPct(emp.epf_com_per);
    setEtfCompanyPct(emp.etf_com_per);
    setAllowances([]);
    setDeductions([]);
    setNotes('');
  };

  const applyVoucherToForm = (v) => {
    setPerDay(v.per_day_rate_used);
    setPerHourOt(v.per_hour_ot_rate_used);
    setExpectedHours(v.expected_hours_per_day);
    setDaysPresent(v.days_present);
    setDaysLate(v.days_late);
    setDaysHalf(v.days_half);
    setDaysLeave(v.days_leave);
    setDaysAbsent(v.days_absent);
    setHolidayWorkDays(v.holiday_work_days);
    setOtHours(v.ot_hours);
    setRegularPay(v.regular_pay);
    setOtPay(v.ot_pay);
    setHolidayPay(v.holiday_pay);
    setLeavePay(v.leave_pay);
    setBasicForEpf(v.basic_for_epf);
    setEpfEmployeePct(v.epf_employee_pct);
    setEpfCompanyPct(v.epf_company_pct);
    setEtfCompanyPct(v.etf_company_pct);
    setAllowances((v.allowances || []).map((a) => ({ ...a, tmpId: Math.random() })));
    setDeductions((v.deductions || []).map((d) => ({ ...d, tmpId: Math.random() })));
    setNotes(v.notes || '');
  };

  // Live totals (mirrors backend _recompute_totals)
  const totals = useMemo(() => {
    const reg = Number(regularPay || 0);
    const ot = Number(otPay || 0);
    const hol = Number(holidayPay || 0);
    const lv = Number(leavePay || 0);
    const alw = allowances.reduce((s, r) => s + Number(r.amount || 0), 0);
    const ded = deductions.reduce((s, r) => s + Number(r.amount || 0), 0);
    const gross = reg + ot + hol + lv + alw;
    const base = Number(basicForEpf || 0);
    const epfEmp = base * Number(epfEmployeePct || 0) / 100;
    const epfCom = base * Number(epfCompanyPct || 0) / 100;
    const etfCom = base * Number(etfCompanyPct || 0) / 100;
    const net = gross - ded - epfEmp;
    return { reg, ot, hol, lv, alw, ded, gross, epfEmp, epfCom, etfCom, net };
  }, [regularPay, otPay, holidayPay, leavePay, allowances, deductions, basicForEpf, epfEmployeePct, epfCompanyPct, etfCompanyPct]);

  // Actions
  const addAllowance = () => setAllowances((p) => [...p, { tmpId: Math.random(), label: '', amount: 0 }]);
  const editAllowance = (i, f, v) => setAllowances((p) => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const removeAllowance = (i) => setAllowances((p) => p.filter((_, idx) => idx !== i));
  const addDeduction = () => setDeductions((p) => [...p, { tmpId: Math.random(), label: '', amount: 0 }]);
  const editDeduction = (i, f, v) => setDeductions((p) => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const removeDeduction = (i) => setDeductions((p) => p.filter((_, idx) => idx !== i));

  const buildPayload = () => ({
    per_day_rate_used: perDay,
    per_hour_ot_rate_used: perHourOt,
    expected_hours_per_day: expectedHours,
    days_present: daysPresent,
    days_late: daysLate,
    days_half: daysHalf,
    days_leave: daysLeave,
    days_absent: daysAbsent,
    holiday_work_days: holidayWorkDays,
    ot_hours: otHours,
    regular_pay: regularPay,
    ot_pay: otPay,
    holiday_pay: holidayPay,
    leave_pay: leavePay,
    basic_for_epf: basicForEpf,
    epf_employee_pct: epfEmployeePct,
    epf_company_pct: epfCompanyPct,
    etf_company_pct: etfCompanyPct,
    notes,
    allowances: allowances.map((a) => ({ label: a.label || 'Allowance', amount: Number(a.amount || 0) })),
    deductions: deductions.map((d) => ({ label: d.label || 'Deduction', amount: Number(d.amount || 0) })),
  });

  const saveDraft = async () => {
    setSaving(true); setError('');
    try {
      let id = voucher?.id;
      if (!id) {
        // Create voucher first
        const res = await api.post('/calculation/vouchers/', {
          employee_id: employeeId, period_start: periodStart, period_end: periodEnd,
        });
        id = res.data.id;
      }
      const r = await api.patch(`/calculation/vouchers/${id}/`, buildPayload());
      setVoucher(r.data);
      applyVoucherToForm(r.data);
      setToast({ open: true, severity: 'success', message: 'Draft saved.' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save draft.');
    } finally { setSaving(false); }
  };

  const lock = async () => {
    if (!voucher) { setError('Save a draft first.'); return; }
    if (!window.confirm('Lock this voucher? It becomes read-only. Only admins can unlock later.')) return;
    setSaving(true); setError('');
    try {
      const r = await api.post(`/calculation/vouchers/${voucher.id}/lock/`);
      setVoucher(r.data);
      applyVoucherToForm(r.data);
      setToast({ open: true, severity: 'success', message: 'Voucher locked.' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to lock.');
    } finally { setSaving(false); }
  };

  const unlock = async () => {
    if (!isAdmin) return;
    if (!window.confirm('Unlock this voucher?')) return;
    setSaving(true); setError('');
    try {
      const r = await api.post(`/calculation/vouchers/${voucher.id}/unlock/`);
      setVoucher(r.data);
      applyVoucherToForm(r.data);
      setToast({ open: true, severity: 'info', message: 'Voucher unlocked.' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unlock.');
    } finally { setSaving(false); }
  };

  const refreshFromAttendance = () => {
    if (preview && salary && !locked) {
      applyPreviewToForm(preview, salary);
      setToast({ open: true, severity: 'info', message: 'Reloaded numbers from attendance.' });
    }
  };

  const emp = preview?.employee;

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate('/admin/payroll')}><ArrowBackIcon /></IconButton>
        <Typography variant="body2" color="text.secondary">Payroll / Employee Calculation</Typography>
      </Box>

      <PageHeader
        title="Payment Voucher"
        subtitle={voucher ? `Voucher #${voucher.id} · ${voucher.status}` : 'Draft — not yet saved'}
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField label="Period From" type="date" size="small" value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)} disabled={locked}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
            <TextField label="Period To" type="date" size="small" value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)} disabled={locked}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
            <Tooltip title="Reload attendance numbers (overwrites unsaved edits)">
              <span>
                <Button variant="outlined" size="small" onClick={refreshFromAttendance}
                  startIcon={<RestartAltIcon />} disabled={locked || loading}>
                  Recompute
                </Button>
              </span>
            </Tooltip>
            {locked ? (
              isAdmin && (
                <Button variant="contained" color="warning" size="small" onClick={unlock}
                  disabled={saving} startIcon={<LockOpenOutlinedIcon />}>
                  Unlock
                </Button>
              )
            ) : (
              <>
                <Button variant="outlined" size="small" onClick={saveDraft}
                  disabled={saving} startIcon={saving ? <CircularProgress size={14} /> : <SaveOutlinedIcon />}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </Button>
                <Button variant="contained" size="small" onClick={lock}
                  disabled={saving || !voucher} startIcon={<LockOutlinedIcon />}>
                  Generate &amp; Lock
                </Button>
              </>
            )}
          </Box>
        }
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : emp && (
        <>
          {/* Employee header */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Avatar
                src={emp.reference_photo ? `${BASE_URL}${emp.reference_photo}` : undefined}
                sx={{ width: 64, height: 64, bgcolor: pickAvatarColor(emp.fullname), fontWeight: 700, fontSize: '1.3rem' }}
              >
                {getInitials(emp.fullname)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h5" fontWeight={700} noWrap>{emp.fullname}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {emp.empcode || `#${emp.employee_id}`}{emp.idnumber ? ` · NIC ${emp.idnumber}` : ''}{emp.phone_number ? ` · ${emp.phone_number}` : ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.8, flexWrap: 'wrap' }}>
                  {emp.primary_outlet_name && (
                    <Chip size="small" color="primary" label={`Primary: ${emp.primary_outlet_name}`} />
                  )}
                  {emp.outlets.filter((o) => o.id !== emp.primary_outlet_id).map((o) => (
                    <Chip key={o.id} size="small" variant="outlined" label={o.name} />
                  ))}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Basic (master record)</Typography>
                <Typography variant="h6" fontWeight={700}>{fmt(emp.basic_salary)}</Typography>
                <Typography variant="caption" color="text.disabled">
                  EPF {emp.epf_emp_per}% / Co {emp.epf_com_per}% · ETF {emp.etf_com_per}%
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Rates */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Rates</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}><MoneyField label="Per-day salary" value={perDay} onChange={setPerDay} disabled={locked} /></Grid>
              <Grid item xs={12} sm={4}><MoneyField label="Per-hour OT rate" value={perHourOt} onChange={setPerHourOt} disabled={locked} /></Grid>
              <Grid item xs={12} sm={4}><MoneyField label="Expected hours/day" value={expectedHours} onChange={setExpectedHours} disabled={locked} /></Grid>
            </Grid>
          </Paper>

          {/* Attendance counts + pay breakdown */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Attendance · Pay</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><MoneyField label="Present" value={daysPresent} onChange={setDaysPresent} disabled={locked} /></Grid>
              <Grid item xs={6} sm={3}><MoneyField label="Late" value={daysLate} onChange={setDaysLate} disabled={locked} /></Grid>
              <Grid item xs={6} sm={3}><MoneyField label="Half Day" value={daysHalf} onChange={setDaysHalf} disabled={locked} /></Grid>
              <Grid item xs={6} sm={3}><MoneyField label="Leave" value={daysLeave} onChange={setDaysLeave} disabled={locked} /></Grid>
              <Grid item xs={6} sm={3}><MoneyField label="Absent" value={daysAbsent} onChange={setDaysAbsent} disabled={locked} /></Grid>
              <Grid item xs={6} sm={3}><MoneyField label="Holiday worked" value={holidayWorkDays} onChange={setHolidayWorkDays} disabled={locked} /></Grid>
              <Grid item xs={6} sm={3}><MoneyField label="OT hours" value={otHours} onChange={setOtHours} disabled={locked} /></Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}><MoneyField label="Regular Pay" value={regularPay} onChange={setRegularPay} disabled={locked} /></Grid>
              <Grid item xs={12} sm={3}><MoneyField label="OT Pay" value={otPay} onChange={setOtPay} disabled={locked} /></Grid>
              <Grid item xs={12} sm={3}><MoneyField label="Holiday Pay" value={holidayPay} onChange={setHolidayPay} disabled={locked} /></Grid>
              <Grid item xs={12} sm={3}><MoneyField label="Leave Pay" value={leavePay} onChange={setLeavePay} disabled={locked} /></Grid>
            </Grid>
          </Paper>

          {/* Allowances */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="overline" color="text.secondary">Allowances</Typography>
              {!locked && (
                <Button size="small" startIcon={<AddIcon />} onClick={addAllowance} sx={{ ml: 'auto' }}>
                  Add Allowance
                </Button>
              )}
            </Box>
            {allowances.length === 0 && <Typography variant="caption" color="text.disabled">No allowances added.</Typography>}
            {allowances.map((a, i) => (
              <Box key={a.id || a.tmpId} sx={{ display: 'flex', gap: 1.5, mb: 1, alignItems: 'center' }}>
                <TextField size="small" label="Label" value={a.label}
                  onChange={(e) => editAllowance(i, 'label', e.target.value)} disabled={locked} sx={{ flex: 1 }} />
                <TextField size="small" label="Amount" type="number" value={a.amount}
                  onChange={(e) => editAllowance(i, 'amount', e.target.value)} disabled={locked}
                  inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }} sx={{ width: 180 }} />
                {!locked && (
                  <IconButton color="error" onClick={() => removeAllowance(i)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </Box>
            ))}
          </Paper>

          {/* Deductions */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="overline" color="text.secondary">Deductions</Typography>
              {!locked && (
                <Button size="small" startIcon={<AddIcon />} onClick={addDeduction} sx={{ ml: 'auto' }}>
                  Add Deduction
                </Button>
              )}
            </Box>
            {deductions.length === 0 && <Typography variant="caption" color="text.disabled">No deductions added.</Typography>}
            {deductions.map((d, i) => (
              <Box key={d.id || d.tmpId} sx={{ display: 'flex', gap: 1.5, mb: 1, alignItems: 'center' }}>
                <TextField size="small" label="Label" value={d.label}
                  onChange={(e) => editDeduction(i, 'label', e.target.value)} disabled={locked} sx={{ flex: 1 }} />
                <TextField size="small" label="Amount" type="number" value={d.amount}
                  onChange={(e) => editDeduction(i, 'amount', e.target.value)} disabled={locked}
                  inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }} sx={{ width: 180 }} />
                {!locked && (
                  <IconButton color="error" onClick={() => removeDeduction(i)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </Box>
            ))}
          </Paper>

          {/* EPF / ETF */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>EPF / ETF</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}><MoneyField label="Basic for EPF" value={basicForEpf} onChange={setBasicForEpf} disabled={locked} /></Grid>
              <Grid item xs={6} sm={3}><MoneyField label="EPF Employee %" value={epfEmployeePct} onChange={setEpfEmployeePct} disabled={locked} /></Grid>
              <Grid item xs={6} sm={3}><MoneyField label="EPF Company %" value={epfCompanyPct} onChange={setEpfCompanyPct} disabled={locked} /></Grid>
              <Grid item xs={12} sm={3}><MoneyField label="ETF Company %" value={etfCompanyPct} onChange={setEtfCompanyPct} disabled={locked} /></Grid>
            </Grid>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">EPF deducted from salary</Typography>
                <Typography variant="h6" fontWeight={700}>{fmt(totals.epfEmp)}</Typography>
              </Box>
              <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">EPF company contribution</Typography>
                <Typography variant="h6" fontWeight={700}>{fmt(totals.epfCom)}</Typography>
              </Box>
              <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">ETF company contribution</Typography>
                <Typography variant="h6" fontWeight={700}>{fmt(totals.etfCom)}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Totals panel */}
          <Paper sx={{ p: 2.5, borderRadius: 2.5, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="overline" sx={{ opacity: 0.8 }}>Payment Summary</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mt: 1 }}>
              <Box><Typography variant="caption">Regular</Typography><Typography fontWeight={700}>{fmt(totals.reg)}</Typography></Box>
              <Box><Typography variant="caption">OT</Typography><Typography fontWeight={700}>{fmt(totals.ot)}</Typography></Box>
              <Box><Typography variant="caption">Holiday</Typography><Typography fontWeight={700}>{fmt(totals.hol)}</Typography></Box>
              <Box><Typography variant="caption">Leave</Typography><Typography fontWeight={700}>{fmt(totals.lv)}</Typography></Box>
              <Box><Typography variant="caption">Allowances</Typography><Typography fontWeight={700}>+{fmt(totals.alw)}</Typography></Box>
              <Box><Typography variant="caption">Gross</Typography><Typography fontWeight={700}>{fmt(totals.gross)}</Typography></Box>
              <Box><Typography variant="caption">Deductions</Typography><Typography fontWeight={700}>-{fmt(totals.ded)}</Typography></Box>
              <Box><Typography variant="caption">EPF (employee)</Typography><Typography fontWeight={700}>-{fmt(totals.epfEmp)}</Typography></Box>
            </Box>
            <Divider sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="overline" sx={{ opacity: 0.85 }}>Net Pay</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ ml: 'auto' }}>{fmt(totals.net)}</Typography>
            </Box>
          </Paper>

          {/* Notes */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <TextField
              label="Notes" fullWidth multiline minRows={2}
              value={notes} onChange={(e) => setNotes(e.target.value)}
              disabled={locked}
            />
          </Paper>

          {voucher?.locked_by_name && (
            <Alert severity="info" icon={<LockOutlinedIcon fontSize="inherit" />}>
              Locked by <strong>{voucher.locked_by_name}</strong> on {voucher.locked_at ? new Date(voucher.locked_at).toLocaleString() : ''}.
            </Alert>
          )}
        </>
      )}

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