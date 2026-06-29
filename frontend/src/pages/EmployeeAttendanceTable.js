import React, { useMemo, useState } from "react";
import { Box, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { DataTable, applyClientFilters, exportRowsToCsv } from "components/ui";

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

        return new Intl.DateTimeFormat('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        }).format(date);

    } catch (e) {
        return "";
    }
};

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

                if (noteType === 'manual_bulk_add') {
                    part = `MANUAL ADD (User: ${noteDetails.updated_by} @ ${formattedTime})`;
                } else if (noteType === 'checkin_update') {
                    const originalTime = formatTime(noteDetails.Original_check_in_time);
                    const newTime = formatTime(noteDetails.check_in_time);
                    part = `CHECK-IN UPDATE (User: ${noteDetails.updated_by} @ ${formattedTime} | Original: ${originalTime}, New: ${newTime})`;
                } else if (noteType === 'checkout_update') {
                    const originalTime = formatTime(noteDetails.Original_check_out_time);
                    const newTime = formatTime(noteDetails.check_out_time);
                    part = `CHECK-OUT UPDATE (User: ${noteDetails.updated_by} @ ${formattedTime} | Original: ${originalTime}, New: ${newTime})`;
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
      const empCode = username || empData.employee_details?.fullname || "";
      const userFirstName = [username, fullname, firstName].filter(Boolean).join(" · ");

      const dailyRows = (empData.daily_report || []).map((day, index) => {
        const checkIn = formatTime(day.check_in_time);
        const checkOut = formatTime(day.check_out_time);
        const verificationNotes = processVerificationNotes(day.verification_notes);

        const rowId = `day-${empIndex}-${employeeId}-${index}-${day.work_date}`;
        const workDateFormatted = formatDateTime(day.work_date);

        let rowType = "blank";
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
          workDate: workDateFormatted,
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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState({ key: '', dir: 'asc' });

  const columns = useMemo(() => [
    { key: 'employeeId', label: 'ID', width: 80, sortKey: 'employeeId', filterKey: 'f_id', filterType: 'text', render: (r) => r.employeeId },
    { key: 'userFirstName', label: 'User Name', width: 160, sortKey: 'userFirstName', filterKey: 'f_user', filterType: 'text', render: (r) => r.userFirstName },
    { key: 'empCode', label: 'EMP Code', width: 110, sortKey: 'empCode', filterKey: 'f_empcode', filterType: 'text', render: (r) => r.empCode },
    { key: 'workDate', label: 'Date', width: 110, sortKey: 'workDate', render: (r) => r.workDate },
    { key: 'checkInTime', label: 'In', width: 90, render: (r) => r.checkInTime },
    { key: 'checkOutTime', label: 'Out', width: 90, render: (r) => r.checkOutTime },
    { key: 'workedHours', label: 'Hrs', width: 80, align: 'center', render: (r) => r.workedHours },
    { key: 'attendanceStatus', label: 'Status', width: 120, sortKey: 'attendanceStatus', filterKey: 'f_status', filterType: 'text', render: (r) => r.attendanceStatus },
    {
      key: 'verificationNotes', label: 'Verification Notes (Audit Details)', width: 450,
      render: (r) => (
        <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
          {r.verificationNotes || '-'}
        </div>
      ),
    },
    { key: 'leaveRemarks', label: 'Leave Remarks', width: 150, render: (r) => r.leaveRemarks },
    { key: 'leaveDate', label: 'Leave Date', width: 110, render: (r) => r.leaveDate },
    { key: 'leaveTypeId', label: 'L. Type ID', width: 100, render: (r) => r.leaveTypeId },
    { key: 'attendanceType', label: 'L. Code', width: 100, render: (r) => r.attendanceType },
    { key: 'attendanceTypeName', label: 'L. Name', width: 150, render: (r) => r.attendanceTypeName },
  ], []);

  const filteredRows = useMemo(
    () => applyClientFilters(rows, columns, columnFilters, sortBy),
    [rows, columns, columnFilters, sortBy]
  );
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize]
  );

  const handleFilterChange = (filterKey, value) => {
    const next = { ...columnFilters, [filterKey]: value };
    if (value === '' || value == null) delete next[filterKey];
    setColumnFilters(next);
    setPage(1);
  };

  const handleDownloadCsv = () => {
    const exportCols = columns.map((c) => ({ key: c.key, label: c.label }));
    exportRowsToCsv(`attendance_detail_${new Date().toISOString().slice(0, 10)}.csv`, exportCols, filteredRows);
  };

  return (
    <div style={{ width: '100%', marginTop: 16 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<DownloadIcon />}
          disabled={filteredRows.length === 0}
          onClick={handleDownloadCsv}
        >
          Download CSV
        </Button>
      </Box>
      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowId={(r) => r.id}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50, 100]}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        filters={columnFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1); }}
        onRowClassName={(row) => {
          if (row.rowType === 'leave') return 'eat-leave-row';
          if (row.rowType === 'attendance') return 'eat-attendance-row';
          return 'eat-blank-row';
        }}
        emptyMessage="No records"
        height={600}
        minHeight={600}
      />
      <style>{`
        .eat-attendance-row td { background-color: #DCFCE7 !important; }
        .eat-attendance-row:hover td { background-color: #BBF7D0 !important; }
        .eat-leave-row td { background-color: #FEF3C7 !important; }
        .eat-leave-row:hover td { background-color: #FDE68A !important; }
        .eat-blank-row td { background-color: #FEE2E2 !important; }
        .eat-blank-row:hover td { background-color: #FECACA !important; }
      `}</style>
    </div>
  );
}
