import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Paper,
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from 'utils/api';

// Validation schema
const schema = yup.object({
  att_type: yup.string().required('Attendance Type is required'),
  att_type_name: yup.string().required('Name is required'),
  active: yup.boolean().required(),
  att_type_group: yup.string().required('Group is required'),
  att_type_per_day_hours: yup
    .number()
    .typeError('Hours per day must be a number')
    .min(0)
    .required('Hours per day is required'),
  pay_percentage: yup
    .number()
    .typeError('Pay percentage must be a number')
    .min(0)
    .max(100)
    .required('Pay percentage is required'),
  att_type_no_of_days_in_year: yup
    .number()
    .typeError('Number of days must be a number')
    .required('Number of days per year is required'),
  year_start_date: yup.date().required('Start Date is required').typeError('Invalid date'),
  year_end_date: yup.date().required('End Date is required').typeError('Invalid date'),
}).required();

export default function HolidayGrid() {
  const [leaveData, setLeaveData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editHoliday, setEditHoliday] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetching the leave data
  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await api.get('/api/leavetypes/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLeaveData(res.data);
    } catch (err) {
      console.error('Failed to fetch Holidays:', err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []); // Fetch data when component mounts

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues, // <-- Include getValues here
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      att_type: '',
      att_type_name: '',
      active: true,
      att_type_group: '',
      att_type_per_day_hours: '',
      pay_percentage: '',
      att_type_no_of_days_in_year: '',
      year_start_date: null,
      year_end_date: null,
    },
  });

  const openAddDialog = () => {
    setEditHoliday(null);
    reset({
      att_type: '',
      att_type_name: '',
      active: true,
      att_type_group: '',
      att_type_per_day_hours: '',
      pay_percentage: '',
      att_type_no_of_days_in_year: '',
      year_start_date: null,
      year_end_date: null,
    });
    setOpenDialog(true);
  };

  const openEditDialog = (row) => {
    const start = row.year_start_date instanceof Date ? row.year_start_date : new Date(row.year_start_date);
    const end = row.year_end_date instanceof Date ? row.year_end_date : new Date(row.year_end_date);
    setEditHoliday(row);
    reset({ ...row, year_start_date: start, year_end_date: end });
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setEditHoliday(null);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    const token = localStorage.getItem('access_token');

    // Format year_start_date and year_end_date to 'YYYY-MM-DD'
    const formattedData = {
      ...data,
      year_start_date: data.year_start_date ? new Date(data.year_start_date).toISOString().split('T')[0] : '',
      year_end_date: data.year_end_date ? new Date(data.year_end_date).toISOString().split('T')[0] : '',
    };

    try {
      if (editHoliday) {
        // PUT request to update leave type
        await api.put(`/api/leavetypes/${editHoliday.id}/`, formattedData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setLeaveData((prev) =>
          prev.map((item) => (item.id === editHoliday.id ? { ...item, ...formattedData } : item))
        );
        alert('Leave Type Updated Successfully!');
      } else {
        // POST request to create a new leave type
        const response = await api.post('/api/leavetypes/', formattedData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setLeaveData((prev) => [...prev, { id: response.data.id, ...formattedData }]);
        alert('Leave Type Created Successfully!');
      }
    } catch (error) {
      console.error('Error saving leave type:', error);
      alert('Error saving leave type!');
    }
    setLoading(false);
    closeDialog();
  };

  const columns = [
    { field: 'att_type', headerName: 'AttType', width: 100 },
    { field: 'att_type_name', headerName: 'Name', flex: 1, minWidth: 150 },
    {
      field: 'active',
      headerName: 'Active',
      width: 90,
      type: 'boolean',
      valueFormatter: (params) => (params.value ? 'Y' : 'N'),
    },
    {
      field: 'pay_percentage',
      headerName: 'Pay Percent',
      width: 120,
      type: 'number',
    },
    {
      field: 'att_type_no_of_days_in_year',
      headerName: 'Days in Year',
      width: 130,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 90,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Edit">
              <EditIcon />
            </Tooltip>
          }
          label="Edit"
          onClick={() => openEditDialog(params.row)}
          showInMenu={false}
          key="edit"
        />,
      ],
    },
  ];

  // Automatically set `att_type` to the value of `att_type_name`
  useEffect(() => {
    const attTypeName = getValues('att_type_name');
    setValue('att_type', attTypeName); // Automatically set `att_type` to `att_type_name`
  }, [getValues, setValue]);

return (
  <Box
    sx={{
      width: '90%',
      mx: 'auto',
      mt: 5,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      position: 'relative',
      textTransform: 'uppercase',
    }}
  >
    {/* Header Row */}
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          letterSpacing: 0.5,
          color: '#333',
        }}
      >
        Leave Types
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openAddDialog}
        sx={{
          backgroundColor: '#1976d2',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        }}
      >
        Add Attendance Type
      </Button>
    </Box>

    {/* Leave Types Table */}
    <Paper
      elevation={2}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <DataGrid
        rows={leaveData}
        columns={columns}
        pageSize={7}
        rowsPerPageOptions={[5, 7, 10]}
        disableSelectionOnClick
        autoHeight
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f9fafb',
            fontWeight: 600,
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f5f5f5',
          },
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      />
    </Paper>

    {/* Add/Edit Leave Type Dialog */}
    <Dialog
      open={openDialog}
      onClose={closeDialog}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #eee',
        }}
      >
        {editHoliday ? 'Edit Attendance Type' : 'Add Attendance Type'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mt: 1,
          }}
        >
          {/* Attendance Type */}
          <Controller
            name="att_type"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Attendance Type"
                fullWidth
                error={!!errors.att_type}
                helperText={errors.att_type?.message}
                disabled={loading}
              />
            )}
          />

          {/* Name */}
          <Controller
            name="att_type_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Name"
                fullWidth
                error={!!errors.att_type_name}
                helperText={errors.att_type_name?.message}
                disabled={loading}
              />
            )}
          />

          {/* Active Switch */}
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox {...field} checked={field.value} />}
                label="Active"
                disabled={loading}
              />
            )}
          />

          {/* Group */}
          <Controller
            name="att_type_group"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Group"
                fullWidth
                error={!!errors.att_type_group}
                helperText={errors.att_type_group?.message}
                disabled={loading}
              />
            )}
          />

          {/* Hours per day */}
          <Controller
            name="att_type_per_day_hours"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Hours per Day"
                type="number"
                fullWidth
                error={!!errors.att_type_per_day_hours}
                helperText={errors.att_type_per_day_hours?.message}
                disabled={loading}
              />
            )}
          />

          {/* Pay Percentage */}
          <Controller
            name="pay_percentage"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Pay Percentage"
                type="number"
                fullWidth
                error={!!errors.pay_percentage}
                helperText={errors.pay_percentage?.message}
                disabled={loading}
              />
            )}
          />

          {/* Days per Year */}
          <Controller
            name="att_type_no_of_days_in_year"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Days in Year"
                type="number"
                fullWidth
                error={!!errors.att_type_no_of_days_in_year}
                helperText={errors.att_type_no_of_days_in_year?.message}
                disabled={loading}
              />
            )}
          />

          {/* Year Start Date */}
          <Controller
            name="year_start_date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Year Start Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={!!errors.year_start_date}
                helperText={errors.year_start_date?.message}
                disabled={loading}
              />
            )}
          />

          {/* Year End Date */}
          <Controller
            name="year_end_date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Year End Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={!!errors.year_end_date}
                helperText={errors.year_end_date?.message}
                disabled={loading}
              />
            )}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{
              backgroundColor: '#1976d2',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#1565c0',
              },
            }}
          >
            {loading
              ? editHoliday
                ? 'Saving...'
                : 'Creating...'
              : editHoliday
              ? 'Save'
              : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  </Box>
);

}
