import React from "react";
import { Box, Typography } from "@mui/material";

function SectionLabel({ icon, children, sx }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, my: 2, ...sx }}>
      {icon && (
        <Box
          sx={{
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            "& > *": { fontSize: 18 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="overline" color="text.secondary">
        {children}
      </Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
    </Box>
  );
}

export default SectionLabel;
