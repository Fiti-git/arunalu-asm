import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { NavLink } from "react-router-dom";
import { getUserRole } from "../utils/auth";
import { SIDEBAR_WIDTH_OPEN, SIDEBAR_WIDTH_COLLAPSED } from "../theme/tokens";

// Icons
import GroupIcon from "@mui/icons-material/Group";
import StoreIcon from "@mui/icons-material/Store";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import TaskIcon from "@mui/icons-material/Task";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import BackupIcon from "@mui/icons-material/Backup";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import LockClockIcon from "@mui/icons-material/LockClock";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import FingerprintOutlinedIcon from "@mui/icons-material/FingerprintOutlined";

function Sidebar({ sidebarOpen, onClose }) {
  const role = getUserRole() || "";
  const normalizedRole =
    role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  const navItems = [
    // MAIN
    {
      text: "Dashboard",
      path: normalizedRole === "Admin" ? "/admin/reports/outlet-summary" : "/manager/dashboard",
      roles: ["Admin", "Manager"],
      icon: <AnalyticsIcon />,
      group: "Overview",
    },

    // ADMIN - MANAGEMENT
    {
      text: "Employees",
      path: "/admin/employees/editor",
      roles: ["Admin"],
      icon: <GroupIcon />,
      group: "Management",
    },
    {
      text: "User Status",
      path: "/admin/employees/status",
      roles: ["Admin"],
      icon: <ToggleOnIcon />,
      group: "Management",
    },
    {
      text: "Outlets",
      path: "/admin/outlets",
      roles: ["Admin"],
      icon: <StoreIcon />,
      group: "Management",
    },
    {
      text: "Leave & Holidays",
      path: "/admin/create/leave",
      roles: ["Admin"],
      icon: <EditCalendarIcon />,
      group: "Management",
    },

    // ADMIN - OPERATIONS
    {
      text: "Leave Management",
      path: "/admin/assign/leave",
      roles: ["Admin"],
      icon: <WorkHistoryIcon />,
      group: "Operations",
    },
    {
      text: "Attendance Management",
      path: "/admin/attendance",
      roles: ["Admin"],
      icon: <TaskIcon />,
      group: "Operations",
    },
    {
      text: "Attendance Locks",
      path: "/admin/attendance-locks",
      roles: ["Admin"],
      icon: <LockClockIcon />,
      group: "Operations",
    },

    // ADMIN - REPORTS
    {
      text: "Reports",
      path: "/admin/reports",
      roles: ["Admin"],
      icon: <QueryStatsIcon />,
      group: "Reports",
    },
    {
      text: "Attendance Detail",
      path: "/admin/reports/attendance-detail",
      roles: ["Admin"],
      icon: <AssessmentOutlinedIcon />,
      group: "Reports",
    },
    {
      text: "Payroll",
      path: "/admin/payroll",
      roles: ["Admin"],
      icon: <CalculateOutlinedIcon />,
      group: "Payroll",
    },
    {
      text: "Fingerprint Import",
      path: "/admin/fingerprint",
      roles: ["Admin"],
      icon: <FingerprintOutlinedIcon />,
      group: "Payroll",
    },

    // MANAGER - MANAGEMENT
    {
      text: "Employees",
      path: "/manager/employees",
      roles: ["Manager"],
      icon: <ManageAccountsIcon />,
      group: "Management",
    },
    {
      text: "Leave Management",
      path: "/manager/leave-approval",
      roles: ["Manager"],
      icon: <FactCheckIcon />,
      group: "Management",
    },
    {
      text: "Attendance Management",
      path: "/manager/attendance-editor",
      roles: ["Manager"],
      icon: <TaskIcon />,
      group: "Management",
    },

    // MANAGER - REPORTS
    {
      text: "Reports",
      path: "/manager/reports",
      roles: ["Manager"],
      icon: <QueryStatsIcon />,
      group: "Reports",
    },
    {
      text: "Attendance Detail",
      path: "/manager/reports/attendance-detail",
      roles: ["Manager"],
      icon: <AssessmentOutlinedIcon />,
      group: "Reports",
    },
    {
      text: "Employee Report",
      path: "/manager/reports/employee",
      roles: ["Manager"],
      icon: <PersonSearchOutlinedIcon />,
      group: "Reports",
    },
    {
      text: "Fingerprint Import",
      path: "/manager/fingerprint",
      roles: ["Manager"],
      icon: <FingerprintOutlinedIcon />,
      group: "Operations",
    },

    // MANAGER - SYSTEM
    {
      text: "Database Backup",
      path: "/manager/database-backup",
      roles: ["Manager"],
      icon: <BackupIcon />,
      group: "System",
    },
  ];

  const groupedNav = navItems.reduce((acc, item) => {
    if (item.roles.includes(normalizedRole)) {
      acc[item.group] = acc[item.group] || [];
      acc[item.group].push(item);
    }
    return acc;
  }, {});

  return (
    <Box
      sx={{
        width: sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_COLLAPSED,
        height: "100vh",
        pt: 10,
        bgcolor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        transition: "width 0.3s ease-in-out",
        overflowY: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        // Echoes the header's gold accent bar — thin vertical gold strip on the far right
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 2,
          backgroundImage: (theme) =>
            `linear-gradient(180deg, ${theme.palette.secondary.light} 0%, ${theme.palette.secondary.main} 50%, ${theme.palette.secondary.dark} 100%)`,
          opacity: 0.6,
          pointerEvents: "none",
        },
      }}
    >
      {Object.entries(groupedNav).map(([group, items], gi) => (
        <Box key={group} sx={{ pb: 1 }}>
          {sidebarOpen ? (
            <Box sx={{ px: 2.25, pt: gi === 0 ? 0.5 : 1.75, pb: 0.75 }}>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "secondary.dark",
                }}
              >
                {group}
              </Typography>
            </Box>
          ) : (
            gi > 0 && (
              <Box sx={{
                mx: 1.5, my: 0.75, height: 1,
                bgcolor: 'divider',
              }} />
            )
          )}

          <List sx={{ px: 1, py: 0 }} disablePadding>
            {items.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                <Tooltip title={!sidebarOpen ? item.text : ""} placement="right" arrow>
                  <ListItemButton
                    component={NavLink}
                    to={item.path}
                    onClick={onClose}
                    sx={{
                      position: 'relative',
                      borderRadius: 2,
                      px: sidebarOpen ? 1.75 : 1,
                      py: 1,
                      justifyContent: sidebarOpen ? "flex-start" : "center",
                      color: 'text.primary',
                      transition: 'background-color 0.15s, color 0.15s',
                      '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                      },
                      '& .MuiTypography-root': { fontWeight: 500 },
                      '&.active': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                        '& .MuiTypography-root': { fontWeight: 700 },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 6,
                          bottom: 6,
                          width: 3,
                          borderRadius: 4,
                          backgroundColor: (theme) => theme.palette.secondary.main,
                        },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        minWidth: 0, display: 'flex', alignItems: 'center',
                        '& svg': { fontSize: 20 },
                      }}
                    >
                      {item.icon}
                    </Box>

                    {sidebarOpen && (
                      <ListItemText
                        primary={item.text}
                        slotProps={{
                          primary: { fontSize: '0.82rem', lineHeight: 1.3 },
                        }}
                        sx={{ ml: 1.75, whiteSpace: "nowrap" }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Box>
      ))}

      {sidebarOpen && (
        <Box sx={{ mt: 'auto', px: 2.5, py: 2, textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontSize: '0.65rem',
              color: 'text.disabled',
              letterSpacing: 0.5,
            }}
          >
            ARUNALU · Staff Management
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default Sidebar;