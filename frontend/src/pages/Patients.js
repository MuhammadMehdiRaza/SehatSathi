import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, Tabs, Tab, IconButton,
  Button, Divider, Alert, CircularProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  List, ListItem, ListItemText, Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Search as SearchIcon,
  Assignment as RecordIcon,
  Science as LabIcon,
  Event as AppointmentIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../utils/axiosConfig';

// Tab panel for patient details
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Patients = () => {
  const { currentUser, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [patientRecords, setPatientRecords] = useState([]);
  const [patientTests, setPatientTests] = useState([]);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [loadingPatientData, setLoadingPatientData] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/patients/');
      console.log("API Response:", response.data);
      console.log("Current user role:", currentUser?.user_type);
      console.log("Number of patients returned:", response.data.length);
      setPatients(response.data);
      setFilteredPatients(response.data);
      setError('');
    } catch (err) {
      console.error("API Error:", err);
      
      // If we get a 401 (Unauthorized) or 403 (Forbidden), logout and redirect
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        alert("Your session has expired. Please log in again.");
        logout();
        return;
      }
      
      setError('Failed to fetch patients: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    // Filter patients based on search term
    if (searchTerm) {
      const filtered = patients.filter(
        (patient) =>
          `${patient.user.first_name} ${patient.user.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          patient.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchTerm, patients]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handlePatientClick = async (patient) => {
    setSelectedPatient(patient);
    setOpenDialog(true);
    setTabValue(0);
    setLoadingPatientData(true);

    try {
      // Fetch patient's medical records
      const recordsResponse = await axiosInstance.get(`/api/medical-records/?patient=${patient.id}`);
      setPatientRecords(recordsResponse.data);

      // Fetch patient's lab tests
      const testsResponse = await axiosInstance.get(`/api/lab-tests/?patient=${patient.id}`);
      setPatientTests(testsResponse.data);

      // Fetch patient's appointments
      const appointmentsResponse = await axiosInstance.get(`/api/appointments/?patient=${patient.id}`);
      setPatientAppointments(appointmentsResponse.data);
    } catch (err) {
      console.error('Failed to fetch patient data:', err);
    } finally {
      setLoadingPatientData(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPatient(null);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchPatients} 
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const isDoctor = currentUser?.user_type === 'DOCTOR';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Patients
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchPatients}
        >
          Refresh
        </Button>
      </Box>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        {isDoctor ? 'View patient information and medical history' : 'Manage patients in the system'}
      </Typography>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search patients by name or email"
        value={searchTerm}
        onChange={handleSearchChange}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {filteredPatients.length === 0 ? (
        <Alert severity="info">No patients found.</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredPatients.map((patient) => (
            <Grid item xs={12} sm={6} md={4} key={patient.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => handlePatientClick(patient)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">
                      {patient.user.first_name} {patient.user.last_name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Email:</strong> {patient.user.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Phone:</strong> {patient.user.phone_number || 'Not provided'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Gender:</strong> {patient.gender || 'Not specified'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Blood Group:</strong> {patient.blood_group || 'Not specified'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Patient Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedPatient?.user.first_name} {selectedPatient?.user.last_name}
            </Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPatient && (
            <>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Patient Info" icon={<PersonIcon />} iconPosition="start" />
                <Tab label="Medical Records" icon={<RecordIcon />} iconPosition="start" />
                <Tab label="Lab Tests" icon={<LabIcon />} iconPosition="start" />
                <Tab label="Appointments" icon={<AppointmentIcon />} iconPosition="start" />
              </Tabs>

              {loadingPatientData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* Patient Info Tab */}
                  <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>Full Name:</strong>
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedPatient.user.first_name} {selectedPatient.user.last_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>Email:</strong>
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedPatient.user.email}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>Phone:</strong>
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedPatient.user.phone_number || 'Not provided'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>Date of Birth:</strong>
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedPatient.date_of_birth || 'Not provided'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>Gender:</strong>
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedPatient.gender === 'M' ? 'Male' : 
                           selectedPatient.gender === 'F' ? 'Female' : 
                           selectedPatient.gender === 'O' ? 'Other' : 'Not specified'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>Blood Group:</strong>
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedPatient.blood_group || 'Not specified'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>Address:</strong>
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedPatient.address || 'Not provided'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>Emergency Contact:</strong>
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedPatient.emergency_contact || 'Not provided'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  {/* Medical Records Tab */}
                  <TabPanel value={tabValue} index={1}>
                    {patientRecords.length === 0 ? (
                      <Alert severity="info">No medical records found for this patient.</Alert>
                    ) : (
                      <List>
                        {patientRecords.map((record) => (
                          <React.Fragment key={record.id}>
                            <ListItem alignItems="flex-start">
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="subtitle1">
                                      Record from {record.date}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Dr. {record.doctor_name}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography variant="body2" component="span" sx={{ display: 'block', mt: 1 }}>
                                      <strong>Diagnosis:</strong> {record.diagnosis}
                                    </Typography>
                                    <Typography variant="body2" component="span" sx={{ display: 'block', mt: 1 }}>
                                      <strong>Prescription:</strong> {record.prescription}
                                    </Typography>
                                    {record.notes && (
                                      <Typography variant="body2" component="span" sx={{ display: 'block', mt: 1 }}>
                                        <strong>Notes:</strong> {record.notes}
                                      </Typography>
                                    )}
                                  </>
                                }
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </TabPanel>

                  {/* Lab Tests Tab */}
                  <TabPanel value={tabValue} index={2}>
                    {patientTests.length === 0 ? (
                      <Alert severity="info">No lab tests found for this patient.</Alert>
                    ) : (
                      <List>
                        {patientTests.map((test) => (
                          <React.Fragment key={test.id}>
                            <ListItem alignItems="flex-start">
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="subtitle1">
                                      {test.name}
                                    </Typography>
                                    <Chip 
                                      label={test.status}
                                      color={
                                        test.status === 'COMPLETED' ? 'success' :
                                        test.status === 'ORDERED' ? 'warning' : 'error'
                                      }
                                      size="small"
                                    />
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography variant="body2" component="span" sx={{ display: 'block', mt: 1 }}>
                                      <strong>Ordered By:</strong> Dr. {test.doctor_name}
                                    </Typography>
                                    <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                                      <strong>Date Ordered:</strong> {test.date_ordered}
                                    </Typography>
                                    {test.status === 'COMPLETED' && (
                                      <>
                                        <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                                          <strong>Date Completed:</strong> {test.date_completed}
                                        </Typography>
                                        <Typography variant="body2" component="span" sx={{ display: 'block', mt: 1 }}>
                                          <strong>Results:</strong> {test.results}
                                        </Typography>
                                      </>
                                    )}
                                  </>
                                }
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </TabPanel>

                  {/* Appointments Tab */}
                  <TabPanel value={tabValue} index={3}>
                    {patientAppointments.length === 0 ? (
                      <Alert severity="info">No appointments found for this patient.</Alert>
                    ) : (
                      <List>
                        {patientAppointments.map((appointment) => (
                          <React.Fragment key={appointment.id}>
                            <ListItem alignItems="flex-start">
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="subtitle1">
                                      Appointment on {appointment.date} at {appointment.time}
                                    </Typography>
                                    <Chip 
                                      label={appointment.status}
                                      color={
                                        appointment.status === 'COMPLETED' ? 'success' :
                                        appointment.status === 'APPROVED' ? 'primary' :
                                        appointment.status === 'REQUESTED' ? 'warning' : 'error'
                                      }
                                      size="small"
                                    />
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography variant="body2" component="span" sx={{ display: 'block', mt: 1 }}>
                                      <strong>Doctor:</strong> Dr. {appointment.doctor_name}
                                    </Typography>
                                    <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                                      <strong>Purpose:</strong> {appointment.purpose}
                                    </Typography>
                                    {appointment.notes && (
                                      <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                                        <strong>Notes:</strong> {appointment.notes}
                                      </Typography>
                                    )}
                                  </>
                                }
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </TabPanel>
                </>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={handleCloseDialog}>Close</Button>
                {isDoctor && tabValue === 1 && (
                  <Button 
                    variant="contained" 
                    color="primary"
                    component="a"
                    href={`/medical-records/new?patient=${selectedPatient.id}`}
                  >
                    Add Medical Record
                  </Button>
                )}
                {isDoctor && tabValue === 2 && (
                  <Button 
                    variant="contained" 
                    color="primary"
                    component="a"
                    href={`/lab-tests/new?patient=${selectedPatient.id}`}
                  >
                    Order Lab Test
                  </Button>
                )}
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Patients; 