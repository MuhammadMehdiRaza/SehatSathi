import os
import django
from datetime import datetime

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sehat_saathi.settings')
django.setup()

# Import models after Django setup
from hms_app.models import Patient, User

def update_patient_info():
    # Find the patient by email
    try:
        # Update this email to match the patient you want to update
        patient_email = "jeijeie@hihi.com"
        
        user = User.objects.get(email=patient_email, user_type='PATIENT')
        patient = Patient.objects.get(user=user)
        
        print(f"Found patient: {user.first_name} {user.last_name}")
        print(f"Current data:")
        print(f"  Gender: {patient.gender}")
        print(f"  Date of Birth: {patient.date_of_birth}")
        print(f"  Blood Group: {patient.blood_group}")
        print(f"  Address: {patient.address}")
        print(f"  Emergency Contact: {patient.emergency_contact}")
        
        # Update the patient info with actual data
        patient.date_of_birth = datetime.strptime("1990-01-01", "%Y-%m-%d").date()  # Example date
        patient.blood_group = "B+"  # Example blood group
        patient.address = "123 Main St, City, Country"  # Example address
        patient.emergency_contact = "9876543210"  # Example emergency contact
        
        # Save the changes
        patient.save()
        
        print("\nPatient information updated successfully!")
        print(f"Updated data:")
        print(f"  Gender: {patient.gender}")
        print(f"  Date of Birth: {patient.date_of_birth}")
        print(f"  Blood Group: {patient.blood_group}")
        print(f"  Address: {patient.address}")
        print(f"  Emergency Contact: {patient.emergency_contact}")
        
    except User.DoesNotExist:
        print(f"No user found with email {patient_email} and type PATIENT")
    except Patient.DoesNotExist:
        print(f"No patient profile found for user with email {patient_email}")
    except Exception as e:
        print(f"Error updating patient info: {str(e)}")

if __name__ == "__main__":
    update_patient_info() 