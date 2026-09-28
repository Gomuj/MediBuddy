# ==============================================================================
# Medibuddy/backend/controllers/record_controller.py
# ==============================================================================

import os
from datetime import datetime, timedelta
from models.appointment_model import get_appointment_by_id
from models.record_model import (
    save_medical_record,
    get_medical_records,
    get_medical_record_by_id,
    delete_medical_record,
    save_prescription,      
    get_prescriptions_by_patient
)
from models.access_request_model import (
    create_access_request,
    get_access_requests_by_patient, 
    get_access_requests_by_doctor,
    update_access_request_status,
    is_access_approved
)

class RecordController:

    def _validate_prescription_time_window(self, appointment_id, doctor_id, patient_id):
        appt = get_appointment_by_id(appointment_id)
        if not appt or appt.get('doctor_id') != doctor_id or appt.get('patient_id') != patient_id:
            return False, "Appointment not found or unauthorized."

        try:
            appt_datetime_str = f"{appt['appointment_date']} {appt['appointment_time']}"
            appt_time = datetime.strptime(appt_datetime_str, "%Y-%m-%d %H:%M")
        except (ValueError, KeyError):
            return True, "Valid"

        now = datetime.now()
        deadline = appt_time + timedelta(hours=1)

        if now < appt_time:
            return False, "Cannot upload prescription before the appointment time."
        if now > deadline:
            return False, "Upload window expired. Prescriptions must be uploaded within 1 hour post-appointment."

        return True, "Valid"

    def upload_record(self, upload, patient_id, description, upload_dir):
        if not upload or not patient_id:
            return {'status': 'error', 'message': 'Missing file or patient_id'}, 400

        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, upload.filename)
        upload.save(file_path, overwrite=True)

        save_medical_record(patient_id, upload.filename, file_path, description)
        return {'status': 'success', 'message': 'File uploaded successfully'}, 200

    def get_records(self, patient_id):
        if not patient_id:
            return {'status': 'error', 'message': 'Missing patient_id'}, 400

        records = get_medical_records(patient_id)
        return {'status': 'success', 'records': records}, 200

    def delete_record(self, record_id):
        if not record_id:
            return {'status': 'error', 'message': 'Missing record_id'}, 400

        record = get_medical_record_by_id(record_id)
        if not record:
            return {'status': 'error', 'message': 'Record not found'}, 404

        file_path = record.get('file_path')
        deleted = delete_medical_record(record_id)

        if deleted and file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        return {'status': 'success', 'message': 'Record deleted'}, 200

    def request_access(self, data):
        appointment_id = data.get('appointment_id')
        doctor_id = data.get('doctor_id')
        patient_id = data.get('patient_id')

        if not all([appointment_id, doctor_id, patient_id]):
            return {'status': 'error', 'message': 'Missing appointment_id, doctor_id, or patient_id'}, 400

        try:
            result = create_access_request(appointment_id, doctor_id, patient_id)
            if result.get("already_exists"):
                return {
                    'status': 'success', 
                    'message': 'Access request already submitted', 
                    'data': result
                }, 200
            
            return {
                'status': 'success', 
                'message': 'Access request sent successfully', 
                'data': result
            }, 201
        except Exception as e:
            return {'status': 'error', 'message': str(e)}, 500

    def get_patient_access_requests(self, patient_id):
        if not patient_id:
            return {'status': 'error', 'message': 'Missing patient_id'}, 400

        try:
            raw_requests = get_access_requests_by_patient(patient_id)
            formatted = []
            for r in raw_requests:
                r['doctor_name'] = f"{r.get('first_name', '')} {r.get('last_name', '')}".strip()
                formatted.append(r)
            return {'status': 'success', 'requests': formatted}, 200
        except Exception as e:
            return {'status': 'error', 'message': str(e)}, 500

    def get_doctor_access_requests(self, doctor_id):
        if not doctor_id:
            return {'status': 'error', 'message': 'Missing doctor_id'}, 400

        try:
            raw_requests = get_access_requests_by_doctor(doctor_id)
            formatted = []
            for r in raw_requests:
                r['patient_name'] = f"{r.get('first_name', '')} {r.get('last_name', '')}".strip()
                formatted.append(r)
            return {'status': 'success', 'requests': formatted}, 200
        except Exception as e:
            return {'status': 'error', 'message': str(e)}, 500

    def respond_access_request(self, data):
        request_id = data.get('request_id')
        status = data.get('status')  

        if not request_id or not status:
            return {'status': 'error', 'message': 'Missing request_id or status'}, 400

        clean_status = str(status).strip().lower()

        try:
            updated = update_access_request_status(request_id, clean_status)
            if updated:
                return {'status': 'success', 'message': f'Access request {clean_status}'}, 200
            return {'status': 'error', 'message': 'Request not found'}, 404
        except Exception as e:
            return {'status': 'error', 'message': str(e)}, 500

    def upload_prescription(self, upload, patient_id, doctor_id, appointment_id, notes, upload_dir):
        if not upload or not patient_id or not doctor_id:
            return {'status': 'error', 'message': 'Missing required fields'}, 400

        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, upload.filename)
        upload.save(file_path, overwrite=True)

        save_prescription(patient_id, doctor_id, appointment_id, upload.filename, file_path, notes)
        return {'status': 'success', 'message': 'Prescription uploaded successfully'}, 200

    def get_prescriptions(self, patient_id):
        if not patient_id:
            return {'status': 'error', 'message': 'Missing patient_id'}, 400

        try:
            raw_prescriptions = get_prescriptions_by_patient(patient_id)
            formatted = []
            for p in raw_prescriptions:
                fn = p.get('doctor_first_name', '')
                ln = p.get('doctor_last_name', '')
                p['doctor_name'] = f"{fn} {ln}".strip() if fn or ln else p.get('doctor_email')
                formatted.append(p)
            return {'status': 'success', 'prescriptions': formatted}, 200
        except Exception as e:
            return {'status': 'error', 'message': str(e)}, 500

    def get_patient_history_for_doctor(self, doctor_id, patient_id):
        if not doctor_id or not patient_id:
            return {'status': 'error', 'message': 'Missing doctor_id or patient_id'}, 400

        if not is_access_approved(doctor_id, patient_id):
            return {'status': 'error', 'message': 'Access denied. Patient has not approved record access.'}, 403

        try:
            records = get_medical_records(patient_id)
            prescriptions = get_prescriptions_by_patient(patient_id)
            return {
                'status': 'success', 
                'history': {
                    'records': records,
                    'prescriptions': prescriptions
                }
            }, 200
        except Exception as e:
            return {'status': 'error', 'message': str(e)}, 500

    def doctor_upload_prescription(self, upload, patient_id, doctor_id, appointment_id, notes, upload_dir):
        if not all([upload, patient_id, doctor_id, appointment_id]):
            return {'status': 'error', 'message': 'Missing required fields'}, 400

        try:
            valid, msg = self._validate_prescription_time_window(appointment_id, doctor_id, patient_id)
            if not valid:
                return {'status': 'error', 'message': msg}, 400
        except Exception:
            pass

        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, upload.filename)
        upload.save(file_path, overwrite=True)

        save_prescription(patient_id, doctor_id, appointment_id, upload.filename, file_path, notes)
        return {'status': 'success', 'message': 'Prescription uploaded successfully'}, 200