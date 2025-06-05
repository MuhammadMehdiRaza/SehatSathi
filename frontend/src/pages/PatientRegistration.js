import React, { useState } from 'react';
import { 
  Paper, Typography, TextField, Button, Box, Grid, 
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '../utils/axiosConfig';

const PatientRegistration = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    gender: '',
    date_of_birth: null,
    blood_group: '',
    address: '',
    emergency_contact: '',
    zip_code: '',
    password: '',
    confirm_password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, date_of_birth: date });
    console.log("Date selected:", date);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirm_password) {
      setSnackbar({
        open: true,
        message: 'Passwords do not match',
        severity: 'error'
      });
      return;
    }
    
    // Basic validation for required fields
    if (!formData.gender) {
      setSnackbar({
        open: true,
        message: 'Please select a gender',
        severity: 'error'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // First register the user
      const userResponse = await axiosInstance.post('/api/register/', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        password: formData.password,
        confirm_password: formData.confirm_password,
        user_type: 'PATIENT'
      });
      
      // If user registration successful, create patient profile
      if (userResponse.data && userResponse.data.id) {
        const userId = userResponse.data.id;
        
        // Format the date to YYYY-MM-DD if it exists
        const formattedDateOfBirth = formData.date_of_birth ? 
          formData.date_of_birth.toISOString().split('T')[0] : null;
        
        // Prepare patient data with default values for empty fields
        const patientData = {
          user: userId,
          date_of_birth: formattedDateOfBirth,
          blood_group: formData.blood_group || "N/A",
          gender: formData.gender,
          address: formData.address || "Not specified",
          emergency_contact: formData.emergency_contact || "Not specified"
        };
        
        console.log("Sending patient data:", patientData);
        
        await axiosInstance.post('/api/patients/', patientData);
        
        setSnackbar({
          open: true,
          message: 'Patient registered successfully',
          severity: 'success'
        });
        
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone_number: '',
          gender: '',
          date_of_birth: null,
          blood_group: '',
          address: '',
          emergency_contact: '',
          password: '',
          confirm_password: ''
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response data:', error.response?.data);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 
                 JSON.stringify(error.response?.data) || 
                 'Registration failed. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 4, mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          Register New Patient
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                name="first_name"
                label="First Name"
                fullWidth
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="last_name"
                label="Last Name"
                fullWidth
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="email"
                label="Email Address"
                type="email"
                fullWidth
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="phone_number"
                label="Phone Number"
                fullWidth
                value={formData.phone_number}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Gender</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  label="Gender"
                >
                  <MenuItem value="M">Male</MenuItem>
                  <MenuItem value="F">Female</MenuItem>
                  <MenuItem value="O">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date of Birth"
                value={formData.date_of_birth}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="blood_group"
                label="Blood Group"
                fullWidth
                value={formData.blood_group}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="emergency_contact"
                label="Emergency Contact"
                fullWidth
                value={formData.emergency_contact}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="address"
                label="Address"
                fullWidth
                multiline
                rows={3}
                value={formData.address}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="password"
                label="Password"
                type="password"
                fullWidth
                value={formData.password}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="confirm_password"
                label="Confirm Password"
                type="password"
                fullWidth
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register Patient'}
            </Button>
          </Box>
        </Box>
      </Paper>
      
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
    </LocalizationProvider>
  );
};

export default PatientRegistration; 