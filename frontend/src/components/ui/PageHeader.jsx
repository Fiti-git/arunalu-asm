import React from "react";
import { Box, Typography, Stack } from "@mui/material";

function PageHeader({ title, subtitle, actions, sx }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
        mb: 3,
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h3" sx={{ mb: subtitle ? 0.5 : 0 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions && (
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
        >
          {actions}
        </Stack>
      )}
    </Box>
  );
}

export default PageHeader;
