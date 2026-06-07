import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import AuthService from '../services/AuthService';
import Modal from '../components/Modal';
import DoctorForm from '../components/forms/DoctorForm';
import PatientForm from '../components/forms/PatientForm';
import ReceptionistForm from '../components/forms/ReceptionistForm';
import AppointmentForm from '../components/forms/AppointmentForm';
import ConfirmDialog from '../components/ConfirmDialog';
import SystemLogs from '../components/SystemLogs';
import SystemDiagnostic from '../components/SystemDiagnostic';
import '../styles/Dashboard.css';

export default function HMSDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all'); // 'all', 'error', 'warning', 'info'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  const dataFetched = useRef(false);
  
  // State for modals
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showReceptionistModal, setShowReceptionistModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLogDetailsModal, setShowLogDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [deleteAction, setDeleteAction] = useState(null); // Function to call on confirm delete

  // Appointment filters
  const [appointmentFilters, setAppointmentFilters] = useState({
    doctorId: '',
    patientId: '',
    status: ''
  });

  // Check if user is logged in and has admin role
  useEffect(() => {
    if (!user || user.userType !== 'Admin') {
      navigate('/login/admin');
    }
  }, [user, navigate]);

  // Only fetch data once when component mounts
  useEffect(() => {
    // Skip if not logged in
    if (!user || user.userType !== 'Admin') {
      return;
    }

    fetchData();
  }, [user]);

  // Function to fetch all data
  const fetchData = async () => {
    if (dataFetched.current) return;
    
    setLoading(true);
    setError(null);
    dataFetched.current = true;
    
    try {
      console.log('Fetching dashboard data...');
      
      // Clear cache first to ensure fresh data
      if (apiClient.cache && typeof apiClient.cache.clear === 'function') {
        apiClient.cache.clear();
      }
      
      // Fetch all data for the admin dashboard with proper error handling and namespaces
      try {
        print('Fetching doctors data...');
        const doctorsResponse = await apiClient.get('/api/doctors/');
        console.log('Doctors data:', doctorsResponse.data);
        
        const sanitizedDoctors = Array.isArray(doctorsResponse.data) 
          ? doctorsResponse.data.map(doctor => ({
              ...doctor,
              doctor_id: doctor.doctor_id,
              first_name: doctor.first_name || '',
              last_name: doctor.last_name || '',
              specialization: doctor.specialization || '',
              department: doctor.department || '',
              email: doctor.email || '',
              contact_number: doctor.contact_number || ''
            }))
          : [];
        
        setDoctors(sanitizedDoctors);
      } catch (doctorErr) {
        console.error('Failed to fetch doctors:', doctorErr);
        setDoctors([]);
      }
      
      try {
        console.log('Fetching patients data...');
        
        // Fetch both patient data sources using explicit api namespaces
        const patientProfilesPromise = apiClient.get('/api/patients/');
        const hmsPatientPromise = apiClient.get('/api/patients/'); // Updated fallback to match primary router mapping
        
        // Wait for both requests to complete
        const [patientProfilesResponse, hmsPatientResponse] = await Promise.all([
          patientProfilesPromise,
          hmsPatientPromise
        ]);
        
        console.log('PatientProfiles data:', patientProfilesResponse.data);
        
        // Create maps for easier lookups
        const hmsPatientMap = {};
        const patientProfileMap = {};
        
        // Map HMS patients by reg_num and name
        if (Array.isArray(hmsPatientResponse.data)) {
          hmsPatientResponse.data.forEach(patient => {
            const key = `${patient.first_name}-${patient.last_name}-${patient.reg_num}`;
            hmsPatientMap[key] = patient;
            if (patient.reg_num) {
              hmsPatientMap[patient.reg_num] = patient;
            }
          });
        }
        
        // Map PatientProfiles by username and name
        if (Array.isArray(patientProfilesResponse.data)) {
          patientProfilesResponse.data.forEach(profile => {
            if (profile.user_details) {
              const userName = profile.user_details.username;
              const firstName = profile.user_details.first_name;
              const lastName = profile.user_details.last_name;
              const key = `${firstName}-${lastName}-${userName}`;
              patientProfileMap[key] = profile;
              patientProfileMap[userName] = profile;
            }
          });
        }
        
        // Combine both data sources
        let allPatients = [];
        
        if (Array.isArray(hmsPatientResponse.data)) {
          allPatients = hmsPatientResponse.data.map(hmsPatient => {
            const firstName = hmsPatient.first_name;
            const lastName = hmsPatient.last_name;
            const regNum = hmsPatient.reg_num;
            const key = `${firstName}-${lastName}-${regNum}`;
            const profile = patientProfileMap[key] || patientProfileMap[regNum];
            
            return {
              patient_id: hmsPatient.patient_id,
              hms_patient_id: hmsPatient.patient_id,
              reg_num: hmsPatient.reg_num,
              first_name: hmsPatient.first_name,
              last_name: hmsPatient.last_name,
              gender: hmsPatient.gender,
              date_of_birth: hmsPatient.date_of_birth,
              contact_number: hmsPatient.contact_number || (profile ? profile.contact_number : ''),
              email: hmsPatient.email,
              address: profile ? profile.address : '',
              auth_id: profile && profile.user_details ? profile.user_details.id : null
            };
          });
        }
        
        console.log('Combined patients data:', allPatients);
        setPatients(allPatients);
      } catch (patientErr) {
        console.error('Failed to fetch patients:', patientErr);
        setPatients([]);
      }
      
      try {
        console.log('Fetching appointments data...');
        const appointmentsResponse = await apiClient.get('/api/appointments/');
        console.log('Appointments data:', appointmentsResponse.data);
        
        const sanitizedAppointments = Array.isArray(appointmentsResponse.data)
          ? appointmentsResponse.data.map(appointment => ({
              ...appointment,
              appointment_id: appointment.appointment_id,
              patient_name: appointment.patient_name || 'Unknown Patient',
              doctor_name: appointment.doctor_name || 'Unknown Doctor',
              appointment_date: appointment.appointment_date || new Date().toISOString(),
              reason: appointment.reason || '',
              status: appointment.status || 'Scheduled',
              patient_id: appointment.patient_id,
              doctor_id: appointment.doctor_id
            }))
          : [];
        
        setAppointments(sanitizedAppointments);
      } catch (appointmentErr) {
        console.error('Failed to fetch appointments:', appointmentErr);
        setAppointments([]);
      }
      
      // Fetch real receptionist data from database via API namespace
      try {
        console.log('Fetching receptionists data...');
        const receptionistsResponse = await apiClient.get('/api/receptionists/');
        console.log('Receptionists data:', receptionistsResponse.data);
        
        const sanitizedReceptionists = Array.isArray(receptionistsResponse.data)
          ? receptionistsResponse.data.map(receptionist => ({
              receptionist_id: receptionist.receptionist_id,
              first_name: receptionist.first_name || '',
              last_name: receptionist.last_name || '',
              contact_number: receptionist.contact_number || '',
              email: receptionist.email || '',
              join_date: receptionist.join_date || new Date().toISOString(),
              address: receptionist.address || '',
              user_id: receptionist.user_details?.id || null
            }))
          : [];
        
        setReceptionists(sanitizedReceptionists);
      } catch (receptionistErr) {
        console.error('Failed to fetch receptionists:', receptionistErr);
        setReceptionists([]);
      }
      
      const mockLogs = generateMockLogs(25);
      setLogs(mockLogs);
      setLogsLoading(false);
      
      setDataInitialized(true);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(`Failed to load dashboard data. ${err.message || 'Please try again.'}`);
      setLoading(false);
      setDataInitialized(true);
    }
  };
  
  // Fetch system logs
  const fetchSystemLogs = async () => {
    setLogsLoading(true);
    try {
      const mockLogs = generateMockLogs(25);
      setLogs(mockLogs);
    } catch (err) {
      console.error("Error generating logs:", err);
      const errorLog = {
        id: `error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'error',
        source: 'system',
        message: `Failed to generate logs: ${err.message || 'Unknown error'}`,
        details: JSON.stringify({ error: err.toString(), stack: err.stack }, null, 2)
      };
      
      const mockLogs = [errorLog, ...generateMockLogs(15)];
      setLogs(mockLogs);
    } finally {
      setLogsLoading(false);
    }
  };
  
  // Generate mock logs for demonstration
  const generateMockLogs = (count = 20) => {
    const levels = ['info', 'warning', 'error'];
    const sources = ['system', 'auth', 'database', 'api'];
    const messages = [
      'User login successful',
      'User login failed',
      'Database connection established',
      'Database query error',
      'API request received',
      'API request failed',
      'Patient record updated',
      'Doctor record created',
      'Appointment scheduled',
      'Appointment cancelled',
      'System backup completed',
      'File upload failed',
      'Email notification sent',
      'Password reset requested',
      'User session expired'
    ];
    
    const mockLogs = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now.getTime() - (i * 1000 * 60 * Math.floor(Math.random() * 60)));
      const detailsObj = {
        userId: Math.floor(Math.random() * 1000),
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0',
        requestPath: `/api/${['users', 'doctors', 'patients', 'appointments'][Math.floor(Math.random() * 4)]}`,
        statusCode: [200, 201, 400, 404, 500][Math.floor(Math.random() * 5)]
      };
      
      mockLogs.push({
        id: `log-${i}`,
        timestamp: timestamp.toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        details: JSON.stringify(detailsObj, null, 2)
      });
    }
    
    mockLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return mockLogs;
  };

  // Reset data cache and fetch fresh data
  const resetDataCache = () => {
    dataFetched.current = false;
    try {
      if (apiClient.cache && typeof apiClient.cache.clear === 'function') {
        apiClient.cache.clear();
      } else {
        const cache = window.apiClientCache || {};
        if (cache.clear && typeof cache.clear === 'function') {
          cache.clear();
        }
      }
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
    
    setLoading(true);
    setError(null);
    fetchData();
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'logs' && logs.length === 0) {
      try {
        fetchSystemLogs();
      } catch (error) {
        console.error("Error while fetching logs:", error);
        setLogs(generateMockLogs(15));
      }
    }
    if (tab === 'diagnostics') {
      setError(null);
    }
  };

  // Filter logs by level
  const handleLogFilterChange = (filter) => {
    setLogFilter(filter);
  };
  
  // Get filtered logs based on current filter
  const getFilteredLogs = () => {
    if (logFilter === 'all') {
      return logs;
    }
    return logs.filter(log => log.level === logFilter);
  };
  
  // Format date for log display
  const formatLogDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) ? date.toLocaleString() : 'Invalid date';
    } catch (e) {
      return 'N/A';
    }
  };

  // Format date for display (general purpose)
  const formatDate = (dateString, fallback = 'N/A') => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) 
        ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : fallback;
    } catch (e) {
      return fallback;
    }
  };
  
  // Format date and time
  const formatDateTime = (dateString, fallback = 'N/A') => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime())
        ? date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : fallback;
    } catch (e) {
      return fallback;
    }
  };

  // Handle adding a new doctor
  const handleAddDoctor = () => {
    setSelectedItem(null);
    setModalMode('add');
    setShowDoctorModal(true);
  };

  // Handle editing a doctor
  const handleEditDoctor = (doctor) => {
    setSelectedItem(doctor);
    setModalMode('edit');
    setShowDoctorModal(true);
  };

  // Handle doctor form submission
  const handleDoctorSubmit = async (doctorData) => {
    try {
      let response;
      if (modalMode === 'add') {
        const newDoctor = doctorData.data ? doctorData.data : doctorData;
        setDoctors([...doctors, newDoctor]);
      } else {
        response = await apiClient.put(`/api/doctors/${doctorData.doctor_id}/`, doctorData);
        setDoctors(doctors.map(d => d.doctor_id === doctorData.doctor_id ? response.data : d));
      }
      setShowDoctorModal(false);
    } catch (error) {
      console.error('Error saving doctor:', error);
      alert(`Failed to ${modalMode === 'add' ? 'add' : 'update'} doctor: ${error.message}`);
    }
  };

  // View doctor details
  const handleViewDoctor = (doctor) => {
    setSelectedItem(doctor);
    setModalMode('view');
    setShowDoctorModal(true);
  };

  // Handle delete doctor
  const handleDeleteDoctor = (doctor) => {
    setSelectedItem(doctor);
    setDeleteAction(() => async () => {
      try {
        if (doctor.doctor_id && !doctor.doctor_id.toString().startsWith('temp-') && 
            !doctor.doctor_id.toString().startsWith('new-')) {
          await apiClient.delete(`/api/doctors/${doctor.doctor_id}/`);
        }
        setDoctors(doctors.filter(d => d.doctor_id !== doctor.doctor_id));
        setShowConfirmDialog(false);
      } catch (error) {
        console.error('Error deleting doctor:', error);
        alert('Failed to delete doctor. Please try again.');
      }
    });
    setShowConfirmDialog(true);
  };

  // Patient handling functions
  const handleAddPatient = () => {
    setSelectedItem(null);
    setModalMode('add');
    setShowPatientModal(true);
  };

  const handleEditPatient = (patient) => {
    setSelectedItem(patient);
    setModalMode('edit');
    setShowPatientModal(true);
  };

  const handleViewPatient = (patient) => {
    setSelectedItem(patient);
    setModalMode('view');
    setShowPatientModal(true);
  };

  const handlePatientSubmit = async (patientData) => {
    try {
      if (modalMode === 'add') {
        const newPatient = patientData.data; 
        setPatients(prevPatients => [...prevPatients, newPatient]);
      } else {
        const response = await apiClient.put(`/api/patients/${patientData.patient_id}/`, patientData);
        setPatients(prevPatients => 
          prevPatients.map(p => p.patient_id === patientData.patient_id ? response.data : p)
        );
      }
      setShowPatientModal(false);
    } catch (error) {
      console.error('Error in handlePatientSubmit:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred.';
      alert(`Failed to ${modalMode === 'add' ? 'add' : 'update'} patient: ${errorMessage}`);
    }
  };

  const handleDeletePatient = (patient) => {
    setSelectedItem(patient);
    setDeleteAction(() => async () => {
      try {
        if (patient.patient_id && !patient.patient_id.toString().startsWith('temp-') && 
            !patient.patient_id.toString().startsWith('new-')) {
          await apiClient.delete(`/api/patients/${patient.patient_id}/`);
        }
        setPatients(patients.filter(p => p.patient_id !== patient.patient_id));
        setShowConfirmDialog(false);
      } catch (error) {
        console.error('Error deleting patient:', error);
        alert('Failed to delete patient. Please try again.');
      }
    });
    setShowConfirmDialog(true);
  };

  // Appointment handling functions
  const handleViewAppointment = (appointment) => {
    setSelectedItem(appointment);
    setModalMode('view');
    setShowAppointmentModal(true);
  };

  // Handle appointment filter changes
  const handleAppointmentFilterChange = (e) => {
    const { name, value } = e.target;
    setAppointmentFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Get filtered appointments
  const getFilteredAppointments = () => {
    return appointments.filter(appointment => {
      if (appointmentFilters.doctorId && 
          appointment.doctor_id.toString() !== appointmentFilters.doctorId) {
        return false;
      }
      if (appointmentFilters.patientId && 
          appointment.patient_id.toString() !== appointmentFilters.patientId) {
        return false;
      }
      if (appointmentFilters.status && 
          appointment.status !== appointmentFilters.status) {
        return false;
      }
      return true;
    });
  };

  const handleAppointmentSubmit = async (appointmentData) => {
    try {
      setShowAppointmentModal(false);
    } catch (error) {
      console.error('Error with appointment:', error);
      alert(`An error occurred: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteAppointment = (appointment) => {
    setSelectedItem(appointment);
    setDeleteAction(() => async () => {
      try {
        if (appointment.appointment_id && !appointment.appointment_id.toString().startsWith('temp-') && 
            !appointment.appointment_id.toString().startsWith('new-')) {
          await apiClient.delete(`/api/appointments/${appointment.appointment_id}/`);
        }
        setAppointments(appointments.filter(a => a.appointment_id !== appointment.appointment_id));
        setShowConfirmDialog(false);
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Failed to delete appointment. Please try again.');
      }
    });
    setShowConfirmDialog(true);
  };

  // Format JSON details for display
  const formatLogDetails = (details) => {
    if (!details) return null;
    try {
      const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
      if (detailsObj && typeof detailsObj === 'object') {
        return JSON.stringify(detailsObj, null, 2);
      }
      return typeof details === 'string' ? details : JSON.stringify(details);
    } catch (e) {
      return typeof details === 'string' ? details : String(details);
    }
  };

  // Receptionist management functions
  const handleAddReceptionist = () => {
    setModalMode('add');
    setSelectedItem(null);
    setShowReceptionistModal(true);
  };
  
  const handleEditReceptionist = (receptionist) => {
    setModalMode('edit');
    setSelectedItem(receptionist);
    setShowReceptionistModal(true);
  };
  
  const handleViewReceptionist = (receptionist) => {
    setModalMode('view');
    setSelectedItem(receptionist);
    setShowReceptionistModal(true);
  };
  
  const handleReceptionistSubmit = async (receptionistData) => {
    try {
      if (modalMode === 'add') {
        const receptionistResponse = receptionistData.data?.data || receptionistData.data || receptionistData;
        if (receptionistResponse && (receptionistResponse.receptionist_id || receptionistResponse.id)) {
          const formattedReceptionist = {
            receptionist_id: receptionistResponse.receptionist_id || receptionistResponse.id,
            first_name: receptionistResponse.first_name || receptionistResponse.user?.first_name || '',
            last_name: receptionistResponse.last_name || receptionistResponse.user?.last_name || '',
            contact_number: receptionistResponse.contact_number || '',
            email: receptionistResponse.email || receptionistResponse.user?.email || '',
            join_date: receptionistResponse.join_date || new Date().toISOString(),
            address: receptionistResponse.address || '',
            user_id: receptionistResponse.user?.id || null
          };
          setReceptionists(prevReceptionists => [...prevReceptionists, formattedReceptionist]);
        }
      } else if (modalMode === 'edit') {
        const receptionistId = receptionistData.receptionist_id || receptionistData.id;
        const response = await apiClient.put(`/api/receptionists/${receptionistId}/`, receptionistData);
        setReceptionists(prevReceptionists => 
          prevReceptionists.map(item => item.receptionist_id === receptionistId ? response.data : item)
        );
      }
      setShowReceptionistModal(false);
    } catch (error) {
      console.error('Error in handleReceptionistSubmit:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred.';
      alert(`Failed to ${modalMode === 'add' ? 'add' : 'update'} receptionist: ${errorMessage}`);
      setShowReceptionistModal(true);
    }
  };
  
  const handleDeleteReceptionist = (receptionist) => {
    setSelectedItem(receptionist);
    setDeleteAction(() => async () => {
      try {
        const receptionistId = receptionist.receptionist_id || receptionist.id;
        await apiClient.delete(`/api/receptionists/${receptionistId}/`);
        setReceptionists(prev => prev.filter(r => r.receptionist_id !== receptionistId));
        setShowConfirmDialog(false);
      } catch (error) {
        console.error('Failed to delete receptionist:', error);
        alert('Failed to delete receptionist. Please try again.');
      }
    });
    setShowConfirmDialog(true);
  };

  if (!user || user.userType !== 'Admin') {
    return null;
  }

  if (loading && !dataInitialized) {
    return <div className="loading-spinner">Loading HMS dashboard...</div>;
  }

  if (error && !dataInitialized) {
    return (
      <div className="error-message">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={resetDataCache} className="edit-profile-btn">
          Try Again
        </button>
      </div>
    );
  }

  const dashboardStats = [
    { name: 'Total Doctors', value: doctors.length, icon: 'fa-user-md', color: 'blue' },
    { name: 'Total Patients', value: patients.length, icon: 'fa-users', color: 'green' },
    { name: 'Appointments', value: appointments.length, icon: 'fa-calendar-check', color: 'orange' },
    { name: 'Pending Appointments', 
      value: appointments.filter(a => a.status === 'Scheduled').length, 
      icon: 'fa-clock', 
      color: 'red' 
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-sidebar">
        <div className="admin-info">
          <div className="admin-avatar">
            <i className="fas fa-user-shield"></i>
          </div>
          <h3>Admin Dashboard</h3>
          <p>{user?.username || 'Administrator'}</p>
        </div>
        
        <nav className="dashboard-nav">
          <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
            <i className="fas fa-th-large"></i> Overview
          </button>
          <button className={`nav-item ${activeTab === 'doctors' ? 'active' : ''}`} onClick={() => handleTabChange('doctors')}>
            <i className="fas fa-user-md"></i> Doctors
          </button>
          <button className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => handleTabChange('patients')}>
            <i className="fas fa-users"></i> Patients
          </button>
          <button className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => handleTabChange('appointments')}>
            <i className="fas fa-calendar-alt"></i> Appointments
          </button>
          <button className={`nav-item ${activeTab === 'receptionists' ? 'active' : ''}`} onClick={() => handleTabChange('receptionists')}>
            <i className="fas fa-user-tie"></i> Receptionists
          </button>
          <button className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => handleTabChange('logs')}>
            <i className="fas fa-list-alt"></i> System Logs
          </button>
          <button className={`nav-item ${activeTab === 'diagnostics' ? 'active' : ''}`} onClick={() => handleTabChange('diagnostics')}>
            <i className="fas fa-heartbeat"></i> Diagnostics
          </button>
        </nav>
        
        <div className="admin-actions">
          <button onClick={resetDataCache} className="refresh-button">
            <i className="fas fa-sync-alt"></i> Refresh Data
          </button>
          <button onClick={() => AuthService.logout()} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="dashboard-section">
            <h2>Hospital Overview</h2>
            <div className="stats-grid">
              {dashboardStats.map((stat, index) => (
                <div className={`stat-card stat-${stat.color}`} key={index}>
                  <div className="stat-icon">
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                  <div className="stat-details">
                    <h3>{stat.value}</h3>
                    <p>{stat.name}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="overview-charts">
              <div className="chart-container">
                <h3>Recent Appointments</h3>
                <div className="recent-items">
                  {appointments.slice(0, 5).map(appointment => {
                    const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : new Date();
                    const dateStr = isNaN(appointmentDate.getTime()) ? 'Invalid date' : appointmentDate.toLocaleString();
                    return (
                      <div className="recent-item" key={appointment.appointment_id || `appointment-${Math.random()}`}>
                        <div className="recent-item-info">
                          <h4>{appointment.patient_name || 'Unknown Patient'}</h4>
                          <p>with Dr. {appointment.doctor_name || 'Unknown Doctor'}</p>
                          <small>{dateStr}</small>
                        </div>
                        <span className={`status-badge status-${(appointment.status || 'scheduled').toLowerCase()}`}>
                          {appointment.status || 'Scheduled'}
                        </span>
                      </div>
                    );
                  })}
                  {appointments.length === 0 && <p>No appointments scheduled yet.</p>}
                </div>
              </div>
              
              <div className="chart-container">
                <h3>Quick Actions</h3>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={handleAddDoctor}>
                    <i className="fas fa-plus-circle"></i> Add New Doctor
                  </button>
                  <button className="quick-action-btn" onClick={handleAddPatient}>
                    <i className="fas fa-user-plus"></i> Register Patient
                  </button>
                  <button className="quick-action-btn" onClick={() => handleTabChange('diagnostics')}>
                    <i className="fas fa-stethoscope"></i> System Diagnostics
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'doctors' && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>All Doctors</h2>
              <button className="primary-btn" onClick={handleAddDoctor}>
                <i className="fas fa-plus"></i> Add Doctor
              </button>
            </div>
            {doctors.length === 0 ? <p>No doctors found.</p> : (
              <div className="doctors-grid">
                {doctors.map(doctor => (
                  <div className="doctor-card" key={doctor.doctor_id || `doctor-${Math.random()}`}>
                    <div className="doctor-avatar">
                      <i className="fas fa-user-md"></i>
                    </div>
                    <h3>Dr. {`${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Unknown'}</h3>
                    <p className="doctor-specialty">{doctor.specialization || 'General Medicine'}</p>
                    <p className="doctor-department">{doctor.department || 'Not assigned'}</p>
                    <div className="doctor-contact">
                      <div><i className="fas fa-envelope"></i> {doctor.email || 'N/A'}</div>
                      <div><i className="fas fa-phone"></i> {doctor.contact_number || 'N/A'}</div>
                    </div>
                    <div className="doctor-actions">
                      <button className="doctor-btn" onClick={() => handleViewDoctor(doctor)}>View Profile</button>
                      <button className="doctor-btn" onClick={() => handleEditDoctor(doctor)}>Edit</button>
                      <button className="doctor-btn delete" onClick={() => handleDeleteDoctor(doctor)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'patients' && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>All Patients</h2>
              <button className="primary-btn" onClick={handleAddPatient}>
                <i className="fas fa-plus"></i> Register Patient
              </button>
            </div>
            {patients.length === 0 ? <p>No patients found.</p> : (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Date of Birth</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(patient => (
                      <tr key={patient.patient_id || `patient-${Math.random()}`}>
                        <td>{patient.reg_num || patient.patient_id || 'N/A'}</td>
                        <td>{`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'N/A'}</td>
                        <td>{patient.gender || 'Not specified'}</td>
                        <td>{formatDate(patient.date_of_birth)}</td>
                        <td>{patient.contact_number || 'N/A'}</td>
                        <td>{patient.email || 'N/A'}</td>
                        <td>
                          <button className="action-btn view-btn" onClick={() => handleViewPatient(patient)}>
                            <i className="fas fa-eye"></i>
                          </button>
                          <button className="action-btn edit-btn" onClick={() => handleEditPatient(patient)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="action-btn delete-btn" onClick={() => handleDeletePatient(patient)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'appointments' && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>All Appointments</h2>
            </div>
            <div className="filter-container">
              <div className="filter-group">
                <label>Filter by Doctor:</label>
                <select name="doctorId" value={appointmentFilters.doctorId} onChange={handleAppointmentFilterChange}>
                  <option value="">All Doctors</option>
                  {doctors.map(doctor => (
                    <option key={doctor.doctor_id} value={doctor.doctor_id}>
                      Dr. {doctor.first_name} {doctor.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Filter by Patient:</label>
                <select name="patientId" value={appointmentFilters.patientId} onChange={handleAppointmentFilterChange}>
                  <option value="">All Patients</option>
                  {patients.map(patient => (
                    <option key={patient.patient_id} value={patient.patient_id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Filter by Status:</label>
                <select name="status" value={appointmentFilters.status} onChange={handleAppointmentFilterChange}>
                  <option value="">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Rescheduled">Rescheduled</option>
                </select>
              </div>
              <button className="clear-filter-btn" onClick={() => setAppointmentFilters({ doctorId: '', patientId: '', status: '' })}>
                Clear Filters
              </button>
            </div>
            {appointments.length === 0 ? <p>No appointments found.</p> : (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Date & Time</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAppointments().map(appointment => (
                      <tr key={appointment.appointment_id || `appointment-${Math.random()}`}>
                        <td>{appointment.appointment_id || 'N/A'}</td>
                        <td>{appointment.patient_name || 'N/A'}</td>
                        <td>{appointment.doctor_name || 'N/A'}</td>
                        <td>{formatDateTime(appointment.appointment_date)}</td>
                        <td>{appointment.reason || 'Not specified'}</td>
                        <td>
                          <span className={`status-badge status-${(appointment.status || 'scheduled').toLowerCase()}`}>
                            {appointment.status || 'Scheduled'}
                          </span>
                        </td>
                        <td>
                          <button className="action-btn view-btn" onClick={() => handleViewAppointment(appointment)}>
                            <i className="fas fa-eye"></i>
                          </button>
                          <button className="action-btn delete-btn" onClick={() => handleDeleteAppointment(appointment)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'receptionists' && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>All Receptionists</h2>
              <button className="primary-btn" onClick={handleAddReceptionist}>
                <i className="fas fa-plus"></i> Add Receptionist
              </button>
            </div>
            {receptionists.length === 0 ? <p>No receptionists found.</p> : (
              <div className="receptionists-grid">
                {receptionists.map(receptionist => (
                  <div className="receptionist-card" key={receptionist.receptionist_id || `receptionist-${Math.random()}`}>
                    <div className="receptionist-avatar">
                      <i className="fas fa-user-tie"></i>
                    </div>
                    <h3>Receptionist {`${receptionist.first_name || ''} ${receptionist.last_name || ''}`.trim() || 'Unknown'}</h3>
                    <p className="receptionist-contact">
                      <i className="fas fa-envelope"></i> {receptionist.email || 'N/A'}
                    </p>
                    <div className="receptionist-actions">
                      <button className="receptionist-btn" onClick={() => handleViewReceptionist(receptionist)}>View Profile</button>
                      <button className="receptionist-btn" onClick={() => handleEditReceptionist(receptionist)}>Edit</button>
                      <button className="receptionist-btn delete" onClick={() => handleDeleteReceptionist(receptionist)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'logs' && (
          <div className="dashboard-section">
            <SystemLogs />
          </div>
        )}
        
        {activeTab === 'diagnostics' && (
          <div className="dashboard-section">
            <h2>System Diagnostics</h2>
            <SystemDiagnostic />
          </div>
        )}
      </div>

      {/* Modals */}
      {showDoctorModal && (
        <Modal title={modalMode === 'add' ? 'Add New Doctor' : modalMode === 'edit' ? 'Edit Doctor' : 'Doctor Details'} onClose={() => setShowDoctorModal(false)} size="large">
          <DoctorForm doctor={selectedItem} onSubmit={handleDoctorSubmit} onCancel={() => setShowDoctorModal(false)} readOnly={modalMode === 'view'} />
        </Modal>
      )}

      {showPatientModal && (
        <Modal title={modalMode === 'add' ? 'Register New Patient' : modalMode === 'edit' ? 'Edit Patient' : 'Patient Details'} onClose={() => setShowPatientModal(false)} size="large">
          <PatientForm patient={selectedItem} onSubmit={handlePatientSubmit} onCancel={() => setShowPatientModal(false)} readOnly={modalMode === 'view'} />
        </Modal>
      )}
      
      {showReceptionistModal && (
        <Modal title={modalMode === 'add' ? "Add New Receptionist" : modalMode === 'edit' ? "Edit Receptionist" : "Receptionist Details"} onClose={() => setShowReceptionistModal(false)}>
          <ReceptionistForm receptionist={selectedItem} onSubmit={handleReceptionistSubmit} onCancel={() => setShowReceptionistModal(false)} readOnly={modalMode === 'view'} />
        </Modal>
      )}

      {showAppointmentModal && (
        <Modal title={modalMode === 'add' ? 'Schedule New Appointment' : 'Appointment Details'} onClose={() => setShowAppointmentModal(false)} size="large">
          <AppointmentForm appointment={selectedItem} onSubmit={handleAppointmentSubmit} onCancel={() => setShowAppointmentModal(false)} readOnly={true} />
        </Modal>
      )}

      {showConfirmDialog && (
        <ConfirmDialog title="Confirm Delete" onClose={() => setShowConfirmDialog(false)} onConfirm={deleteAction} message={`Are you sure you want to delete this ${selectedItem?.doctor_id ? 'doctor' : selectedItem?.patient_id ? 'patient' : 'appointment'}?`} />
      )}
    </div>
  );
}