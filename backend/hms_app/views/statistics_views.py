from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from ..models import User, Doctor, Patient, Appointment, Bill, MedicalRecord
from django.db.models import Count, Sum, Q
from datetime import datetime, timedelta
import json
import csv
from django.utils import timezone
import io
from django.template.loader import get_template
from xhtml2pdf import pisa
from django.db.models.functions import TruncMonth

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_statistics(request):
    """
    Get system statistics for dashboard
    """
    # Get date filters if provided
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    
    # Date filtering
    filter_kwargs = {}
    if from_date and to_date:
        filter_kwargs['date_joined__range'] = [from_date, to_date]
    
    # Get today and month start for filtering
    today = timezone.now().date()
    month_start = today.replace(day=1)
    
    # Patient statistics
    total_patients = Patient.objects.count()
    active_patients = Patient.objects.filter(user__is_active=True).count()
    new_patients_this_month = Patient.objects.filter(
        user__date_joined__gte=month_start
    ).count()
    
    # Gender distribution
    gender_distribution = {}
    for gender, count in Patient.objects.values('gender').annotate(count=Count('id')):
        gender_distribution[gender] = count
    
    # Age distribution
    age_groups = {
        '0-18': Q(date_of_birth__gte=today - timedelta(days=365*18)),
        '19-35': Q(date_of_birth__lt=today - timedelta(days=365*18)) & Q(date_of_birth__gte=today - timedelta(days=365*35)),
        '36-50': Q(date_of_birth__lt=today - timedelta(days=365*35)) & Q(date_of_birth__gte=today - timedelta(days=365*50)),
        '51-65': Q(date_of_birth__lt=today - timedelta(days=365*50)) & Q(date_of_birth__gte=today - timedelta(days=365*65)),
        '65+': Q(date_of_birth__lt=today - timedelta(days=365*65))
    }
    
    age_distribution = {}
    for age_group, query in age_groups.items():
        age_distribution[age_group] = Patient.objects.filter(query).count()
    
    # Appointment statistics
    total_appointments = Appointment.objects.count()
    completed_appointments = Appointment.objects.filter(status='COMPLETED').count()
    upcoming_appointments = Appointment.objects.filter(
        date__gte=today, 
        status='SCHEDULED'
    ).count()
    cancelled_appointments = Appointment.objects.filter(status='CANCELLED').count()
    
    # Appointments by department
    dept_appointments = {}
    for dept in Appointment.objects.values('doctor__department__name').annotate(count=Count('id')):
        dept_name = dept['doctor__department__name'] or 'Unassigned'
        dept_appointments[dept_name] = dept['count']
    
    # Financial statistics
    total_revenue = Bill.objects.aggregate(total=Sum('amount'))['total'] or 0
    paid_amount = Bill.objects.filter(payment_status='PAID').aggregate(total=Sum('amount'))['total'] or 0
    pending_amount = Bill.objects.filter(payment_status='PENDING').aggregate(total=Sum('amount'))['total'] or 0
    
    # Monthly revenue trend
    monthly_revenue = []
    for i in range(12):
        month = today.replace(day=1) - timedelta(days=30*i)
        month_start = month.replace(day=1)
        if month.month == 12:
            next_month = month.replace(year=month.year+1, month=1)
        else:
            next_month = month.replace(month=month.month+1)
        
        month_revenue = Bill.objects.filter(
            date_generated__gte=month_start,
            date_generated__lt=next_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        monthly_revenue.insert(0, month_revenue)
    
    # Revenue by service type
    service_revenue = {
        'Consultations': Bill.objects.filter(description__icontains='consultation').aggregate(total=Sum('amount'))['total'] or 0,
        'Lab Tests': Bill.objects.filter(description__icontains='lab').aggregate(total=Sum('amount'))['total'] or 0,
        'Procedures': Bill.objects.filter(description__icontains='procedure').aggregate(total=Sum('amount'))['total'] or 0,
        'Medications': Bill.objects.filter(description__icontains='medication').aggregate(total=Sum('amount'))['total'] or 0,
    }
    
    # Export format
    export_format = request.GET.get('export')
    if export_format == 'pdf':
        return generate_statistics_pdf({
            'patients': {
                'total': total_patients,
                'active': active_patients,
                'inactive': total_patients - active_patients,
                'new_this_month': new_patients_this_month,
                'gender_distribution': gender_distribution,
                'age_distribution': age_distribution
            },
            'appointments': {
                'total': total_appointments,
                'completed': completed_appointments,
                'upcoming': upcoming_appointments,
                'cancelled': cancelled_appointments,
                'by_department': dept_appointments,
                'monthly_trend': monthly_revenue  # Reusing monthly revenue data
            },
            'financials': {
                'total_revenue': total_revenue,
                'paid_amount': paid_amount,
                'pending_amount': pending_amount,
                'monthly_revenue': monthly_revenue,
                'by_service': service_revenue
            }
        })
    elif export_format == 'csv':
        return generate_statistics_csv({
            'patients': {
                'total': total_patients,
                'active': active_patients,
                'inactive': total_patients - active_patients,
                'new_this_month': new_patients_this_month,
                'gender_distribution': gender_distribution,
                'age_distribution': age_distribution
            },
            'appointments': {
                'total': total_appointments,
                'completed': completed_appointments,
                'upcoming': upcoming_appointments,
                'cancelled': cancelled_appointments,
                'by_department': dept_appointments,
                'monthly_trend': monthly_revenue
            },
            'financials': {
                'total_revenue': total_revenue,
                'paid_amount': paid_amount,
                'pending_amount': pending_amount,
                'monthly_revenue': monthly_revenue,
                'by_service': service_revenue
            }
        })
    
    # Return JSON response
    return JsonResponse({
        'patients': {
            'total': total_patients,
            'active': active_patients,
            'inactive': total_patients - active_patients,
            'new_this_month': new_patients_this_month,
            'gender_distribution': gender_distribution,
            'age_distribution': age_distribution
        },
        'appointments': {
            'total': total_appointments,
            'completed': completed_appointments,
            'upcoming': upcoming_appointments,
            'cancelled': cancelled_appointments,
            'by_department': dept_appointments,
            'monthly_trend': monthly_revenue  # Reusing monthly revenue data
        },
        'financials': {
            'total_revenue': total_revenue,
            'paid_amount': paid_amount,
            'pending_amount': pending_amount,
            'monthly_revenue': monthly_revenue,
            'by_service': service_revenue
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_reports(request):
    """
    Generate and download reports
    """
    report_type = request.GET.get('type', 'patient')
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    export_format = request.GET.get('export')
    
    data = generate_report_data(report_type, from_date, to_date)
    
    if export_format == 'pdf':
        return generate_report_pdf(report_type, data, from_date, to_date)
    elif export_format == 'csv':
        return generate_report_csv(report_type, data, from_date, to_date)
    
    return JsonResponse(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def preview_report(request):
    """
    Preview report data before download
    """
    report_type = request.GET.get('type', 'patient')
    from_date = request.GET.get('from_date')
    to_date = request.GET.get('to_date')
    
    data = generate_report_data(report_type, from_date, to_date)
    return JsonResponse(data)

def generate_report_data(report_type, from_date=None, to_date=None):
    """
    Generate report data based on type and date range
    """
    filter_kwargs = {}
    if from_date and to_date:
        if report_type == 'patient':
            filter_kwargs['user__date_joined__range'] = [from_date, to_date]
        elif report_type == 'appointment':
            filter_kwargs['date__range'] = [from_date, to_date]
        elif report_type == 'financial':
            filter_kwargs['date_generated__range'] = [from_date, to_date]
    
    if report_type == 'patient':
        patients = Patient.objects.filter(**filter_kwargs).select_related('user')
        data = []
        
        for patient in patients:
            appointments = Appointment.objects.filter(patient=patient).count()
            latest_appointment = Appointment.objects.filter(patient=patient).order_by('-date').first()
            
            age = None
            if patient.date_of_birth:
                today = timezone.now().date()
                age = today.year - patient.date_of_birth.year - ((today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day))
            
            data.append({
                'name': f"{patient.user.first_name} {patient.user.last_name}",
                'gender': patient.get_gender_display() if hasattr(patient, 'get_gender_display') else patient.gender,
                'age': age,
                'visits': appointments,
                'lastVisit': latest_appointment.date.strftime('%Y-%m-%d') if latest_appointment else 'Never'
            })
        
        return {
            'title': 'Patient Report',
            'period': f"{from_date} to {to_date}" if from_date and to_date else "All time",
            'data': data
        }
        
    elif report_type == 'appointment':
        # Group appointments by doctor
        doctors = Doctor.objects.all().select_related('user', 'department')
        data = []
        
        for doctor in doctors:
            appointments = Appointment.objects.filter(doctor=doctor, **filter_kwargs)
            completed = appointments.filter(status='COMPLETED').count()
            cancelled = appointments.filter(status='CANCELLED').count()
            total_patients = appointments.values('patient').distinct().count()
            
            data.append({
                'doctor': f"Dr. {doctor.user.first_name} {doctor.user.last_name}",
                'department': doctor.department.name if doctor.department else 'Unassigned',
                'patients': total_patients,
                'completed': completed,
                'cancelled': cancelled
            })
        
        return {
            'title': 'Appointment Report',
            'period': f"{from_date} to {to_date}" if from_date and to_date else "All time",
            'data': data
        }
        
    elif report_type == 'financial':
        # Group financial data by category
        categories = {
            'Consultations': Q(description__icontains='consultation'),
            'Lab Tests': Q(description__icontains='lab'),
            'Procedures': Q(description__icontains='procedure'),
            'Medications': Q(description__icontains='medication'),
        }
        
        data = []
        for category, query in categories.items():
            bills = Bill.objects.filter(query, **filter_kwargs)
            total = bills.aggregate(total=Sum('amount'))['total'] or 0
            paid = bills.filter(payment_status='PAID').aggregate(total=Sum('amount'))['total'] or 0
            pending = bills.filter(payment_status='PENDING').aggregate(total=Sum('amount'))['total'] or 0
            
            data.append({
                'category': category,
                'amount': total,
                'paid': paid,
                'pending': pending
            })
        
        return {
            'title': 'Financial Report',
            'period': f"{from_date} to {to_date}" if from_date and to_date else "All time",
            'data': data
        }
    
    return {'title': 'Unknown Report Type', 'data': []}

def generate_report_pdf(report_type, data, from_date=None, to_date=None):
    """
    Generate PDF report
    """
    buffer = io.BytesIO()
    
    # Simple HTML template for report
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            h1 {{ color: #2c3e50; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th {{ background-color: #2c3e50; color: white; padding: 8px; text-align: left; }}
            td {{ border: 1px solid #ddd; padding: 8px; }}
            .footer {{ margin-top: 20px; font-size: 10px; color: #7f8c8d; text-align: center; }}
        </style>
    </head>
    <body>
        <h1>{data['title']}</h1>
        <p>Period: {data['period']}</p>
        <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        
        <table>
            <thead>
                <tr>
    """
    
    # Add columns based on report type
    if report_type == 'patient':
        html += """
                    <th>Patient Name</th>
                    <th>Gender</th>
                    <th>Age</th>
                    <th>Visits</th>
                    <th>Last Visit</th>
                </tr>
            </thead>
            <tbody>
        """
        
        for row in data['data']:
            html += f"""
                <tr>
                    <td>{row['name']}</td>
                    <td>{row['gender']}</td>
                    <td>{row['age'] if row['age'] is not None else 'N/A'}</td>
                    <td>{row['visits']}</td>
                    <td>{row['lastVisit']}</td>
                </tr>
            """
    
    elif report_type == 'appointment':
        html += """
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Patients</th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                </tr>
            </thead>
            <tbody>
        """
        
        for row in data['data']:
            html += f"""
                <tr>
                    <td>{row['doctor']}</td>
                    <td>{row['department']}</td>
                    <td>{row['patients']}</td>
                    <td>{row['completed']}</td>
                    <td>{row['cancelled']}</td>
                </tr>
            """
    
    elif report_type == 'financial':
        html += """
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Paid</th>
                    <th>Pending</th>
                </tr>
            </thead>
            <tbody>
        """
        
        for row in data['data']:
            html += f"""
                <tr>
                    <td>{row['category']}</td>
                    <td>${row['amount']}</td>
                    <td>${row['paid']}</td>
                    <td>${row['pending']}</td>
                </tr>
            """
    
    html += """
            </tbody>
        </table>
        
        <div class="footer">
            © SehatSathi Healthcare System
        </div>
    </body>
    </html>
    """
    
    # Generate PDF
    pisa_status = pisa.CreatePDF(html, dest=buffer)
    
    # Return PDF response
    if pisa_status.err:
        return HttpResponse("PDF generation error", status=500)
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_report.pdf"'
    
    return response

def generate_report_csv(report_type, data, from_date=None, to_date=None):
    """
    Generate CSV report
    """
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_report.csv"'
    
    writer = csv.writer(response)
    
    # Write headers based on report type
    if report_type == 'patient':
        writer.writerow(['Patient Name', 'Gender', 'Age', 'Visits', 'Last Visit'])
        for row in data['data']:
            writer.writerow([
                row['name'],
                row['gender'],
                row['age'] if row['age'] is not None else 'N/A',
                row['visits'],
                row['lastVisit']
            ])
    
    elif report_type == 'appointment':
        writer.writerow(['Doctor', 'Department', 'Patients', 'Completed', 'Cancelled'])
        for row in data['data']:
            writer.writerow([
                row['doctor'],
                row['department'],
                row['patients'],
                row['completed'],
                row['cancelled']
            ])
    
    elif report_type == 'financial':
        writer.writerow(['Category', 'Amount', 'Paid', 'Pending'])
        for row in data['data']:
            writer.writerow([
                row['category'],
                row['amount'],
                row['paid'],
                row['pending']
            ])
    
    return response

def generate_statistics_pdf(data):
    """
    Generate PDF for statistics
    """
    buffer = io.BytesIO()
    
    # Simple HTML template for statistics
    html = """
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #2c3e50; }
            h2 { color: #34495e; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #2c3e50; color: white; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            .footer { margin-top: 20px; font-size: 10px; color: #7f8c8d; text-align: center; }
            .stat-box { margin-bottom: 5px; }
        </style>
    </head>
    <body>
        <h1>Healthcare Statistics Report</h1>
        <p>Generated on: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """</p>
        
        <h2>Patient Statistics</h2>
        <div class="stat-box">Total Patients: """ + str(data['patients']['total']) + """</div>
        <div class="stat-box">Active Patients: """ + str(data['patients']['active']) + """</div>
        <div class="stat-box">Inactive Patients: """ + str(data['patients']['inactive']) + """</div>
        <div class="stat-box">New This Month: """ + str(data['patients']['new_this_month']) + """</div>
        
        <h2>Appointment Statistics</h2>
        <div class="stat-box">Total Appointments: """ + str(data['appointments']['total']) + """</div>
        <div class="stat-box">Completed: """ + str(data['appointments']['completed']) + """</div>
        <div class="stat-box">Upcoming: """ + str(data['appointments']['upcoming']) + """</div>
        <div class="stat-box">Cancelled: """ + str(data['appointments']['cancelled']) + """</div>
        
        <h2>Financial Statistics</h2>
        <div class="stat-box">Total Revenue: $""" + str(data['financials']['total_revenue']) + """</div>
        <div class="stat-box">Paid Amount: $""" + str(data['financials']['paid_amount']) + """</div>
        <div class="stat-box">Pending Amount: $""" + str(data['financials']['pending_amount']) + """</div>
        
        <h2>Gender Distribution</h2>
        <table>
            <thead>
                <tr>
                    <th>Gender</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for gender, count in data['patients']['gender_distribution'].items():
        html += f"""
                <tr>
                    <td>{gender}</td>
                    <td>{count}</td>
                </tr>
        """
    
    html += """
            </tbody>
        </table>
        
        <h2>Department Distribution</h2>
        <table>
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Appointments</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for dept, count in data['appointments']['by_department'].items():
        html += f"""
                <tr>
                    <td>{dept}</td>
                    <td>{count}</td>
                </tr>
        """
    
    html += """
            </tbody>
        </table>
        
        <div class="footer">
            © SehatSathi Healthcare System
        </div>
    </body>
    </html>
    """
    
    # Generate PDF
    pisa_status = pisa.CreatePDF(html, dest=buffer)
    
    # Return PDF response
    if pisa_status.err:
        return HttpResponse("PDF generation error", status=500)
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="statistics.pdf"'
    
    return response

def generate_statistics_csv(data):
    """
    Generate CSV for statistics
    """
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="statistics.csv"'
    
    writer = csv.writer(response)
    
    # Basic info
    writer.writerow(['SehatSathi Healthcare Statistics Report'])
    writer.writerow([])
    writer.writerow(['Generated on', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow([])
    
    # Patient statistics
    writer.writerow(['PATIENT STATISTICS'])
    writer.writerow(['Total Patients', data['patients']['total']])
    writer.writerow(['Active Patients', data['patients']['active']])
    writer.writerow(['Inactive Patients', data['patients']['inactive']])
    writer.writerow(['New This Month', data['patients']['new_this_month']])
    writer.writerow([])
    
    # Appointment statistics
    writer.writerow(['APPOINTMENT STATISTICS'])
    writer.writerow(['Total Appointments', data['appointments']['total']])
    writer.writerow(['Completed', data['appointments']['completed']])
    writer.writerow(['Upcoming', data['appointments']['upcoming']])
    writer.writerow(['Cancelled', data['appointments']['cancelled']])
    writer.writerow([])
    
    # Financial statistics
    writer.writerow(['FINANCIAL STATISTICS'])
    writer.writerow(['Total Revenue', f"${data['financials']['total_revenue']}"]) 
    writer.writerow(['Paid Amount', f"${data['financials']['paid_amount']}"]) 
    writer.writerow(['Pending Amount', f"${data['financials']['pending_amount']}"]) 
    writer.writerow([])
    
    # Gender distribution
    writer.writerow(['GENDER DISTRIBUTION'])
    writer.writerow(['Gender', 'Count'])
    for gender, count in data['patients']['gender_distribution'].items():
        writer.writerow([gender, count])
    writer.writerow([])
    
    # Department distribution
    writer.writerow(['DEPARTMENT DISTRIBUTION'])
    writer.writerow(['Department', 'Appointments'])
    for dept, count in data['appointments']['by_department'].items():
        writer.writerow([dept, count])
    
    return response 