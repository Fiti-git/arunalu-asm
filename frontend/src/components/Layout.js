import React, { useState } from "react";
import { Box, useMediaQuery } from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isSmall = useMediaQuery("(max-width:900px)");

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "100vh",
        overflowX: "hidden", // 🔥 Prevent horizontal scroll globally
        backgroundColor: "#f5f6fa",
      }}
    >
      {/* Sidebar */}
      <Sidebar sidebarOpen={!isSmall && sidebarOpen} />

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          ml: !isSmall ? (sidebarOpen ? "260px" : "70px") : 0,
          transition: "margin-left 0.3s ease-in-out",
          overflowX: "hidden", // ✅ double safeguard
          width: "100%",
          maxWidth: "100vw", // ✅ never exceed viewport width
        }}
      >
        {/* Sticky Header */}
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <Header onMenuClick={toggleSidebar} />
        </Box>

        {/* Main Content Area */}
        <Box
          sx={{
            mt: "72px", // header height
            p: { xs: 2, md: 3 },
            minHeight: "calc(100vh - 72px)",
            overflowX: "hidden", // ✅ content-level safety
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export default Layout;
