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
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { 
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

const MedicalRecords = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [newRecord, setNewRecord] = useState({
    patient: '',
    diagnosis: '',
    prescription: '',
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const recordsResponse = await axios.get('/api/medical-records/');
        setRecords(recordsResponse.data);
        
        // If current user is a doctor, fetch patients for creating records
        if (currentUser?.user_type === 'DOCTOR') {
          const patientsResponse = await axios.get('/api/patients/');
          setPatients(patientsResponse.data);
        }
        
        setError('');
      } catch (err) {
        setError('Failed to fetch medical records: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewRecord({
      patient: '',
      diagnosis: '',
      prescription: '',
      notes: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRecord({
      ...newRecord,
      [name]: value,
    });
  };

  const handleCreateRecord = async () => {
    try {
      console.log('Sending medical record data:', newRecord);
      const response = await axios.post('/api/medical-records/', newRecord);
      setRecords([...records, response.data]);
      handleCloseDialog();
    } catch (err) {
      console.error('Error creating medical record:', err);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      }
    }
  };

  const handleDownload = (recordId) => {
    // This is just a placeholder - in a real app, this would download a PDF
    alert(`Medical record ${recordId} has been downloaded.`);
  };

  const handlePatientSearchChange = (e) => {
    setPatientSearch(e.target.value);
  };

  // Filter records if patientSearch is provided
  const filteredRecords = patientSearch 
    ? records.filter(record => 
        record.patient_name.toLowerCase().includes(patientSearch.toLowerCase()))
    : records;

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Medical Records
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            View and manage medical records
          </Typography>
        </div>
        
        {isDoctor && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 2 }}
            onClick={handleOpenDialog}
          >
            Add Medical Record
          </Button>
        )}
      </Box>

      {isDoctor && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Search Patient"
            variant="outlined"
            value={patientSearch}
            onChange={handlePatientSearchChange}
            placeholder="Search by patient name"
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Box>
      )}

      {filteredRecords.length === 0 ? (
        <Alert severity="info">No medical records available.</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredRecords.map((record) => (
            <Grid item xs={12} key={record.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      Medical Record for {record.patient_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {record.date}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Doctor:</strong> {record.doctor_name}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="diagnosis-content"
                      id="diagnosis-header"
                    >
                      <Typography variant="subtitle1">Diagnosis</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        {record.diagnosis}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="prescription-content"
                      id="prescription-header"
                    >
                      <Typography variant="subtitle1">Prescription</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        {record.prescription}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  
                  {record.notes && (
                    <Accordion>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="notes-content"
                        id="notes-header"
                      >
                        <Typography variant="subtitle1">Notes</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2">
                          {record.notes}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  )}
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      startIcon={<DownloadIcon />}
                      variant="outlined"
                      size="small"
                      onClick={() => handleDownload(record.id)}
                    >
                      Download Report
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog for creating new medical record */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Medical Record</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="patient-select-label">Patient</InputLabel>
            <Select
              labelId="patient-select-label"
              id="patient-select"
              name="patient"
              value={newRecord.patient}
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
          
          <TextField
            margin="normal"
            name="diagnosis"
            label="Diagnosis"
            multiline
            rows={4}
            value={newRecord.diagnosis}
            onChange={handleInputChange}
            fullWidth
          />
          
          <TextField
            margin="normal"
            name="prescription"
            label="Prescription"
            multiline
            rows={4}
            value={newRecord.prescription}
            onChange={handleInputChange}
            fullWidth
          />
          
          <TextField
            margin="normal"
            name="notes"
            label="Additional Notes"
            multiline
            rows={4}
            value={newRecord.notes}
            onChange={handleInputChange}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateRecord} 
            variant="contained" 
            disabled={!newRecord.patient || !newRecord.diagnosis}
          >
            Create Record
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicalRecords; 