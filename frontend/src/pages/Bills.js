import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  CheckCircle as PaidIcon,
  Pending as PendingIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material';

const getStatusIcon = (status) => {
  switch (status) {
    case 'PAID':
      return <PaidIcon color="success" />;
    case 'PENDING':
      return <PendingIcon color="warning" />;
    case 'CANCELLED':
      return <CancelledIcon color="error" />;
    default:
      return null;
  }
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

const Bills = () => {
  const { currentUser } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/bills/');
        setBills(response.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch bills: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  const handleMarkAsPaid = async (id) => {
    try {
      const response = await axios.post(`/api/bills/${id}/pay/`);
      // Update local state
      setBills(bills.map(bill => 
        bill.id === id ? response.data : bill
      ));
    } catch (err) {
      console.error('Error marking bill as paid:', err);
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

  const isReceptionist = currentUser?.user_type === 'RECEPTIONIST';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Bills
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            View and manage patient bills
          </Typography>
        </div>
      </Box>

      {bills.length === 0 ? (
        <Alert severity="info">No bills available at the moment.</Alert>
      ) : (
        <Grid container spacing={3}>
          {bills.map((bill) => (
            <Grid item xs={12} sm={6} md={4} key={bill.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ReceiptIcon color="primary" />
                      <Typography variant="h6" component="div">
                        Bill #{bill.id}
                      </Typography>
                    </Box>
                    <Chip
                      icon={getStatusIcon(bill.payment_status)}
                      label={bill.payment_status}
                      color={getStatusColor(bill.payment_status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Patient:</strong> {bill.patient_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Amount:</strong> ${bill.amount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Date Generated:</strong> {bill.date_generated}
                  </Typography>
                  
                  {bill.payment_status === 'PAID' && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Payment Date:</strong> {bill.payment_date}
                    </Typography>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Description:</strong>
                  </Typography>
                  <Typography variant="body2">{bill.description}</Typography>
                  
                  {isReceptionist && bill.payment_status === 'PENDING' && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        color="success"
                        size="small"
                        onClick={() => handleMarkAsPaid(bill.id)}
                      >
                        Mark as Paid
                      </Button>
                    </Box>
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

export default Bills; 