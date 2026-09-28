import os
from bottle import Bottle, request, response, static_file, run
from controllers.auth_controller import AuthController
from controllers.doctor_controller import DoctorController
from controllers.bookmark_controller import BookmarkController
from controllers.record_controller import RecordController
from controllers.appointment_controller import AppointmentController
from controllers.telemedicine_controller import TelemedicineController
from db.database import init_db

app = Bottle()

auth_controller = AuthController()
doctor_controller = DoctorController()
bookmark_controller = BookmarkController()
record_controller = RecordController()
appointment_controller = AppointmentController()
telemedicine_controller = TelemedicineController()

UPLOAD_DIR = './uploads'
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@app.hook('after_request')
def enable_cors():
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, Authorization'

@app.route('/<path:path>', method='OPTIONS')
def options_handler(path):
    return {}

@app.route('/api/login', method=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return {}        
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    result, status_code = auth_controller.login(email, password)
    response.status = status_code
    return result

@app.route('/api/send-otp', method=['POST', 'OPTIONS'])
def send_otp():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    email = data.get('email')
    result, status_code = auth_controller.send_otp(email)
    response.status = status_code
    return result

@app.route('/api/signup', method=['POST', 'OPTIONS'])
def signup():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    result, status_code = auth_controller.signup(data)
    response.status = status_code
    return result

@app.route('/api/doctors', method=['GET', 'OPTIONS'])
def get_doctors():
    if request.method == 'OPTIONS':
        return {}
    result, status_code = doctor_controller.get_doctors()
    response.status = status_code
    return result

@app.route('/api/bookmarks/add', method=['POST', 'OPTIONS'])
def add_bookmark():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    result, status_code = bookmark_controller.add_bookmark(data)
    response.status = status_code
    return result

@app.route('/api/bookmarks/<patient_id:int>', method=['GET', 'OPTIONS'])
def get_bookmarks(patient_id):
    if request.method == 'OPTIONS':
        return {}
    result, status_code = bookmark_controller.get_bookmarks(patient_id)
    response.status = status_code
    return result

@app.route('/api/bookmarks/delete', method=['DELETE', 'OPTIONS'])
def delete_bookmark():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    result, status_code = bookmark_controller.delete_bookmark(data)
    response.status = status_code
    return result

@app.route('/api/records/upload', method=['POST', 'OPTIONS'])
def upload_record():
    if request.method == 'OPTIONS':
        return {}
    upload = request.files.get('file')
    patient_id = request.forms.get('patient_id')
    description = request.forms.get('description', '')
    result, status_code = record_controller.upload_record(upload, patient_id, description, UPLOAD_DIR)
    response.status = status_code
    return result

@app.route('/api/records/<patient_id:int>', method=['GET', 'OPTIONS'])
def get_records(patient_id):
    if request.method == 'OPTIONS':
        return {}
    result, status_code = record_controller.get_records(patient_id)
    response.status = status_code
    return result

@app.route('/api/records/delete/<record_id:int>', method=['DELETE', 'OPTIONS'])
def delete_record(record_id):
    if request.method == 'OPTIONS':
        return {}
    result, status_code = record_controller.delete_record(record_id)
    response.status = status_code
    return result

@app.route('/api/records/request-access', method=['POST', 'OPTIONS'])
def request_record_access():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    result, status_code = record_controller.request_access(data)
    response.status = status_code
    return result

@app.route('/api/records/access-requests/<patient_id:int>', method=['GET', 'OPTIONS'])
def get_access_requests(patient_id):
    if request.method == 'OPTIONS':
        return {}
    result, status_code = record_controller.get_patient_access_requests(patient_id)
    response.status = status_code
    return result

@app.route('/api/records/access-requests/doctor/<doctor_id:int>', method=['GET', 'OPTIONS'])
def get_doctor_access_requests(doctor_id):
    if request.method == 'OPTIONS':
        return {}
    result, status_code = record_controller.get_doctor_access_requests(doctor_id)
    response.status = status_code
    return result

@app.route('/api/records/access-request/respond', method=['POST', 'OPTIONS'])
@app.route('/api/records/access-requests/respond', method=['POST', 'OPTIONS'])
@app.route('/api/records/respond-access', method=['POST', 'OPTIONS'])
def respond_access_request():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    result, status_code = record_controller.respond_access_request(data)
    response.status = status_code
    return result

@app.route('/api/records/doctor-view/<patient_id:int>', method=['GET', 'OPTIONS'])
def doctor_view_records(patient_id):
    if request.method == 'OPTIONS':
        return {}
    doctor_id = request.query.get('doctor_id')
    result, status_code = record_controller.get_patient_history_for_doctor(doctor_id, patient_id)
    response.status = status_code
    return result

@app.route('/api/prescriptions/upload', method=['POST', 'OPTIONS'])
def upload_prescription():
    if request.method == 'OPTIONS':
        return {}
    
    upload = request.files.get('file')
    patient_id = request.forms.get('patient_id')
    doctor_id = request.forms.get('doctor_id')
    appointment_id = request.forms.get('appointment_id')
    notes = request.forms.get('notes', '')

    try:
        patient_id = int(patient_id) if patient_id else None
        doctor_id = int(doctor_id) if doctor_id else None
        appointment_id = int(appointment_id) if appointment_id else None
    except ValueError:
        response.status = 400
        return {'status': 'error', 'message': 'Invalid ID formats provided.'}

    result, status_code = record_controller.doctor_upload_prescription(
        upload, patient_id, doctor_id, appointment_id, notes, UPLOAD_DIR
    )
    
    response.status = status_code
    return result

@app.route('/api/prescriptions/patient/<patient_id:int>', method=['GET', 'OPTIONS'])
def get_patient_prescriptions(patient_id):
    if request.method == 'OPTIONS':
        return {}
    result, status_code = record_controller.get_prescriptions(patient_id)
    response.status = status_code
    return result

@app.route('/api/appointments/schedule', method=['POST', 'OPTIONS'])
def schedule_appointment():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    result, status_code = appointment_controller.schedule(data)
    response.status = status_code
    return result

@app.route('/api/appointments/patient/<patient_id:int>', method=['GET', 'OPTIONS'])
def get_patient_appointments(patient_id):
    if request.method == 'OPTIONS':
        return {}
    result, status_code = appointment_controller.get_patient_appointments(patient_id)
    response.status = status_code
    return result

@app.route('/api/appointments/doctor/<doctor_id:int>', method=['GET', 'OPTIONS'])
def get_doctor_appointments(doctor_id):
    if request.method == 'OPTIONS':
        return {}
    result, status_code = appointment_controller.get_doctor_appointments(doctor_id)
    response.status = status_code
    return result

@app.route('/api/appointments/update-status', method=['POST', 'OPTIONS'])
def update_appointment_status():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    result, status_code = appointment_controller.update_status(data)
    response.status = status_code
    return result

@app.route('/api/telemedicine/join-room', method=['POST', 'OPTIONS'])
def join_telemedicine_room():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    result, status_code = telemedicine_controller.join_room(data)
    response.status = status_code
    return result

@app.route('/api/telemedicine/upload', method=['POST', 'OPTIONS'])
def upload_telemedicine_recording():
    if request.method == 'OPTIONS':
        return {}
    result, status_code = telemedicine_controller.save_recording()
    response.status = status_code
    return result

@app.route('/api/telemedicine/get-recording/<appointment_id:int>', method=['GET', 'OPTIONS'])
def get_telemedicine_recording(appointment_id):
    if request.method == 'OPTIONS':
        return {}
    return telemedicine_controller.get_recording(appointment_id)

@app.route('/uploads/<filename>', method=['GET', 'OPTIONS'])
def serve_upload(filename):
    if request.method == 'OPTIONS':
        return {}
    return static_file(filename, root=UPLOAD_DIR)

if __name__ == '__main__':
    init_db()
    run(app, host='0.0.0.0', port=8080, server='waitress')