import React, { useState } from "react";
import { Box, useMediaQuery } from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";
import LicenseBanner from "./LicenseBanner";
import {
  SIDEBAR_WIDTH_OPEN,
  SIDEBAR_WIDTH_COLLAPSED,
  HEADER_HEIGHT,
} from "../theme/tokens";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isSmall = useMediaQuery("(max-width:900px)");

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const sidebarWidth = isSmall
    ? 0
    : sidebarOpen
    ? SIDEBAR_WIDTH_OPEN
    : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "100vh",
        overflowX: "hidden",
      }}
    >
      <Sidebar sidebarOpen={!isSmall && sidebarOpen} />

      <Box
        sx={{
          flexGrow: 1,
          ml: `${sidebarWidth}px`,
          transition: "margin-left 0.3s ease-in-out",
          overflowX: "hidden",
          width: "100%",
          maxWidth: "100vw",
        }}
      >
        <Box
          sx={(theme) => ({
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
            overflow: "hidden",
          })}
        >
          <Header onMenuClick={toggleSidebar} />
        </Box>

        <Box
          sx={{
            mt: `${HEADER_HEIGHT}px`,
            p: { xs: 2, md: 3 },
            minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
            overflowX: "hidden",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <LicenseBanner />
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export default Layout;
