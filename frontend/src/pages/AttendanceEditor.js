import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import { PageHeader } from 'components/ui';
import AttendanceHistoryTab from './admin/attendance/AttendanceHistoryTab';
import AttendanceAddTab from './admin/attendance/AttendanceAddTab';
import AttendanceModifyTab from './admin/attendance/AttendanceModifyTab';

export default function AttendanceEditor() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Attendance Management"
        subtitle="Review history, add manual entries, or modify records for your outlets"
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Attendance History" icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Manual Adding" icon={<AddCircleOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Modification" icon={<EditNoteOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box hidden={tab !== 0}>{tab === 0 && <AttendanceHistoryTab />}</Box>
      <Box hidden={tab !== 1}>{tab === 1 && <AttendanceAddTab />}</Box>
      <Box hidden={tab !== 2}>{tab === 2 && <AttendanceModifyTab />}</Box>
    </Box>
  );
}