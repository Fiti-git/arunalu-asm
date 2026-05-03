import React, { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

// Helper function to format ISO datetime string to HH:MM time (for check-in/out)
const formatTime = (dateTimeStr) => {
  if (!dateTimeStr) return "";
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);

  } catch (e) {
    return String(dateTimeStr).split('T')[1]?.substring(0, 5) || "";
  }
};

// Helper function to format ISO datetime string to MM/DD/YYYY
const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    try {
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return "";

        // Format to MM/DD/YYYY
        return new Intl.DateTimeFormat('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        }).format(date);

    } catch (e) {
        return "";
    }
};

// Helper function to process verification notes and include ALL audit details
const processVerificationNotes = (notes) => {
    if (!Array.isArray(notes) || notes.length === 0) {
        return "";
    }

    let summaryParts = [];
    
    notes.forEach(noteObj => {
        if (typeof noteObj !== 'object' || noteObj === null) {
            return;
        }

        for (const noteType in noteObj) {
            if (noteObj.hasOwnProperty(noteType)) {
                const noteDetails = noteObj[noteType];
                
                if (!noteDetails || !noteDetails.updated_by) continue;

                const formattedTime = formatDateTime(noteDetails.updated_at);
                let part = "";

                // 1. Manual Bulk Add
                if (noteType === 'manual_bulk_add') {
                    part = `MANUAL ADD (User: ${noteDetails.updated_by} @ ${formattedTime})`;
                    
                // 2. Check-in Update
                } else if (noteType === 'checkin_update') {
                    const originalTime = formatTime(noteDetails.Original_check_in_time);
                    const newTime = formatTime(noteDetails.check_in_time);
                    part = `CHECK-IN UPDATE (User: ${noteDetails.updated_by} @ ${formattedTime} | Original: ${originalTime}, New: ${newTime})`;
                    
                // 3. Check-out Update
                } else if (noteType === 'checkout_update') {
                    const originalTime = formatTime(noteDetails.Original_check_out_time);
                    const newTime = formatTime(noteDetails.check_out_time);
                    part = `CHECK-OUT UPDATE (User: ${noteDetails.updated_by} @ ${formattedTime} | Original: ${originalTime}, New: ${newTime})`;
                    
                // 4. General/Other Note
                } else {
                    const cleanNoteType = noteType.replace(/_/g, ' ');
                    part = `${cleanNoteType.toUpperCase()} (User: ${noteDetails.updated_by} @ ${formattedTime})`;
                }
                
                if (part) {
                    summaryParts.push(part);
                }
            }
        }
    });
    
    return summaryParts.filter(p => p).join(" | ");
};


export default function EmployeeAttendanceTable({ data }) {
  const rows = useMemo(() => {
    if (!data) return [];

    const reports = Array.isArray(data) ? data : [data];

    const allRows = reports.flatMap((empData, empIndex) => {
      const employeeId = empData.employee_details?.employee_id || "";
      const username = empData.employee_details?.username || "";
      const fullname = empData.employee_details?.fullname || "";
      const firstName = empData.employee_details?.user_first_name || "";
      // EMP Code column = auth user's username
      const empCode = username || empData.employee_details?.fullname || "";
      // User Name column = username + existing data (fullname + first_name)
      const userFirstName = [username, fullname, firstName].filter(Boolean).join(" · ");

      const dailyRows = (empData.daily_report || []).map((day, index) => {
        const checkIn = formatTime(day.check_in_time);
        const checkOut = formatTime(day.check_out_time);
        const verificationNotes = processVerificationNotes(day.verification_notes);

        const rowId = `day-${empIndex}-${employeeId}-${index}-${day.work_date}`;

        // Use the updated formatDateTime for workDate
        const workDateFormatted = formatDateTime(day.work_date);

        let rowType = "blank";
        // Check for leave marker first
        const isLeaveDay = !!day.leave_refno || !!day.leave_date;
        const isAttendanceDay = !!day.check_in_time;

        if (isLeaveDay) {
            rowType = "leave";
        } else if (isAttendanceDay) {
            rowType = "attendance";
        }

        return {
          id: rowId,
          employeeId,
          userFirstName,
          empCode,
          workDate: workDateFormatted, // Display MM/DD/YYYY
          checkInTime: checkIn, 
          checkOutTime: checkOut,
          workedHours: day.worked_hours || "",
          attendanceStatus: day.attendance_status || "",
          verificationNotes: verificationNotes,
          leaveDate: day.leave_date || "",
          leaveRemarks: day.leave_remarks || "",
          leaveTypeId: day.leave_type_id || "",
          attendanceType: day.att_type || "",
          attendanceTypeName: day.att_type_name || "",
          rowType: rowType,
        };
      });

      return dailyRows;
    });

    return allRows;
  }, [data]);

  const columns = [
    { field: "employeeId", headerName: "ID", width: 80 }, 
    { field: "userFirstName", headerName: "User Name", width: 140 }, 
    { field: "empCode", headerName: "EMP Code", width: 90 }, 
    { field: "workDate", headerName: "Date", width: 110 },
    { field: "checkInTime", headerName: "In", width: 80 },
    { field: "checkOutTime", headerName: "Out", width: 80 },
    { field: "workedHours", headerName: "Hrs", width: 80 },
    { field: "attendanceStatus", headerName: "Status", width: 120 },
    {
      field: "verificationNotes",
      headerName: "Verification Notes (Audit Details)",
      width: 450,
      renderCell: (params) => (
        <div style={{ whiteSpace: "normal", wordWrap: "break-word", lineHeight: "1.5" }}>
          {params.value || "-"}
        </div>
      ),
    },
    { field: "leaveRemarks", headerName: "Leave Remarks", width: 150 },
    { field: "leaveDate", headerName: "Leave Date", width: 110 },
    { field: "leaveTypeId", headerName: "L. Type ID", width: 100 },
    { field: "attendanceType", headerName: "L. Code", width: 100 },
    { field: "attendanceTypeName", headerName: "L. Name", width: 150 },
  ];

  const handleDownloadCsv = () => {
    const headers = columns.map((c) => c.headerName);
    const fields = columns.map((c) => c.field);
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(esc).join(",")];
    rows.forEach((r) => {
      lines.push(fields.map((f) => esc(r[f])).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_detail_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: "100%", marginTop: 16 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<DownloadIcon />}
          disabled={rows.length === 0}
          onClick={handleDownloadCsv}
        >
          Download CSV
        </Button>
      </Box>
      <div style={{ height: 600, width: "100%" }}>
      <DataGrid
        showToolbar
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10 },
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        getRowId={(row) => row.id}
        disableRowSelectionOnClick
        getRowHeight={() => 'auto'}
        getRowClassName={(params) => {
          if (params.row.rowType === "leave") return "leave-row"; // Leave -> Yellow
          if (params.row.rowType === "attendance") return "attendance-row"; // Present -> Green
          return "blank-row"; // Blank Day -> Red
        }}
        sx={(theme) => ({
          "& .MuiDataGrid-row": {
            maxHeight: 'none !important',
          },
          "& .MuiDataGrid-cell": {
            alignItems: 'start',
            paddingTop: '8px',
            paddingBottom: '8px',
          },
          // Attendance (Present) -> Green
          "& .attendance-row": {
            backgroundColor: theme.palette.success.light,
            "&:hover": { backgroundColor: theme.palette.success.main },
          },
          // Leave -> Yellow
          "& .leave-row": {
            backgroundColor: theme.palette.warning.light,
            "&:hover": { backgroundColor: theme.palette.warning.main },
          },
          // Blank Day -> Red
          "& .blank-row": {
            backgroundColor: theme.palette.error.light,
            "&:hover": { backgroundColor: theme.palette.error.main },
          },
        })}
      />
      </div>
    </div>
  );
}
