import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Tooltip,
  Avatar,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, logout, getUserRole } from "../utils/auth";
import { HEADER_HEIGHT } from "../theme/tokens";

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const role = getUserRole() || "";

  useEffect(() => setIsLoggedIn(isAuthenticated()), []);

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        height: HEADER_HEIGHT,
        justifyContent: "center",
        transition: "all 0.3s ease-in-out",
        // Thin gold accent bar beneath the header to echo the logo's sun rays
        "&::after": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          backgroundImage: (theme) =>
            `linear-gradient(90deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.main} 50%, ${theme.palette.secondary.light} 100%)`,
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 3,
          minHeight: `${HEADER_HEIGHT}px !important`,
        }}
      >
        {/* --- Left: Sidebar Toggle + Brand --- */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={onMenuClick}
            color="inherit"
            sx={{
              bgcolor: "grey.100",
              "&:hover": { bgcolor: "grey.200" },
              borderRadius: 2.5,
              p: 1,
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() =>
              navigate(role === "Admin" ? "/admin/reports/outlet-summary" : "/manager/dashboard")
            }
          >
            <Box
              component="img"
              src="/logo.png"
              alt="Arunalu"
              sx={{
                height: 44,
                width: 44,
                objectFit: "contain",
                borderRadius: 1.5,
                bgcolor: "common.white",
                p: 0.5,
                boxShadow: "0 1px 3px rgba(107, 21, 21, 0.12)",
              }}
            />
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  lineHeight: 1.1,
                  letterSpacing: 2,
                  color: "primary.main",
                }}
              >
                ARUNALU
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "secondary.dark",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  fontSize: "0.65rem",
                }}
              >
                Staff Management
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* --- Right: User Controls --- */}
        {isLoggedIn ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {role && (
              <Box
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  alignItems: "center",
                  px: 1.5,
                  py: 0.4,
                  borderRadius: 999,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {role}
              </Box>
            )}

            <Avatar
              alt="User Avatar"
              sx={{
                width: 40,
                height: 40,
                cursor: "pointer",
                bgcolor: "secondary.main",
                color: "secondary.contrastText",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              {(role || "U").charAt(0).toUpperCase()}
            </Avatar>

            <Divider orientation="vertical" flexItem />

            <Tooltip title="Logout" arrow>
              <IconButton
                onClick={handleLogout}
                sx={{
                  color: "error.main",
                  "&:hover": {
                    transform: "scale(1.08)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <LogoutRoundedIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box />
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Header;