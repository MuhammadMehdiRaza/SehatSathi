from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.urls import path
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from .models import (
    User, Department, Doctor, Patient, Appointment, 
    MedicalRecord, LabTest, Bill, SystemLog, Role, UserRole
)

# Register Role and UserRole models
@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'permission_count')
    filter_horizontal = ('permissions',)
    search_fields = ('name', 'description')
    
    def permission_count(self, obj):
        return obj.permissions.count()
    permission_count.short_description = 'Permissions'

@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')
    list_filter = ('role',)
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'role__name')

# Register all models with admin site
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'user_type', 'date_joined', 'is_active', 'view_profile')
    list_filter = ('user_type', 'is_active', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name', 'phone_number')
    readonly_fields = ('date_joined',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('Permissions', {'fields': ('user_type', 'is_active', 'is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('date_joined', 'last_login')}),
    )
    
    def view_profile(self, obj):
        if obj.user_type == 'DOCTOR':
            try:
                doctor = obj.doctor_profile
                url = reverse('admin:hms_app_doctor_change', args=[doctor.id])
                return format_html('<a href="{}">View Doctor Profile</a>', url)
            except Doctor.DoesNotExist:
                return "No profile"
        elif obj.user_type == 'PATIENT':
            try:
                patient = obj.patient_profile
                url = reverse('admin:hms_app_patient_change', args=[patient.id])
                return format_html('<a href="{}">View Patient Profile</a>', url)
            except Patient.DoesNotExist:
                return "No profile"
        return "N/A"
    view_profile.short_description = 'Profile'

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'doctor_count')
    search_fields = ('name', 'description')
    
    def doctor_count(self, obj):
        return Doctor.objects.filter(department=obj).count()
    doctor_count.short_description = 'Doctors'

class DoctorProfileInline(admin.StackedInline):
    model = Doctor
    can_delete = False
    verbose_name_plural = 'Doctor Profile'
    fk_name = 'user'

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('get_doctor_name', 'department', 'specialization', 'qualification', 'experience', 'view_user', 'view_appointments', 'actions_buttons')
    list_filter = ('department', 'specialization')
    search_fields = ('user__first_name', 'user__last_name', 'user__email', 'specialization', 'qualification')
    autocomplete_fields = ['user', 'department']
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.user.first_name} {obj.user.last_name}"
    get_doctor_name.short_description = 'Doctor Name'
    
    def view_user(self, obj):
        url = reverse('admin:hms_app_user_change', args=[obj.user.id])
        return format_html('<a href="{}">View User</a>', url)
    view_user.short_description = 'User Details'
    
    def view_appointments(self, obj):
        url = reverse('admin:hms_app_appointment_changelist')
        return format_html('<a href="{}?doctor__id__exact={}">View Appointments</a>', url, obj.id)
    view_appointments.short_description = 'Appointments'
    
    def actions_buttons(self, obj):
        edit_url = reverse('admin:hms_app_doctor_change', args=[obj.id])
        delete_url = reverse('admin:hms_app_doctor_delete', args=[obj.id])
        return format_html(
            '<div class="btn-group">'
            '<a class="button btn" href="{}" style="background-color: #417690; color: white; margin-right: 5px;">Edit</a>'
            '<a class="button btn" href="{}" style="background-color: #BA2121; color: white;">Delete</a>'
            '</div>',
            edit_url, delete_url
        )
    actions_buttons.short_description = 'Actions'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user', 'department')
        return queryset
        
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('add_doctor/', self.admin_site.admin_view(self.add_doctor_view), name='add_doctor'),
        ]
        return custom_urls + urls
        
    def add_doctor_view(self, request):
        # This view would be implemented for a custom doctor creation form
        context = dict(
           self.admin_site.each_context(request),
           title='Add New Doctor',
        )
        return TemplateResponse(request, "admin/add_doctor.html", context)

class PatientProfileInline(admin.StackedInline):
    model = Patient
    can_delete = False
    verbose_name_plural = 'Patient Profile'
    fk_name = 'user'

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('get_patient_name', 'gender', 'date_of_birth', 'blood_group', 'view_user', 'view_appointments', 'view_medical_records', 'view_bills', 'actions_buttons')
    list_filter = ('gender', 'blood_group')
    search_fields = ('user__first_name', 'user__last_name', 'user__email', 'address', 'emergency_contact')
    autocomplete_fields = ['user']
    
    def get_patient_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"
    get_patient_name.short_description = 'Patient Name'
    
    def view_user(self, obj):
        url = reverse('admin:hms_app_user_change', args=[obj.user.id])
        return format_html('<a href="{}">View User</a>', url)
    view_user.short_description = 'User Details'
    
    def view_appointments(self, obj):
        url = reverse('admin:hms_app_appointment_changelist')
        return format_html('<a href="{}?patient__id__exact={}">View Appointments</a>', url, obj.id)
    view_appointments.short_description = 'Appointments'
    
    def view_medical_records(self, obj):
        url = reverse('admin:hms_app_medicalrecord_changelist')
        return format_html('<a href="{}?patient__id__exact={}">View Medical Records</a>', url, obj.id)
    view_medical_records.short_description = 'Medical Records'
    
    def view_bills(self, obj):
        url = reverse('admin:hms_app_bill_changelist')
        return format_html('<a href="{}?patient__id__exact={}">View Bills</a>', url, obj.id)
    view_bills.short_description = 'Bills'
    
    def actions_buttons(self, obj):
        edit_url = reverse('admin:hms_app_patient_change', args=[obj.id])
        delete_url = reverse('admin:hms_app_patient_delete', args=[obj.id])
        return format_html(
            '<div class="btn-group">'
            '<a class="button btn" href="{}" style="background-color: #417690; color: white; margin-right: 5px;">Edit</a>'
            '<a class="button btn" href="{}" style="background-color: #BA2121; color: white;">Delete</a>'
            '</div>',
            edit_url, delete_url
        )
    actions_buttons.short_description = 'Actions'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('user')
        return queryset
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('add_patient/', self.admin_site.admin_view(self.add_patient_view), name='add_patient'),
        ]
        return custom_urls + urls
        
    def add_patient_view(self, request):
        # This view would be implemented for a custom patient creation form
        context = dict(
           self.admin_site.each_context(request),
           title='Add New Patient',
        )
        return TemplateResponse(request, "admin/add_patient.html", context)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['show_add_buttons'] = True
        return super().changelist_view(request, extra_context=extra_context)

# Add action buttons to admin headers for Patient and Doctor
class ActionButtonsMixin:
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['add_button_url'] = reverse(f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_add')
        extra_context['add_button_label'] = f'Add {self.model._meta.verbose_name}'
        return super().changelist_view(request, extra_context=extra_context)

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_patient_name', 'get_doctor_name', 'date', 'time', 'status', 'notification_status')
    list_filter = ('status', 'date', 'notification_status')
    search_fields = ('patient__user__first_name', 'patient__user__last_name', 'doctor__user__first_name', 'doctor__user__last_name', 'reason')
    raw_id_fields = ('patient', 'doctor')
    date_hierarchy = 'date'
    
    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"
    get_patient_name.short_description = 'Patient'
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.first_name} {obj.doctor.user.last_name}"
    get_doctor_name.short_description = 'Doctor'

@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_patient_name', 'get_doctor_name', 'date', 'diagnosis')
    list_filter = ('date', 'doctor')
    search_fields = ('patient__user__first_name', 'patient__user__last_name', 'doctor__user__first_name', 'doctor__user__last_name', 'diagnosis', 'prescription', 'notes')
    raw_id_fields = ('patient', 'doctor')
    date_hierarchy = 'date'
    
    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"
    get_patient_name.short_description = 'Patient'
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.first_name} {obj.doctor.user.last_name}"
    get_doctor_name.short_description = 'Doctor'

@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_patient_name', 'get_doctor_name', 'date_ordered', 'status', 'test_type', 'urgency')
    list_filter = ('status', 'test_type', 'urgency', 'date_ordered')
    search_fields = ('name', 'patient__user__first_name', 'patient__user__last_name', 'doctor__user__first_name', 'doctor__user__last_name', 'instructions', 'results')
    raw_id_fields = ('patient', 'doctor')
    date_hierarchy = 'date_ordered'
    
    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"
    get_patient_name.short_description = 'Patient'
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.first_name} {obj.doctor.user.last_name}"
    get_doctor_name.short_description = 'Doctor'

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_patient_name', 'amount', 'date_generated', 'payment_status', 'payment_date')
    list_filter = ('payment_status', 'date_generated')
    search_fields = ('patient__user__first_name', 'patient__user__last_name', 'description')
    raw_id_fields = ('patient',)
    date_hierarchy = 'date_generated'
    
    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}"
    get_patient_name.short_description = 'Patient'

@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action', 'description', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__email', 'description')
    readonly_fields = ('user', 'action', 'description', 'timestamp')
