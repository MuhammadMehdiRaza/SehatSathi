from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager, Permission
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'ADMIN')
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('DOCTOR', 'Doctor'),
        ('PATIENT', 'Patient'),
        ('ADMIN', 'Administrator'),
        ('RECEPTIONIST', 'Receptionist'),
    )
    
    username = None
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=15, choices=USER_TYPE_CHOICES)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    date_joined = models.DateTimeField(default=timezone.now)
    zip_code=models.IntegerField(default=1)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'user_type']
    
    objects = UserManager()
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_user_type_display()})"

class Role(models.Model):
    """
    Model to define roles that can be assigned to users.
    Each role has a set of permissions.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    permissions = models.ManyToManyField(Permission, blank=True)
    
    def __str__(self):
        return self.name

class UserRole(models.Model):
    """
    Many-to-many relationship between User and Role
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('user', 'role')
    
    def __str__(self):
        return f"{self.user.email} - {self.role.name}"

class Department(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.name

class Doctor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    specialization = models.CharField(max_length=100)
    qualification = models.CharField(max_length=100)
    experience = models.IntegerField(help_text="Experience in years")
    
    def __str__(self):
        return f"Dr. {self.user.first_name} {self.user.last_name} - {self.specialization}"

class Patient(models.Model):
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    blood_group = models.CharField(max_length=5, blank=True, null=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=15, blank=True, null=True)
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('REQUESTED', 'Requested'),
        ('APPROVED', 'Approved'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    
    NOTIFICATION_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
    )
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    date = models.DateField()
    time = models.TimeField()
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='REQUESTED')
    notification_status = models.CharField(
        max_length=10, 
        choices=NOTIFICATION_STATUS_CHOICES, 
        default='PENDING',
        help_text='Status of the appointment notification'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.patient.user.first_name} with Dr. {self.doctor.user.first_name} on {self.date} at {self.time}"

class MedicalRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_records')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='medical_records')
    diagnosis = models.TextField()
    prescription = models.TextField()
    notes = models.TextField(blank=True, null=True)
    date = models.DateField(auto_now_add=True)
    
    def __str__(self):
        return f"Medical Record for {self.patient.user.first_name} - {self.date}"

class LabTest(models.Model):
    STATUS_CHOICES = (
        ('ORDERED', 'Ordered'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    
    TEST_TYPE_CHOICES = (
        ('BLOOD', 'Blood Test'),
        ('URINE', 'Urine Test'),
        ('IMAGING', 'Imaging'),
        ('PATHOLOGY', 'Pathology'),
        ('OTHER', 'Other'),
    )
    
    URGENCY_CHOICES = (
        ('NORMAL', 'Normal'),
        ('URGENT', 'Urgent'),
        ('EMERGENCY', 'Emergency'),
    )
    
    name = models.CharField(max_length=100)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_tests')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='ordered_tests')
    date_ordered = models.DateField(auto_now_add=True)
    date_completed = models.DateField(blank=True, null=True)
    results = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ORDERED')
    test_type = models.CharField(max_length=20, choices=TEST_TYPE_CHOICES, default='OTHER')
    instructions = models.TextField(blank=True, null=True)
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES, default='NORMAL')
    
    def __str__(self):
        return f"{self.name} for {self.patient.user.first_name}"

class Bill(models.Model):
    PAYMENT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    )
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='bills')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    date_generated = models.DateField(auto_now_add=True)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    payment_date = models.DateField(blank=True, null=True)
    
    def __str__(self):
        return f"Bill #{self.id} - {self.patient.user.first_name} ({self.amount})"

class SystemLog(models.Model):
    ACTION_CHOICES = (
        ('CREATE', 'Create'),
        ('READ', 'Read'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
    )
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"

# Signal to automatically create a Patient profile for new users with user_type='PATIENT'
@receiver(post_save, sender=User)
def create_patient_profile(sender, instance, created, **kwargs):
    """
    Signal handler to automatically create a Patient profile when a user with
    user_type='PATIENT' is created.
    """
    if created and instance.user_type == 'PATIENT':
        # Check if a patient profile already exists (should not, but just in case)
        if not hasattr(instance, 'patient_profile'):
            print(f"Creating patient profile for new user: {instance.email}")
            Patient.objects.create(
                user=instance,
                gender='M',  # Default value, can be updated later
                date_of_birth=None,
                blood_group='',
                address='',
                emergency_contact=''
            )
