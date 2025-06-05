import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Chip,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';
import { format, compareAsc, parseISO, addDays } from 'date-fns';

const AppointmentReminder = () => {
  const { currentUser } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    // Only run for patients
    if (!currentUser || currentUser.user_type !== 'PATIENT') {
      return;
    }

    const fetchAppointments = async () => {
      try {
        const response = await axios.get('/api/appointments/');
        
        // Filter for approved upcoming appointments only
        const today = new Date();
        const upcoming = response.data.filter(appointment => {
          const appointmentDate = parseISO(appointment.date);
          
          return (
            appointment.status === 'APPROVED' && 
            compareAsc(appointmentDate, today) >= 0 &&
            compareAsc(appointmentDate, addDays(today, 7)) <= 0 // Within next 7 days
          );
        });
        
        setUpcomingAppointments(upcoming);
        
        // Show reminder popup if there are upcoming appointments
        if (upcoming.length > 0) {
          // Show first reminder after 3 seconds
          setTimeout(() => {
            setOpen(true);
          }, 3000);
        }
      } catch (error) {
        console.error('Error fetching appointment reminders:', error);
      }
    };

    fetchAppointments();
  }, [currentUser]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleNext = () => {
    if (currentIndex < upcomingAppointments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setOpen(false);
    }
  };

  const handleDismissAll = () => {
    setOpen(false);
    setSnackbarMessage('All reminders dismissed');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // If no appointments or not a patient, don't render anything
  if (upcomingAppointments.length === 0 || !currentUser || currentUser.user_type !== 'PATIENT') {
    return null;
  }

  const currentAppointment = upcomingAppointments[currentIndex];
  
  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="appointment-reminder-dialog"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="appointment-reminder-dialog">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <NotificationIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Appointment Reminder</Typography>
            </Box>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{ color: (theme) => theme.palette.grey[500] }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentAppointment && (
            <Box sx={{ py: 1 }}>
              <Typography variant="h6" gutterBottom>
                Upcoming Appointment with {currentAppointment.doctor_name}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body1">
                  <strong>Date & Time:</strong> {format(parseISO(currentAppointment.date), 'PPP')} at {currentAppointment.time}
                </Typography>
              </Box>
              
              <Typography variant="body1" gutterBottom>
                <strong>Reason:</strong> {currentAppointment.reason}
              </Typography>
              
              <Typography variant="body1" gutterBottom>
                <strong>Status:</strong> 
                <Chip 
                  label={currentAppointment.status} 
                  color="success" 
                  size="small" 
                  sx={{ ml: 1 }} 
                />
              </Typography>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                Please arrive 15 minutes before your scheduled appointment time.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDismissAll}>Dismiss All</Button>
          {currentIndex < upcomingAppointments.length - 1 ? (
            <Button onClick={handleNext} color="primary">
              Next ({currentIndex + 1}/{upcomingAppointments.length})
            </Button>
          ) : (
            <Button onClick={handleClose} color="primary">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </>
  );
};

export default AppointmentReminder; 