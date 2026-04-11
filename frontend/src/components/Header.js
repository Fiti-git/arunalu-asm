// src/components/Header.js
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
import { isAuthenticated, logout } from "../utils/auth";

function Header({ onMenuClick, sidebarOpen, isSmall, calculatedSidebarWidth }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());

  useEffect(() => setIsLoggedIn(isAuthenticated()), []);

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    navigate("/");
  };

  const headerLeftPosition = calculatedSidebarWidth;
  const headerWidth = `calc(100% - ${calculatedSidebarWidth}px)`;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: "#ffffff",
        color: "#111",
        height: 72,
        justifyContent: "center",
        borderBottom: "1px solid #e0e0e0",
        zIndex: 1100,
        left: `${headerLeftPosition}px`,
        width: headerWidth,
        transition: "all 0.3s ease-in-out",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 3,
        }}
      >
        {/* --- Left: Sidebar Toggle --- */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={onMenuClick}
            color="inherit"
            sx={{
              backgroundColor: "#f7f7f7",
              "&:hover": { backgroundColor: "#eee" },
              borderRadius: "10px",
              p: 1,
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* --- Center: Brand Name --- */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            letterSpacing: 1,
            color: "#222",
            fontFamily: "Inter, sans-serif",
          }}
        >
          ARUNALU
        </Typography>

        {/* --- Right: User Controls --- */}
        {isLoggedIn ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* Profile Avatar (placeholder or future image) */}
            <Avatar
              alt="User Avatar"
              src="/logo.png"
              sx={{
                width: 40,
                height: 40,
                cursor: "pointer",
              }}
            />

            <Divider orientation="vertical" flexItem />

            {/* Logout Icon */}
            <Tooltip title="Logout" arrow>
              <IconButton
                onClick={handleLogout}
                sx={{
                
                  
                  color: "#ff0000ff",
                  "&:hover": {
                    backgroundColor: "#fff3cd",
                    transform: "scale(1.1)",
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
