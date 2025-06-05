# Sehat Saathi - Hospital Management System

A comprehensive hospital management system built with Django, PostgreSQL, and React.

## Features

### Doctor Module
- Profile Management
- Patient Medical Record Access
- Lab Test Ordering

### Patient Module
- Appointment Booking with doctors
- View Available Doctors and their specializations
- Appointment Reminders
- Access to Personal Medical Records
- Financial History View

### Administrator Module
- User Management (CRUD operations)
- Role-Based Permission Management
- System Logs Viewing
- System Statistics and Reporting

### Receptionist Module
- Patient Registration
- Appointment Management
- Bill and Invoice Generation
- Available Doctor Viewing
- Patient Profile Updates

## Tech Stack

### Backend
- Django
- Django REST Framework
- PostgreSQL

### Frontend
- React
- Material UI
- Formik & Yup for form handling
- React Router for navigation

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL

### Backend Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd sehat-saathi
   ```

2. Create a virtual environment and activate it:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a PostgreSQL database:
   ```
   createdb sehat_saathi  # Or use pgAdmin to create the database
   ```

5. Update the database settings in `sehat_saathi/settings.py` if necessary.

6. Run migrations:
   ```
   python manage.py migrate
   ```

7. Create a superuser:
   ```
   python manage.py createsuperuser
   ```

8. Start the development server:
   ```
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. The application should now be running at:
   - Backend: http://localhost:8000/
   - Frontend: http://localhost:3000/
   - API Documentation: http://localhost:8000/api/

## Deployment

For deployment, please follow these steps:

1. Set `DEBUG=False` in `sehat_saathi/settings.py`
2. Configure a production database
3. Collect static files: `python manage.py collectstatic`
4. Set up WSGI or ASGI server (e.g., Gunicorn)
5. Set up a reverse proxy (e.g., Nginx)
6. Build the React app for production: `npm run build`
7. Configure the server to serve the built React app

## License

This project is licensed under the MIT License - see the LICENSE file for details. 