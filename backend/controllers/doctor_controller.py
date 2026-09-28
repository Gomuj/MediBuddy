# ==============================================================================
# Medibuddy/backend/controllers/doctor_controller.py
# ==============================================================================

from models.doctor_model import fetch_all_doctors

class DoctorController:

    def get_doctors(self):
        raw_doctors = fetch_all_doctors()
        
        formatted_doctors = []
        for d in raw_doctors:
            first_name = d.get('first_name', '')
            last_name = d.get('last_name', '')
            d['name'] = f"Dr. {first_name} {last_name}".strip()
            d['specialty'] = d.get('specialty') or 'General Practitioner'
            
            phone_val = d.get('phone_number') or 'N/A'
            d['phone_number'] = phone_val
            d['phone'] = phone_val
            formatted_doctors.append(d)

        return {'status': 'success', 'doctors': formatted_doctors}, 200