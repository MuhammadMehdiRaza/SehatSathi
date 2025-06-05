import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { 
  Add as AddIcon,
  Science as ScienceIcon,
  CheckCircle as CompletedIcon,
  Pending as OrderedIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material';

const getStatusIcon = (status) => {
  switch (status) {
    case 'COMPLETED':
      return <CompletedIcon color="success" />;
    case 'ORDERED':
      return <OrderedIcon color="warning" />;
    case 'CANCELLED':
      return <CancelledIcon color="error" />;
    default:
      return null;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'ORDERED':
      return 'warning';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
};

const LabTests = () => {
  const { currentUser } = useAuth();
  const [labTests, setLabTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newTest, setNewTest] = useState({
    name: '',
    patient: '',
    test_type: '',
    instructions: '',
    urgency: 'NORMAL',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const testsResponse = await axios.get('/api/lab-tests/');
        setLabTests(testsResponse.data);
        
        // If current user is a doctor, fetch patients for ordering tests
        if (currentUser?.user_type === 'DOCTOR') {
          const patientsResponse = await axios.get('/api/patients/');
          setPatients(patientsResponse.data);
        }
        
        setError('');
      } catch (err) {
        setError('Failed to fetch lab tests: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleCompleteTest = async (id) => {
    try {
      const response = await axios.post(`/api/lab-tests/${id}/complete/`, {
        results: 'Test completed successfully.',
        date_completed: new Date().toISOString().split('T')[0],
      });
      
      // Update local state
      setLabTests(labTests.map(test => 
        test.id === id ? response.data : test
      ));
    } catch (err) {
      console.error('Error completing lab test:', err);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTest({
      ...newTest,
      [name]: value,
    });
  };

  const handleOrderTest = async () => {
    try {
      console.log('Sending test data:', newTest);
      const response = await axios.post('/api/lab-tests/', newTest);
      setLabTests([...labTests, response.data]);
      handleCloseDialog();
      setNewTest({ 
        name: '', 
        patient: '', 
        test_type: '',
        instructions: '',
        urgency: 'NORMAL' 
      });
    } catch (err) {
      console.error('Error ordering lab test:', err);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      }
    }
  };

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

  const isDoctor = currentUser?.user_type === 'DOCTOR';
  const isReceptionist = currentUser?.user_type === 'RECEPTIONIST';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Lab Tests
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            View and manage laboratory tests
          </Typography>
        </div>
        
        {isDoctor && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 2 }}
            onClick={handleOpenDialog}
          >
            Order New Test
          </Button>
        )}
      </Box>

      {labTests.length === 0 ? (
        <Alert severity="info">No lab tests available.</Alert>
      ) : (
        <Grid container spacing={3}>
          {labTests.map((test) => (
            <Grid item xs={12} sm={6} md={4} key={test.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScienceIcon color="primary" />
                      <Typography variant="h6" component="div">
                        {test.name}
                      </Typography>
                    </Box>
                    <Chip
                      icon={getStatusIcon(test.status)}
                      label={test.status}
                      color={getStatusColor(test.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Patient:</strong> {test.patient_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ordered By:</strong> {test.doctor_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Date Ordered:</strong> {test.date_ordered}
                  </Typography>
                  
                  {test.status === 'COMPLETED' && (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Date Completed:</strong> {test.date_completed}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2">Results:</Typography>
                      <Typography variant="body2">{test.results}</Typography>
                    </>
                  )}
                  
                  {isReceptionist && test.status === 'ORDERED' && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        color="success"
                        size="small"
                        onClick={() => handleCompleteTest(test.id)}
                      >
                        Mark as Completed
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog for ordering new test */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Order New Lab Test</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                autoFocus
                margin="dense"
                name="name"
                label="Test Name"
                type="text"
                fullWidth
                value={newTest.name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="patient-select-label">Patient</InputLabel>
                <Select
                  labelId="patient-select-label"
                  id="patient-select"
                  name="patient"
                  value={newTest.patient}
                  onChange={handleInputChange}
                  label="Patient"
                >
                  {patients.map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.user.first_name} {patient.user.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="test-type-label">Test Type</InputLabel>
                <Select
                  labelId="test-type-label"
                  id="test-type-select"
                  name="test_type"
                  value={newTest.test_type}
                  onChange={handleInputChange}
                  label="Test Type"
                >
                  <MenuItem value="BLOOD">Blood Test</MenuItem>
                  <MenuItem value="URINE">Urine Test</MenuItem>
                  <MenuItem value="IMAGING">Imaging (X-Ray, MRI, etc.)</MenuItem>
                  <MenuItem value="PATHOLOGY">Pathology</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="urgency-label">Urgency</InputLabel>
                <Select
                  labelId="urgency-label"
                  id="urgency-select"
                  name="urgency"
                  value={newTest.urgency}
                  onChange={handleInputChange}
                  label="Urgency"
                >
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                  <MenuItem value="EMERGENCY">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="instructions"
                label="Special Instructions"
                multiline
                rows={4}
                fullWidth
                value={newTest.instructions}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleOrderTest} 
            variant="contained" 
            disabled={!newTest.name || !newTest.patient || !newTest.test_type}
          >
            Order Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LabTests; 