import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Create as CreateIcon,
  Edit as UpdateIcon,
  Delete as DeleteIcon,
  Visibility as ReadIcon,
} from '@mui/icons-material';

const getActionIcon = (action) => {
  switch (action) {
    case 'LOGIN':
      return <LoginIcon color="primary" />;
    case 'LOGOUT':
      return <LogoutIcon color="primary" />;
    case 'CREATE':
      return <CreateIcon color="success" />;
    case 'UPDATE':
      return <UpdateIcon color="warning" />;
    case 'DELETE':
      return <DeleteIcon color="error" />;
    case 'READ':
      return <ReadIcon color="info" />;
    default:
      return null;
  }
};

const getActionColor = (action) => {
  switch (action) {
    case 'LOGIN':
    case 'LOGOUT':
      return 'primary';
    case 'CREATE':
      return 'success';
    case 'UPDATE':
      return 'warning';
    case 'DELETE':
      return 'error';
    case 'READ':
      return 'info';
    default:
      return 'default';
  }
};

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/system-logs/');
        setLogs(response.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch system logs: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

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

  const handleActionFilterChange = (event) => {
    setActionFilter(event.target.value);
    setPage(0);
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

  // Filter logs based on search term and action filter
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === '' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const displayedLogs = filteredLogs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        System Logs
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        View system activity logs
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Search"
              variant="outlined"
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
              placeholder="Search by description or user..."
              size="small"
            />
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="action-filter-label">Filter by Action</InputLabel>
              <Select
                labelId="action-filter-label"
                id="action-filter"
                value={actionFilter}
                label="Filter by Action"
                onChange={handleActionFilterChange}
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="LOGIN">Login</MenuItem>
                <MenuItem value="LOGOUT">Logout</MenuItem>
                <MenuItem value="CREATE">Create</MenuItem>
                <MenuItem value="READ">Read</MenuItem>
                <MenuItem value="UPDATE">Update</MenuItem>
                <MenuItem value="DELETE">Delete</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {filteredLogs.length === 0 ? (
            <Alert severity="info">No logs match your search criteria.</Alert>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="system logs table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getActionIcon(log.action)}
                            label={log.action}
                            color={getActionColor(log.action)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredLogs.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemLogs; 