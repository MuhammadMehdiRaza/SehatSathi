import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Box, Button, Grid, TextField,
  FormControl, InputLabel, Select, MenuItem, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axiosInstance from '../utils/axiosConfig';
import { format } from 'date-fns';

const BillGeneration = () => {
  const [patients, setPatients] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  
  const [billData, setBillData] = useState({
    patient: '',
    amount: '',
    description: '',
    payment_status: 'PENDING'
  });
  
  const [paymentDate, setPaymentDate] = useState(new Date());
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  useEffect(() => {
    fetchPatients();
    fetchBills();
  }, []);
  
  const fetchPatients = async () => {
    try {
      const response = await axiosInstance.get('/api/patients/');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };
  
  const fetchBills = async () => {
    try {
      const response = await axiosInstance.get('/api/bills/');
      setBills(response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load bills',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBillData({ ...billData, [name]: value });
  };
  
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setBillData({
      patient: '',
      amount: '',
      description: '',
      payment_status: 'PENDING'
    });
  };
  
  const handleOpenPaymentDialog = (bill) => {
    setSelectedBill(bill);
    setOpenPaymentDialog(true);
  };
  
  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setSelectedBill(null);
  };
  
  const handleGenerateBill = async () => {
    try {
      await axiosInstance.post('/api/bills/', {
        patient: billData.patient,
        amount: billData.amount,
        description: billData.description,
        payment_status: billData.payment_status
      });
      
      setSnackbar({
        open: true,
        message: 'Bill generated successfully',
        severity: 'success'
      });
      
      fetchBills();
      handleCloseDialog();
    } catch (error) {
      console.error('Error generating bill:', error);
      setSnackbar({
        open: true,
        message: 'Failed to generate bill',
        severity: 'error'
      });
    }
  };
  
  const handleMarkAsPaid = async () => {
    try {
      const formattedDate = format(paymentDate, 'yyyy-MM-dd');
      
      await axiosInstance.post(`/api/bills/${selectedBill.id}/mark_as_paid/`, {
        payment_date: formattedDate
      });
      
      setSnackbar({
        open: true,
        message: 'Bill marked as paid',
        severity: 'success'
      });
      
      fetchBills();
      handleClosePaymentDialog();
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      setSnackbar({
        open: true,
        message: 'Failed to mark bill as paid',
        severity: 'error'
      });
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Grid container justifyContent="space-between" alignItems="center" mb={3}>
          <Grid item>
            <Typography variant="h5">Manage Bills</Typography>
          </Grid>
          <Grid item>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleOpenDialog}
            >
              Generate New Bill
            </Button>
          </Grid>
        </Grid>
        
        <Paper elevation={3} sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Bill ID</TableCell>
                    <TableCell>Patient Name</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Date Generated</TableCell>
                    <TableCell>Payment Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No bills found
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.id}</TableCell>
                        <TableCell>
                          {`${bill.patient_details?.user?.first_name || ''} ${bill.patient_details?.user?.last_name || ''}`}
                        </TableCell>
                        <TableCell>₹{bill.amount}</TableCell>
                        <TableCell>{bill.description}</TableCell>
                        <TableCell>{bill.date_generated}</TableCell>
                        <TableCell>{bill.payment_status}</TableCell>
                        <TableCell>
                          {bill.payment_status === 'PENDING' && (
                            <Button 
                              size="small" 
                              color="primary" 
                              onClick={() => handleOpenPaymentDialog(bill)}
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
        
        {/* Generate Bill Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle>Generate New Bill</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Patient</InputLabel>
                    <Select
                      name="patient"
                      value={billData.patient}
                      onChange={handleInputChange}
                      label="Patient"
                    >
                      {patients.map((patient) => (
                        <MenuItem key={patient.id} value={patient.id}>
                          {`${patient.user.first_name} ${patient.user.last_name}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    name="amount"
                    label="Amount (₹)"
                    type="number"
                    fullWidth
                    value={billData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    name="description"
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    value={billData.description}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      name="payment_status"
                      value={billData.payment_status}
                      onChange={handleInputChange}
                      label="Payment Status"
                    >
                      <MenuItem value="PENDING">Pending</MenuItem>
                      <MenuItem value="PAID">Paid</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleGenerateBill} 
              variant="contained" 
              color="primary"
              disabled={!billData.patient || !billData.amount || !billData.description}
            >
              Generate Bill
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Mark as Paid Dialog */}
        <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} fullWidth maxWidth="sm">
          <DialogTitle>Mark Bill as Paid</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {selectedBill && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body1">
                      Bill for: {`${selectedBill.patient_details?.user?.first_name || ''} ${selectedBill.patient_details?.user?.last_name || ''}`}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="body1">
                      Amount: ₹{selectedBill.amount}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <DatePicker
                      label="Payment Date"
                      value={paymentDate}
                      onChange={(date) => setPaymentDate(date)}
                      renderInput={(params) => 
                        <TextField {...params} fullWidth required />
                      }
                    />
                  </Grid>
                </Grid>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>Cancel</Button>
            <Button 
              onClick={handleMarkAsPaid} 
              variant="contained" 
              color="primary"
            >
              Confirm Payment
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
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default BillGeneration; 