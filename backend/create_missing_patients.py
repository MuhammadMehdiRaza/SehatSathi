import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sehat_saathi.settings')
django.setup()

# Import models after Django setup
from hms_app.models import Patient, User

def create_missing_patients():
    # Get all users with type PATIENT
    patient_users = User.objects.filter(user_type='PATIENT')
    
    print(f"Found {patient_users.count()} users with type PATIENT")
    
    created_count = 0
    already_exists_count = 0
    
    # Create patient profiles for those without one
    for user in patient_users:
        try:
            # Check if patient profile already exists
            patient = Patient.objects.get(user=user)
            print(f"Patient profile already exists for {user.first_name} {user.last_name}")
            already_exists_count += 1
        except Patient.DoesNotExist:
            # Create a new patient profile
            patient = Patient.objects.create(
                user=user,
                gender='M',  # Default values, can be updated later
                date_of_birth=None,
                blood_group='',
                address='',
                emergency_contact=''
            )
            print(f"Created new patient profile for {user.first_name} {user.last_name}")
            created_count += 1
    
    print(f"\nSummary: {created_count} patient profiles created, {already_exists_count} already existed")
    
    # Verify all patients were created
    all_patients = Patient.objects.all()
    print(f"Total patients in database after script: {all_patients.count()}")
    
    for idx, patient in enumerate(all_patients, 1):
        print(f"  {idx}. ID: {patient.id}, Name: {patient.user.first_name} {patient.user.last_name}")

if __name__ == "__main__":
    create_missing_patients() 