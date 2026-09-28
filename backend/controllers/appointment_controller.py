# ==============================================================================
# Medibuddy/backend/controllers/appointment_controller.py
# ==============================================================================

import uuid
from datetime import datetime, timedelta
from models.appointment_model import (
    create_appointment,
    get_appointments_by_patient,
    get_appointments_by_doctor,
    get_appointment_by_id,
    update_appointment_status,
    update_appointment_room,
    expire_pending_appointments
)

class AppointmentController:

    def _run_expiration_check(self):
        cutoff_time = (datetime.now() - timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')
        expire_pending_appointments(cutoff_time)

    def schedule(self, data):
        patient_id = data.get('patient_id')
        doctor_id = data.get('doctor_id')
        appointment_date = data.get('appointment_date')
        appointment_time = data.get('appointment_time')

        if not all([patient_id, doctor_id, appointment_date, appointment_time]):
            return {'status': 'error', 'message': 'Missing required fields'}, 400

        create_appointment(patient_id, doctor_id, appointment_date, appointment_time)
        return {'status': 'success', 'message': 'Appointment requested successfully'}, 200

    def get_patient_appointments(self, patient_id):
        self._run_expiration_check()
        raw_appointments = get_appointments_by_patient(patient_id)
        
        formatted_appointments = []
        for appt in raw_appointments:
            first_name = appt.get('doctor_first_name', '')
            last_name = appt.get('doctor_last_name', '')
            appt['doctor_name'] = f"Dr. {first_name} {last_name}".strip()
            formatted_appointments.append(appt)

        return {'status': 'success', 'appointments': formatted_appointments}, 200

    def get_doctor_appointments(self, doctor_id):
        self._run_expiration_check()
        raw_appointments = get_appointments_by_doctor(doctor_id)
        
        formatted_appointments = []
        for appt in raw_appointments:
            first_name = appt.get('patient_first_name', '')
            last_name = appt.get('patient_last_name', '')
            appt['patient_name'] = f"{first_name} {last_name}".strip()
            formatted_appointments.append(appt)

        return {'status': 'success', 'appointments': formatted_appointments}, 200

    def update_status(self, data):
        appointment_id = data.get('appointment_id')
        status = data.get('status')

        if not appointment_id or not status:
            return {'status': 'error', 'message': 'Missing appointment_id or status'}, 400

        if str(status).lower() == 'accepted':
            room_name = f"medibuddy-room-{appointment_id}-{uuid.uuid4().hex[:8]}"
            update_appointment_status(appointment_id, status, room_name=room_name)
        else:
            update_appointment_status(appointment_id, status)

        return {'status': 'success', 'message': f'Appointment {status.lower()} successfully'}, 200