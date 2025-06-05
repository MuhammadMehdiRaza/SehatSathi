import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Paper,
  Divider,
  Rating,
} from '@mui/material';
import { Link } from 'react-router-dom';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Doctors = () => {
  const { currentUser } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    searchTerm: '',
    department: '',
    specialization: '',
  });
  const [specializations, setSpecializations] = useState([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/doctors/');
        setDoctors(response.data);
        
        // Extract unique specializations for filtering
        const uniqueSpecs = [...new Set(response.data.map(doc => doc.specialization))];
        setSpecializations(uniqueSpecs);
        
        setError('');
      } catch (err) {
        setError('Failed to fetch doctors: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/api/departments/');
        setDepartments(response.data);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };

    fetchDoctors();
    fetchDepartments();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      department: '',
      specialization: '',
    });
  };

  // Apply filters to the doctors list
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.user.first_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      doctor.user.last_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
    const matchesDepartment = !filters.department || 
      (doctor.department && doctor.department.id.toString() === filters.department);
      
    const matchesSpecialization = !filters.specialization || 
      doctor.specialization === filters.specialization;
      
    return matchesSearch && matchesDepartment && matchesSpecialization;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const isPatient = currentUser?.user_type === 'PATIENT';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Doctors
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            View all doctors and their specializations
          </Typography>
        </div>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filter Doctors
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              name="searchTerm"
              label="Search"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              placeholder="Search by name or specialization"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel id="department-select-label">Department</InputLabel>
              <Select
                labelId="department-select-label"
                id="department"
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                label="Department"
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel id="specialization-select-label">Specialization</InputLabel>
              <Select
                labelId="specialization-select-label"
                id="specialization"
                name="specialization"
                value={filters.specialization}
                onChange={handleFilterChange}
                label="Specialization"
              >
                <MenuItem value="">All Specializations</MenuItem>
                {specializations.map((spec) => (
                  <MenuItem key={spec} value={spec}>
                    {spec}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={clearFilters}
              color="secondary"
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {filteredDoctors.length === 0 ? (
        <Alert severity="info">No doctors match your search criteria.</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredDoctors.map((doctor) => (
            <Grid item xs={12} sm={6} md={4} key={doctor.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    <Avatar
                      sx={{ width: 56, height: 56, bgcolor: 'primary.main', mr: 2 }}
                    >
                      {doctor.user.first_name[0]}{doctor.user.last_name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="div">
                        Dr. {doctor.user.first_name} {doctor.user.last_name}
                      </Typography>
                      <Chip
                        label={doctor.specialization}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <Rating name="read-only" value={4} readOnly size="small" />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Department:</strong> {doctor.department?.name || 'Not specified'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Qualification:</strong> {doctor.qualification}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Experience:</strong> {doctor.experience} years
                  </Typography>
                  
                  {isPatient && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          component={Link}
                          to="/book-appointment"
                          state={{ selectedDoctor: doctor.id }}
                          size="small"
                          variant="contained"
                          startIcon={<CalendarIcon />}
                        >
                          Book Appointment
                        </Button>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Doctors; 