import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as ApprovedIcon,
  WatchLater as PendingIcon,
  Cancel as CancelledIcon,
  Done as CompletedIcon,
} from '@mui/icons-material';

const getStatusIcon = (status) => {
  switch (status) {
    case 'APPROVED':
      return <ApprovedIcon color="success" />;
    case 'REQUESTED':
      return <PendingIcon color="warning" />;
    case 'CANCELLED':
      return <CancelledIcon color="error" />;
    case 'COMPLETED':
      return <CompletedIcon color="info" />;
    default:
      return null;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REQUESTED':
      return 'warning';
    case 'CANCELLED':
      return 'error';
    case 'COMPLETED':
      return 'info';
    default:
      return 'default';
  }
};

const Appointments = () => {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/appointments/');
        setAppointments(response.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch appointments: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const handleApprove = async (id) => {
    try {
      await axios.post(`/api/appointments/${id}/approve/`);
      // Update local state
      setAppointments(appointments.map(appointment => 
        appointment.id === id ? { ...appointment, status: 'APPROVED' } : appointment
      ));
    } catch (err) {
      console.error('Error approving appointment:', err);
    }
  };

  const handleCancel = async (id) => {
    try {
      await axios.post(`/api/appointments/${id}/cancel/`);
      // Update local state
      setAppointments(appointments.map(appointment => 
        appointment.id === id ? { ...appointment, status: 'CANCELLED' } : appointment
      ));
    } catch (err) {
      console.error('Error cancelling appointment:', err);
    }
  };

  const handleComplete = async (id) => {
    try {
      await axios.post(`/api/appointments/${id}/complete/`);
      // Update local state
      setAppointments(appointments.map(appointment => 
        appointment.id === id ? { ...appointment, status: 'COMPLETED' } : appointment
      ));
    } catch (err) {
      console.error('Error completing appointment:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const isReceptionist = currentUser?.user_type === 'RECEPTIONIST';
  const isDoctor = currentUser?.user_type === 'DOCTOR';
  const isPatient = currentUser?.user_type === 'PATIENT';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Appointments
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            View and manage appointments
          </Typography>
        </div>
        
        {isPatient && (
          <Button
            component={Link}
            to="/book-appointment"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 2 }}
          >
            Book Appointment
          </Button>
        )}
      </Box>

      {appointments.length === 0 ? (
        <Alert severity="info">No appointments available at the moment.</Alert>
      ) : (
        <Grid container spacing={3}>
          {appointments.map((appointment) => (
            <Grid item xs={12} sm={6} key={appointment.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {appointment.doctor_name}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(appointment.status)}
                      label={appointment.status}
                      color={getStatusColor(appointment.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Patient:</strong> {appointment.patient_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Date:</strong> {appointment.date}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Time:</strong> {appointment.time}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Reason:</strong> {appointment.reason}
                  </Typography>
                  
                  {(isReceptionist || isDoctor || isPatient) && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {isReceptionist && appointment.status === 'REQUESTED' && (
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="success"
                            onClick={() => handleApprove(appointment.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {isDoctor && appointment.status === 'APPROVED' && (
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="info"
                            onClick={() => handleComplete(appointment.id)}
                          >
                            Complete
                          </Button>
                        )}
                        {appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && (
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="error"
                            onClick={() => handleCancel(appointment.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Appointments; 