# ==============================================================================
# Medibuddy/backend/controllers/telemedicine_controller.py
# ==============================================================================

import os
import uuid
from datetime import datetime, timedelta
from bottle import request, static_file
from models.appointment_model import get_appointment_by_id, update_appointment_room
from models.recording_model import (
    create_recording,
    get_expired_recordings,
    delete_expired_recordings_db,
    fetch_latest_recording
)

BASE_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDINGS_DIR = os.path.join(BASE_BACKEND_DIR, 'uploads', 'recordings')

class TelemedicineController:

    def _cleanup_expired_recordings(self):
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        expired_files = get_expired_recordings(now_str)
        
        for record in expired_files:
            file_path = record.get('recording_url')
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass

        delete_expired_recordings_db(now_str)

    def join_room(self, data=None):
        if data is None:
            data = request.json or {}

        appointment_id = data.get('appointment_id')
        if not appointment_id:
            return {'status': 'error', 'message': 'Appointment ID is required'}, 400

        appt = get_appointment_by_id(appointment_id)
        if not appt:
            return {'status': 'error', 'message': 'Appointment not found'}, 404

        room_name = appt.get('room_name')
        if not room_name:
            room_name = f"medibuddy-room-{appointment_id}-{uuid.uuid4().hex[:8]}"
            update_appointment_room(appointment_id, room_name)

        return {
            'status': 'success',
            'room_name': room_name,
            'domain': 'meet.jit.si'
        }, 200

    def save_recording(self):
        upload = request.files.get('recording') or request.files.get('video')
        appointment_id = request.forms.get('appointment_id')

        if not appointment_id or not upload:
            return {'status': 'error', 'message': 'Missing appointment_id or recording file'}, 400

        os.makedirs(RECORDINGS_DIR, exist_ok=True)
        file_path = os.path.join(RECORDINGS_DIR, f"rec_{appointment_id}_{upload.filename}")
        upload.save(file_path, overwrite=True)

        created_at = datetime.now()
        expires_at = created_at + timedelta(days=7)

        create_recording(
            appointment_id,
            file_path,
            created_at.strftime('%Y-%m-%d %H:%M:%S'),
            expires_at.strftime('%Y-%m-%d %H:%M:%S')
        )
        
        return {'status': 'success', 'message': 'Recording saved successfully.'}, 201

    def get_recording(self, appointment_id):
        self._cleanup_expired_recordings()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        recording = fetch_latest_recording(appointment_id, now_str)
        if not recording:
            return {'status': 'error', 'message': 'No recording found for this appointment'}, 404

        recording_url = recording.get('recording_url')
        expires_at_str = recording.get('expires_at')

        try:
            if expires_at_str:
                expires_at = datetime.strptime(expires_at_str, '%Y-%m-%d %H:%M:%S')
                if datetime.now() > expires_at:
                    return {'status': 'error', 'message': 'Recording has expired'}, 410
        except (ValueError, TypeError):
            pass

        abs_recording_path = os.path.abspath(recording_url)
        if not os.path.exists(abs_recording_path):
            return {'status': 'error', 'message': 'File not found on server'}, 404

        folder_path, file_name = os.path.split(abs_recording_path)
        return static_file(file_name, root=folder_path, mimetype='video/webm')