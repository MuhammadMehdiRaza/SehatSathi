import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import {
  PeopleAlt as PeopleIcon,
  LocalHospital as DoctorIcon,
  Event as AppointmentIcon,
  Description as MedicalRecordIcon,
  Receipt as BillIcon,
  Science as LabTestIcon,
} from '@mui/icons-material';

const DashboardCard = ({ title, value, icon, color }) => {
  return (
    <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Box
              sx={{
                bgcolor: `${color}.light`,
                color: `${color}.main`,
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="h6" component="div" fontWeight="medium">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect receptionists to their specific dashboard
    if (currentUser?.user_type === 'RECEPTIONIST') {
      navigate('/receptionist-dashboard');
      return;
    }
    
    // Redirect admins to the admin dashboard
    if (currentUser?.user_type === 'ADMIN') {
      navigate('/admin-dashboard');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');
        let url = '';

        // Determine the endpoint based on user type
        switch (currentUser?.user_type) {
          case 'ADMIN':
            url = '/api/dashboard/admin/';
            break;
          case 'DOCTOR':
            url = '/api/dashboard/doctor/';
            break;
          case 'PATIENT':
            url = '/api/dashboard/patient/';
            break;
          default:
            throw new Error('Unknown user type');
        }

        const response = await axios.get(url);
        setDashboardData(response.data);
      } catch (err) {
        setError('Failed to load dashboard data: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && currentUser.user_type !== 'RECEPTIONIST') {
      fetchDashboardData();
    }
  }, [currentUser, navigate]);

  if (loading && currentUser?.user_type !== 'RECEPTIONIST') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Render dashboard based on user type
  switch (currentUser?.user_type) {
    case 'ADMIN':
      return (
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Administrator Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Welcome to the administrator dashboard. Here's an overview of the system.
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Total Doctors"
                value={dashboardData?.total_doctors || 0}
                icon={<DoctorIcon fontSize="large" />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Total Patients"
                value={dashboardData?.total_patients || 0}
                icon={<PeopleIcon fontSize="large" />}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Total Appointments"
                value={dashboardData?.total_appointments || 0}
                icon={<AppointmentIcon fontSize="large" />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Pending Appointments"
                value={dashboardData?.pending_appointments || 0}
                icon={<AppointmentIcon fontSize="large" />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Total Bills"
                value={dashboardData?.total_bills || 0}
                icon={<BillIcon fontSize="large" />}
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Pending Bills"
                value={dashboardData?.pending_bills || 0}
                icon={<BillIcon fontSize="large" />}
                color="secondary"
              />
            </Grid>
          </Grid>
        </Box>
      );

    case 'DOCTOR':
      return (
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Doctor Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Welcome, Dr. {currentUser.first_name} {currentUser.last_name}. Here's your overview.
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard
                title="Total Appointments"
                value={dashboardData?.total_appointments || 0}
                icon={<AppointmentIcon fontSize="large" />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard
                title="Pending Appointments"
                value={dashboardData?.pending_appointments || 0}
                icon={<AppointmentIcon fontSize="large" />}
                color="warning"
              />
              
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
            <Button
                  variant="outlined"
                  color="primary"
                  component="a"
                  href="/medical-records"
                >
                  Medical Records
                </Button>
              <DashboardCard
                title="Approved Appointments"
                value={dashboardData?.approved_appointments || 0}
                icon={<AppointmentIcon fontSize="large" />}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard
                title="Completed Appointments"
                value={dashboardData?.completed_appointments || 0}
                icon={<AppointmentIcon fontSize="large" />}
                color="success"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  component="a"
                  href="/appointments"
                >
                  View Appointments
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  color="primary"
                  component="a"
                  href="/medical-records"
                >
                  Medical Records
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  color="primary"
                  component="a"
                  href="/lab-tests"
                >
                  Order Lab Tests
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  color="primary"
                  component="a"
                  href="/profile"
                >
                  My Profile
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Grid container spacing={3} sx={{ mt: 4 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Today's Appointments
                  </Typography>
                  {dashboardData?.todays_appointments?.length > 0 ? (
                    dashboardData.todays_appointments.map((apt) => (
                      <Box
                        key={apt.id}
                        sx={{
                          p: 2,
                          mb: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          boxShadow: 1,
                        }}
                      >
                        <Typography variant="subtitle1">
                          {apt.patient_name} - {apt.time}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {apt.purpose}
                        </Typography>
                        <Chip
                          size="small"
                          label={apt.status}
                          color={
                            apt.status === 'APPROVED'
                              ? 'primary'
                              : apt.status === 'COMPLETED'
                              ? 'success'
                              : 'warning'
                          }
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      No appointments scheduled for today.
                    </Typography>
                  )}
                  <Button
                    variant="text"
                    component="a"
                    href="/appointments"
                    sx={{ mt: 2 }}
                  >
                    See all appointments
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Medical Records
                  </Typography>
                  {dashboardData?.recent_records?.length > 0 ? (
                    dashboardData.recent_records.map((record) => (
                      <Box
                        key={record.id}
                        sx={{
                          p: 2,
                          mb: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          boxShadow: 1,
                        }}
                      >
                        <Typography variant="subtitle1">
                          {record.patient_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.date} - {record.diagnosis.substring(0, 60)}...
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      No recent medical records.
                    </Typography>
                  )}
                  <Button
                    variant="text"
                    component="a"
                    href="/medical-records"
                    sx={{ mt: 2 }}
                  >
                    View all medical records
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      );

    case 'PATIENT':
      return (
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Patient Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Welcome, {currentUser.first_name} {currentUser.last_name}. Here's your health overview.
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Total Appointments"
                value={dashboardData?.total_appointments || 0}
                icon={<AppointmentIcon fontSize="large" />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Pending Appointments"
                value={dashboardData?.pending_appointments || 0}
                icon={<AppointmentIcon fontSize="large" />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Pending Bills"
                value={dashboardData?.pending_bills || 0}
                icon={<BillIcon fontSize="large" />}
                color="error"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  component="a"
                  href="/appointments"
                >
                  Book Appointment
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  color="primary"
                  component="a"
                  href="/medical-records"
                >
                  View Medical Records
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  color="primary"
                  component="a"
                  href="/bills"
                >
                  View Bills
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      );

    default:
      return null; // Receptionists get redirected in useEffect
  }
};

export default Dashboard;