import React from "react";
import { InputBase, Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  fullWidth = false,
  sx,
  inputProps,
}) {
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        minWidth: fullWidth ? "auto" : 240,
        width: fullWidth ? "100%" : "auto",
        transition: "border-color 120ms, box-shadow 120ms",
        "&:hover": { borderColor: theme.palette.grey[400] },
        "&:focus-within": {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 0 0 3px ${theme.palette.action.focus}`,
        },
        ...sx,
      })}
    >
      <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
      <InputBase
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        sx={{ flex: 1, fontSize: "0.875rem" }}
        inputProps={inputProps}
      />
    </Box>
  );
}

export default SearchInput;
