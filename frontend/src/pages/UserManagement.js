import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Snackbar, Tooltip, InputAdornment, TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Check as ActiveIcon,
  Close as InactiveIcon
} from '@mui/icons-material';
import axiosInstance from '../utils/axiosConfig';

// User form component for adding/editing users
const UserForm = ({ user, open, onClose, onSave, mode }) => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    user_type: 'PATIENT',
    password: '',
    confirm_password: '',
    zip_code: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        ...user,
        password: '',
        confirm_password: ''
      });
    } else {
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        user_type: 'PATIENT',
        password: '',
        confirm_password: '',
        zip_code: '',
      });
    }
  }, [user, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';
    if (!formData.user_type) newErrors.user_type = 'User type is required';
    
    if (mode === 'add') {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      
      if (!formData.confirm_password) newErrors.confirm_password = 'Please confirm password';
      else if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
    } else if (mode === 'edit' && formData.password) {
      // Only validate password if it's provided during edit
      if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      let submitData = { ...formData };
      
      // If editing and no password provided, remove password fields
      if (mode === 'edit' && !formData.password) {
        delete submitData.password;
        delete submitData.confirm_password;
      }
      
      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      if (error.response?.data) {
        // Handle API validation errors
        const apiErrors = {};
        Object.entries(error.response.data).forEach(([key, value]) => {
          apiErrors[key] = Array.isArray(value) ? value[0] : value;
        });
        setErrors(apiErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'add' ? 'Add New User' : 'Edit User'}
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            disabled={loading}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="first_name"
              label="First Name"
              id="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={!!errors.first_name}
              helperText={errors.first_name}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="last_name"
              label="Last Name"
              id="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={!!errors.last_name}
              helperText={errors.last_name}
              disabled={loading}
            />
          </Box>
          <TextField
            margin="normal"
            fullWidth
            name="phone_number"
            label="Phone Number"
            id="phone_number"
            value={formData.phone_number || ''}
            onChange={handleChange}
            error={!!errors.phone_number}
            helperText={errors.phone_number}
            disabled={loading}
          />

         
          <TextField
            margin="normal"
            fullWidth
            name="zip_code"
            label="zip code"
            id="zip_code"
            value={formData.zip_code || ''}
            onChange={handleChange}
            error={!!errors.zip_code}
            helperText={errors.zip_code}
            disabled={loading}
          />

          <FormControl fullWidth margin="normal" error={!!errors.user_type}>
            <InputLabel id="user-type-label">User Type *</InputLabel>
            <Select
              labelId="user-type-label"
              id="user_type"
              name="user_type"
              value={formData.user_type}
              onChange={handleChange}
              label="User Type *"
              disabled={loading}
            >
              <MenuItem value="ADMIN">Administrator</MenuItem>
              <MenuItem value="DOCTOR">Doctor</MenuItem>
              <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
              <MenuItem value="PATIENT">Patient</MenuItem>
            </Select>
            {errors.user_type && <Typography color="error" variant="caption">{errors.user_type}</Typography>}
          </FormControl>
          <TextField
            margin="normal"
            fullWidth
            name="password"
            label={mode === 'edit' ? "New Password (leave blank to keep current)" : "Password"}
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
            required={mode === 'add'}
            disabled={loading}
          />
          <TextField
            margin="normal"
            fullWidth
            name="confirm_password"
            label="Confirm Password"
            type="password"
            id="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            error={!!errors.confirm_password}
            helperText={errors.confirm_password}
            required={mode === 'add' || formData.password !== ''}
            disabled={loading}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : (mode === 'add' ? 'Add User' : 'Update User')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [selectedUser, setSelectedUser] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    userId: null,
    userName: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/users/');
      setUsers(response.data);
    } catch (err) {
      setError('Failed to fetch users: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDeleteUser = (userId, userName) => {
    setConfirmDialog({
      open: true,
      userId,
      userName
    });
  };

  const confirmDeleteUser = async () => {
    try {
      await axiosInstance.delete(`/api/users/${confirmDialog.userId}/`);
      
      // Update users list after deletion
      setUsers(users.filter(user => user.id !== confirmDialog.userId));
      
      setSnackbar({
        open: true,
        message: `User ${confirmDialog.userName} has been deleted`,
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to delete user: ' + (err.response?.data?.message || err.message),
        severity: 'error'
      });
    } finally {
      setConfirmDialog({ open: false, userId: null, userName: '' });
    }
  };

  const handleSaveUser = async (userData) => {
    if (dialogMode === 'add') {
      const response = await axiosInstance.post('/api/users/', userData);
      setUsers([...users, response.data]);
      setSnackbar({
        open: true,
        message: 'User created successfully',
        severity: 'success'
      });
    } else {
      const response = await axiosInstance.put(`/api/users/${selectedUser.id}/`, userData);
      setUsers(users.map(user => user.id === selectedUser.id ? response.data : user));
      setSnackbar({
        open: true,
        message: 'User updated successfully',
        severity: 'success'
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleUserTypeFilterChange = (event) => {
    setUserTypeFilter(event.target.value);
    setPage(0);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter users based on search term and user type filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUserType = userTypeFilter === '' || user.user_type === userTypeFilter;
    return matchesSearch && matchesUserType;
  });

  const displayedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDateJoined = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'ADMIN':
        return 'error';
      case 'DOCTOR':
        return 'primary';
      case 'RECEPTIONIST':
        return 'secondary';
      case 'PATIENT':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddUser}
        >
          Add User
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            placeholder="Search by name or email..."
          />
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel id="user-type-filter-label">User Type</InputLabel>
            <Select
              labelId="user-type-filter-label"
              id="user-type-filter"
              value={userTypeFilter}
              label="User Type"
              onChange={handleUserTypeFilterChange}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="ADMIN">Administrator</MenuItem>
              <MenuItem value="DOCTOR">Doctor</MenuItem>
              <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
              <MenuItem value="PATIENT">Patient</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <TableContainer>
          <Table aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>User Type</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Date Joined</TableCell>
                <TableCell>Zip Code</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                displayedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.user_type} 
                        color={getUserTypeColor(user.user_type)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{user.phone_number || 'N/A'}</TableCell>
                    <TableCell>{formatDateJoined(user.date_joined)}</TableCell>
                    <TableCell>{user.zip_code || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Box>
                        <Tooltip title="Edit User">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleEditUser(user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* User add/edit dialog */}
      <UserForm
        user={selectedUser}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveUser}
        mode={dialogMode}
      />

      {/* Confirmation dialog for delete */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {confirmDialog.userName}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} 
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteUser} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement; 