# Import views packages 

# Import statistics views
from .statistics_views import * 

# Import chatbot views
from .chatbot_views import *

# Define necessary ViewSets
from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from ..models import (
    Department, Doctor, Patient, Appointment, 
    MedicalRecord, LabTest, Bill, SystemLog,
    Role, UserRole
)
from ..serializers import (
    UserSerializer, DepartmentSerializer, DoctorSerializer,
    PatientSerializer, AppointmentSerializer, MedicalRecordSerializer,
    LabTestSerializer, BillSerializer, SystemLogSerializer,
    UserRegistrationSerializer, RoleSerializer, UserRoleSerializer,
    PermissionSerializer
)
from django.contrib.auth.models import Permission
from django.utils import timezone

User = get_user_model()

# Authentication views
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@csrf_exempt
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    # First check if the user exists
    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            'message': 'No account found with this email address'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Then try to authenticate
    user = authenticate(request, username=email, password=password)
    
    if user is not None:
        login(request, user)
        
        # Log the login action
        SystemLog.objects.create(
            user=user,
            action='LOGIN',
            description=f"User {user.email} logged in"
        )
        
        # Return user details
        serializer = UserSerializer(user)
        return Response({
            'user': serializer.data,
            'message': 'Login successful'
        })
    else:
        # Wrong password
        return Response({
            'message': 'Invalid password'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@csrf_exempt
def logout_view(request):
    # Log the logout action
    SystemLog.objects.create(
        user=request.user,
        action='LOGOUT',
        description=f"User {request.user.email} logged out"
    )
    
    logout(request)
    return Response({'message': 'Logged out successfully'})

@api_view(['GET'])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['GET', 'PATCH', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    user = request.user
    
    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    elif request.method in ['PATCH', 'PUT']:
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Dashboard views
@api_view(['GET'])
def admin_dashboard(request):
    """
    Dashboard data for admin users
    """
    # Count of various entities
    doctors_count = Doctor.objects.count()
    patients_count = Patient.objects.count()
    appointments_count = Appointment.objects.count()
    
    # Get appointment status counts
    pending_appointments = Appointment.objects.filter(status='REQUESTED').count()
    completed_appointments = Appointment.objects.filter(status='COMPLETED').count()
    
    # Get billing info
    total_bills = Bill.objects.count()
    pending_bills = Bill.objects.filter(payment_status='PENDING').count()
    paid_bills = Bill.objects.filter(payment_status='PAID').count()
    
    # Get recent activity
    recent_appointments = Appointment.objects.order_by('-created_at')[:5]
    recent_patients = Patient.objects.order_by('-user__date_joined')[:5]
    
    # For more detailed statistics, call the statistics function
    try:
        from .statistics_views import get_statistics as get_detailed_stats
        detailed_stats = get_detailed_stats(request).data
    except Exception as e:
        detailed_stats = {'error': str(e)}
    
    # Return the dashboard data
    return Response({
        'total_doctors': doctors_count,
        'total_patients': patients_count,
        'total_appointments': appointments_count,
        'pending_appointments': pending_appointments,
        'completed_appointments': completed_appointments,
        'total_bills': total_bills,
        'pending_bills': pending_bills,
        'paid_bills': paid_bills,
        'detailed_stats': detailed_stats,
    })

@api_view(['GET'])
def doctor_dashboard(request):
    """
    Dashboard data for doctor users
    """
    try:
        doctor = Doctor.objects.get(user=request.user)
        
        # Get appointments for this doctor
        total_appointments = Appointment.objects.filter(doctor=doctor).count()
        pending_appointments = Appointment.objects.filter(doctor=doctor, status='REQUESTED').count()
        today_appointments = Appointment.objects.filter(
            doctor=doctor, 
            date=timezone.now().date()
        ).count()
        
        # Get patient counts for this doctor
        patient_ids = Appointment.objects.filter(doctor=doctor).values_list('patient', flat=True).distinct()
        total_patients = len(patient_ids)
        
        # Get recent appointments
        recent_appointments = Appointment.objects.filter(doctor=doctor).order_by('-date')[:5]
        
        # Return the dashboard data
        return Response({
            'doctor_name': f"Dr. {doctor.user.first_name} {doctor.user.last_name}",
            'specialty': doctor.specialization,
            'total_appointments': total_appointments,
            'pending_appointments': pending_appointments,
            'today_appointments': today_appointments,
            'total_patients': total_patients,
        })
    except Doctor.DoesNotExist:
        return Response({
            'message': 'Doctor profile not found',
            'error': 'No doctor profile associated with this user account'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def patient_dashboard(request):
    """
    Dashboard data for patient users
    """
    try:
        patient = Patient.objects.get(user=request.user)
        
        # Get appointments for this patient
        total_appointments = Appointment.objects.filter(patient=patient).count()
        pending_appointments = Appointment.objects.filter(patient=patient, status='REQUESTED').count()
        upcoming_appointments = Appointment.objects.filter(
            patient=patient, 
            date__gte=timezone.now().date(),
            status='SCHEDULED'
        ).count()
        
        # Get medical records count
        medical_records_count = MedicalRecord.objects.filter(patient=patient).count()
        
        # Get billing information
        total_bills = Bill.objects.filter(patient=patient).count()
        pending_bills = Bill.objects.filter(patient=patient, payment_status='PENDING').count()
        
        # Get lab tests information
        lab_tests_count = LabTest.objects.filter(patient=patient).count()
        pending_lab_tests = LabTest.objects.filter(patient=patient, status='ORDERED').count()
        
        # Return the dashboard data
        return Response({
            'patient_name': f"{patient.user.first_name} {patient.user.last_name}",
            'total_appointments': total_appointments,
            'pending_appointments': pending_appointments,
            'upcoming_appointments': upcoming_appointments,
            'medical_records_count': medical_records_count,
            'total_bills': total_bills,
            'pending_bills': pending_bills,
            'lab_tests_count': lab_tests_count,
            'pending_lab_tests': pending_lab_tests,
        })
    except Patient.DoesNotExist:
        return Response({
            'message': 'Patient profile not found',
            'error': 'No patient profile associated with this user account'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def receptionist_dashboard(request):
    """
    Dashboard data for receptionist users
    """
    # Today's date
    today = timezone.now().date()
    
    # Today's appointments
    today_appointments = Appointment.objects.filter(date=today).count()
    pending_appointments = Appointment.objects.filter(status='REQUESTED').count()
    
    # Patient registrations today
    today_registrations = Patient.objects.filter(
        user__date_joined__date=today
    ).count()
    
    # Pending bills
    pending_bills = Bill.objects.filter(payment_status='PENDING').count()
    
    # Return the dashboard data
    return Response({
        'today_appointments': today_appointments,
        'pending_appointments': pending_appointments,
        'today_registrations': today_registrations,
        'pending_bills': pending_bills,
    })

# Department views
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

# Doctor views
class DoctorViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorSerializer
    
    def get_queryset(self):
        # Admins and receptionists can see all doctors
        if self.request.user.user_type in ['ADMIN', 'RECEPTIONIST']:
            return Doctor.objects.all()
        
        # Patients can see all doctors for booking appointments
        elif self.request.user.user_type == 'PATIENT':
            return Doctor.objects.all()
        
        # Doctors can only see their own profile
        elif self.request.user.user_type == 'DOCTOR':
            try:
                return Doctor.objects.filter(user=self.request.user)
            except Doctor.DoesNotExist:
                return Doctor.objects.none()
        
        return Doctor.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get', 'patch'])
    def my_profile(self, request):
        try:
            doctor = Doctor.objects.get(user=request.user)
            
            if request.method == 'PATCH':
                serializer = self.get_serializer(doctor, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(doctor)
            return Response(serializer.data)
        except Doctor.DoesNotExist:
            return Response(
                {'detail': 'Doctor profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

# Patient views
class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    
    def get_queryset(self):
        # Admins and receptionists can see all patients
        if self.request.user.user_type in ['ADMIN', 'RECEPTIONIST']:
            return Patient.objects.all()
        
        # Doctors can see all patients
        elif self.request.user.user_type == 'DOCTOR':
            return Patient.objects.all()
        
        # Patients can only see their own profile
        elif self.request.user.user_type == 'PATIENT':
            try:
                return Patient.objects.filter(user=self.request.user)
            except Patient.DoesNotExist:
                return Patient.objects.none()
        
        return Patient.objects.none()
    
    def get_permissions(self):
        if self.action in ['create']:
            # Allow both admins and receptionists to create patients
            return [permissions.IsAuthenticated()]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['destroy']:
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get', 'patch'])
    def my_profile(self, request):
        """
        Get the profile for the current logged-in patient
        """
        try:
            patient = Patient.objects.get(user=request.user)
            
            if request.method == 'PATCH':
                serializer = self.get_serializer(patient, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(patient)
            return Response(serializer.data)
        except Patient.DoesNotExist:
            return Response(
                {'detail': 'Patient profile not found for current user'}, 
                status=status.HTTP_404_NOT_FOUND
            )

# Appointment views
class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    
    def get_queryset(self):
        # Admins and receptionists can see all appointments
        if self.request.user.user_type in ['ADMIN', 'RECEPTIONIST']:
            return Appointment.objects.all()
        
        # Doctors can see only their appointments
        elif self.request.user.user_type == 'DOCTOR':
            try:
                doctor = Doctor.objects.get(user=self.request.user)
                return Appointment.objects.filter(doctor=doctor)
            except Doctor.DoesNotExist:
                return Appointment.objects.none()
        
        # Patients can see only their appointments
        elif self.request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=self.request.user)
                return Appointment.objects.filter(patient=patient)
            except Patient.DoesNotExist:
                return Appointment.objects.none()
        
        return Appointment.objects.none()

# Medical Record views
class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    
    def get_queryset(self):
        # Admins can see all records
        if self.request.user.user_type == 'ADMIN':
            return MedicalRecord.objects.all()
        
        # Doctors can see records of their patients
        elif self.request.user.user_type == 'DOCTOR':
            try:
                doctor = Doctor.objects.get(user=self.request.user)
                return MedicalRecord.objects.filter(doctor=doctor)
            except Doctor.DoesNotExist:
                return MedicalRecord.objects.none()
        
        # Patients can see only their records
        elif self.request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=self.request.user)
                return MedicalRecord.objects.filter(patient=patient)
            except Patient.DoesNotExist:
                return MedicalRecord.objects.none()
        
        return MedicalRecord.objects.none()

# Lab Test views
class LabTestViewSet(viewsets.ModelViewSet):
    serializer_class = LabTestSerializer
    
    def get_queryset(self):
        # Admins can see all lab tests
        if self.request.user.user_type == 'ADMIN':
            return LabTest.objects.all()
        
        # Doctors can see lab tests they ordered
        elif self.request.user.user_type == 'DOCTOR':
            try:
                doctor = Doctor.objects.get(user=self.request.user)
                return LabTest.objects.filter(doctor=doctor)
            except Doctor.DoesNotExist:
                return LabTest.objects.none()
        
        # Patients can see only their lab tests
        elif self.request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=self.request.user)
                return LabTest.objects.filter(patient=patient)
            except Patient.DoesNotExist:
                return LabTest.objects.none()
        
        return LabTest.objects.none()

# Bill views
class BillViewSet(viewsets.ModelViewSet):
    serializer_class = BillSerializer
    
    def get_queryset(self):
        # Admins and receptionists can see all bills
        if self.request.user.user_type in ['ADMIN', 'RECEPTIONIST']:
            return Bill.objects.all()
        
        # Patients can see only their bills
        elif self.request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=self.request.user)
                return Bill.objects.filter(patient=patient)
            except Patient.DoesNotExist:
                return Bill.objects.none()
        
        return Bill.objects.none()

# System Log views
class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SystemLogSerializer
    
    def get_queryset(self):
        # Only admins can see system logs
        if self.request.user.user_type == 'ADMIN':
            return SystemLog.objects.all()
        return SystemLog.objects.none()

# User views
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    
    def get_queryset(self):
        # Only admins can list all users
        if self.request.user.user_type == 'ADMIN':
            return User.objects.all()
        return User.objects.none()

# Role views
class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    
    def get_queryset(self):
        # Only admins can manage roles
        if self.request.user.user_type == 'ADMIN':
            return Role.objects.all()
        return Role.objects.none()

# Permission views
class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PermissionSerializer
    
    def get_queryset(self):
        # Only admins can view permissions
        if self.request.user.user_type == 'ADMIN':
            return Permission.objects.all()
        return Permission.objects.none() 