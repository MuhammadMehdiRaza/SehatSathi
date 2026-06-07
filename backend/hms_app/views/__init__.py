# Import distributed sub-views modules cleanly onto separate lines
from .statistics_views import *
from .chatbot_views import *

# Explicitly expose your core authentication and dashboard views to the URL router
from .views import (
    login_view,
    logout_view,
    current_user,
    user_profile,
    admin_dashboard,
    doctor_dashboard,
    patient_dashboard,
    receptionist_dashboard,
    RegisterView,
    DepartmentViewSet,
    DoctorViewSet,
    PatientViewSet,
    AppointmentViewSet,
    MedicalRecordViewSet,
    LabTestViewSet,
    BillViewSet,
    SystemLogViewSet,
    UserViewSet,
    RoleViewSet,
    PermissionViewSet
)