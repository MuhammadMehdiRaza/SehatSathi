import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Switch, FormGroup, FormControlLabel, 
  Button, Alert, Snackbar, CircularProgress, Tab, Tabs, Divider, Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as UserIcon,
  SupervisedUserCircle as PatientIcon,
  MedicalServices as DoctorIcon,
  Healing as MedicalIcon,
  EventNote as AppointmentIcon,
  Science as LabIcon,
  Assessment as ReportIcon,
  Receipt as BillIcon,
  Settings as SettingsIcon,
  Visibility as LogsIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';
import axiosInstance from '../utils/axiosConfig';

// Tabbed panel component for different role permissions
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`role-tabpanel-${index}`}
      aria-labelledby={`role-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Grouping of permissions for each module
const permissionGroups = [
  {
    name: 'Dashboard',
    icon: <DashboardIcon />,
    permissions: [
      { key: 'view_dashboard', label: 'View Dashboard', default: true },
      { key: 'view_analytics', label: 'View Analytics', default: false },
    ]
  },
  {
    name: 'User Management',
    icon: <UserIcon />,
    permissions: [
      { key: 'view_users', label: 'View Users', default: false },
      { key: 'add_user', label: 'Add User', default: false },
      { key: 'edit_user', label: 'Edit User', default: false },
      { key: 'delete_user', label: 'Delete User', default: false },
    ]
  },
  {
    name: 'Patient Management',
    icon: <PatientIcon />,
    permissions: [
      { key: 'view_patients', label: 'View Patients', default: true },
      { key: 'add_patient', label: 'Register Patient', default: false },
      { key: 'edit_patient', label: 'Edit Patient', default: false },
      { key: 'delete_patient', label: 'Delete Patient', default: false },
    ]
  },
  {
    name: 'Doctor Management',
    icon: <DoctorIcon />,
    permissions: [
      { key: 'view_doctors', label: 'View Doctors', default: true },
      { key: 'add_doctor', label: 'Add Doctor', default: false },
      { key: 'edit_doctor', label: 'Edit Doctor', default: false },
      { key: 'delete_doctor', label: 'Delete Doctor', default: false },
    ]
  },
  {
    name: 'Appointments',
    icon: <AppointmentIcon />,
    permissions: [
      { key: 'view_appointments', label: 'View Appointments', default: true },
      { key: 'book_appointment', label: 'Book Appointment', default: false },
      { key: 'approve_appointment', label: 'Approve Appointment', default: false },
      { key: 'cancel_appointment', label: 'Cancel Appointment', default: false },
      { key: 'complete_appointment', label: 'Mark Appointment Completed', default: false },
    ]
  },
  {
    name: 'Medical Records',
    icon: <MedicalIcon />,
    permissions: [
      { key: 'view_medical_records', label: 'View Medical Records', default: false },
      { key: 'add_medical_record', label: 'Add Medical Record', default: false },
      { key: 'edit_medical_record', label: 'Edit Medical Record', default: false },
      { key: 'delete_medical_record', label: 'Delete Medical Record', default: false },
    ]
  },
  {
    name: 'Lab Tests',
    icon: <LabIcon />,
    permissions: [
      { key: 'view_lab_tests', label: 'View Lab Tests', default: true },
      { key: 'order_lab_test', label: 'Order Lab Test', default: false },
      { key: 'update_lab_test', label: 'Update Lab Test', default: false },
      { key: 'delete_lab_test', label: 'Delete Lab Test', default: false },
    ]
  },
  {
    name: 'Billing',
    icon: <BillIcon />,
    permissions: [
      { key: 'view_bills', label: 'View Bills', default: true },
      { key: 'generate_bill', label: 'Generate Bill', default: false },
      { key: 'update_bill', label: 'Update Bill', default: false },
      { key: 'delete_bill', label: 'Delete Bill', default: false },
      { key: 'mark_bill_paid', label: 'Mark Bill as Paid', default: false },
    ]
  },
  {
    name: 'Reports',
    icon: <ReportIcon />,
    permissions: [
      { key: 'view_reports', label: 'View Reports', default: false },
      { key: 'generate_report', label: 'Generate Report', default: false },
      { key: 'export_data', label: 'Export Data', default: false },
    ]
  },
  {
    name: 'System Logs',
    icon: <LogsIcon />,
    permissions: [
      { key: 'view_logs', label: 'View System Logs', default: false },
    ]
  },
  {
    name: 'System Settings',
    icon: <SettingsIcon />,
    permissions: [
      { key: 'manage_settings', label: 'Manage System Settings', default: false },
      { key: 'manage_permissions', label: 'Manage Role Permissions', default: false },
    ]
  },
];

// Default role types in the application
const roleTypes = [
  { key: 'ADMIN', label: 'Administrator', color: 'error' },
  { key: 'DOCTOR', label: 'Doctor', color: 'primary' },
  { key: 'RECEPTIONIST', label: 'Receptionist', color: 'secondary' },
  { key: 'PATIENT', label: 'Patient', color: 'success' },
];

const RolePermissions = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    // In a real app, you would fetch the permissions from the server
    // For this demo, we'll generate default permissions
    initializeRolePermissions();
  }, []);

  const initializeRolePermissions = () => {
    // Simulate loading from backend
    setLoading(true);
    
    // Generate default permissions for each role
    const defaultPermissions = {};
    
    roleTypes.forEach(role => {
      const permissions = {};
      
      permissionGroups.forEach(group => {
        group.permissions.forEach(permission => {
          // Set default permissions based on role
          // Administrators have all permissions by default
          if (role.key === 'ADMIN') {
            permissions[permission.key] = true;
          } 
          // Doctors have access to medical records, appointments, and lab tests
          else if (role.key === 'DOCTOR') {
            if (
              group.name === 'Dashboard' ||
              group.name === 'Patient Management' ||
              group.name === 'Appointments' ||
              group.name === 'Medical Records' ||
              group.name === 'Lab Tests'
            ) {
              permissions[permission.key] = true;
            } else {
              permissions[permission.key] = false;
            }
          } 
          // Receptionists handle appointments, patients, and billing
          else if (role.key === 'RECEPTIONIST') {
            if (
              group.name === 'Dashboard' ||
              group.name === 'Patient Management' ||
              group.name === 'Appointments' ||
              group.name === 'Billing'
            ) {
              permissions[permission.key] = true;
            } else {
              permissions[permission.key] = false;
            }
          } 
          // Patients can only view specific content related to them
          else if (role.key === 'PATIENT') {
            if (
              (group.name === 'Dashboard' && permission.key === 'view_dashboard') ||
              (group.name === 'Appointments' && (permission.key === 'view_appointments' || permission.key === 'book_appointment')) ||
              (group.name === 'Medical Records' && permission.key === 'view_medical_records') ||
              (group.name === 'Lab Tests' && permission.key === 'view_lab_tests') ||
              (group.name === 'Billing' && permission.key === 'view_bills')
            ) {
              permissions[permission.key] = true;
            } else {
              permissions[permission.key] = false;
            }
          }
          // Default for all other roles and permissions
          else {
            permissions[permission.key] = permission.default;
          }
        });
      });
      
      defaultPermissions[role.key] = permissions;
    });
    
    setRolePermissions(defaultPermissions);
    setLoading(false);
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handlePermissionChange = (roleKey, permissionKey, checked) => {
    setRolePermissions(prevState => ({
      ...prevState,
      [roleKey]: {
        ...prevState[roleKey],
        [permissionKey]: checked
      }
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    
    try {
      // In a real app, you would send the updated permissions to the server
      // Here we'll just simulate a successful API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSnackbar({
        open: true,
        message: 'Permissions saved successfully',
        severity: 'success'
      });
      
      // Here's where you would add the API call in a real app:
      // await axiosInstance.post('/api/permissions/', { rolePermissions });
      
    } catch (err) {
      setError('Failed to save permissions: ' + (err.response?.data?.message || err.message));
      
      setSnackbar({
        open: true,
        message: 'Failed to save permissions',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const currentRole = roleTypes[selectedTab];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={2}>
        <HospitalIcon fontSize="large" sx={{ mr: 1 }} />
        <Typography variant="h4" component="h1">
          Role Permissions
        </Typography>
      </Box>
      
      <Typography variant="subtitle1" paragraph color="text.secondary">
        Manage permissions for different user roles in the system. Define what actions each role can perform.
      </Typography>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange} 
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          {roleTypes.map((role, index) => (
            <Tab 
              key={role.key} 
              label={
                <Box display="flex" alignItems="center">
                  <Chip
                    label={role.label}
                    color={role.color}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                </Box>
              } 
              id={`role-tab-${index}`}
            />
          ))}
        </Tabs>
        
        {roleTypes.map((role, index) => (
          <TabPanel key={role.key} value={selectedTab} index={index}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {role.label} Permissions
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {role.key === 'ADMIN' 
                  ? 'Administrators have the highest level of access to the system and can manage all aspects.'
                  : role.key === 'DOCTOR'
                  ? 'Doctors can access patient information, medical records, and manage appointments.'
                  : role.key === 'RECEPTIONIST'
                  ? 'Receptionists handle patient registration, appointments, and billing.'
                  : 'Patients can view their own medical information, appointments, and bills.'}
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              {permissionGroups.map((group) => (
                <Grid item xs={12} md={6} key={group.name}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Box sx={{ color: 'primary.main', mr: 1 }}>
                        {group.icon}
                      </Box>
                      <Typography variant="h6">{group.name}</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <FormGroup>
                      {group.permissions.map((permission) => (
                        <FormControlLabel
                          key={permission.key}
                          control={
                            <Switch
                              checked={rolePermissions[role.key][permission.key]}
                              onChange={(e) => handlePermissionChange(role.key, permission.key, e.target.checked)}
                              // Disable editing for administrator's core permissions to prevent locking out
                              disabled={role.key === 'ADMIN' && 
                                (permission.key === 'view_dashboard' || 
                                 permission.key === 'manage_permissions' ||
                                 permission.key === 'view_users' ||
                                 permission.key === 'edit_user' ||
                                 permission.key === 'add_user')}
                            />
                          }
                          label={permission.label}
                        />
                      ))}
                    </FormGroup>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        ))}
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={savePermissions}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Permissions'}
          </Button>
        </Box>
      </Paper>
      
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      
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
    </Box>
  );
};

export default RolePermissions; 