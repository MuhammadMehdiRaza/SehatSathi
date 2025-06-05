from django.shortcuts import render
from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from .models import (
    Department, Doctor, Patient, Appointment,
    MedicalRecord, LabTest, Bill, SystemLog,
    Role, UserRole
)
from .serializers import (
    UserSerializer, DepartmentSerializer, DoctorSerializer,
    PatientSerializer, AppointmentSerializer, MedicalRecordSerializer,
    LabTestSerializer, BillSerializer, SystemLogSerializer,
    UserRegistrationSerializer, RoleSerializer, UserRoleSerializer,
    PermissionSerializer
)
from datetime import date, timedelta
from django.utils import timezone
from django.http import HttpResponse
import csv
import json
import io
from django.template.loader import get_template
from xhtml2pdf import pisa
from django.db.models import Count, Sum
from django.http import JsonResponse
from datetime import datetime
import requests # Added for making HTTP requests to the chatbot API

User = get_user_model()

# Authentication views
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        print("Registration request data:", request.data)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("Validation errors:", serializer.errors)
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
    
    print(f"Login attempt for email: {email}")
    
    # First check if the user exists
    try:
        user_obj = User.objects.get(email=email)
        print(f"Found user with email {email}, user_type: {user_obj.user_type}")
    except User.DoesNotExist:
        print(f"No user found with email: {email}")
        return Response({
            'message': 'No account found with this email address'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Then try to authenticate
    user = authenticate(request, username=email, password=password)
    
    if user is not None:
        print(f"Authentication successful for {email}")
        login(request, user)
        
        # Log the login action
        SystemLog.objects.create(
            user=user,
            action='LOGIN',
            description=f"User {user.email} logged in"
        )
        
        # Return user details
        serializer = UserSerializer(user)
        response = Response({
            'user': serializer.data,
            'message': 'Login successful'
        })
        
        # Set session cookie explicitly
        if not request.session.session_key:
            request.session.create()
            
        print(f"Session key: {request.session.session_key}")
        print(f"Session data: {dict(request.session)}")
        
        return response
    else:
        print(f"Authentication failed for {email}")
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
    """
    Get or update the user's basic profile information
    """
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
            print(f"User {self.request.user.email} has role {self.request.user.user_type}")
            patients = Patient.objects.all()
            print(f"Returning {patients.count()} patients:")
            
            # Print details for each patient to identify filtering issues
            for idx, patient in enumerate(patients, 1):
                print(f"  {idx}. ID: {patient.id}, Name: {patient.user.first_name} {patient.user.last_name}, Email: {patient.user.email}")
            
            # Check if this query has any filters
            print(f"Query parameters: {self.request.query_params}")
            
            return patients
        
        # Doctors can see all patients
        elif self.request.user.user_type == 'DOCTOR':
            return Patient.objects.all()
        
        # Patients can only see their own profile
        elif self.request.user.user_type == 'PATIENT':
            try:
                return Patient.objects.filter(user=self.request.user)
            except Patient.DoesNotExist:
                return Patient.objects.none()
        
        print(f"No matching user type: {self.request.user.user_type}")
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
                {'detail': 'Patient profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
    def create(self, request, *args, **kwargs):
        print("Creating patient profile with data:", request.data)
        
        # Validate that we have a user ID
        user_id = request.data.get('user')
        if not user_id:
            return Response(
                {'detail': 'User ID is required to create a patient profile'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify the user exists and is a PATIENT
            user = User.objects.get(id=user_id)
            if user.user_type != 'PATIENT':
                return Response(
                    {'detail': 'The specified user must have user_type PATIENT'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if this user already has a patient profile
            if hasattr(user, 'patient_profile'):
                return Response(
                    {'detail': 'This user already has a patient profile'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process date_of_birth if provided
            date_of_birth = request.data.get('date_of_birth')
            if date_of_birth == '':
                request.data['date_of_birth'] = None
            
            # Ensure gender is set (required field)
            if not request.data.get('gender'):
                request.data['gender'] = 'M'  # Default to Male if not provided
            
            # Continue with normal creation process
            return super().create(request, *args, **kwargs)
            
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Error creating patient: {str(e)}")
            return Response(
                {'detail': f'Error creating patient: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

# Appointment views
class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    
    def get_queryset(self):
        # Admins and receptionists can see all appointments
        if self.request.user.user_type in ['ADMIN', 'RECEPTIONIST']:
            return Appointment.objects.all().order_by('-date', '-time')
        
        # Doctors can only see their appointments
        elif self.request.user.user_type == 'DOCTOR':
            try:
                doctor = Doctor.objects.get(user=self.request.user)
                return Appointment.objects.filter(doctor=doctor).order_by('-date', '-time')
            except Doctor.DoesNotExist:
                return Appointment.objects.none()
        
        # Patients can only see their appointments
        elif self.request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=self.request.user)
                return Appointment.objects.filter(patient=patient).order_by('-date', '-time')
            except Patient.DoesNotExist:
                return Appointment.objects.none()
        
        return Appointment.objects.none()
    
    def create(self, request, *args, **kwargs):
        # If patient is making appointment
        if request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=request.user)
                request.data['patient'] = patient.id
                request.data['status'] = 'REQUESTED'
            except Patient.DoesNotExist:
                return Response(
                    {'detail': 'Patient profile not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.user_type not in ['ADMIN', 'RECEPTIONIST']:
            return Response(
                {'detail': 'You do not have permission to approve appointments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        appointment.status = 'APPROVED'
        appointment.save()
        
        # Log the action
        SystemLog.objects.create(
            user=request.user,
            action='UPDATE',
            description=f"Appointment {appointment.id} approved by {request.user.email}"
        )
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        
        # Patients, receptionists, admins, or the doctor of the appointment can cancel
        if (request.user.user_type in ['ADMIN', 'RECEPTIONIST'] or 
            (request.user.user_type == 'PATIENT' and 
             appointment.patient.user == request.user) or
            (request.user.user_type == 'DOCTOR' and 
             appointment.doctor.user == request.user)):
            
            appointment.status = 'CANCELLED'
            appointment.save()
            
            # Log the action
            SystemLog.objects.create(
                user=request.user,
                action='UPDATE',
                description=f"Appointment {appointment.id} cancelled by {request.user.email}"
            )
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
        
        return Response(
            {'detail': 'You do not have permission to cancel this appointment'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        
        # Only the doctor of the appointment can mark it as completed
        if (request.user.user_type == 'DOCTOR' and 
            appointment.doctor.user == request.user):
            
            appointment.status = 'COMPLETED'
            appointment.save()
            
            # Log the action
            SystemLog.objects.create(
                user=request.user,
                action='UPDATE',
                description=f"Appointment {appointment.id} marked as completed by {request.user.email}"
            )
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
        
        return Response(
            {'detail': 'You do not have permission to complete this appointment'}, 
            status=status.HTTP_403_FORBIDDEN
        )

    @action(detail=True, methods=['post'])
    def mark_notification_sent(self, request, pk=None):
        appointment = self.get_object()
        
        # Admin, Receptionist, or System can mark notifications as sent
        if request.user.user_type in ['ADMIN', 'RECEPTIONIST'] or request.user.is_superuser:
            
            appointment.notification_status = 'SENT'
            appointment.save()
            
            # Log the action
            SystemLog.objects.create(
                user=request.user,
                action='UPDATE',
                description=f"Notification for appointment {appointment.id} marked as sent by {request.user.email}"
            )
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
        
        return Response(
            {'detail': 'You do not have permission to update notification status'}, 
            status=status.HTTP_403_FORBIDDEN
        )
        
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming appointments for the current user"""
        user = request.user
        
        # Get today's date
        today = timezone.now().date()
        
        if user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=user)
                # Get approved upcoming appointments within the next 7 days
                upcoming = Appointment.objects.filter(
                    patient=patient,
                    status='APPROVED',
                    date__gte=today,
                    date__lte=today + timedelta(days=7)
                ).order_by('date', 'time')
                
                serializer = self.get_serializer(upcoming, many=True)
                return Response(serializer.data)
            except Patient.DoesNotExist:
                return Response(
                    {'detail': 'Patient profile not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
        elif user.user_type == 'DOCTOR':
            try:
                doctor = Doctor.objects.get(user=user)
                # Get approved upcoming appointments within the next 7 days
                upcoming = Appointment.objects.filter(
                    doctor=doctor,
                    status='APPROVED',
                    date__gte=today,
                    date__lte=today + timedelta(days=7)
                ).order_by('date', 'time')
                
                serializer = self.get_serializer(upcoming, many=True)
                return Response(serializer.data)
            except Doctor.DoesNotExist:
                return Response(
                    {'detail': 'Doctor profile not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Admin and receptionists can see all upcoming appointments
        elif user.user_type in ['ADMIN', 'RECEPTIONIST']:
            upcoming = Appointment.objects.filter(
                status='APPROVED',
                date__gte=today,
                date__lte=today + timedelta(days=7)
            ).order_by('date', 'time')
            
            serializer = self.get_serializer(upcoming, many=True)
            return Response(serializer.data)
            
        return Response(
            {'detail': 'Unauthorized'}, 
            status=status.HTTP_403_FORBIDDEN
        )

# Medical Record views
class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    
    def get_queryset(self):
        # Admins can see all records
        if self.request.user.user_type == 'ADMIN':
            return MedicalRecord.objects.all().order_by('-date')
        
        # Doctors can see records they created
        elif self.request.user.user_type == 'DOCTOR':
            try:
                doctor = Doctor.objects.get(user=self.request.user)
                return MedicalRecord.objects.filter(doctor=doctor).order_by('-date')
            except Doctor.DoesNotExist:
                return MedicalRecord.objects.none()
        
        # Patients can only see their records
        elif self.request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=self.request.user)
                return MedicalRecord.objects.filter(patient=patient).order_by('-date')
            except Patient.DoesNotExist:
                return MedicalRecord.objects.none()
        
        # Receptionists can't see medical records
        return MedicalRecord.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Only doctors can create/update medical records
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        # Only doctors can create medical records
        if request.user.user_type != 'DOCTOR':
            return Response(
                {'detail': 'Only doctors can create medical records'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            doctor = Doctor.objects.get(user=request.user)
            request.data['doctor'] = doctor.id
        except Doctor.DoesNotExist:
            return Response(
                {'detail': 'Doctor profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return super().create(request, *args, **kwargs)

# Lab Test views
class LabTestViewSet(viewsets.ModelViewSet):
    serializer_class = LabTestSerializer
    
    def get_queryset(self):
        # Admins can see all lab tests
        if self.request.user.user_type == 'ADMIN':
            return LabTest.objects.all().order_by('-date_ordered')
        
        # Doctors can see the lab tests they ordered
        elif self.request.user.user_type == 'DOCTOR':
            try:
                doctor = Doctor.objects.get(user=self.request.user)
                return LabTest.objects.filter(doctor=doctor).order_by('-date_ordered')
            except Doctor.DoesNotExist:
                return LabTest.objects.none()
        
        # Patients can only see their lab tests
        elif self.request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=self.request.user)
                return LabTest.objects.filter(patient=patient).order_by('-date_ordered')
            except Patient.DoesNotExist:
                return LabTest.objects.none()
        
        # Receptionists can see all lab tests
        elif self.request.user.user_type == 'RECEPTIONIST':
            return LabTest.objects.all().order_by('-date_ordered')
        
        return LabTest.objects.none()
    
    def create(self, request, *args, **kwargs):
        # Only doctors can order lab tests
        if request.user.user_type != 'DOCTOR':
            return Response(
                {'detail': 'Only doctors can order lab tests'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            doctor = Doctor.objects.get(user=request.user)
            request.data['doctor'] = doctor.id
            request.data['status'] = 'ORDERED'
        except Doctor.DoesNotExist:
            return Response(
                {'detail': 'Doctor profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        # Admin and receptionist can mark tests as complete
        if request.user.user_type not in ['ADMIN', 'RECEPTIONIST']:
            return Response(
                {'detail': 'You do not have permission to complete this test'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        lab_test = self.get_object()
        lab_test.status = 'COMPLETED'
        lab_test.results = request.data.get('results', '')
        lab_test.date_completed = request.data.get('date_completed')
        lab_test.save()
        
        # Log the action
        SystemLog.objects.create(
            user=request.user,
            action='UPDATE',
            description=f"Lab test {lab_test.id} marked as completed by {request.user.email}"
        )
        
        serializer = self.get_serializer(lab_test)
        return Response(serializer.data)

# Bill views
class BillViewSet(viewsets.ModelViewSet):
    serializer_class = BillSerializer
    
    def get_queryset(self):
        # Admins and receptionists can see all bills
        if self.request.user.user_type in ['ADMIN', 'RECEPTIONIST']:
            return Bill.objects.all().order_by('-date_generated')
        
        # Patients can only see their bills
        elif self.request.user.user_type == 'PATIENT':
            try:
                patient = Patient.objects.get(user=self.request.user)
                return Bill.objects.filter(patient=patient).order_by('-date_generated')
            except Patient.DoesNotExist:
                return Bill.objects.none()
        
        # Doctors can't see bills
        return Bill.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Only admins and receptionists can manage bills
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        # Only admins and receptionists can create bills
        if request.user.user_type not in ['ADMIN', 'RECEPTIONIST']:
            return Response(
                {'detail': 'Only administrators and receptionists can create bills'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        # Admins and receptionists can mark bills as paid
        if request.user.user_type not in ['ADMIN', 'RECEPTIONIST']:
            return Response(
                {'detail': 'You do not have permission to update payment status'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        bill = self.get_object()
        bill.payment_status = 'PAID'
        bill.payment_date = request.data.get('payment_date')
        bill.save()
        
        # Log the action
        SystemLog.objects.create(
            user=request.user,
            action='UPDATE',
            description=f"Bill {bill.id} marked as paid by {request.user.email}"
        )
        
        serializer = self.get_serializer(bill)
        return Response(serializer.data)

# System Log views (Admin only)
class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SystemLogSerializer
    
    def get_queryset(self):
        # Only admins can see system logs
        if self.request.user.user_type == 'ADMIN':
            return SystemLog.objects.all().order_by('-timestamp')
        
        return SystemLog.objects.none()
    
    def get_permissions(self):
        return [permissions.IsAdminUser()]

# Dashboard data for admin
@api_view(['GET'])
def admin_dashboard(request):
    if request.user.user_type != 'ADMIN':
        return Response(
            {'detail': 'You do not have permission to access this data'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    total_doctors = Doctor.objects.count()
    total_patients = Patient.objects.count()
    total_appointments = Appointment.objects.count()
    pending_appointments = Appointment.objects.filter(status='REQUESTED').count()
    completed_appointments = Appointment.objects.filter(status='COMPLETED').count()
    total_bills = Bill.objects.count()
    pending_bills = Bill.objects.filter(payment_status='PENDING').count()
    
    return Response({
        'total_doctors': total_doctors,
        'total_patients': total_patients,
        'total_appointments': total_appointments,
        'pending_appointments': pending_appointments,
        'completed_appointments': completed_appointments,
        'total_bills': total_bills,
        'pending_bills': pending_bills
    })

# Dashboard data for doctor
@api_view(['GET'])
def doctor_dashboard(request):
    if request.user.user_type != 'DOCTOR':
        return Response(
            {'detail': 'You do not have permission to access this data'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        doctor = Doctor.objects.get(user=request.user)
        
        total_appointments = Appointment.objects.filter(doctor=doctor).count()
        pending_appointments = Appointment.objects.filter(
            doctor=doctor, status='REQUESTED').count()
        approved_appointments = Appointment.objects.filter(
            doctor=doctor, status='APPROVED').count()
        completed_appointments = Appointment.objects.filter(
            doctor=doctor, status='COMPLETED').count()
        
        # Get today's appointments
        from datetime import date
        today = date.today()
        todays_appointments = Appointment.objects.filter(
            doctor=doctor, date=today
        ).order_by('time')
        
        # Get recent medical records
        recent_records = MedicalRecord.objects.filter(
            doctor=doctor
        ).order_by('-date')[:5]
        
        # Serialize the data
        appointment_serializer = AppointmentSerializer(todays_appointments, many=True)
        record_serializer = MedicalRecordSerializer(recent_records, many=True)
        
        return Response({
            'total_appointments': total_appointments,
            'pending_appointments': pending_appointments,
            'approved_appointments': approved_appointments,
            'completed_appointments': completed_appointments,
            'todays_appointments': appointment_serializer.data,
            'recent_records': record_serializer.data
        })
    
    except Doctor.DoesNotExist:
        return Response(
            {'detail': 'Doctor profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

# Dashboard data for patient
@api_view(['GET'])
def patient_dashboard(request):
    if request.user.user_type != 'PATIENT':
        return Response(
            {'detail': 'You do not have permission to access this data'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        patient = Patient.objects.get(user=request.user)
        
        total_appointments = Appointment.objects.filter(patient=patient).count()
        pending_appointments = Appointment.objects.filter(
            patient=patient, status='REQUESTED').count()
        approved_appointments = Appointment.objects.filter(
            patient=patient, status='APPROVED').count()
        total_bills = Bill.objects.filter(patient=patient).count()
        pending_bills = Bill.objects.filter(
            patient=patient, payment_status='PENDING').count()
        
        return Response({
            'total_appointments': total_appointments,
            'pending_appointments': pending_appointments,
            'approved_appointments': approved_appointments,
            'total_bills': total_bills,
            'pending_bills': pending_bills
        })
    
    except Patient.DoesNotExist:
        return Response(
            {'detail': 'Patient profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

# Dashboard data for receptionist
@api_view(['GET'])
def receptionist_dashboard(request):
    if request.user.user_type != 'RECEPTIONIST':
        return Response(
            {'detail': 'You do not have permission to access this data'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    total_patients = Patient.objects.count()
    
    # Get appointment counts
    total_appointments = Appointment.objects.count()
    pending_appointments = Appointment.objects.filter(status='REQUESTED').count()
    approved_appointments = Appointment.objects.filter(status='APPROVED').count()
    
    # Get bill counts
    total_bills = Bill.objects.count()
    pending_bills = Bill.objects.filter(payment_status='PENDING').count()
    
    # Get today's appointments
    today = timezone.now().date()
    todays_appointments = Appointment.objects.filter(date=today).order_by('time')
    
    # Serialize today's appointments
    appointment_serializer = AppointmentSerializer(todays_appointments, many=True)
    
    # Get recent patients (last 5 registered)
    recent_patients = Patient.objects.all().order_by('-user__date_joined')[:5]
    patient_serializer = PatientSerializer(recent_patients, many=True)
    
    return Response({
        'total_patients': total_patients,
        'total_appointments': total_appointments,
        'pending_appointments': pending_appointments,
        'approved_appointments': approved_appointments,
        'total_bills': total_bills,
        'pending_bills': pending_bills,
        'todays_appointments': appointment_serializer.data,
        'recent_patients': patient_serializer.data
    })

# User Management Views (Admin only)
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    
    def get_queryset(self):
        # Only admins can list all users
        if self.request.user.user_type == 'ADMIN':
            return get_user_model().objects.all().order_by('-date_joined')
        return get_user_model().objects.none()
    
    def get_permissions(self):
        # Only admins can manage users
        if self.request.user.is_authenticated and self.request.user.user_type == 'ADMIN':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]
    
    def perform_create(self, serializer):
        user = serializer.save()
        # Log the action
        SystemLog.objects.create(
            user=self.request.user,
            action='CREATE',
            description=f"User {user.email} created by {self.request.user.email}"
        )
    
    def perform_update(self, serializer):
        user = serializer.save()
        # Log the action
        SystemLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            description=f"User {user.email} updated by {self.request.user.email}"
        )
    
    def perform_destroy(self, instance):
        email = instance.email
        instance.delete()
        # Log the action
        SystemLog.objects.create(
            user=self.request.user,
            action='DELETE',
            description=f"User {email} deleted by {self.request.user.email}"
        )

# Role Management Views (Admin only)
class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    
    def get_queryset(self):
        if self.request.user.user_type == 'ADMIN':
            return Role.objects.all()
        return Role.objects.none()
    
    def get_permissions(self):
        if self.request.user.is_authenticated and self.request.user.user_type == 'ADMIN':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]
    
    def perform_create(self, serializer):
        role = serializer.save()
        # Log the action
        SystemLog.objects.create(
            user=self.request.user,
            action='CREATE',
            description=f"Role {role.name} created by {self.request.user.email}"
        )
    
    def perform_update(self, serializer):
        role = serializer.save()
        # Log the action
        SystemLog.objects.create(
            user=self.request.user,
            action='UPDATE',
            description=f"Role {role.name} updated by {self.request.user.email}"
        )
    
    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        # Log the action
        SystemLog.objects.create(
            user=self.request.user,
            action='DELETE',
            description=f"Role {name} deleted by {self.request.user.email}"
        )

# Permission Views (Admin only)
class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PermissionSerializer
    
    def get_queryset(self):
        if self.request.user.user_type == 'ADMIN':
            return Permission.objects.all()
        return Permission.objects.none()
    
    def get_permissions(self):
        if self.request.user.is_authenticated and self.request.user.user_type == 'ADMIN':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

# Helper function to render PDF
def render_to_pdf(template_src, context_dict):
    template = get_template(template_src)
    html = template.render(context_dict)
    result = io.BytesIO()
    pdf = pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), result)
    
    if not pdf.err:
        return HttpResponse(result.getvalue(), content_type='application/pdf')
    return None

# Statistics and Reporting for Admin
@api_view(['GET'])
def admin_statistics(request):
    if request.user.user_type != 'ADMIN':
        return Response(
            {'detail': 'You do not have permission to access this data'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get date range parameters if provided
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')
    
    # Base querysets
    doctors_qs = Doctor.objects.all()
    patients_qs = Patient.objects.all()
    appointments_qs = Appointment.objects.all()
    bills_qs = Bill.objects.all()
    
    # Apply date filters if provided
    if from_date and to_date:
        appointments_qs = appointments_qs.filter(date__range=[from_date, to_date])
        bills_qs = bills_qs.filter(date_generated__range=[from_date, to_date])
    
    # Doctor statistics
    doctor_stats = {
        'total': doctors_qs.count(),
        'by_department': {}
    }
    departments = Department.objects.all()
    for dept in departments:
        doctor_stats['by_department'][dept.name] = doctors_qs.filter(department=dept).count()
    
    # Patient statistics
    patient_stats = {
        'total': patients_qs.count(),
        'by_gender': {
            'Male': patients_qs.filter(gender='M').count(),
            'Female': patients_qs.filter(gender='F').count(),
            'Other': patients_qs.filter(gender='O').count(),
        }
    }
    
    # Appointment statistics
    appointment_stats = {
        'total': appointments_qs.count(),
        'by_status': {
            'Requested': appointments_qs.filter(status='REQUESTED').count(),
            'Approved': appointments_qs.filter(status='APPROVED').count(),
            'Completed': appointments_qs.filter(status='COMPLETED').count(),
            'Cancelled': appointments_qs.filter(status='CANCELLED').count(),
        }
    }
    
    # Financial statistics
    financial_stats = {
        'total_billed': float(bills_qs.aggregate(Sum('amount'))['amount__sum'] or 0),
        'total_paid': float(bills_qs.filter(payment_status='PAID')
                           .aggregate(Sum('amount'))['amount__sum'] or 0),
        'total_pending': float(bills_qs.filter(payment_status='PENDING')
                              .aggregate(Sum('amount'))['amount__sum'] or 0),
    }
    
    # System activity statistics
    system_stats = {
        'total_logs': SystemLog.objects.count(),
        'by_action': {
            'Create': SystemLog.objects.filter(action='CREATE').count(),
            'Read': SystemLog.objects.filter(action='READ').count(),
            'Update': SystemLog.objects.filter(action='UPDATE').count(),
            'Delete': SystemLog.objects.filter(action='DELETE').count(),
            'Login': SystemLog.objects.filter(action='LOGIN').count(),
            'Logout': SystemLog.objects.filter(action='LOGOUT').count(),
        }
    }
    
    # Check if export is requested
    export_format = request.query_params.get('export', None)
    
    # Log this data access
    SystemLog.objects.create(
        user=request.user,
        action='READ',
        description=f"Admin statistics accessed by {request.user.email}"
    )
    
    # Prepare the statistics data
    stats_data = {
        'doctor_statistics': doctor_stats,
        'patient_statistics': patient_stats,
        'appointment_statistics': appointment_stats,
        'financial_statistics': financial_stats,
        'system_statistics': system_stats
    }
    
    # Handle export formats
    if export_format == 'csv':
        # Create CSV file
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="system_statistics.csv"'
        
        writer = csv.writer(response)
        
        # Write headers and data rows
        writer.writerow(['Statistics Report', f'Generated on: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}'])
        writer.writerow([])
        
        # Doctor statistics
        writer.writerow(['Doctor Statistics'])
        writer.writerow(['Total Doctors', doctor_stats['total']])
        writer.writerow(['Department', 'Count'])
        for dept, count in doctor_stats['by_department'].items():
            writer.writerow([dept, count])
        writer.writerow([])
        
        # Patient statistics
        writer.writerow(['Patient Statistics'])
        writer.writerow(['Total Patients', patient_stats['total']])
        writer.writerow(['Gender', 'Count'])
        for gender, count in patient_stats['by_gender'].items():
            writer.writerow([gender, count])
        writer.writerow([])
        
        # Appointment statistics
        writer.writerow(['Appointment Statistics'])
        writer.writerow(['Total Appointments', appointment_stats['total']])
        writer.writerow(['Status', 'Count'])
        for status, count in appointment_stats['by_status'].items():
            writer.writerow([status, count])
        writer.writerow([])
        
        # Financial statistics
        writer.writerow(['Financial Statistics'])
        writer.writerow(['Total Billed', financial_stats['total_billed']])
        writer.writerow(['Total Paid', financial_stats['total_paid']])
        writer.writerow(['Total Pending', financial_stats['total_pending']])
        writer.writerow([])
        
        # System statistics
        writer.writerow(['System Statistics'])
        writer.writerow(['Total Logs', system_stats['total_logs']])
        writer.writerow(['Action', 'Count'])
        for action, count in system_stats['by_action'].items():
            writer.writerow([action, count])
        
        return response
        
    elif export_format == 'pdf':
        # Create PDF file
        context = {
            'today': timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
            'doctor_stats': doctor_stats,
            'patient_stats': patient_stats,
            'appointment_stats': appointment_stats,
            'financial_stats': financial_stats,
            'system_stats': system_stats,
            'title': 'System Statistics Report'
        }
        
        pdf = render_to_pdf('admin/statistics_report.html', context)
        if pdf:
            response = HttpResponse(pdf, content_type='application/pdf')
            filename = f"system_statistics_{timezone.now().strftime('%Y_%m_%d')}.pdf"
            content = f"attachment; filename={filename}"
            response['Content-Disposition'] = content
            return response
        return HttpResponse("Error rendering PDF", status=400)
    
    # Return regular JSON response
    return Response(stats_data)

# Generate various admin reports
@api_view(['GET'])
def admin_reports(request):
    if request.user.user_type != 'ADMIN':
        return Response(
            {'detail': 'You do not have permission to access this data'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    report_type = request.query_params.get('type', 'appointment')
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')
    export_format = request.query_params.get('export', None)
    
    # Validate required parameters
    if not from_date or not to_date:
        return Response(
            {'detail': 'Both from_date and to_date parameters are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Log report generation
    SystemLog.objects.create(
        user=request.user,
        action='READ',
        description=f"{report_type.capitalize()} report generated by {request.user.email}"
    )
    
    if report_type == 'appointment':
        # Appointment report
        appointments = Appointment.objects.filter(date__range=[from_date, to_date])
        data = AppointmentSerializer(appointments, many=True).data
        report_data = {
            'report_type': 'Appointment Report',
            'from_date': from_date,
            'to_date': to_date,
            'total_count': appointments.count(),
            'data': data
        }
        
        # Handle export
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="appointment_report_{from_date}_to_{to_date}.csv"'
            
            writer = csv.writer(response)
            
            writer.writerow(['Appointment Report', f'From: {from_date}', f'To: {to_date}'])
            writer.writerow(['Total Appointments', appointments.count()])
            writer.writerow([])
            writer.writerow(['ID', 'Patient', 'Doctor', 'Date', 'Time', 'Status', 'Reason'])
            
            for appt in appointments:
                writer.writerow([
                    appt.id,
                    f"{appt.patient.user.first_name} {appt.patient.user.last_name}",
                    f"Dr. {appt.doctor.user.first_name} {appt.doctor.user.last_name}",
                    appt.date,
                    appt.time,
                    appt.get_status_display(),
                    appt.reason[:50] + ('...' if len(appt.reason) > 50 else '')
                ])
                
            return response
            
        elif export_format == 'pdf':
            context = {
                'title': 'Appointment Report',
                'from_date': from_date,
                'to_date': to_date,
                'appointments': appointments,
                'total_count': appointments.count(),
                'today': timezone.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            pdf = render_to_pdf('admin/appointment_report.html', context)
            if pdf:
                response = HttpResponse(pdf, content_type='application/pdf')
                filename = f"appointment_report_{from_date}_to_{to_date}.pdf"
                content = f"attachment; filename={filename}"
                response['Content-Disposition'] = content
                return response
            return HttpResponse("Error rendering PDF", status=400)
        
        return Response(report_data)
    
    elif report_type == 'patient':
        # Filter patients by registration date (through user.date_joined)
        patients = Patient.objects.filter(user__date_joined__range=[from_date, to_date])
        data = PatientSerializer(patients, many=True).data
        report_data = {
            'report_type': 'Patient Report',
            'from_date': from_date,
            'to_date': to_date,
            'total_count': patients.count(),
            'data': data
        }
        
        # Handle export
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="patient_report_{from_date}_to_{to_date}.csv"'
            
            writer = csv.writer(response)
            
            writer.writerow(['Patient Report', f'Registered From: {from_date}', f'To: {to_date}'])
            writer.writerow(['Total Patients', patients.count()])
            writer.writerow([])
            writer.writerow(['ID', 'Name', 'Email', 'Gender', 'Date of Birth', 'Blood Group', 'Phone'])
            
            for patient in patients:
                writer.writerow([
                    patient.id,
                    f"{patient.user.first_name} {patient.user.last_name}",
                    patient.user.email,
                    patient.get_gender_display(),
                    patient.date_of_birth or 'N/A',
                    patient.blood_group or 'N/A',
                    patient.user.phone_number or 'N/A'
                ])
                
            return response
            
        elif export_format == 'pdf':
            context = {
                'title': 'Patient Registration Report',
                'from_date': from_date,
                'to_date': to_date,
                'patients': patients,
                'total_count': patients.count(),
                'today': timezone.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            pdf = render_to_pdf('admin/patient_report.html', context)
            if pdf:
                response = HttpResponse(pdf, content_type='application/pdf')
                filename = f"patient_report_{from_date}_to_{to_date}.pdf"
                content = f"attachment; filename={filename}"
                response['Content-Disposition'] = content
                return response
            return HttpResponse("Error rendering PDF", status=400)
        
        return Response(report_data)
    
    elif report_type == 'financial':
        # Financial report
        bills = Bill.objects.filter(date_generated__range=[from_date, to_date])
        data = BillSerializer(bills, many=True).data
        
        total_amount = bills.aggregate(Sum('amount'))['amount__sum'] or 0
        paid_amount = bills.filter(payment_status='PAID').aggregate(Sum('amount'))['amount__sum'] or 0
        
        report_data = {
            'report_type': 'Financial Report',
            'from_date': from_date,
            'to_date': to_date,
            'total_amount': float(total_amount),
            'paid_amount': float(paid_amount),
            'pending_amount': float(total_amount - paid_amount),
            'payment_rate': float(paid_amount / total_amount * 100) if total_amount > 0 else 0,
            'data': data
        }
        
        # Handle export
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="financial_report_{from_date}_to_{to_date}.csv"'
            
            writer = csv.writer(response)
            
            writer.writerow(['Financial Report', f'From: {from_date}', f'To: {to_date}'])
            writer.writerow(['Total Amount', f"${total_amount:.2f}"])
            writer.writerow(['Paid Amount', f"${paid_amount:.2f}"])
            writer.writerow(['Pending Amount', f"${float(total_amount - paid_amount):.2f}"])
            writer.writerow(['Payment Rate', f"{float(paid_amount / total_amount * 100) if total_amount > 0 else 0:.2f}%"])
            writer.writerow([])
            writer.writerow(['Bill ID', 'Patient', 'Amount', 'Date Generated', 'Status', 'Description'])
            
            for bill in bills:
                writer.writerow([
                    bill.id,
                    f"{bill.patient.user.first_name} {bill.patient.user.last_name}",
                    f"${bill.amount:.2f}",
                    bill.date_generated,
                    bill.get_payment_status_display(),
                    bill.description[:50] + ('...' if len(bill.description) > 50 else '')
                ])
                
            return response
            
        elif export_format == 'pdf':
            context = {
                'title': 'Financial Report',
                'from_date': from_date,
                'to_date': to_date,
                'bills': bills,
                'total_amount': total_amount,
                'paid_amount': paid_amount,
                'pending_amount': total_amount - paid_amount,
                'payment_rate': f"{float(paid_amount / total_amount * 100) if total_amount > 0 else 0:.2f}%",
                'today': timezone.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            pdf = render_to_pdf('admin/financial_report.html', context)
            if pdf:
                response = HttpResponse(pdf, content_type='application/pdf')
                filename = f"financial_report_{from_date}_to_{to_date}.pdf"
                content = f"attachment; filename={filename}"
                response['Content-Disposition'] = content
                return response
            return HttpResponse("Error rendering PDF", status=400)
        
        return Response(report_data)
    
    else:
        return Response(
            {'detail': 'Invalid report type. Valid options are: appointment, patient, financial'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

# New Reports and Statistics API views
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_statistics(request):
    """
    Get system statistics for dashboard
    """
    # Get date filters if provided
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    
    # Date filtering
    filter_kwargs = {}
    if from_date and to_date:
        filter_kwargs['date_joined__range'] = [from_date, to_date]
    
    # Get today and month start for filtering
    today = timezone.now().date()
    month_start = today.replace(day=1)
    
    # Patient statistics
    total_patients = Patient.objects.count()
    active_patients = Patient.objects.filter(user__is_active=True).count()
    new_patients_this_month = Patient.objects.filter(
        user__date_joined__gte=month_start
    ).count()
    
    # Gender distribution
    gender_distribution = {}
    for gender, count in Patient.objects.values('gender').annotate(Count('id')):
        gender_distribution[gender] = count
    
    # Age distribution
    age_groups = {
        '0-18': Q(date_of_birth__gte=today - timedelta(days=365*18)),
        '19-35': Q(date_of_birth__lt=today - timedelta(days=365*18)) & Q(date_of_birth__gte=today - timedelta(days=365*35)),
        '36-50': Q(date_of_birth__lt=today - timedelta(days=365*35)) & Q(date_of_birth__gte=today - timedelta(days=365*50)),
        '51-65': Q(date_of_birth__lt=today - timedelta(days=365*50)) & Q(date_of_birth__gte=today - timedelta(days=365*65)),
        '65+': Q(date_of_birth__lt=today - timedelta(days=365*65))
    }
    
    age_distribution = {}
    for age_group, query in age_groups.items():
        age_distribution[age_group] = Patient.objects.filter(query).count()
    
    # Appointment statistics
    total_appointments = Appointment.objects.count()
    completed_appointments = Appointment.objects.filter(status='COMPLETED').count()
    upcoming_appointments = Appointment.objects.filter(
        date__gte=today, 
        status='SCHEDULED'
    ).count()
    cancelled_appointments = Appointment.objects.filter(status='CANCELLED').count()
    
    # Appointments by department
    dept_appointments = {}
    for dept in Appointment.objects.values('doctor__department__name').annotate(count=Count('id')):
        dept_name = dept['doctor__department__name'] or 'Unassigned'
        dept_appointments[dept_name] = dept['count']
    
    # Financial statistics
    total_revenue = Bill.objects.aggregate(total=Sum('amount'))['total'] or 0
    paid_amount = Bill.objects.filter(payment_status='PAID').aggregate(total=Sum('amount'))['total'] or 0
    pending_amount = Bill.objects.filter(payment_status='PENDING').aggregate(total=Sum('amount'))['total'] or 0
    
    # Monthly revenue trend
    monthly_revenue = []
    for i in range(12):
        month = today.replace(day=1) - timedelta(days=30*i)
        month_start = month.replace(day=1)
        if month.month == 12:
            next_month = month.replace(year=month.year+1, month=1)
        else:
            next_month = month.replace(month=month.month+1)
        
        month_revenue = Bill.objects.filter(
            date_generated__gte=month_start,
            date_generated__lt=next_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        monthly_revenue.insert(0, month_revenue)
    
    # Revenue by service type
    service_revenue = {
        'Consultations': Bill.objects.filter(description__icontains='consultation').aggregate(total=Sum('amount'))['total'] or 0,
        'Lab Tests': Bill.objects.filter(description__icontains='lab').aggregate(total=Sum('amount'))['total'] or 0,
        'Procedures': Bill.objects.filter(description__icontains='procedure').aggregate(total=Sum('amount'))['total'] or 0,
        'Medications': Bill.objects.filter(description__icontains='medication').aggregate(total=Sum('amount'))['total'] or 0,
    }
    
    # Export format
    export_format = request.GET.get('export')
    if export_format == 'pdf':
        return generate_statistics_pdf({
            'patients': {
                'total': total_patients,
                'active': active_patients,
                'inactive': total_patients - active_patients,
                'new_this_month': new_patients_this_month,
                'gender_distribution': gender_distribution,
                'age_distribution': age_distribution
            },
            'appointments': {
                'total': total_appointments,
                'completed': completed_appointments,
                'upcoming': upcoming_appointments,
                'cancelled': cancelled_appointments,
                'by_department': dept_appointments,
                'monthly_trend': monthly_revenue  # Reusing monthly revenue data
            },
            'financials': {
                'total_revenue': total_revenue,
                'paid_amount': paid_amount,
                'pending_amount': pending_amount,
                'monthly_revenue': monthly_revenue,
                'by_service': service_revenue
            }
        })
    elif export_format == 'csv':
        return generate_statistics_csv({
            'patients': {
                'total': total_patients,
                'active': active_patients,
                'inactive': total_patients - active_patients,
                'new_this_month': new_patients_this_month,
                'gender_distribution': gender_distribution,
                'age_distribution': age_distribution
            },
            'appointments': {
                'total': total_appointments,
                'completed': completed_appointments,
                'upcoming': upcoming_appointments,
                'cancelled': cancelled_appointments,
                'by_department': dept_appointments,
                'monthly_trend': monthly_revenue
            },
            'financials': {
                'total_revenue': total_revenue,
                'paid_amount': paid_amount,
                'pending_amount': pending_amount,
                'monthly_revenue': monthly_revenue,
                'by_service': service_revenue
            }
        })
    
    # Return JSON response
    return JsonResponse({
        'patients': {
            'total': total_patients,
            'active': active_patients,
            'inactive': total_patients - active_patients,
            'new_this_month': new_patients_this_month,
            'gender_distribution': gender_distribution,
            'age_distribution': age_distribution
        },
        'appointments': {
            'total': total_appointments,
            'completed': completed_appointments,
            'upcoming': upcoming_appointments,
            'cancelled': cancelled_appointments,
            'by_department': dept_appointments,
            'monthly_trend': monthly_revenue  # Reusing monthly revenue data
        },
        'financials': {
            'total_revenue': total_revenue,
            'paid_amount': paid_amount,
            'pending_amount': pending_amount,
            'monthly_revenue': monthly_revenue,
            'by_service': service_revenue
        }
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, permissions.IsAdminUser])
def get_reports(request):
    """
    Generate and download reports
    """
    report_type = request.GET.get('type', 'patient')
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    export_format = request.GET.get('export')
    
    data = generate_report_data(report_type, from_date, to_date)
    
    if export_format == 'pdf':
        return generate_report_pdf(report_type, data, from_date, to_date)
    elif export_format == 'csv':
        return generate_report_csv(report_type, data, from_date, to_date)
    
    return JsonResponse(data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, permissions.IsAdminUser])
def preview_report(request):
    """
    Preview report data before download
    """
    report_type = request.GET.get('type', 'patient')
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    
    data = generate_report_data(report_type, from_date, to_date)
    return JsonResponse(data)

def generate_report_data(report_type, from_date=None, to_date=None):
    """
    Generate report data based on type and date range
    """
    filter_kwargs = {}
    if from_date and to_date:
        if report_type == 'patient':
            filter_kwargs['user__date_joined__range'] = [from_date, to_date]
        elif report_type == 'appointment':
            filter_kwargs['date__range'] = [from_date, to_date]
        elif report_type == 'financial':
            filter_kwargs['date_generated__range'] = [from_date, to_date]
    
    if report_type == 'patient':
        patients = Patient.objects.filter(**filter_kwargs).select_related('user')
        data = []
        
        for patient in patients:
            appointments = Appointment.objects.filter(patient=patient).count()
            latest_appointment = Appointment.objects.filter(patient=patient).order_by('-date').first()
            
            age = None
            if patient.date_of_birth:
                today = timezone.now().date()
                age = today.year - patient.date_of_birth.year - ((today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day))
            
            data.append({
                'name': f"{patient.user.first_name} {patient.user.last_name}",
                'gender': patient.get_gender_display() if hasattr(patient, 'get_gender_display') else patient.gender,
                'age': age,
                'visits': appointments,
                'lastVisit': latest_appointment.date.strftime('%Y-%m-%d') if latest_appointment else 'Never'
            })
        
        return {
            'title': 'Patient Report',
            'period': f"{from_date} to {to_date}" if from_date and to_date else "All time",
            'data': data
        }
        
    elif report_type == 'appointment':
        # Group appointments by doctor
        doctors = Doctor.objects.all().select_related('user', 'department')
        data = []
        
        for doctor in doctors:
            appointments = Appointment.objects.filter(doctor=doctor, **filter_kwargs)
            completed = appointments.filter(status='COMPLETED').count()
            cancelled = appointments.filter(status='CANCELLED').count()
            total_patients = appointments.values('patient').distinct().count()
            
            data.append({
                'doctor': f"Dr. {doctor.user.first_name} {doctor.user.last_name}",
                'department': doctor.department.name if doctor.department else 'Unassigned',
                'patients': total_patients,
                'completed': completed,
                'cancelled': cancelled
            })
        
        return {
            'title': 'Appointment Report',
            'period': f"{from_date} to {to_date}" if from_date and to_date else "All time",
            'data': data
        }
        
    elif report_type == 'financial':
        # Group financial data by category
        categories = {
            'Consultations': Q(description__icontains='consultation'),
            'Lab Tests': Q(description__icontains='lab'),
            'Procedures': Q(description__icontains='procedure'),
            'Medications': Q(description__icontains='medication'),
        }
        
        data = []
        for category, query in categories.items():
            bills = Bill.objects.filter(query, **filter_kwargs)
            total = bills.aggregate(total=Sum('amount'))['total'] or 0
            paid = bills.filter(payment_status='PAID').aggregate(total=Sum('amount'))['total'] or 0
            pending = bills.filter(payment_status='PENDING').aggregate(total=Sum('amount'))['total'] or 0
            
            data.append({
                'category': category,
                'amount': total,
                'paid': paid,
                'pending': pending
            })
        
        return {
            'title': 'Financial Report',
            'period': f"{from_date} to {to_date}" if from_date and to_date else "All time",
            'data': data
        }
    
    return {'title': 'Unknown Report Type', 'data': []}

def generate_report_pdf(report_type, data, from_date=None, to_date=None):
    """
    Generate PDF report
    """
    buffer = io.BytesIO()
    
    # Simple HTML template for report
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            h1 {{ color: #2c3e50; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th {{ background-color: #2c3e50; color: white; padding: 8px; text-align: left; }}
            td {{ border: 1px solid #ddd; padding: 8px; }}
            .footer {{ margin-top: 20px; font-size: 10px; color: #7f8c8d; text-align: center; }}
        </style>
    </head>
    <body>
        <h1>{data['title']}</h1>
        <p>Period: {data['period']}</p>
        <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        
        <table>
            <thead>
                <tr>
    """
    
    # Add columns based on report type
    if report_type == 'patient':
        html += """
                    <th>Patient Name</th>
                    <th>Gender</th>
                    <th>Age</th>
                    <th>Visits</th>
                    <th>Last Visit</th>
                </tr>
            </thead>
            <tbody>
        """
        
        for row in data['data']:
            html += f"""
                <tr>
                    <td>{row['name']}</td>
                    <td>{row['gender']}</td>
                    <td>{row['age'] if row['age'] is not None else 'N/A'}</td>
                    <td>{row['visits']}</td>
                    <td>{row['lastVisit']}</td>
                </tr>
            """
    
    elif report_type == 'appointment':
        html += """
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Patients</th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                </tr>
            </thead>
            <tbody>
        """
        
        for row in data['data']:
            html += f"""
                <tr>
                    <td>{row['doctor']}</td>
                    <td>{row['department']}</td>
                    <td>{row['patients']}</td>
                    <td>{row['completed']}</td>
                    <td>{row['cancelled']}</td>
                </tr>
            """
    
    elif report_type == 'financial':
        html += """
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Paid</th>
                    <th>Pending</th>
                </tr>
            </thead>
            <tbody>
        """
        
        for row in data['data']:
            html += f"""
                <tr>
                    <td>{row['category']}</td>
                    <td>${row['amount']}</td>
                    <td>${row['paid']}</td>
                    <td>${row['pending']}</td>
                </tr>
            """
    
    html += """
            </tbody>
        </table>
        
        <div class="footer">
            © SehatSathi Healthcare System
        </div>
    </body>
    </html>
    """
    
    # Generate PDF
    pisa_status = pisa.CreatePDF(html, dest=buffer)
    
    # Return PDF response
    if pisa_status.err:
        return HttpResponse("PDF generation error", status=500)
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_report.pdf"'
    
    return response

def generate_report_csv(report_type, data, from_date=None, to_date=None):
    """
    Generate CSV report
    """
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_report.csv"'
    
    writer = csv.writer(response)
    
    # Write headers based on report type
    if report_type == 'patient':
        writer.writerow(['Patient Name', 'Gender', 'Age', 'Visits', 'Last Visit'])
        for row in data['data']:
            writer.writerow([
                row['name'],
                row['gender'],
                row['age'] if row['age'] is not None else 'N/A',
                row['visits'],
                row['lastVisit']
            ])
    
    elif report_type == 'appointment':
        writer.writerow(['Doctor', 'Department', 'Patients', 'Completed', 'Cancelled'])
        for row in data['data']:
            writer.writerow([
                row['doctor'],
                row['department'],
                row['patients'],
                row['completed'],
                row['cancelled']
            ])
    
    elif report_type == 'financial':
        writer.writerow(['Category', 'Amount', 'Paid', 'Pending'])
        for row in data['data']:
            writer.writerow([
                row['category'],
                row['amount'],
                row['paid'],
                row['pending']
            ])
    
    return response

def generate_statistics_pdf(data):
    """
    Generate PDF for statistics
    """
    buffer = io.BytesIO()
    
    # Simple HTML template for statistics
    html = """
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #2c3e50; }
            h2 { color: #34495e; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #2c3e50; color: white; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            .footer { margin-top: 20px; font-size: 10px; color: #7f8c8d; text-align: center; }
            .stat-box { margin-bottom: 5px; }
        </style>
    </head>
    <body>
        <h1>Healthcare Statistics Report</h1>
        <p>Generated on: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """</p>
        
        <h2>Patient Statistics</h2>
        <div class="stat-box">Total Patients: """ + str(data['patients']['total']) + """</div>
        <div class="stat-box">Active Patients: """ + str(data['patients']['active']) + """</div>
        <div class="stat-box">Inactive Patients: """ + str(data['patients']['inactive']) + """</div>
        <div class="stat-box">New This Month: """ + str(data['patients']['new_this_month']) + """</div>
        
        <h2>Appointment Statistics</h2>
        <div class="stat-box">Total Appointments: """ + str(data['appointments']['total']) + """</div>
        <div class="stat-box">Completed: """ + str(data['appointments']['completed']) + """</div>
        <div class="stat-box">Upcoming: """ + str(data['appointments']['upcoming']) + """</div>
        <div class="stat-box">Cancelled: """ + str(data['appointments']['cancelled']) + """</div>
        
        <h2>Financial Statistics</h2>
        <div class="stat-box">Total Revenue: $""" + str(data['financials']['total_revenue']) + """</div>
        <div class="stat-box">Paid Amount: $""" + str(data['financials']['paid_amount']) + """</div>
        <div class="stat-box">Pending Amount: $""" + str(data['financials']['pending_amount']) + """</div>
        
        <h2>Gender Distribution</h2>
        <table>
            <thead>
                <tr>
                    <th>Gender</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for gender, count in data['patients']['gender_distribution'].items():
        html += f"""
                <tr>
                    <td>{gender}</td>
                    <td>{count}</td>
                </tr>
        """
    
    html += """
            </tbody>
        </table>
        
        <h2>Department Distribution</h2>
        <table>
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Appointments</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for dept, count in data['appointments']['by_department'].items():
        html += f"""
                <tr>
                    <td>{dept}</td>
                    <td>{count}</td>
                </tr>
        """
    
    html += """
            </tbody>
        </table>
        
        <div class="footer">
            © SehatSathi Healthcare System
        </div>
    </body>
    </html>
    """
    
    # Generate PDF
    pisa_status = pisa.CreatePDF(html, dest=buffer)
    
    # Return PDF response
    if pisa_status.err:
        return HttpResponse("PDF generation error", status=500)
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="statistics.pdf"'
    
    return response

def generate_statistics_csv(data):
    """
    Generate CSV for statistics
    """
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="statistics.csv"'
    
    writer = csv.writer(response)
    
    # Basic info
    writer.writerow(['SehatSathi Healthcare Statistics Report'])
    writer.writerow([])
    writer.writerow(['Generated on', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow([])
    
    # Patient statistics
    writer.writerow(['PATIENT STATISTICS'])
    writer.writerow(['Total Patients', data['patients']['total']])
    writer.writerow(['Active Patients', data['patients']['active']])
    writer.writerow(['Inactive Patients', data['patients']['inactive']])
    writer.writerow(['New This Month', data['patients']['new_this_month']])
    writer.writerow([])
    
    # Appointment statistics
    writer.writerow(['APPOINTMENT STATISTICS'])
    writer.writerow(['Total Appointments', data['appointments']['total']])
    writer.writerow(['Completed', data['appointments']['completed']])
    writer.writerow(['Upcoming', data['appointments']['upcoming']])
    writer.writerow(['Cancelled', data['appointments']['cancelled']])
    writer.writerow([])
    
    # Financial statistics
    writer.writerow(['FINANCIAL STATISTICS'])
    writer.writerow(['Total Revenue', f"${data['financials']['total_revenue']}"]) 
    writer.writerow(['Paid Amount', f"${data['financials']['paid_amount']}"]) 
    writer.writerow(['Pending Amount', f"${data['financials']['pending_amount']}"]) 
    writer.writerow([])
    
    # Gender distribution
    writer.writerow(['GENDER DISTRIBUTION'])
    writer.writerow(['Gender', 'Count'])
    for gender, count in data['patients']['gender_distribution'].items():
        writer.writerow([gender, count])
    writer.writerow([])
    
    # Department distribution
    writer.writerow(['DEPARTMENT DISTRIBUTION'])
    writer.writerow(['Department', 'Appointments'])
    for dept, count in data['appointments']['by_department'].items():
        writer.writerow([dept, count])
    
    return response

# Patient Chatbot View
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@csrf_exempt
def patient_chatbot_view(request):
    user_message = request.data.get('message', '').lower()
    bot_response_text = "I'm sorry, I couldn't connect to the AI assistant at the moment. Please try again later." # Default error message

    # API details for free-ai.xyz (experimental)
    api_url = "https://free-ai.xyz/free-ai-x-basic"
    # As per their free plan, an API key might not be strictly needed for basic/limited use,
    # or a generic one might work. If this fails, a specific API key from free-ai.xyz would be required.
    # For now, we'll try without a specific key or with a placeholder if needed by the library.
    headers = {
        'Content-Type': 'application/json',
        # 'x-api-key': 'YOUR_API_KEY_IF_NEEDED' # Placeholder
    }
    payload = {
        "message": user_message
    }

    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=10) # 10 second timeout
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
        
        api_data = response.json()
        
        # Adjust based on the actual structure of the API response
        # Assuming the response has a key like 'response' or 'answer' for the bot's message
        if 'response' in api_data:
            bot_response_text = api_data['response']
        elif 'answer' in api_data: # Common alternative key
            bot_response_text = api_data['answer']
        elif 'message' in api_data and isinstance(api_data['message'], str): # If the API echoes back or uses 'message' for reply
             bot_response_text = api_data['message']
        else:
            # If the structure is unknown or the expected key is missing
            # We might log this for debugging: print(f"Unexpected API response structure: {api_data}")
            bot_response_text = "I received a response, but couldn't understand it. Please try rephrasing."

    except requests.exceptions.Timeout:
        bot_response_text = "The AI assistant is taking too long to respond. Please try again shortly."
    except requests.exceptions.HTTPError as e:
        # Log the error: print(f"HTTP error calling chatbot API: {e} - Response: {e.response.text}")
        if e.response.status_code == 401 or e.response.status_code == 403:
            bot_response_text = "There was an authentication issue with the AI assistant. Please contact support."
        elif e.response.status_code == 429: # Too Many Requests
            bot_response_text = "The AI assistant is currently experiencing high traffic. Please try again later."
        else:
            bot_response_text = f"An error occurred while communicating with the AI assistant (HTTP {e.response.status_code})."
    except requests.exceptions.RequestException as e:
        # Catch other network-related errors (DNS failure, connection refused, etc.)
        # Log the error: print(f"Error calling chatbot API: {e}")
        bot_response_text = "I'm having trouble connecting to the AI assistant. Please check your internet connection and try again."
    except ValueError: # Handles JSON decoding errors
        # Log the error: print(f"Error decoding JSON response from chatbot API: {response.text}")
        bot_response_text = "The AI assistant gave an unexpected response format."

    return Response({'user_message': user_message, 'bot_response': bot_response_text})
