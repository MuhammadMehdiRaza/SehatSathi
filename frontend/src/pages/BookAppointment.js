import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Divider,
  Snackbar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';

const BookAppointment = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    doctor: '',
    date: null,
    time: null,
    reason: '',
  });

  useEffect(() => {
    // Redirect if not a patient
    if (currentUser && currentUser.user_type !== 'PATIENT') {
      navigate('/dashboard');
      return;
    }

    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/doctors/');
        setDoctors(response.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch doctors: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleDateChange = (newDate) => {
    setFormData({
      ...formData,
      date: newDate,
    });
  };

  const handleTimeChange = (newTime) => {
    setFormData({
      ...formData,
      time: newTime,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formattedDate = format(formData.date, 'yyyy-MM-dd');
      const formattedTime = format(formData.time, 'HH:mm:ss');
      
      // Create a variable to track loaded appointment data
      console.log('Current user:', currentUser);
      
      // Get patient ID - first check if we already have it from currentUser
      let patientId = null;
      try {
        // Fetch the patient record for the current user
        const patientResponse = await axios.get('/api/patients/');
        console.log('Patient response:', patientResponse);
        
        // Find the patient record that belongs to the current user
        const userPatient = patientResponse.data.find(
          patient => patient.user.id === currentUser.id
        );
        
        if (userPatient) {
          patientId = userPatient.id;
          console.log('Found patient ID:', patientId);
        } else {
          throw new Error('Could not find patient record for current user');
        }
      } catch (patientError) {
        console.error('Error getting patient ID:', patientError);
        setError('Failed to get patient information. Please try again later.');
        return;
      }
      
      const appointmentData = {
        patient: patientId,
        doctor: formData.doctor,
        date: formattedDate,
        time: formattedTime,
        reason: formData.reason,
        status: 'REQUESTED',
      };
      
      console.log('Sending appointment data:', appointmentData);
      
      await axios.post('/api/appointments/', appointmentData);
      
      setSuccess(true);
      // Reset form
      setFormData({
        doctor: '',
        date: null,
        time: null,
        reason: '',
      });
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/appointments');
      }, 2000);
      
    } catch (err) {
      console.error('Appointment error:', err);
      setError('Failed to book appointment: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Book Appointment
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Select a doctor and your preferred time for an appointment
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Paper sx={{ p: 3, mb: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="doctor-select-label">Select Doctor</InputLabel>
                  <Select
                    labelId="doctor-select-label"
                    id="doctor"
                    name="doctor"
                    value={formData.doctor}
                    onChange={handleChange}
                    label="Select Doctor"
                  >
                    {doctors.map((doctor) => (
                      <MenuItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.user.first_name} {doctor.user.last_name} - {doctor.specialization}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Appointment Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  disablePast
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TimePicker
                  label="Appointment Time"
                  value={formData.time}
                  onChange={handleTimeChange}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  id="reason"
                  name="reason"
                  label="Reason for Appointment"
                  multiline
                  rows={4}
                  value={formData.reason}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={!formData.doctor || !formData.date || !formData.time || !formData.reason}
              >
                Book Appointment
              </Button>
            </Box>
          </form>
        </Paper>

        <Snackbar
          open={success}
          autoHideDuration={2000}
          onClose={() => setSuccess(false)}
          message="Appointment booked successfully! Redirecting..."
        />
      </Box>
    </LocalizationProvider>
  );
};

export default BookAppointment; 