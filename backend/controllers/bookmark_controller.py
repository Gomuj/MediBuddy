# ==============================================================================
# Medibuddy/backend/controllers/bookmark_controller.py
# ==============================================================================

from models.bookmark_model import (
    is_doctor_bookmarked,
    add_bookmark_db,
    get_bookmarks_by_patient,
    remove_bookmark_db
)

class BookmarkController:

    def add_bookmark(self, data):
        patient_id = data.get('patient_id')
        doctor_id = data.get('doctor_id')

        if not patient_id or not doctor_id:
            return {'status': 'error', 'message': 'Missing patient_id or doctor_id'}, 400

        if is_doctor_bookmarked(patient_id, doctor_id):
            return {'status': 'error', 'message': 'Doctor already bookmarked'}, 409

        try:
            add_bookmark_db(patient_id, doctor_id)
            return {'status': 'success', 'message': 'Doctor bookmarked successfully'}, 200
        except Exception as e:
            return {'status': 'error', 'message': str(e)}, 400

    def get_bookmarks(self, patient_id):
        if not patient_id:
            return {'status': 'error', 'message': 'Missing patient_id'}, 400

        raw_bookmarks = get_bookmarks_by_patient(patient_id)
        
        formatted_bookmarks = []
        for row in raw_bookmarks:
            first_name = row.get('first_name', '')
            last_name = row.get('last_name', '')
            row['name'] = f"Dr. {first_name} {last_name}".strip()
            row['specialty'] = row.get('specialty') or 'General Practitioner'
            formatted_bookmarks.append(row)

        return {'status': 'success', 'bookmarks': formatted_bookmarks}, 200

    def delete_bookmark(self, data):
        patient_id = data.get('patient_id')
        doctor_id = data.get('doctor_id')

        if not patient_id or not doctor_id:
            return {'status': 'error', 'message': 'Missing patient_id or doctor_id'}, 400

        remove_bookmark_db(patient_id, doctor_id)
        return {'status': 'success', 'message': 'Bookmark removed'}, 200