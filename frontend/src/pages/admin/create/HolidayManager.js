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
  Switch,
  FormControlLabel,
  Paper
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from 'utils/api';

// Validation schema
const schema = yup.object({
  hcode: yup.string().required('Hcode is required'),
  holiday_type: yup.string().required('Holiday type is required'),
  holiday_type_name: yup.string().required('Holiday type name is required'),
  holiday_name: yup.string().required('Holiday name is required'),
  hdate: yup.date().required('Holiday date is required').typeError('Invalid date'),
  active: yup.boolean(),
  holiday_ot_pay_percentage: yup
    .number()
    .typeError('OT must be a decimal number')
    .min(0, 'Cannot be negative')
    .required('Holiday OT is required'),
  holiday_regular_pay_percentage: yup
    .number()
    .typeError('Pay Percentage must be a decimal number')
    .min(0, 'Cannot be negative')
    .required('Pay Percentage is required'),
}).required();

export default function HolidayGrid() {
  const [holidayData, setHolidayData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editHoliday, setEditHoliday] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/api/holidays/');
      setHolidayData(res.data);
    } catch (err) {
      console.error('Failed to fetch Holidays:', err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      hcode: '',
      holiday_type: '',
      holiday_type_name: '',
      holiday_name: '',
      hdate: null,
      active: true,
      holiday_ot_pay_percentage: '',
      holiday_regular_pay_percentage: '',
    },
  });

  const openAddDialog = () => {
    setEditHoliday(null);
    reset({
      hcode: '',
      holiday_type: '',
      holiday_type_name: '',
      holiday_name: '',
      hdate: null,
      active: true,
      holiday_ot_pay_percentage: '',
      holiday_regular_pay_percentage: '',
    });
    setOpenDialog(true);
  };

  const openEditDialog = (row) => {
    const holidayDate = row.hdate instanceof Date ? row.hdate : new Date(row.hdate);
    setEditHoliday(row);
    reset({ ...row, hdate: holidayDate });
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setEditHoliday(null);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formattedData = {
        ...data,
        hdate: new Date(data.hdate).toISOString().split('T')[0],
        holiday_ot_pay_percentage: data.holiday_ot_pay_percentage
          ? Number(data.holiday_ot_pay_percentage).toFixed(2)
          : null,
        holiday_regular_pay_percentage: data.holiday_regular_pay_percentage
          ? Number(data.holiday_regular_pay_percentage).toFixed(2)
          : null,
      };

      let response;
      if (editHoliday) {
        response = await api.put(`api/holidays/${editHoliday.id}/`, formattedData);
        const updatedHoliday = response.data;
        setHolidayData((prev) =>
          prev.map((item) => (item.id === editHoliday.id ? updatedHoliday : item))
        );
      } else {
        response = await api.post('api/holidays/', formattedData);
        const newHoliday = response.data;
        setHolidayData((prev) => [...prev, newHoliday]);
      }

      closeDialog();
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'hcode', headerName: 'Hcode', width: 100 },
    { field: 'holiday_name', headerName: 'Holiday Name', flex: 1, minWidth: 180 },
    {
      field: 'hdate',
      headerName: 'Date',
      width: 130,
      renderCell: (params) => {
        if (!params.value) return '';
        const d = new Date(params.value);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
      },
    },
    {
      field: 'active',
      headerName: 'Active',
      width: 90,
      type: 'boolean',
    },
    {
      field: 'holiday_ot_pay_percentage',
      headerName: 'Holiday OT',
      width: 110,
      type: 'number',
    },
    {
      field: 'holiday_regular_pay_percentage',
      headerName: 'Pay %',
      width: 110,
      type: 'text',
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 90,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => openEditDialog(params.row)}
          key="edit"
        />,
      ],
    },
  ];
return (
  <Box
    sx={{
      width: '95%',
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
        Holiday Management
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
        Add Holiday
      </Button>
    </Box>

    {/* Holiday Table */}
    <Paper
      elevation={2}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <DataGrid
        rows={holidayData}
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

    {/* Add/Edit Holiday Dialog */}
    <Dialog
      open={openDialog}
      onClose={closeDialog}
      maxWidth="md"
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
        {editHoliday ? 'Edit Holiday' : 'Add Holiday'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            mt: 1,
          }}
        >
          {/* Fields */}
          {[
            ['hcode', 'Hcode'],
            ['holiday_type', 'Holiday Type'],
            ['holiday_type_name', 'Holiday Type Name'],
            ['holiday_name', 'Holiday Name'],
          ].map(([name, label]) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={label}
                  fullWidth
                  sx={{ flex: '1 1 45%' }}
                  error={!!errors[name]}
                  helperText={errors[name]?.message}
                  disabled={loading}
                />
              )}
            />
          ))}

          {/* Date Picker */}
          <Controller
            name="hdate"
            control={control}
            render={({ field }) => (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Holiday Date"
                  {...field}
                  onChange={(date) => field.onChange(date)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      sx={{ flex: '1 1 45%' }}
                      error={!!errors.hdate}
                      helperText={errors.hdate?.message}
                      disabled={loading}
                    />
                  )}
                />
              </LocalizationProvider>
            )}
          />

          {/* Switch & Pay Fields */}
          <Box sx={{ flex: '1 1 100%', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} disabled={loading} />}
                  label="Active"
                />
              )}
            />

            <Controller
              name="holiday_ot_pay_percentage"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Holiday OT (%)"
                  type="number"
                  sx={{ flex: 1 }}
                  error={!!errors.holiday_ot_pay_percentage}
                  helperText={errors.holiday_ot_pay_percentage?.message}
                  disabled={loading}
                />
              )}
            />

            <Controller
              name="holiday_regular_pay_percentage"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Regular Pay (%)"
                  type="number"
                  sx={{ flex: 1 }}
                  error={!!errors.holiday_regular_pay_percentage}
                  helperText={errors.holiday_regular_pay_percentage?.message}
                  disabled={loading}
                />
              )}
            />
          </Box>
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
