import React from "react";
import { Card, CardContent, Box, Typography, Avatar } from "@mui/material";
import { alpha } from "@mui/material/styles";

function StatCard({ label, value, icon, color = "primary", trend, sx }) {
  return (
    <Card sx={{ height: "100%", ...sx }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
        {icon && (
          <Avatar
            variant="rounded"
            sx={(theme) => {
              const paletteColor = theme.palette[color] || theme.palette.primary;
              return {
                bgcolor: alpha(paletteColor.main, 0.12),
                color: paletteColor.main,
                width: 48,
                height: 48,
                borderRadius: 2,
              };
            }}
          >
            {icon}
          </Avatar>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: "block" }}>
            {label}
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.5, lineHeight: 1.1 }} noWrap>
            {value}
          </Typography>
          {trend && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {trend}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default StatCard;
