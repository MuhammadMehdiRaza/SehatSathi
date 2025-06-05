import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

// Layout Components
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Main Pages
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import MedicalRecords from './pages/MedicalRecords';
import LabTests from './pages/LabTests';
import Bills from './pages/Bills';
import Profile from './pages/Profile';
import SystemLogs from './pages/SystemLogs';

// Admin Module Pages
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import RolePermissions from './pages/RolePermissions';
import ReportsStatistics from './pages/ReportsStatistics';

// Patient Module Pages
import BookAppointment from './pages/BookAppointment';
import PatientMedicalRecords from './pages/PatientMedicalRecords';
import PatientFinancials from './pages/PatientFinancials';

// Receptionist Module Pages
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import PatientRegistration from './pages/PatientRegistration';
import ReceptionistAppointments from './pages/ReceptionistAppointments';
import BillGeneration from './pages/BillGeneration';

// Components
import AppointmentReminder from './components/AppointmentReminder';

// Protected Route Component
const ProtectedRoute = ({ element, allowedRoles }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.user_type)) {
    return <Navigate to="/dashboard" />;
  }

  return element;
};

function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {currentUser && currentUser.user_type === 'PATIENT' && <AppointmentReminder />}
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={currentUser ? <Navigate to="/dashboard" /> : <Register />} />
        </Route>

        {/* Main App Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Dashboard - accessible to all authenticated users */}
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute element={<Dashboard />} />} 
          />

          {/* Profile - accessible to all authenticated users */}
          <Route 
            path="/profile" 
            element={<ProtectedRoute element={<Profile />} />} 
          />

          {/* Doctors - accessible to all authenticated users */}
          <Route 
            path="/doctors" 
            element={<ProtectedRoute element={<Doctors />} />} 
          />

          {/* Patients - accessible to admin, receptionist, and doctor */}
          <Route 
            path="/patients" 
            element={
              <ProtectedRoute 
                element={<Patients />} 
                allowedRoles={['ADMIN', 'RECEPTIONIST', 'DOCTOR']} 
              />
            } 
          />

          {/* Appointments - accessible to all authenticated users */}
          <Route 
            path="/appointments" 
            element={<ProtectedRoute element={<Appointments />} />} 
          />

          {/* Medical Records - accessible to admin, doctor, and patient */}
          <Route 
            path="/medical-records" 
            element={
              <ProtectedRoute 
                element={<MedicalRecords />} 
                allowedRoles={['ADMIN', 'DOCTOR', 'PATIENT']} 
              />
            } 
          />

          {/* Lab Tests - accessible to all authenticated users */}
          <Route 
            path="/lab-tests" 
            element={<ProtectedRoute element={<LabTests />} />} 
          />

          {/* Bills - accessible to admin, receptionist, and patient */}
          <Route 
            path="/bills" 
            element={
              <ProtectedRoute 
                element={<Bills />} 
                allowedRoles={['ADMIN', 'RECEPTIONIST', 'PATIENT']} 
              />
            } 
          />

          {/* System Logs - accessible only to admin */}
          <Route 
            path="/system-logs" 
            element={
              <ProtectedRoute 
                element={<SystemLogs />} 
                allowedRoles={['ADMIN']} 
              />
            } 
          />

          {/* Admin Module Routes */}
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute 
                element={<AdminDashboard />} 
                allowedRoles={['ADMIN']} 
              />
            } 
          />
          
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute 
                element={<UserManagement />} 
                allowedRoles={['ADMIN']} 
              />
            } 
          />
          
          <Route 
            path="/admin/roles" 
            element={
              <ProtectedRoute 
                element={<RolePermissions />} 
                allowedRoles={['ADMIN']} 
              />
            } 
          />
          
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute 
                element={<ReportsStatistics />} 
                allowedRoles={['ADMIN']} 
              />
            } 
          />

          {/* Patient Module Routes */}
          <Route 
            path="/book-appointment" 
            element={
              <ProtectedRoute 
                element={<BookAppointment />} 
                allowedRoles={['PATIENT']} 
              />
            } 
          />

          <Route 
            path="/my-medical-records" 
            element={
              <ProtectedRoute 
                element={<PatientMedicalRecords />} 
                allowedRoles={['PATIENT']} 
              />
            } 
          />

          <Route 
            path="/my-financials" 
            element={
              <ProtectedRoute 
                element={<PatientFinancials />} 
                allowedRoles={['PATIENT']} 
              />
            } 
          />

          {/* Receptionist Module Routes */}
          <Route 
            path="/receptionist-dashboard" 
            element={
              <ProtectedRoute 
                element={<ReceptionistDashboard />} 
                allowedRoles={['RECEPTIONIST']} 
              />
            } 
          />

          <Route 
            path="/patient-registration" 
            element={
              <ProtectedRoute 
                element={<PatientRegistration />} 
                allowedRoles={['RECEPTIONIST', 'ADMIN']} 
              />
            } 
          />

          <Route 
            path="/receptionist-appointments" 
            element={
              <ProtectedRoute 
                element={<ReceptionistAppointments />} 
                allowedRoles={['RECEPTIONIST']} 
              />
            } 
          />

          <Route 
            path="/bill-generation" 
            element={
              <ProtectedRoute 
                element={<BillGeneration />} 
                allowedRoles={['RECEPTIONIST', 'ADMIN']} 
              />
            } 
          />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App; 