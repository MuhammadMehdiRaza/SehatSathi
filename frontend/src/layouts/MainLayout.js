import React, { useState } from 'react';
import { Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Button,
  ListSubheader,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  LocalHospital as LocalHospitalIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Payment as PaymentIcon,
  Science as ScienceIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  EventNote as EventNoteIcon,
  ReceiptLong as ReceiptLongIcon,
  MedicalInformation as MedicalInformationIcon,
  AddCircle as AddCircleIcon,
} from '@mui/icons-material';
import ChatBot from '../components/ChatBot';

const drawerWidth = 280;

const MainLayout = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const items = [
      {
        label: 'Dashboard',
        icon: <DashboardIcon />,
        path: currentUser?.user_type === 'RECEPTIONIST' ? '/receptionist-dashboard' : '/dashboard',
        roles: ['ADMIN', 'DOCTOR', 'PATIENT', 'RECEPTIONIST'],
      },
      {
        label: 'Doctors',
        icon: <LocalHospitalIcon />,
        path: '/doctors',
        roles: ['ADMIN', 'DOCTOR', 'PATIENT', 'RECEPTIONIST'],
      },
      {
        label: 'Patients',
        icon: <PeopleIcon />,
        path: '/patients',
        roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
      },
      {
        label: 'Appointments',
        icon: <AssignmentIcon />,
        path: currentUser?.user_type === 'RECEPTIONIST' ? '/receptionist-appointments' : '/appointments',
        roles: ['ADMIN', 'DOCTOR', 'PATIENT', 'RECEPTIONIST'],
      },
    ];

    // Add patient-specific items
    if (currentUser?.user_type === 'PATIENT') {
      items.push(
        {
          label: 'Book New Appointment',
          icon: <AddCircleIcon />,
          path: '/book-appointment',
          roles: ['PATIENT'],
        },
        {
          label: 'My Medical Records',
          icon: <MedicalInformationIcon />,
          path: '/my-medical-records',
          roles: ['PATIENT'],
        },
        {
          label: 'My Financial History',
          icon: <ReceiptLongIcon />,
          path: '/my-financials',
          roles: ['PATIENT'],
        }
      );
    } else if (currentUser?.user_type === 'RECEPTIONIST') {
      // Add receptionist-specific items
      items.push(
        {
          label: 'Patient Registration',
          icon: <AddCircleIcon />,
          path: '/patient-registration',
          roles: ['RECEPTIONIST'],
        },
        {
          label: 'Bill Generation',
          icon: <ReceiptLongIcon />,
          path: '/bill-generation',
          roles: ['RECEPTIONIST'],
        }
      );
    } else {
      // For doctors and admins, show the standard views
      items.push(
        {
          label: 'Medical Records',
          icon: <DescriptionIcon />,
          path: '/medical-records',
          roles: ['ADMIN', 'DOCTOR', 'PATIENT'],
        },
        {
          label: 'Lab Tests',
          icon: <ScienceIcon />,
          path: '/lab-tests',
          roles: ['ADMIN', 'DOCTOR', 'PATIENT', 'RECEPTIONIST'],
        },
        {
          label: 'Billing',
          icon: <PaymentIcon />,
          path: '/bills',
          roles: ['ADMIN', 'PATIENT', 'RECEPTIONIST'],
        }
      );
    }

    // Add system logs only for admin
    if (currentUser?.user_type === 'ADMIN') {
      items.push({
        label: 'System Logs',
        icon: <AdminPanelSettingsIcon />,
        path: '/system-logs',
        roles: ['ADMIN'],
      });
    }

    return items.filter(item => item.roles.includes(currentUser?.user_type));
  };

  const navigationItems = getNavigationItems();
  
  const drawer = (
    <div>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 2,
        }}
      >
        <LocalHospitalIcon color="primary" sx={{ fontSize: 32, mr: 1 }} />
        <Typography variant="h6" component="div" fontWeight="bold" color="primary">
          Sehat Saathi HMS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              sx={{
                py: 1.5,
                '&.active': {
                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleUserMenuOpen}
                size="small"
                sx={{ ml: 2 }}
                aria-controls={Boolean(userMenuAnchorEl) ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(userMenuAnchorEl) ? 'true' : undefined}
              >
                <Avatar 
                  alt={`${currentUser?.first_name} ${currentUser?.last_name}`}
                  sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                >
                  {currentUser?.first_name?.[0]}{currentUser?.last_name?.[0]}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Typography variant="body1" sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
              {currentUser?.first_name} {currentUser?.last_name}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: '#f5f8fb',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Box sx={{ py: 2 }}>
          <Outlet />
        </Box>
      </Box>
      <Menu
        id="account-menu"
        anchorEl={userMenuAnchorEl}
        open={Boolean(userMenuAnchorEl)}
        onClose={handleUserMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem component={RouterLink} to="/profile" onClick={handleUserMenuClose}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
      
      {/* Add ChatBot component for patients */}
      {currentUser?.user_type === 'PATIENT' && <ChatBot />}
    </Box>
  );
};

export default MainLayout; 