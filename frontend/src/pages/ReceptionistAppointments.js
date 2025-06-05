import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Box, Button, Grid, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField, 
  Snackbar, Alert, CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import axiosInstance from '../utils/axiosConfig';
import { format } from 'date-fns';

const ReceptionistAppointments = () => {
  const [tabValue, setTabValue] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    patient: '',
    doctor: '',
    date: null,
    time: null,
    reason: ''
  });
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
    fetchPatients();
  }, []);
  
  const fetchAppointments = async () => {
    try {
      const response = await axiosInstance.get('/api/appointments/');
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load appointments',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDoctors = async () => {
    try {
      const response = await axiosInstance.get('/api/doctors/');
      setDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };
  
  const fetchPatients = async () => {
    try {
      const response = await axiosInstance.get('/api/patients/');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setAppointmentData({
      patient: '',
      doctor: '',
      date: null,
      time: null,
      reason: ''
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAppointmentData({ ...appointmentData, [name]: value });
  };
  
  const handleDateChange = (date) => {
    setAppointmentData({ ...appointmentData, date });
  };
  
  const handleTimeChange = (time) => {
    setAppointmentData({ ...appointmentData, time });
  };
  
  const handleCreateAppointment = async () => {
    try {
      const formattedDate = format(appointmentData.date, 'yyyy-MM-dd');
      const formattedTime = format(appointmentData.time, 'HH:mm:ss');
      
      const response = await axiosInstance.post('/api/appointments/', {
        patient: appointmentData.patient,
        doctor: appointmentData.doctor,
        date: formattedDate,
        time: formattedTime,
        reason: appointmentData.reason,
        status: 'APPROVED' // Receptionists can directly approve appointments
      });
      
      setSnackbar({
        open: true,
        message: 'Appointment created successfully',
        severity: 'success'
      });
      
      fetchAppointments();
      handleCloseDialog();
    } catch (error) {
      console.error('Error creating appointment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create appointment',
        severity: 'error'
      });
    }
  };
  
  const handleApproveAppointment = async (id) => {
    try {
      await axiosInstance.post(`/api/appointments/${id}/approve/`);
      setSnackbar({
        open: true,
        message: 'Appointment approved successfully',
        severity: 'success'
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error approving appointment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to approve appointment',
        severity: 'error'
      });
    }
  };
  
  const handleCancelAppointment = async (id) => {
    try {
      await axiosInstance.post(`/api/appointments/${id}/cancel/`);
      setSnackbar({
        open: true,
        message: 'Appointment cancelled successfully',
        severity: 'success'
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to cancel appointment',
        severity: 'error'
      });
    }
  };
  
  const handleCompleteAppointment = async (id) => {
    try {
      await axiosInstance.post(`/api/appointments/${id}/complete/`);
      setSnackbar({
        open: true,
        message: 'Appointment marked as completed',
        severity: 'success'
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to complete appointment',
        severity: 'error'
      });
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Filter appointments based on tab
  const filteredAppointments = appointments.filter(appointment => {
    if (tabValue === 0) return appointment.status === 'REQUESTED';
    if (tabValue === 1) return appointment.status === 'APPROVED';
    if (tabValue === 2) return appointment.status === 'COMPLETED';
    if (tabValue === 3) return appointment.status === 'CANCELLED';
    return true;
  });
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Grid container justifyContent="space-between" alignItems="center" mb={3}>
          <Grid item>
            <Typography variant="h5">Manage Appointments</Typography>
          </Grid>
          <Grid item>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleOpenDialog}
            >
              Create Appointment
            </Button>
          </Grid>
        </Grid>
        
        <Paper elevation={3}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Requested" />
            <Tab label="Approved" />
            <Tab label="Completed" />
            <Tab label="Cancelled" />
          </Tabs>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient Name</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          {`${appointment.patient_details?.user?.first_name || ''} ${appointment.patient_details?.user?.last_name || ''}`}
                        </TableCell>
                        <TableCell>
                          {`Dr. ${appointment.doctor_details?.user?.first_name || ''} ${appointment.doctor_details?.user?.last_name || ''}`}
                        </TableCell>
                        <TableCell>{appointment.date}</TableCell>
                        <TableCell>{appointment.time}</TableCell>
                        <TableCell>{appointment.reason}</TableCell>
                        <TableCell>
                          {appointment.status === 'REQUESTED' && (
                            <>
                              <Button 
                                size="small" 
                                color="primary" 
                                onClick={() => handleApproveAppointment(appointment.id)}
                                sx={{ mr: 1 }}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="small" 
                                color="error" 
                                onClick={() => handleCancelAppointment(appointment.id)}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {appointment.status === 'APPROVED' && (
                            <>
                              <Button 
                                size="small" 
                                color="success" 
                                onClick={() => handleCompleteAppointment(appointment.id)}
                                sx={{ mr: 1 }}
                              >
                                Complete
                              </Button>
                              <Button 
                                size="small" 
                                color="error" 
                                onClick={() => handleCancelAppointment(appointment.id)}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
        
        {/* Create Appointment Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle>Create New Appointment</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Patient</InputLabel>
                    <Select
                      name="patient"
                      value={appointmentData.patient}
                      onChange={handleInputChange}
                      label="Patient"
                    >
                      {patients.map((patient) => (
                        <MenuItem key={patient.id} value={patient.id}>
                          {`${patient.user.first_name} ${patient.user.last_name}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Doctor</InputLabel>
                    <Select
                      name="doctor"
                      value={appointmentData.doctor}
                      onChange={handleInputChange}
                      label="Doctor"
                    >
                      {doctors.map((doctor) => (
                        <MenuItem key={doctor.id} value={doctor.id}>
                          {`Dr. ${doctor.user.first_name} ${doctor.user.last_name} (${doctor.specialization})`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Appointment Date"
                    value={appointmentData.date}
                    onChange={handleDateChange}
                    renderInput={(params) => 
                      <TextField {...params} fullWidth required />
                    }
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TimePicker
                    label="Appointment Time"
                    value={appointmentData.time}
                    onChange={handleTimeChange}
                    renderInput={(params) => 
                      <TextField {...params} fullWidth required />
                    }
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    name="reason"
                    label="Reason for Appointment"
                    fullWidth
                    multiline
                    rows={3}
                    value={appointmentData.reason}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleCreateAppointment} 
              variant="contained" 
              color="primary"
              disabled={!appointmentData.patient || !appointmentData.doctor || 
                       !appointmentData.date || !appointmentData.time || !appointmentData.reason}
            >
              Create Appointment
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default ReceptionistAppointments; 