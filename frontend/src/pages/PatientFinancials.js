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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  CreditCard as PaymentIcon,
  Info as InfoIcon,
  Print as PrintIcon,
} from '@mui/icons-material';

const PatientFinancials = () => {
  const { currentUser } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/bills/');
        setBills(response.data);
        
        // Calculate totals
        const pending = response.data
          .filter(bill => bill.payment_status === 'PENDING')
          .reduce((total, bill) => total + parseFloat(bill.amount), 0);
          
        const paid = response.data
          .filter(bill => bill.payment_status === 'PAID')
          .reduce((total, bill) => total + parseFloat(bill.amount), 0);
          
        setTotalPending(pending);
        setTotalPaid(paid);
        
        setError('');
      } catch (err) {
        setError('Failed to fetch bills: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  const handleViewDetails = (bill) => {
    setSelectedBill(bill);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const printReceipt = () => {
    // In a real app, you would call an API to generate a receipt
    // or create a printable view
    window.print();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Financial History
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        View your bills and payment history
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#f5f5f5', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending Payments</Typography>
              </Box>
              <Typography variant="h4" color="error" gutterBottom>
                ₹{totalPending.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total amount due in pending bills
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#f5f5f5', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PaymentIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Paid Amount</Typography>
              </Box>
              <Typography variant="h4" color="success.main" gutterBottom>
                ₹{totalPaid.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total amount you have paid
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%' }}>
        {bills.length === 0 ? (
          <Alert severity="info">No billing records available.</Alert>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id} hover>
                    <TableCell>{bill.date_generated}</TableCell>
                    <TableCell>
                      {bill.description.length > 50
                        ? `${bill.description.substring(0, 50)}...`
                        : bill.description}
                    </TableCell>
                    <TableCell align="right">₹{parseFloat(bill.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={bill.payment_status}
                        color={getStatusColor(bill.payment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewDetails(bill)}
                          title="View Details"
                        >
                          <InfoIcon />
                        </IconButton>
                        {bill.payment_status === 'PAID' && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={printReceipt}
                            title="Print Receipt"
                          >
                            <PrintIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Detail dialog for bills */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Bill Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedBill && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Bill ID:</Typography>
                <Typography variant="body1" paragraph>
                  #{selectedBill.id}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Date Generated:</Typography>
                <Typography variant="body1" paragraph>
                  {selectedBill.date_generated}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Payment Status:</Typography>
                <Typography variant="body1" paragraph>
                  <Chip
                    label={selectedBill.payment_status}
                    color={getStatusColor(selectedBill.payment_status)}
                    size="small"
                  />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description:</Typography>
                <Typography variant="body1" paragraph>
                  {selectedBill.description}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Amount:</Typography>
                <Typography variant="h5" color={selectedBill.payment_status === 'PAID' ? 'success.main' : 'error'} paragraph>
                  ₹{parseFloat(selectedBill.amount).toFixed(2)}
                </Typography>
              </Grid>
              {selectedBill.payment_date && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Payment Date:</Typography>
                  <Typography variant="body1" paragraph>
                    {selectedBill.payment_date}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Alert severity="info" icon={<InfoIcon />}>
                  For payment-related queries, please contact the billing department.
                </Alert>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {selectedBill && selectedBill.payment_status === 'PAID' && (
            <Button 
              onClick={printReceipt} 
              startIcon={<PrintIcon />}
              variant="contained"
            >
              Print Receipt
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientFinancials; 