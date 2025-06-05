import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

const AuthLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f8fb',
        backgroundImage: 'url("https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            py: 4,
            px: 5,
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LocalHospitalIcon 
              color="primary" 
              sx={{ fontSize: 56, mb: 1 }} 
            />
            <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
              Sehat Saathi
            </Typography>
            <Typography variant="body1" color="text.secondary" mt={1}>
              Hospital Management System
            </Typography>
          </Box>

          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthLayout; 