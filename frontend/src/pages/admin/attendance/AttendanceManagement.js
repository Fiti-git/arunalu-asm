import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { PageHeader } from 'components/ui';
import { getUserRole } from 'utils/auth';
import AttendanceHistoryTab from './AttendanceHistoryTab';
import AttendanceAddTab from './AttendanceAddTab';
import AttendanceModifyTab from './AttendanceModifyTab';
import AttendanceRemoveTab from './AttendanceRemoveTab';
import AttendanceApprovalsTab from './AttendanceApprovalsTab';

export default function AttendanceManagement() {
  const [tab, setTab] = useState(0);
  const isAdmin = (getUserRole() || '').toLowerCase() === 'admin';

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Attendance Management"
        subtitle="Review history, add manual entries, modify records, or delete mistakes"
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Attendance History" icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Manual Adding" icon={<AddCircleOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Modification" icon={<EditNoteOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Record Delete" icon={<DeleteSweepOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          {isAdmin && (
            <Tab label="Edit Approvals" icon={<VerifiedOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          )}
        </Tabs>
      </Box>

      <Box hidden={tab !== 0}>{tab === 0 && <AttendanceHistoryTab />}</Box>
      <Box hidden={tab !== 1}>{tab === 1 && <AttendanceAddTab />}</Box>
      <Box hidden={tab !== 2}>{tab === 2 && <AttendanceModifyTab />}</Box>
      <Box hidden={tab !== 3}>{tab === 3 && <AttendanceRemoveTab />}</Box>
      {isAdmin && <Box hidden={tab !== 4}>{tab === 4 && <AttendanceApprovalsTab />}</Box>}
    </Box>
  );
}