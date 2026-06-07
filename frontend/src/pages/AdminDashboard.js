import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from "@mui/material";
import {
  PeopleAlt as UsersIcon,
  VpnKey as PermissionsIcon,
  Assessment as ReportsIcon,
  Visibility as LogsIcon,
  DashboardCustomize as DashboardIcon,
  Person as DoctorIcon,
  PersonOutline as PatientIcon,
  EventNote as AppointmentIcon,
  Receipt as BillIcon,
} from "@mui/icons-material";
import axiosInstance from "../utils/axiosConfig";

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: "100%", bgcolor: `${color}.light` }}>
    <CardContent>
      <Box display="flex" alignItems="center">
        <Box sx={{ mr: 2 }}>{icon}</Box>
        <Box>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const FeatureCard = ({ title, description, icon, to, color }) => (
  <Card
    component={Link}
    to={to}
    sx={{
      height: "100%",
      textDecoration: "none",
      transition: "transform 0.2s",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: 4,
      },
    }}
  >
    <CardContent>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        textAlign="center"
      >
        <Box sx={{ color: `${color}.main`, mb: 2, fontSize: "3rem" }}>
          {icon}
        </Box>
        <Typography variant="h6" color="textPrimary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch dashboard stats for admin
        const response = await axiosInstance.get("/api/dashboard/admin/");
        setStats(response.data);
      } catch (err) {
        console.error("Error fetching admin dashboard stats:", err);
        setError(
          err.response?.data?.message || "Failed to load dashboard data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={2}>
        <DashboardIcon fontSize="large" sx={{ mr: 1 }} />
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          System Overview
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Doctors"
              value={stats?.total_doctors || 0}
              icon={<DoctorIcon fontSize="large" color="primary" />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Patients"
              value={stats?.total_patients || 0}
              icon={<PatientIcon fontSize="large" color="info" />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Appointments"
              value={stats?.total_appointments || 0}
              icon={<AppointmentIcon fontSize="large" color="success" />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Pending Bills"
              value={stats?.pending_bills || 0}
              icon={<BillIcon fontSize="large" color="warning" />}
              color="warning"
            />
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Admin Features
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <FeatureCard
            title="User Management"
            description="Create, update, delete and manage user accounts"
            icon={<UsersIcon fontSize="large" />}
            to="/admin/users"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <FeatureCard
            title="Role Permissions"
            description="Manage role-based permissions and access control"
            icon={<PermissionsIcon fontSize="large" />}
            to="/admin/roles"
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <FeatureCard
            title="System Logs"
            description="View detailed system activity logs and events"
            icon={<LogsIcon fontSize="large" />}
            to="/system-logs"
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <FeatureCard
            title="Reports & Statistics"
            description="Generate reports and view system statistics"
            icon={<ReportsIcon fontSize="large" />}
            to="/admin/reports"
            color="success"
          />
        </Grid>
      </Grid>

      <Box mt={4} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/dashboard"
        >
          Back to Main Dashboard
        </Button>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
