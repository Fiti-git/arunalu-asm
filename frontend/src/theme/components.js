import { alpha } from "@mui/material/styles";

const components = {
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      "html, body, #root": {
        height: "100%",
      },
      body: {
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      },
      "*::-webkit-scrollbar": {
        width: 8,
        height: 8,
      },
      "*::-webkit-scrollbar-thumb": {
        backgroundColor: theme.palette.grey[300],
        borderRadius: 8,
      },
      "*::-webkit-scrollbar-thumb:hover": {
        backgroundColor: theme.palette.grey[400],
      },
      "*::-webkit-scrollbar-track": {
        backgroundColor: "transparent",
      },
    }),
  },

  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 10,
        fontWeight: 600,
        textTransform: "none",
        padding: "8px 16px",
      },
      sizeSmall: {
        padding: "6px 12px",
      },
      sizeLarge: {
        padding: "10px 20px",
      },
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },

  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 14,
        border: `1px solid ${theme.palette.divider}`,
        backgroundImage: "none",
      }),
    },
  },

  MuiPaper: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        backgroundImage: "none",
      },
      rounded: {
        borderRadius: 12,
      },
    },
  },

  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 999,
        height: 24,
        fontSize: "0.72rem",
        fontWeight: 600,
      },
      colorSuccess: ({ theme }) => ({
        backgroundColor: theme.palette.success.light,
        color: theme.palette.success.dark,
      }),
      colorWarning: ({ theme }) => ({
        backgroundColor: theme.palette.warning.light,
        color: theme.palette.warning.dark,
      }),
      colorError: ({ theme }) => ({
        backgroundColor: theme.palette.error.light,
        color: theme.palette.error.dark,
      }),
      colorInfo: ({ theme }) => ({
        backgroundColor: theme.palette.info.light,
        color: theme.palette.info.dark,
      }),
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 10,
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.divider,
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.grey[400],
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
          borderWidth: 1,
        },
      }),
    },
  },

  MuiTextField: {
    defaultProps: {
      variant: "outlined",
      size: "small",
    },
  },

  MuiAppBar: {
    defaultProps: {
      elevation: 0,
      color: "inherit",
    },
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: "none",
      }),
    },
  },

  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.divider}`,
      }),
    },
  },

  MuiTableCell: {
    styleOverrides: {
      head: ({ theme }) => ({
        backgroundColor: theme.palette.grey[50],
        color: theme.palette.text.secondary,
        fontWeight: 600,
        fontSize: "0.72rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }),
      body: {
        fontSize: "0.8125rem",
      },
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 8,
        "&.Mui-selected, &.active": {
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
          color: theme.palette.primary.dark,
          fontWeight: 600,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.18),
          },
        },
      }),
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: theme.palette.grey[900],
        borderRadius: 6,
        fontSize: "0.72rem",
        padding: "6px 10px",
      }),
      arrow: ({ theme }) => ({
        color: theme.palette.grey[900],
      }),
    },
  },

  MuiDivider: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderColor: theme.palette.divider,
      }),
    },
  },

  MuiLink: {
    defaultProps: {
      underline: "hover",
    },
  },

  MuiDataGrid: {
    defaultProps: {
      disableRowSelectionOnClick: true,
      rowHeight: 44,
      columnHeaderHeight: 44,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 12,
        backgroundColor: theme.palette.background.paper,
        fontSize: "0.8125rem",
        "--DataGrid-rowBorderColor": theme.palette.divider,
        "--DataGrid-containerBackground": theme.palette.grey[50],
      }),
      columnHeaders: ({ theme }) => ({
        backgroundColor: theme.palette.grey[50],
        borderBottom: `1px solid ${theme.palette.divider}`,
      }),
      columnHeader: ({ theme }) => ({
        "&:focus, &:focus-within": { outline: "none" },
        color: theme.palette.text.secondary,
      }),
      columnHeaderTitle: {
        fontWeight: 600,
        fontSize: "0.72rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      },
      columnSeparator: {
        visibility: "hidden",
      },
      cell: ({ theme }) => ({
        borderBottom: `1px solid ${theme.palette.divider}`,
        "&:focus, &:focus-within": { outline: "none" },
      }),
      row: ({ theme }) => ({
        "&:hover": { backgroundColor: theme.palette.action.hover },
        "&.Mui-selected": {
          backgroundColor: theme.palette.action.selected,
          "&:hover": { backgroundColor: theme.palette.action.selected },
        },
      }),
      footerContainer: ({ theme }) => ({
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.grey[50],
        minHeight: 44,
      }),
      toolbarContainer: ({ theme }) => ({
        padding: theme.spacing(1, 1.5),
        gap: theme.spacing(1),
        borderBottom: `1px solid ${theme.palette.divider}`,
      }),
      overlay: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
      }),
    },
  },
};

export default components;
