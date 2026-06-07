import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import {
  Event as AppointmentIcon,
  Receipt as BillIcon,
} from "@mui/icons-material";

const DashboardCard = ({ title, value, icon, color }) => {
  return (
    <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Box
              sx={{
                bgcolor: `${color}.light`,
                color: `${color}.main`,
                borderRadius: 2,
                p: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Robust multidirectional role parsing fallback engine
    const rawRole =
      currentUser?.user_type ||
      currentUser?.userType ||
      currentUser?.user_details?.user_type ||
      currentUser?.user_details?.userType ||
      "";

    const normalizedUserRole = rawRole.toUpperCase();

    if (normalizedUserRole === "RECEPTIONIST") {
      navigate("/receptionist-dashboard");
      return;
    }

    if (normalizedUserRole === "ADMIN") {
      navigate("/admin-dashboard");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");
        let url = "";

        switch (normalizedUserRole) {
          case "ADMIN":
            url = "/api/admin/statistics/";
            break;
          case "DOCTOR":
            url = "/api/appointments/";
            break;
          case "PATIENT":
            url = "/api/appointments/";
            break;
          default:
            url = "/api/appointments/";
        }

        const response = await apiClient.get(url);
        const incomingData = response.data || [];

        if (
          normalizedUserRole === "PATIENT" ||
          currentUser?.user_type === "Patient"
        ) {
          const appointmentsList = Array.isArray(incomingData)
            ? incomingData
            : [];

          // Secure the dynamic target profile ID straight from your authentication layers
          const currentLoggedUserId =
            currentUser?.id || currentUser?.user_details?.id;

          // ✅ THE FRONTEND FIX: Filter appointments list strictly to matching user IDs
          const personalizedAppointments = appointmentsList.filter((apt) => {
            if (!currentLoggedUserId) return true; // Fallback calculation safely
            return apt.patient_user_id === currentLoggedUserId;
          });

          setDashboardData({
            total_appointments: personalizedAppointments.length,
            pending_appointments: personalizedAppointments.filter(
              (a) => (a.status || "").toUpperCase() === "REQUESTED",
            ).length,
            pending_bills: 0,
          });
        } else {
          setDashboardData(incomingData);
        }
      } catch (err) {
        console.error("Unified dashboard metric gathering crash trace:", err);
        setError(
          "Failed to load dashboard statistics data panel: " +
            (err.response?.data?.message || err.message),
        );
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, navigate]);

  const normalizedUserType = (
    currentUser?.user_type ||
    currentUser?.user_details?.user_type ||
    ""
  ).toUpperCase();

  if (loading && normalizedUserType !== "RECEPTIONIST") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {normalizedUserType === "PATIENT"
          ? "Patient Dashboard"
          : "Medical Staff Overview"}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Welcome back,{" "}
        {currentUser?.first_name ||
          currentUser?.user_details?.first_name ||
          "User"}{" "}
        {currentUser?.last_name || currentUser?.user_details?.last_name || ""}.
        Here's your application health overview.
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
            title="Pending Actions"
            value={dashboardData?.pending_appointments || 0}
            icon={<AppointmentIcon fontSize="large" />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <DashboardCard
            title="Outstanding Accounts"
            value={dashboardData?.pending_bills || 0}
            icon={<BillIcon fontSize="large" />}
            color="error"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Quick Links
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/appointments")}
            >
              Manage Appointments
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate("/medical-records")}
            >
              Clinical Records
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;
