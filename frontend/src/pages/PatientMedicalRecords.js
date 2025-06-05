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
  Chip,
  Button,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Download as DownloadIcon,
  Biotech as LabIcon,
  MedicalServices as MedicalIcon,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PatientMedicalRecords = () => {
  const { currentUser } = useAuth();
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      try {
        setLoading(true);
        const medRecordsResponse = await axios.get('/api/medical-records/');
        const labTestsResponse = await axios.get('/api/lab-tests/');
        
        setMedicalRecords(medRecordsResponse.data);
        setLabTests(labTestsResponse.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch medical records: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalRecords();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const generatePDF = (record) => {
    // This is a simple mockup for creating a PDF report
    // In a real app, you would call a backend API to generate and return a PDF
    
    const recordTitle = record.diagnosis || record.name;
    const recordDate = record.date || record.date_ordered;
    
    // Generate a simple text blob to simulate PDF download
    const textBlob = `
    Sehat Saathi Hospital
    Medical Record Report
    
    Patient: ${currentUser.first_name} ${currentUser.last_name}
    Date: ${recordDate}
    
    ${record.diagnosis ? `Diagnosis: ${record.diagnosis}` : ''}
    ${record.prescription ? `Prescription: ${record.prescription}` : ''}
    ${record.notes ? `Notes: ${record.notes}` : ''}
    ${record.results ? `Results: ${record.results}` : ''}
    
    Doctor: ${record.doctor_name}
    `;
    
    const blob = new Blob([textBlob], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `medical-record-${recordDate}.txt`);
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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Medical Records
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Access your personal medical records and lab test results
      </Typography>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<MedicalIcon />} label="Medical Records" iconPosition="start" />
          <Tab icon={<LabIcon />} label="Lab Tests" iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {medicalRecords.length === 0 ? (
            <Alert severity="info">No medical records available.</Alert>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Diagnosis</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {medicalRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.doctor_name}</TableCell>
                      <TableCell>
                        {record.diagnosis.length > 50
                          ? `${record.diagnosis.substring(0, 50)}...`
                          : record.diagnosis}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DocumentIcon />}
                            onClick={() => handleViewDetails(record)}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => generatePDF(record)}
                          >
                            Download
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {labTests.length === 0 ? (
            <Alert severity="info">No lab tests available.</Alert>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Test Name</TableCell>
                    <TableCell>Date Ordered</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {labTests.map((test) => (
                    <TableRow key={test.id} hover>
                      <TableCell>{test.name}</TableCell>
                      <TableCell>{test.date_ordered}</TableCell>
                      <TableCell>{test.doctor_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={test.status}
                          color={test.status === 'COMPLETED' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DocumentIcon />}
                            onClick={() => handleViewDetails(test)}
                            disabled={test.status !== 'COMPLETED'}
                          >
                            View Results
                          </Button>
                          {test.status === 'COMPLETED' && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<DownloadIcon />}
                              onClick={() => generatePDF(test)}
                            >
                              Download
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      {/* Detail dialog for medical records or lab tests */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRecord && (
            selectedRecord.diagnosis 
              ? 'Medical Record Details' 
              : 'Lab Test Results'
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selectedRecord && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">
                    {selectedRecord.diagnosis ? 'Date' : 'Test Date'}:
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedRecord.date || selectedRecord.date_ordered}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Doctor:</Typography>
                  <Typography variant="body1" paragraph>
                    {selectedRecord.doctor_name}
                  </Typography>
                </Grid>
                
                {selectedRecord.diagnosis && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Diagnosis:</Typography>
                      <Typography variant="body1" paragraph>
                        {selectedRecord.diagnosis}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Prescription:</Typography>
                      <Typography variant="body1" paragraph>
                        {selectedRecord.prescription}
                      </Typography>
                    </Grid>
                    {selectedRecord.notes && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Notes:</Typography>
                        <Typography variant="body1" paragraph>
                          {selectedRecord.notes}
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}
                
                {selectedRecord.name && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Test Name:</Typography>
                      <Typography variant="body1" paragraph>
                        {selectedRecord.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">Test Type:</Typography>
                      <Typography variant="body1" paragraph>
                        {selectedRecord.test_type}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">Status:</Typography>
                      <Typography variant="body1" paragraph>
                        {selectedRecord.status}
                      </Typography>
                    </Grid>
                    {selectedRecord.results && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Results:</Typography>
                        <Typography variant="body1" paragraph>
                          {selectedRecord.results}
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button 
            onClick={() => generatePDF(selectedRecord)} 
            startIcon={<DownloadIcon />}
            variant="contained"
          >
            Download Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientMedicalRecords; 