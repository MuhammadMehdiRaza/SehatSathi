import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button, CircularProgress, Alert, 
  Tabs, Tab, FormControl, InputLabel, Select, MenuItem, TextField, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, Tooltip,
  AppBar, Toolbar
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Assessment as ReportIcon,
  PieChart as ChartIcon,
  FileDownload as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  FilterList as FilterIcon,
  BarChart as PatientIcon,
  LocalHospital as DoctorIcon,
  EventNote as AppointmentIcon,
  Receipt as BillIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axiosInstance from '../utils/axiosConfig';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StatCard = ({ title, value, icon, color, subtext }) => (
  <Card sx={{ height: '100%', bgcolor: `${color}.light` }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        <Box sx={{ mr: 2, color: `${color}.main` }}>
          {icon}
        </Box>
        <Typography variant="h6" color="text.primary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" align="center" sx={{ my: 2 }}>
        {value}
      </Typography>
      {subtext && (
        <Typography variant="body2" color="text.secondary" align="center">
          {subtext}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const ReportsStatistics = () => {
  const [tabValue, setTabValue] = useState(0);
  const [reportType, setReportType] = useState('patient');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [patientStats, setPatientStats] = useState({
    total: 0,
    new_this_month: 0,
    active: 0,
    inactive: 0
  });
  const [appointmentStats, setAppointmentStats] = useState({
    total: 0,
    completed: 0,
    upcoming: 0,
    cancelled: 0
  });
  const [financialStats, setFinancialStats] = useState({
    total_revenue: 0,
    paid_amount: 0,
    pending_amount: 0
  });
  const [downloadInProgress, setDownloadInProgress] = useState(false);

  useEffect(() => {
    // Fetch real statistics from the database
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Try to get real data from API
      let response;
      try {
        response = await axiosInstance.get('/api/statistics/');
        setPatientStats(response.data.patients);
        setAppointmentStats(response.data.appointments);
        setFinancialStats(response.data.financials);
      } catch (apiError) {
        console.warn('API not ready, using mock data:', apiError);
        // Fallback to mock data if API fails
        setPatientStats({
          total: 150,
          new_this_month: 12,
          active: 122,
          inactive: 28,
          gender_distribution: { 'Male': 70, 'Female': 78, 'Other': 2 },
          age_distribution: {
            '0-18': 25,
            '19-35': 45,
            '36-50': 38,
            '51-65': 30,
            '65+': 12
          }
        });
        setAppointmentStats({
          total: 420,
          completed: 310,
          upcoming: 75,
          cancelled: 35,
          monthly_trend: [42, 38, 55, 40, 32, 28, 45, 50, 35, 30, 28, 35],
          by_department: {
            'Cardiology': 85,
            'Orthopedics': 65,
            'Pediatrics': 50,
            'Neurology': 60,
            'General Medicine': 110,
            'Dermatology': 35,
            'Ophthalmology': 15
          }
        });
        setFinancialStats({
          total_revenue: 125000,
          pending_amount: 15000,
          paid_amount: 110000,
          monthly_revenue: [12500, 9800, 11200, 10500, 9700, 10200, 11800, 12300, 10700, 9500, 8800, 9500],
          by_service: {
            'Consultations': 45000,
            'Lab Tests': 35000,
            'Procedures': 30000,
            'Medications': 15000
          }
        });
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch statistics: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleReportTypeChange = (event) => {
    setReportType(event.target.value);
  };

  const handleStartDateChange = (date) => {
    setDateRange({ ...dateRange, startDate: date });
  };

  const handleEndDateChange = (date) => {
    setDateRange({ ...dateRange, endDate: date });
  };

  const handleDownloadReport = async (format) => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Please select date range');
      return;
    }

    setDownloadInProgress(true);
    try {
      const reportParams = {
        type: reportType,
        from_date: dateRange.startDate.toISOString().split('T')[0],
        to_date: dateRange.endDate.toISOString().split('T')[0],
        export: format
      };
      
      try {
        // Use axios to trigger file download
        const response = await axiosInstance.get('/api/admin/reports/', {
          params: reportParams,
          responseType: 'blob' // Important for file downloads
        });
        
        // Create a blob from the response data
        const blob = new Blob([response.data], { 
          type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
        });
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link and click it to start the download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${reportType}_report.${format}`);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } catch (apiError) {
        console.warn('Download API not ready, generating file locally:', apiError);
        
        if (format === 'pdf') {
          generatePDF();
        } else {
          generateCSV();
        }
      }
    } catch (err) {
      setError('Failed to download report: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloadInProgress(false);
    }
  };

  const handleDownloadStatistics = async (format) => {
    setDownloadInProgress(true);
    try {
      const statParams = {
        export: format
      };

      if (dateRange.startDate && dateRange.endDate) {
        statParams.from_date = dateRange.startDate.toISOString().split('T')[0];
        statParams.to_date = dateRange.endDate.toISOString().split('T')[0];
      }
      
      try {
        // Use axios to trigger file download
        const response = await axiosInstance.get('/api/admin/statistics/', {
          params: statParams,
          responseType: 'blob' // Important for file downloads
        });
        
        // Create a blob from the response data
        const blob = new Blob([response.data], { 
          type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
        });
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link and click it to start the download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `statistics.${format}`);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } catch (apiError) {
        console.warn('Download API not ready, generating file locally:', apiError);
        
        if (format === 'pdf') {
          generateStatsPDF();
        } else {
          generateStatsCSV();
        }
      }
    } catch (err) {
      setError('Failed to download statistics: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloadInProgress(false);
    }
  };

  // Generate PDF for reports
  const generatePDF = () => {
    if (!reportData || !reportData.data || reportData.data.length === 0) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(18);
    doc.text(reportData.title, 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Date Range: ${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`, 14, 30);
    doc.text(`Total Records: ${reportData.data.length}`, 14, 38);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 46);
    
    // Add table data
    const tableColumn = [];
    const tableRows = [];
    
    // Define columns based on report type
    if (reportType === 'patient') {
      tableColumn.push(['Patient Name', 'Gender', 'Age', 'Visits', 'Last Visit']);
      reportData.data.forEach(item => {
        const row = [
          item.name,
          item.gender,
          item.age,
          item.visits,
          item.lastVisit
        ];
        tableRows.push(row);
      });
    } else if (reportType === 'appointment') {
      tableColumn.push(['Doctor', 'Department', 'Patients', 'Completed', 'Cancelled']);
      reportData.data.forEach(item => {
        const row = [
          item.doctor,
          item.department,
          item.patients,
          item.completed,
          item.cancelled
        ];
        tableRows.push(row);
      });
    } else if (reportType === 'financial') {
      tableColumn.push(['Category', 'Amount', 'Paid', 'Pending']);
      reportData.data.forEach(item => {
        const row = [
          item.category,
          '$' + (item.amount || 0).toLocaleString(),
          '$' + (item.paid || 0).toLocaleString(),
          '$' + (item.pending || 0).toLocaleString()
        ];
        tableRows.push(row);
      });
    }
    
    // Add table to PDF
    doc.autoTable({
      head: tableColumn,
      body: tableRows,
      startY: 55,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 118, 144] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { top: 55 }
    });
    
    // Add footer
    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(10);
    doc.text('© SehatSathi Healthcare System', 14, finalY + 15);
    doc.text(`Page 1 of 1`, 170, finalY + 15);

    // Save PDF
    doc.save(`${reportType}_report.pdf`);
  };
  
  // Generate PDF for statistics
  const generateStatsPDF = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(18);
    doc.text('Healthcare Statistics Report', 14, 22);
    
    doc.setFontSize(11);
    let dateRangeText = 'All Time';
    if (dateRange.startDate && dateRange.endDate) {
      dateRangeText = `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`;
    }
    doc.text(`Date Range: ${dateRangeText}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);
    
    let yPos = 50;
    
    // Patient Statistics
    doc.setFontSize(14);
    doc.text('Patient Statistics', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.text(`Total Patients: ${patientStats.total || 0}`, 20, yPos);
    yPos += 7;
    doc.text(`New Patients (This Month): ${patientStats.new_this_month || 0}`, 20, yPos);
    yPos += 7;
    doc.text(`Active Patients: ${patientStats.active || 0}`, 20, yPos);
    yPos += 7;
    doc.text(`Inactive Patients: ${patientStats.inactive || 0}`, 20, yPos);
    yPos += 15;
    
    // Appointment Statistics
    doc.setFontSize(14);
    doc.text('Appointment Statistics', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.text(`Total Appointments: ${appointmentStats.total || 0}`, 20, yPos);
    yPos += 7;
    doc.text(`Completed Appointments: ${appointmentStats.completed || 0}`, 20, yPos);
    yPos += 7;
    doc.text(`Upcoming Appointments: ${appointmentStats.upcoming || 0}`, 20, yPos);
    yPos += 7;
    doc.text(`Cancelled Appointments: ${appointmentStats.cancelled || 0}`, 20, yPos);
    yPos += 15;
    
    // Financial Statistics
    doc.setFontSize(14);
    doc.text('Financial Statistics', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.text(`Total Revenue: $${(financialStats.total_revenue || 0).toLocaleString()}`, 20, yPos);
    yPos += 7;
    doc.text(`Paid Amount: $${(financialStats.paid_amount || 0).toLocaleString()}`, 20, yPos);
    yPos += 7;
    doc.text(`Pending Amount: $${(financialStats.pending_amount || 0).toLocaleString()}`, 20, yPos);
    yPos += 15;
    
    // Department Distribution
    if (appointmentStats.by_department) {
      doc.setFontSize(14);
      doc.text('Appointments by Department', 14, yPos);
      yPos += 10;
      
      const tableColumn = [['Department', 'Count']];
      const tableRows = [];
      
      Object.entries(appointmentStats.by_department).forEach(([dept, count]) => {
        tableRows.push([dept, count]);
      });
      
      doc.autoTable({
        head: tableColumn,
        body: tableRows,
        startY: yPos,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 118, 144] },
        alternateRowStyles: { fillColor: [241, 245, 249] }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Add footer
    doc.setFontSize(10);
    doc.text('© SehatSathi Healthcare System', 14, 280);
    doc.text(`Page 1 of 1`, 170, 280);

    // Save PDF
    doc.save(`statistics.pdf`);
  };
  
  // Generate CSV for reports
  const generateCSV = () => {
    if (!reportData || !reportData.data || reportData.data.length === 0) {
      alert('No data to export');
      return;
    }
    
    let headers = [];
    
    // Define headers based on report type
    if (reportType === 'patient') {
      headers = ['Patient Name', 'Gender', 'Age', 'Visits', 'Last Visit'];
    } else if (reportType === 'appointment') {
      headers = ['Doctor', 'Department', 'Patients', 'Completed', 'Cancelled'];
    } else if (reportType === 'financial') {
      headers = ['Category', 'Amount', 'Paid', 'Pending'];
    }
    
    // Generate CSV content
    let csvContent = headers.join(',') + '\n';
    
    reportData.data.forEach(item => {
      let row = [];
      
      if (reportType === 'patient') {
        row = [
          `"${item.name}"`,
          `"${item.gender}"`,
          item.age,
          item.visits,
          `"${item.lastVisit}"`
        ];
      } else if (reportType === 'appointment') {
        row = [
          `"${item.doctor}"`,
          `"${item.department}"`,
          item.patients,
          item.completed,
          item.cancelled
        ];
      } else if (reportType === 'financial') {
        row = [
          `"${item.category}"`,
          (item.amount || 0),
          (item.paid || 0),
          (item.pending || 0)
        ];
      }
      
      csvContent += row.join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Generate CSV for statistics
  const generateStatsCSV = () => {
    // Create sections for the CSV
    let csvContent = 'SehatSathi Healthcare Statistics Report\n\n';
    
    // Date info
    let dateRangeText = 'All Time';
    if (dateRange.startDate && dateRange.endDate) {
      dateRangeText = `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`;
    }
    csvContent += `Date Range,${dateRangeText}\n`;
    csvContent += `Generated on,${new Date().toLocaleString()}\n\n`;
    
    // Patient Statistics
    csvContent += 'PATIENT STATISTICS\n';
    csvContent += `Total Patients,${patientStats.total || 0}\n`;
    csvContent += `New Patients (This Month),${patientStats.new_this_month || 0}\n`;
    csvContent += `Active Patients,${patientStats.active || 0}\n`;
    csvContent += `Inactive Patients,${patientStats.inactive || 0}\n\n`;
    
    // Appointment Statistics
    csvContent += 'APPOINTMENT STATISTICS\n';
    csvContent += `Total Appointments,${appointmentStats.total || 0}\n`;
    csvContent += `Completed Appointments,${appointmentStats.completed || 0}\n`;
    csvContent += `Upcoming Appointments,${appointmentStats.upcoming || 0}\n`;
    csvContent += `Cancelled Appointments,${appointmentStats.cancelled || 0}\n\n`;
    
    // Financial Statistics
    csvContent += 'FINANCIAL STATISTICS\n';
    csvContent += `Total Revenue,$${(financialStats.total_revenue || 0).toLocaleString()}\n`;
    csvContent += `Paid Amount,$${(financialStats.paid_amount || 0).toLocaleString()}\n`;
    csvContent += `Pending Amount,$${(financialStats.pending_amount || 0).toLocaleString()}\n\n`;
    
    // Gender Distribution
    if (patientStats.gender_distribution) {
      csvContent += 'GENDER DISTRIBUTION\n';
      csvContent += 'Gender,Count\n';
      
      Object.entries(patientStats.gender_distribution).forEach(([gender, count]) => {
        csvContent += `${gender},${count}\n`;
      });
      csvContent += '\n';
    }
    
    // Department Distribution
    if (appointmentStats.by_department) {
      csvContent += 'APPOINTMENTS BY DEPARTMENT\n';
      csvContent += 'Department,Count\n';
      
      Object.entries(appointmentStats.by_department).forEach(([dept, count]) => {
        csvContent += `${dept},${count}\n`;
      });
      csvContent += '\n';
    }
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'statistics.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const reportParams = {
        type: reportType,
        from_date: dateRange.startDate.toISOString().split('T')[0],
        to_date: dateRange.endDate.toISOString().split('T')[0]
      };
      
      // Try to get real data from API
      let response;
      try {
        response = await axiosInstance.get('/api/admin/reports/preview/', { 
          params: reportParams 
        });
        setReportData(response.data);
      } catch (apiError) {
        console.warn('API not ready, using mock data:', apiError);
        // Fallback to mock data if API fails
        let mockReportData;
        
        switch (reportType) {
          case 'patient':
            mockReportData = {
              title: 'Patient Report',
              period: `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`,
              data: [
                { name: 'John Doe', gender: 'Male', age: 45, visits: 3, lastVisit: '2023-05-15' },
                { name: 'Jane Smith', gender: 'Female', age: 32, visits: 1, lastVisit: '2023-06-02' },
                { name: 'Robert Johnson', gender: 'Male', age: 58, visits: 5, lastVisit: '2023-06-10' },
                { name: 'Emily Davis', gender: 'Female', age: 29, visits: 2, lastVisit: '2023-05-20' },
                { name: 'Michael Brown', gender: 'Male', age: 41, visits: 4, lastVisit: '2023-06-15' }
              ]
            };
            break;
          case 'appointment':
            mockReportData = {
              title: 'Appointment Report',
              period: `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`,
              data: [
                { doctor: 'Dr. Smith', department: 'Cardiology', patients: 25, completed: 22, cancelled: 3 },
                { doctor: 'Dr. Johnson', department: 'Orthopedics', patients: 18, completed: 16, cancelled: 2 },
                { doctor: 'Dr. Williams', department: 'Pediatrics', patients: 30, completed: 28, cancelled: 2 },
                { doctor: 'Dr. Brown', department: 'Neurology', patients: 15, completed: 12, cancelled: 3 },
                { doctor: 'Dr. Davis', department: 'General Medicine', patients: 35, completed: 31, cancelled: 4 }
              ]
            };
            break;
          case 'financial':
            mockReportData = {
              title: 'Financial Report',
              period: `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`,
              data: [
                { category: 'Consultations', amount: 45000, paid: 40000, pending: 5000 },
                { category: 'Lab Tests', amount: 35000, paid: 32000, pending: 3000 },
                { category: 'Procedures', amount: 30000, paid: 25000, pending: 5000 },
                { category: 'Medications', amount: 15000, paid: 13000, pending: 2000 }
              ]
            };
            break;
          default:
            mockReportData = { title: 'Unknown Report Type', data: [] };
        }
        
        setReportData(mockReportData);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to generate report: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <AppBar position="static" color="default" elevation={0} sx={{ mb: 3 }}>
          <Toolbar>
            <Box display="flex" alignItems="center" flexGrow={1}>
              <ReportIcon fontSize="large" sx={{ mr: 1 }} />
              <Typography variant="h5" component="div">
                Reports & Statistics
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Tooltip title="Download as PDF">
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<PdfIcon />} 
                  onClick={() => handleDownloadStatistics('pdf')}
                  sx={{ mr: 1 }}
                >
                  PDF
                </Button>
              </Tooltip>
              <Tooltip title="Download as CSV">
                <Button 
                  variant="outlined" 
                  color="primary"
                  startIcon={<CsvIcon />} 
                  onClick={() => handleDownloadStatistics('csv')}
                >
                  CSV
                </Button>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Paper sx={{ mb: 4 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab icon={<ChartIcon />} label="Statistics Dashboard" id="report-tab-0" />
            <Tab icon={<ReportIcon />} label="Generate Reports" id="report-tab-1" />
          </Tabs>

          {/* Statistics Dashboard Tab */}
          <TabPanel value={tabValue} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box display="flex" justifyContent="flex-end" mb={2}>
                  <Button 
                    variant="outlined" 
                    startIcon={<DownloadIcon />} 
                    onClick={() => handleDownloadStatistics('csv')}
                    disabled={downloadInProgress}
                    sx={{ mr: 1 }}
                  >
                    {downloadInProgress ? 'Downloading...' : 'Download CSV'}
                  </Button>
                  <Button 
                    variant="contained" 
                    startIcon={<DownloadIcon />} 
                    onClick={() => handleDownloadStatistics('pdf')}
                    disabled={downloadInProgress}
                  >
                    {downloadInProgress ? 'Downloading...' : 'Download PDF'}
                  </Button>
                </Box>
                
                <Typography variant="h6" gutterBottom>
                  Patient Statistics
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Total Patients"
                      value={patientStats.total}
                      icon={<PatientIcon fontSize="large" />}
                      color="primary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="New Patients"
                      value={patientStats.new_this_month}
                      icon={<PatientIcon fontSize="large" />}
                      color="success"
                      subtext="This month"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Active Patients"
                      value={patientStats.active}
                      icon={<PatientIcon fontSize="large" />}
                      color="info"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Inactive Patients"
                      value={patientStats.inactive}
                      icon={<PatientIcon fontSize="large" />}
                      color="warning"
                    />
                  </Grid>
                </Grid>

                <Typography variant="h6" gutterBottom>
                  Appointment Statistics
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Total Appointments"
                      value={appointmentStats.total}
                      icon={<AppointmentIcon fontSize="large" />}
                      color="primary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Completed"
                      value={appointmentStats.completed}
                      icon={<AppointmentIcon fontSize="large" />}
                      color="success"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Upcoming"
                      value={appointmentStats.upcoming}
                      icon={<AppointmentIcon fontSize="large" />}
                      color="info"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Cancelled"
                      value={appointmentStats.cancelled}
                      icon={<AppointmentIcon fontSize="large" />}
                      color="error"
                    />
                  </Grid>
                </Grid>

                <Typography variant="h6" gutterBottom>
                  Financial Statistics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                      title="Total Revenue"
                      value={`$${(financialStats.total_revenue || 0).toLocaleString()}`}
                      icon={<BillIcon fontSize="large" />}
                      color="primary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                      title="Paid Amount"
                      value={`$${(financialStats.paid_amount || 0).toLocaleString()}`}
                      icon={<BillIcon fontSize="large" />}
                      color="success"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                      title="Pending Amount"
                      value={`$${(financialStats.pending_amount || 0).toLocaleString()}`}
                      icon={<BillIcon fontSize="large" />}
                      color="warning"
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </TabPanel>

          {/* Generate Reports Tab */}
          <TabPanel value={tabValue} index={1}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Report Parameters
                </Typography>
                <Box>
                  <Tooltip title="Download as PDF">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PdfIcon />}
                      onClick={() => handleDownloadReport('pdf')}
                      disabled={!reportData || downloadInProgress}
                      sx={{ mr: 1 }}
                    >
                      {downloadInProgress ? 'Downloading...' : 'PDF'}
                    </Button>
                  </Tooltip>
                  <Tooltip title="Download as CSV">
                    <Button
                      variant="outlined"
                      startIcon={<CsvIcon />}
                      onClick={() => handleDownloadReport('csv')}
                      disabled={!reportData || downloadInProgress}
                    >
                      {downloadInProgress ? 'Downloading...' : 'CSV'}
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel id="report-type-label">Report Type</InputLabel>
                    <Select
                      labelId="report-type-label"
                      value={reportType}
                      label="Report Type"
                      onChange={handleReportTypeChange}
                    >
                      <MenuItem value="patient">Patient Report</MenuItem>
                      <MenuItem value="appointment">Appointment Report</MenuItem>
                      <MenuItem value="financial">Financial Report</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={dateRange.startDate}
                      onChange={handleStartDateChange}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={4}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="End Date"
                      value={dateRange.endDate}
                      onChange={handleEndDateChange}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
              
              <Box display="flex" mt={3}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={generateReport}
                  startIcon={<ReportIcon />}
                  sx={{ mr: 2 }}
                >
                  Generate Report
                </Button>
              </Box>
            </Paper>
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            )}
            
            {error && <Alert severity="error">{error}</Alert>}
            
            {reportData && (
              <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    {reportData.title}
                  </Typography>
                  <Box>
                    <Tooltip title="Download as PDF">
                      <IconButton 
                        onClick={() => handleDownloadReport('pdf')} 
                        color="primary"
                        disabled={downloadInProgress}
                      >
                        <PdfIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download as CSV">
                      <IconButton 
                        onClick={() => handleDownloadReport('csv')} 
                        color="primary"
                        disabled={downloadInProgress}
                      >
                        <CsvIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography variant="subtitle2" color="text.secondary" paragraph>
                  From {dateRange.startDate.toLocaleDateString()} to {dateRange.endDate.toLocaleDateString()} • Total Records: {reportData.data.length}
                </Typography>
                
                <TableContainer>
                  <Table aria-label="report table">
                    <TableHead>
                      <TableRow>
                        {reportType === 'patient' && (
                          <>
                            <TableCell>Patient Name</TableCell>
                            <TableCell align="right">Gender</TableCell>
                            <TableCell align="right">Age</TableCell>
                            <TableCell align="right">Visits</TableCell>
                            <TableCell align="right">Last Visit</TableCell>
                          </>
                        )}
                        {reportType === 'appointment' && (
                          <>
                            <TableCell>Doctor</TableCell>
                            <TableCell align="right">Department</TableCell>
                            <TableCell align="right">Patients</TableCell>
                            <TableCell align="right">Completed</TableCell>
                            <TableCell align="right">Cancelled</TableCell>
                          </>
                        )}
                        {reportType === 'financial' && (
                          <>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell align="right">Paid</TableCell>
                            <TableCell align="right">Pending</TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.data.map((row, index) => (
                        <TableRow key={index}>
                          {reportType === 'patient' && (
                            <>
                              <TableCell>{row.name}</TableCell>
                              <TableCell align="right">{row.gender}</TableCell>
                              <TableCell align="right">{row.age}</TableCell>
                              <TableCell align="right">{row.visits}</TableCell>
                              <TableCell align="right">{row.lastVisit}</TableCell>
                            </>
                          )}
                          {reportType === 'appointment' && (
                            <>
                              <TableCell>{row.doctor}</TableCell>
                              <TableCell align="right">{row.department}</TableCell>
                              <TableCell align="right">{row.patients}</TableCell>
                              <TableCell align="right">{row.completed}</TableCell>
                              <TableCell align="right">{row.cancelled}</TableCell>
                            </>
                          )}
                          {reportType === 'financial' && (
                            <>
                              <TableCell>{row.category}</TableCell>
                              <TableCell align="right">${(row.amount || 0).toLocaleString()}</TableCell>
                              <TableCell align="right">${(row.paid || 0).toLocaleString()}</TableCell>
                              <TableCell align="right">${(row.pending || 0).toLocaleString()}</TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </TabPanel>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default ReportsStatistics; 