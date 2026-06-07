# Import distributed sub-views modules cleanly
# Import distributed sub-views modules cleanly on individual lines
from .statistics_views import *
from .chatbot_views import *

# Define necessary ViewSets
from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.authtoken.models import Token  # Ensure Token model is explicitly exposed
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
    
    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            'message': 'No account found with this email address'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    user = authenticate(request, username=email, password=password)
    
    if user is not None:
        token, created = Token.objects.get_or_create(user=user)
        
        SystemLog.objects.create(
            user=user,
            action='LOGIN',
            description=f"User {user.email} logged in"
        )
        
        serializer = UserSerializer(user)
        return Response({
            'token': token.key,
            'user': serializer.data,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'message': 'Invalid password'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@csrf_exempt
def logout_view(request):
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
    doctors_count = Doctor.objects.count()
    patients_count = Patient.objects.count()
    appointments_count = Appointment.objects.count()
    
    pending_appointments = Appointment.objects.filter(status='REQUESTED').count()
    completed_appointments = Appointment.objects.filter(status='COMPLETED').count()
    
    total_bills = Bill.objects.count()
    pending_bills = Bill.objects.filter(payment_status='PENDING').count()
    paid_bills = Bill.objects.filter(payment_status='PAID').count()
    
    try:
        from .statistics_views import get_statistics as get_detailed_stats
        detailed_stats = get_detailed_stats(request).data
    except Exception as e:
        detailed_stats = {'error': str(e)}
    
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
    try:
        doctor = Doctor.objects.get(user=request.user)
        total_appointments = Appointment.objects.filter(doctor=doctor).count()
        pending_appointments = Appointment.objects.filter(doctor=doctor, status='REQUESTED').count()
        today_appointments = Appointment.objects.filter(
            doctor=doctor, 
            date=timezone.now().date()
        ).count()
        
        patient_ids = Appointment.objects.filter(doctor=doctor).values_list('patient', flat=True).distinct()
        total_patients = len(patient_ids)
        
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
    try:
        patient = Patient.objects.get(user=request.user)
        total_appointments = Appointment.objects.filter(patient=patient).count()
        pending_appointments = Appointment.objects.filter(patient=patient, status='REQUESTED').count()
        upcoming_appointments = Appointment.objects.filter(
            patient=patient, 
            date__gte=timezone.now().date(),
            status='SCHEDULED'
        ).count()
        
        medical_records_count = MedicalRecord.objects.filter(patient=patient).count()
        total_bills = Bill.objects.filter(patient=patient).count()
        pending_bills = Bill.objects.filter(patient=patient, payment_status='PENDING').count()
        lab_tests_count = LabTest.objects.filter(patient=patient).count()
        pending_lab_tests = LabTest.objects.filter(patient=patient, status='ORDERED').count()
        
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
    today = timezone.now().date()
    today_appointments = Appointment.objects.filter(date=today).count()
    pending_appointments = Appointment.objects.filter(status='REQUESTED').count()
    today_registrations = Patient.objects.filter(
        user__date_joined__date=today
    ).count()
    pending_bills = Bill.objects.filter(payment_status='PENDING').count()
    
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
        current_role = str(self.request.user.user_type).upper() if self.request.user.user_type else ""
        
        if current_role in ['ADMIN', 'RECEPTIONIST', 'PATIENT']:
            return Doctor.objects.all()
        elif current_role == 'DOCTOR':
            return Doctor.objects.filter(user=self.request.user)
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
        current_role = str(self.request.user.user_type).upper() if self.request.user.user_type else ""
        
        if current_role in ['ADMIN', 'RECEPTIONIST', 'DOCTOR']:
            return Patient.objects.all()
        elif current_role == 'PATIENT':
            return Patient.objects.filter(user=self.request.user)
        return Patient.objects.none()
    
    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['destroy']:
            return [permissions.IsAdminUser()]
        else:
            return [permissions.IsAuthenticated()]
    
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
                {'detail': 'Patient profile not found for current user'}, 
                status=status.HTTP_404_NOT_FOUND
            )


# Appointment views
class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    
    def get_queryset(self):
        current_role = str(self.request.user.user_type).upper() if self.request.user.user_type else ""
        
        if current_role in ['ADMIN', 'RECEPTIONIST']:
            return Appointment.objects.all()
        elif current_role == 'DOCTOR':
            return Appointment.objects.filter(doctor__user=self.request.user)
        elif current_role == 'PATIENT':
            return Appointment.objects.filter(patient__user=self.request.user)
        return Appointment.objects.none()


# Medical Record views
class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    
    def get_queryset(self):
        current_role = str(self.request.user.user_type).upper() if self.request.user.user_type else ""
        
        if current_role == 'ADMIN':
            return MedicalRecord.objects.all()
        elif current_role == 'DOCTOR':
            return MedicalRecord.objects.filter(doctor__user=self.request.user)
        elif current_role == 'PATIENT':
            return MedicalRecord.objects.filter(patient__user=self.request.user)
        return MedicalRecord.objects.none()


# Lab Test views
class LabTestViewSet(viewsets.ModelViewSet):
    serializer_class = LabTestSerializer
    
    def get_queryset(self):
        current_role = str(self.request.user.user_type).upper() if self.request.user.user_type else ""
        
        if current_role == 'ADMIN':
            return LabTest.objects.all()
        elif current_role == 'DOCTOR':
            return LabTest.objects.filter(doctor__user=self.request.user)
        elif current_role == 'PATIENT':
            return LabTest.objects.filter(patient__user=self.request.user)
        return LabTest.objects.none()


# Bill views
class BillViewSet(viewsets.ModelViewSet):
    serializer_class = BillSerializer
    
    def get_queryset(self):
        current_role = str(self.request.user.user_type).upper() if self.request.user.user_type else ""
        
        if current_role in ['ADMIN', 'RECEPTIONIST']:
            return Bill.objects.all()
        elif current_role == 'PATIENT':
            return Bill.objects.filter(patient__user=self.request.user)
        return Bill.objects.none()


# System Log views
class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SystemLogSerializer
    
    def get_queryset(self):
        if str(self.request.user.user_type).upper() == 'ADMIN':
            return SystemLog.objects.all()
        return SystemLog.objects.none()


# User views
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    
    def get_queryset(self):
        if str(self.request.user.user_type).upper() == 'ADMIN':
            return User.objects.all()
        return User.objects.none()


# Role views
class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    
    def get_queryset(self):
        if str(self.request.user.user_type).upper() == 'ADMIN':
            return Role.objects.all()
        return Role.objects.none()


# Permission views
class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PermissionSerializer
    
    def get_queryset(self):
        if str(self.request.user.user_type).upper() == 'ADMIN':
            return Permission.objects.all()
        return Permission.objects.none()