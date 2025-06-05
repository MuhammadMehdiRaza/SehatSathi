import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Grid,
  Divider,
  Avatar,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material';

const Profile = () => {
  const { currentUser, updateUserInfo } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
  });
  const [formDataProfile, setFormDataProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const endpoint = 
          currentUser?.user_type === 'DOCTOR' ? '/api/doctors/my_profile/' :
          currentUser?.user_type === 'PATIENT' ? '/api/patients/my_profile/' : '/api/users/profile/';
        const response = await axios.get(endpoint);
        setProfile(response.data);
        setFormData({
          first_name: response.data.user?.first_name || response.data.first_name || '',
          last_name: response.data.user?.last_name || response.data.last_name || '',
          phone_number: response.data.user?.phone_number || response.data.phone_number || '',
          email: response.data.user?.email || response.data.email || '',
        });

        // For doctor or patient specific fields
        if (currentUser?.user_type === 'DOCTOR') {
          setFormDataProfile({
            specialization: response.data.specialization || '',
            department: response.data.department || '',
            qualification: response.data.qualification || '',
            experience: response.data.experience || '',
            bio: response.data.bio || '',
            office_hours: response.data.office_hours || '',
            memberships: response.data.memberships || '',
          });
        } else if (currentUser?.user_type === 'PATIENT') {
          setFormDataProfile({
            blood_group: response.data.blood_group || '',
            date_of_birth: response.data.date_of_birth || '',
            gender: response.data.gender || '',
            address: response.data.address || '',
            emergency_contact: response.data.emergency_contact || '',
          });
        }
      } catch (err) {
        setError('Failed to fetch profile: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setFormDataProfile({
      ...formDataProfile,
      [name]: value
    });
  };

  const handleSaveChanges = async () => {
    try {
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        email: formData.email,
      };

      // Update user data
      await axios.patch('/api/users/profile/', userData);

      // Update profile-specific data if doctor or patient
      if (currentUser?.user_type === 'DOCTOR') {
        await axios.patch('/api/doctors/my_profile/', formDataProfile);
      } else if (currentUser?.user_type === 'PATIENT') {
        await axios.patch('/api/patients/my_profile/', formDataProfile);
      }

      // Update the auth context
      updateUserInfo({
        ...currentUser,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        email: formData.email,
      });

      setIsEditing(false);
      setError('');
    } catch (err) {
      setError('Failed to update profile: ' + (err.response?.data?.message || err.message));
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

  const getInitials = () => {
    return `${formData.first_name[0] || ''}${formData.last_name[0] || ''}`;
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        View and manage your personal information
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar
                sx={{ width: 72, height: 72, bgcolor: 'primary.main', mr: 2 }}
              >
                {getInitials()}
              </Avatar>
              <Box>
                <Typography variant="h5">
                  {formData.first_name} {formData.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentUser?.user_type}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
              onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)}
            >
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                fullWidth
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                fullWidth
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                fullWidth
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>
          </Grid>

          {currentUser?.user_type === 'DOCTOR' && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Professional Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Specialization"
                    name="specialization"
                    value={formDataProfile.specialization}
                    onChange={handleProfileInputChange}
                    fullWidth
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Department"
                    name="department"
                    value={formDataProfile.department}
                    onChange={handleProfileInputChange}
                    fullWidth
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Qualification"
                    name="qualification"
                    value={formDataProfile.qualification}
                    onChange={handleProfileInputChange}
                    fullWidth
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Experience (years)"
                    name="experience"
                    type="number"
                    value={formDataProfile.experience}
                    onChange={handleProfileInputChange}
                    fullWidth
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Bio"
                    name="bio"
                    value={formDataProfile.bio || ''}
                    onChange={handleProfileInputChange}
                    fullWidth
                    multiline
                    rows={4}
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Office Hours"
                    name="office_hours"
                    value={formDataProfile.office_hours || ''}
                    onChange={handleProfileInputChange}
                    fullWidth
                    placeholder="e.g. Mon-Fri: 9AM-5PM"
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Professional Memberships"
                    name="memberships"
                    value={formDataProfile.memberships || ''}
                    onChange={handleProfileInputChange}
                    fullWidth
                    placeholder="e.g. American Medical Association, etc."
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </>
          )}

          {currentUser?.user_type === 'PATIENT' && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Medical Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Blood Group"
                    name="blood_group"
                    value={formDataProfile.blood_group}
                    onChange={handleProfileInputChange}
                    fullWidth
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date of Birth"
                    name="date_of_birth"
                    type="date"
                    value={formDataProfile.date_of_birth}
                    onChange={handleProfileInputChange}
                    fullWidth
                    disabled={!isEditing}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Gender"
                    name="gender"
                    select
                    value={formDataProfile.gender}
                    onChange={handleProfileInputChange}
                    fullWidth
                    disabled={!isEditing}
                    margin="normal"
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Address"
                    name="address"
                    value={formDataProfile.address}
                    onChange={handleProfileInputChange}
                    fullWidth
                    multiline
                    rows={2}
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Emergency Contact"
                    name="emergency_contact"
                    value={formDataProfile.emergency_contact}
                    onChange={handleProfileInputChange}
                    fullWidth
                    disabled={!isEditing}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile; 