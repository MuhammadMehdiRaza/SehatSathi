from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for API viewsets
router = DefaultRouter()

# Register viewsets with the router
router.register(r'departments', views.DepartmentViewSet, basename='department')
router.register(r'doctors', views.DoctorViewSet, basename='doctor')
router.register(r'patients', views.PatientViewSet, basename='patient')
router.register(r'appointments', views.AppointmentViewSet, basename='appointment')
router.register(r'medical-records', views.MedicalRecordViewSet, basename='medical-record')
router.register(r'lab-tests', views.LabTestViewSet, basename='lab-test')
router.register(r'bills', views.BillViewSet, basename='bill')
router.register(r'system-logs', views.SystemLogViewSet, basename='system-log')
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'roles', views.RoleViewSet, basename='role')
router.register(r'permissions', views.PermissionViewSet, basename='permission')

urlpatterns = [
    # Authentication endpoints
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('current-user/', views.current_user, name='current-user'),
    path('users/profile/', views.user_profile, name='user-profile'),
    
    # Dashboard endpoints
    path('dashboard/admin/', views.admin_dashboard, name='admin-dashboard'),
    path('dashboard/doctor/', views.doctor_dashboard, name='doctor-dashboard'),
    path('dashboard/patient/', views.patient_dashboard, name='patient-dashboard'),
    path('dashboard/receptionist/', views.receptionist_dashboard, name='receptionist-dashboard'),
    
    # Receptionist module endpoints
    path('receptionist-dashboard/', views.receptionist_dashboard, name='new-receptionist-dashboard'),
    
    # Admin module endpoints
    path('admin/statistics/', views.get_statistics, name='admin-statistics'),
    path('admin/reports/', views.get_reports, name='admin-reports'),
    
    # Statistics and Reports APIs
    path('api/statistics/', views.get_statistics, name='statistics-api'),
    path('api/admin/reports/', views.get_reports, name='reports-api'),
    path('api/admin/reports/preview/', views.preview_report, name='preview-report-api'),
    
    # Patient Chatbot API
    path('patient/chatbot/', views.patient_chatbot_view, name='patient-chatbot-api'),
    path('patient/chatbot/options/', views.chatbot_options, name='patient-chatbot-options'),
    path('csrf-token/', views.get_csrf_token, name='get-csrf-token'),
    
    # Include all router URLs
    path('', include(router.urls)),
] 