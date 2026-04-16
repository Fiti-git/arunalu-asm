import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import WatchLaterOutlinedIcon from '@mui/icons-material/WatchLaterOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import { alpha } from '@mui/material/styles';
import { PageHeader } from 'components/ui';
import { getUserRole } from 'utils/auth';

const reports = [
  { slug: 'monthly-sheet', title: 'Monthly Attendance Sheet',
    desc: 'Payroll-style grid: employees × days. P/A/L/H codes per cell.', icon: <GridOnOutlinedIcon />, tone: 'primary' },
  { slug: 'late-comers', title: 'Late Comers',
    desc: 'Employees ranked by number of late check-ins in the range.', icon: <AccessTimeOutlinedIcon />, tone: 'warning' },
  { slug: 'absenteeism', title: 'Absenteeism',
    desc: 'Employees with absent days above a threshold, with absent rate %.', icon: <EventBusyOutlinedIcon />, tone: 'error' },
  { slug: 'overtime', title: 'Overtime',
    desc: 'Per-employee OT hours + days with OT for the range.', icon: <WatchLaterOutlinedIcon />, tone: 'info' },
  { slug: 'modification-audit', title: 'Attendance Modification Audit',
    desc: 'Full log of attendance edits: who, when, before → after, reason.', icon: <HistoryOutlinedIcon />, tone: 'secondary' },
  { slug: 'employee', title: 'Individual Employee Report',
    desc: 'Pick an employee — day-by-day activity, late marks, leaves, totals.', icon: <PersonSearchOutlinedIcon />, tone: 'success' },
  { slug: 'attendance-detail', title: 'Attendance Detail',
    desc: 'Classic per-employee attendance drill-down grouped by outlet.', icon: <AssessmentOutlinedIcon />, tone: 'primary' },
];

export default function ReportsHub() {
  const navigate = useNavigate();
  const role = (getUserRole() || '').toLowerCase();
  const base = role === 'admin' ? '/admin/reports' : '/manager/reports';

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Reports"
        subtitle="Attendance, overtime, and audit reports — scoped to the outlets you can access."
      />

      <Box sx={{
        display: 'grid', gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
      }}>
        {reports.map((r) => (
          <Box
            key={r.slug}
            onClick={() => navigate(`${base}/${r.slug}`)}
            sx={{
              cursor: 'pointer',
              bgcolor: 'background.paper',
              border: 1, borderColor: 'divider', borderRadius: 2.5,
              p: 2.5,
              transition: 'all 0.18s',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)',
                borderColor: (theme) => theme.palette[r.tone]?.main || theme.palette.primary.main,
              },
            }}
          >
            <Avatar
              variant="rounded"
              sx={(theme) => ({
                bgcolor: alpha(theme.palette[r.tone]?.main || theme.palette.primary.main, 0.12),
                color: theme.palette[r.tone]?.main || theme.palette.primary.main,
                width: 48, height: 48, mb: 1.5, borderRadius: 2,
              })}
            >
              {r.icon}
            </Avatar>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.3 }}>{r.title}</Typography>
            <Typography variant="body2" color="text.secondary">{r.desc}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}