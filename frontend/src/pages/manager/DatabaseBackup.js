import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import StorageIcon from "@mui/icons-material/Storage";

const API_BASE = process.env.REACT_APP_API_URL || "http://123.231.60.24:1605";

export default function DatabaseBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE}/api/db-backup/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You do not have permission to download backups.");
        }
        throw new Error(`Backup failed (status ${response.status}).`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "aas_backup.sql";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      setError(err.message || "An error occurred while generating the backup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 1.5 }}>
        <StorageIcon sx={{ fontSize: 32, color: "#e6b904" }} />
        <Typography variant="h5" fontWeight={700}>
          Database Backup
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Download a complete backup of the AAS database as a <strong>.sql</strong> file.
          This includes all employee records, attendance data, leave records, and system configuration.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Store the backup file in a secure location. It can be used to restore the database if needed.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Backup downloaded successfully.
          </Alert>
        )}

        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
          onClick={handleDownload}
          disabled={loading}
          sx={{
            backgroundColor: "#e6b904",
            color: "#000",
            fontWeight: 700,
            "&:hover": { backgroundColor: "#c9a200" },
          }}
        >
          {loading ? "Generating Backup…" : "Download Backup"}
        </Button>
      </Paper>
    </Box>
  );
}
