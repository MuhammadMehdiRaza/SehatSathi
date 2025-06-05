import React, { useState, useEffect } from 'react';
import { 
  Typography, Paper, Box, Grid, Card, CardContent, 
  Button, List, ListItem, ListItemText, Divider,
  CircularProgress
} from '@mui/material';
import { 
  People as PeopleIcon, 
  EventNote as EventNoteIcon, 
  Receipt as ReceiptIcon, 
  NotificationsActive as NotificationsIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { API_URL } from '../utils/constants';

const ReceptionistDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchDashboardData();
    fetchTodayAppointments();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      const response = await axiosInstance.get('/api/dashboard/receptionist/');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTodayAppointments = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axiosInstance.get('/api/appointments/');
      
      // Filter to get only today's appointments
      const todayAppts = response.data.filter(
        appointment => appointment.date === today
      );
      
      setTodayAppointments(todayAppts);
    } catch (error) {
      console.error('Error fetching today\'s appointments:', error);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Receptionist Dashboard
      </Typography>
      
      {/* Quick Action Buttons */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<PersonAddIcon />}
              onClick={() => navigate('/patient-registration')}
            >
              Register Patient
            </Button>
          </Grid>
          
          <Grid item>
            <Button 
              variant="contained" 
              color="secondary" 
              startIcon={<EventNoteIcon />}
              onClick={() => navigate('/receptionist-appointments')}
            >
              Manage Appointments
            </Button>
          </Grid>
          
          <Grid item>
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<ReceiptIcon />}
              onClick={() => navigate('/bill-generation')}
            >
              Generate Bill
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Patients</Typography>
              </Box>
              <Typography variant="h3" align="center">
                {dashboardData?.total_patients || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EventNoteIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Today's Appointments</Typography>
              </Box>
              <Typography variant="h3" align="center">
                {todayAppointments.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fce4ec', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending Appointments</Typography>
              </Box>
              <Typography variant="h3" align="center">
                {dashboardData?.pending_appointments || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff8e1', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ReceiptIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending Bills</Typography>
              </Box>
              <Typography variant="h3" align="center">
                {dashboardData?.pending_bills || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Today's Appointments */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Today's Appointments
            </Typography>
            {todayAppointments.length === 0 ? (
              <Typography variant="body1" sx={{ color: 'text.secondary', py: 2 }}>
                No appointments scheduled for today.
              </Typography>
            ) : (
              <List>
                {todayAppointments.map((appointment, index) => (
                  <React.Fragment key={appointment.id}>
                    <ListItem>
                      <ListItemText
                        primary={`${appointment.patient_details?.user?.first_name} ${appointment.patient_details?.user?.last_name}`}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              Dr. {appointment.doctor_details?.user?.first_name} {appointment.doctor_details?.user?.last_name}
                            </Typography>
                            {` — ${appointment.time} | ${appointment.status}`}
                          </>
                        }
                      />
                      {appointment.status === 'REQUESTED' && (
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="primary"
                          onClick={() => navigate('/receptionist-appointments')}
                        >
                          Manage
                        </Button>
                      )}
                    </ListItem>
                    {index < todayAppointments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        
        {/* Quick Links */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Card sx={{ bgcolor: '#f3e5f5', mb: 2, cursor: 'pointer' }} 
                      onClick={() => navigate('/patients')}>
                  <CardContent>
                    <Typography variant="h6">View Patients</Typography>
                    <Typography variant="body2">
                      Access patient records and personal information
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card sx={{ bgcolor: '#e0f2f1', cursor: 'pointer' }}
                      onClick={() => navigate('/doctors')}>
                  <CardContent>
                    <Typography variant="h6">View Doctors</Typography>
                    <Typography variant="body2">
                      View doctor schedules and specializations
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Card sx={{ bgcolor: '#f1f8e9', mb: 2, cursor: 'pointer' }}
                      onClick={() => navigate('/bill-generation')}>
                  <CardContent>
                    <Typography variant="h6">Manage Bills</Typography>
                    <Typography variant="body2">
                      Generate new bills and manage existing ones
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card sx={{ bgcolor: '#e8eaf6', cursor: 'pointer' }}
                      onClick={() => navigate('/receptionist-appointments')}>
                  <CardContent>
                    <Typography variant="h6">Manage Appointments</Typography>
                    <Typography variant="body2">
                      Schedule and track patient appointments
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReceptionistDashboard; 