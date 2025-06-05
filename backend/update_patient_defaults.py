import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sehat_saathi.settings')
django.setup()

# Import models after Django setup
from hms_app.models import Patient

def update_patient_defaults():
    # Get all patients
    patients = Patient.objects.all()
    print(f"Found {patients.count()} patients")
    
    updated_count = 0
    
    for patient in patients:
        updated = False
        
        # Update blood_group if empty
        if not patient.blood_group:
            patient.blood_group = "N/A"
            updated = True
            
        # Update address if empty
        if not patient.address:
            patient.address = "Not specified"
            updated = True
            
        # Update emergency_contact if empty
        if not patient.emergency_contact:
            patient.emergency_contact = "Not specified"
            updated = True
            
        if updated:
            patient.save()
            updated_count += 1
            print(f"Updated patient: {patient.user.first_name} {patient.user.last_name}")
    
    print(f"\nUpdated {updated_count} patients with default values")

if __name__ == "__main__":
    update_patient_defaults() 