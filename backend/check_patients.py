import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sehat_saathi.settings')
django.setup()

# Import models after Django setup
from hms_app.models import Patient, User

def check_patients():
    print(f"Total patients in database: {Patient.objects.count()}")
    
    print("\nPatient details:")
    for idx, patient in enumerate(Patient.objects.all(), 1):
        print(f"  {idx}. ID: {patient.id}, User ID: {patient.user.id}, Name: {patient.user.first_name} {patient.user.last_name}, Email: {patient.user.email}")
    
    print("\nUser details for comparison:")
    all_users = User.objects.filter(user_type='PATIENT')
    print(f"Total users with type 'PATIENT': {all_users.count()}")
    
    for idx, user in enumerate(all_users, 1):
        # Check if this user has a patient profile
        has_profile = hasattr(user, 'patient_profile')
        print(f"  {idx}. ID: {user.id}, Name: {user.first_name} {user.last_name}, Email: {user.email}, Has patient profile: {has_profile}")

if __name__ == "__main__":
    check_patients() 