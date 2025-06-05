from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission, ContentType
from .models import (
    Department, Doctor, Patient, Appointment, 
    MedicalRecord, LabTest, Bill, SystemLog,
    Role, UserRole
)

User = get_user_model()

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'permission_ids']
    
    def create(self, validated_data):
        permission_ids = validated_data.pop('permission_ids', [])
        role = Role.objects.create(**validated_data)
        role.permissions.set(permission_ids)
        return role
    
    def update(self, instance, validated_data):
        permission_ids = validated_data.pop('permission_ids', None)
        instance = super().update(instance, validated_data)
        
        if permission_ids is not None:
            instance.permissions.set(permission_ids)
        return instance

class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'role_name']

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    roles = UserRoleSerializer(source='user_roles', many=True, read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 
                 'user_type', 'phone_number', 'date_joined', 'is_active', 'roles', 'role_ids']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        role_ids = validated_data.pop('role_ids', [])
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        # Assign roles
        for role in role_ids:
            UserRole.objects.create(user=user, role=role)
            
        return user
        
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        role_ids = validated_data.pop('role_ids', None)
        
        # Update regular fields
        instance = super().update(instance, validated_data)
        
        # Update password if provided
        if password:
            instance.set_password(password)
            instance.save()
        
        # Update roles if provided
        if role_ids is not None:
            # Clear existing roles
            instance.user_roles.all().delete()
            # Add new roles
            for role in role_ids:
                UserRole.objects.create(user=instance, role=role)
                
        return instance

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class DoctorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), 
        source='department', 
        write_only=True
    )
    
    class Meta:
        model = Doctor
        fields = ['id', 'user', 'department', 'department_id', 'specialization', 
                 'qualification', 'experience']

class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Patient
        fields = ['id', 'user', 'date_of_birth', 'blood_group', 'gender', 
                 'address', 'emergency_contact']
    
    def to_representation(self, instance):
        # Print each patient as it's being serialized
        print(f"Serializing patient: ID {instance.id}, User ID: {instance.user.id}, Name: {instance.user.first_name} {instance.user.last_name}")
        return super().to_representation(instance)

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'doctor', 'patient_name', 'doctor_name',
                 'date', 'time', 'reason', 'status', 'notification_status', 'created_at', 'updated_at']
    
    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.first_name} {obj.doctor.user.last_name}"

class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalRecord
        fields = ['id', 'patient', 'doctor', 'patient_name', 'doctor_name',
                 'diagnosis', 'prescription', 'notes', 'date']
    
    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.first_name} {obj.doctor.user.last_name}"

class LabTestSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LabTest
        fields = ['id', 'name', 'patient', 'doctor', 'patient_name', 'doctor_name',
                 'date_ordered', 'date_completed', 'results', 'status',
                 'test_type', 'instructions', 'urgency']
    
    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.first_name} {obj.doctor.user.last_name}"

class BillSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Bill
        fields = ['id', 'patient', 'patient_name', 'amount', 'description',
                 'date_generated', 'payment_status', 'payment_date']
    
    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"

class SystemLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = SystemLog
        fields = ['id', 'user', 'user_email', 'action', 'description', 'timestamp']
    
    def get_user_email(self, obj):
        if obj.user:
            return obj.user.email
        return None

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'confirm_password', 'first_name', 
                 'last_name', 'user_type', 'phone_number']
    
    def validate(self, data):
        if data['password'] != data.pop('confirm_password'):
            raise serializers.ValidationError("Passwords do not match")
        return data
    
    def create(self, validated_data):
        return User.objects.create_user(**validated_data) 