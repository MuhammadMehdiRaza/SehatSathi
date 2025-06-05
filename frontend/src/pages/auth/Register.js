import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  TextField,
  Link,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      confirm_password: '',
      first_name: '',
      last_name: '',
      user_type: 'PATIENT', // Default user type is patient
      phone_number: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
      confirm_password: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm Password is required'),
      first_name: Yup.string().required('First name is required'),
      last_name: Yup.string().required('Last name is required'),
      user_type: Yup.string().required('User type is required'),
      phone_number: Yup.string().required('Phone number is required'),
    }),
    onSubmit: async (values) => {
      try {
        setError('');
        setLoading(true);
        await register(values);
        navigate('/login');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to register');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 3 }}>
        Create an Account
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="first_name"
              name="first_name"
              label="First Name"
              variant="outlined"
              value={formik.values.first_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.first_name && Boolean(formik.errors.first_name)}
              helperText={formik.touched.first_name && formik.errors.first_name}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="last_name"
              name="last_name"
              label="Last Name"
              variant="outlined"
              value={formik.values.last_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.last_name && Boolean(formik.errors.last_name)}
              helperText={formik.touched.last_name && formik.errors.last_name}
            />
          </Grid>
        </Grid>

        <TextField
          fullWidth
          id="email"
          name="email"
          label="Email Address"
          variant="outlined"
          margin="normal"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
        />

        <TextField
          fullWidth
          id="phone_number"
          name="phone_number"
          label="Phone Number"
          variant="outlined"
          margin="normal"
          value={formik.values.phone_number}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.phone_number && Boolean(formik.errors.phone_number)}
          helperText={formik.touched.phone_number && formik.errors.phone_number}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel id="user-type-label">User Type</InputLabel>
          <Select
            labelId="user-type-label"
            id="user_type"
            name="user_type"
            value={formik.values.user_type}
            label="User Type"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.user_type && Boolean(formik.errors.user_type)}
          >
            <MenuItem value="PATIENT">Patient</MenuItem>
            <MenuItem value="DOCTOR">Doctor</MenuItem>
            <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          id="password"
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          variant="outlined"
          margin="normal"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          id="confirm_password"
          name="confirm_password"
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          variant="outlined"
          margin="normal"
          value={formik.values.confirm_password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.confirm_password && Boolean(formik.errors.confirm_password)}
          helperText={formik.touched.confirm_password && formik.errors.confirm_password}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowConfirmPassword}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ mt: 3, mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Register'}
        </Button>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" variant="body2">
              Sign In
            </Link>
          </Typography>
        </Box>
      </form>
    </Box>
  );
};

export default Register; 