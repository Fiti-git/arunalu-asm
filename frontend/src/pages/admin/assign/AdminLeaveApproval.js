import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import { PageHeader } from 'components/ui';
import LeaveApprovalTab from './leave/LeaveApprovalTab';
import LeaveAddTab from './leave/LeaveAddTab';
import LeaveRemoveTab from './leave/LeaveRemoveTab';

export default function AdminLeaveApproval() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ width: '95%', mx: 'auto', mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Leave Management"
        subtitle="Approve requests, add leaves for employees, or remove mistaken records"
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab
            label="Leave Approvals"
            icon={<FactCheckOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label="Leave Adding"
            icon={<AddCircleOutlineIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label="Leave Record Remove"
            icon={<DeleteSweepOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <Box hidden={tab !== 0}>{tab === 0 && <LeaveApprovalTab />}</Box>
      <Box hidden={tab !== 1}>{tab === 1 && <LeaveAddTab />}</Box>
      <Box hidden={tab !== 2}>{tab === 2 && <LeaveRemoveTab />}</Box>
    </Box>
  );
}