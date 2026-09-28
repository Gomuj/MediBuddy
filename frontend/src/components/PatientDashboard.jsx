// ==============================================================================
// src/components/PatientDashboard.jsx
// ==============================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const STYLES = {
  card: {
    backgroundColor: '#ffffff',
    padding: '25px',
    borderRadius: '10px',
    border: '1px solid #e0e0e0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    marginBottom: '25px',
    color: '#333333'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    fontSize: '0.95rem',
    marginTop: '6px'
  },
  button: {
    padding: '10px 16px',
    backgroundColor: '#007bff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  actionBtn: {
    padding: '6px 12px',
    fontSize: '0.85rem'
  }
};

const DoctorDetailsCard = ({ doctor, onClose }) => (
  <div style={STYLES.card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h3 style={{ margin: 0, color: '#1e3c72' }}>Doctor Details</h3>
      <button 
        onClick={onClose} 
        style={{ ...STYLES.button, backgroundColor: '#6c757d', padding: '4px 10px', fontSize: '0.8rem' }}
      >
        Close
      </button>
    </div>
    <p><strong>Name:</strong> {doctor.name || `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()}</p>
    <p><strong>Specialty:</strong> {doctor.specialty || 'General Practitioner'}</p>
    <p><strong>Email:</strong> {doctor.email || 'N/A'}</p>
    <p><strong>Phone:</strong> {doctor.phone || 'N/A'}</p>
    <p><strong>Experience/Bio:</strong> {doctor.bio || 'No bio available.'}</p>
  </div>
);

const BookingFormCard = ({ bookingDoctor, appointmentDate, setAppointmentDate, appointmentTime, setAppointmentTime, onCancel, onSubmit }) => {
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div style={STYLES.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#1e3c72' }}>Book Appointment with {bookingDoctor.name || `Dr. ${bookingDoctor.first_name || ''}`}</h3>
        <button 
          onClick={onCancel} 
          style={{ ...STYLES.button, backgroundColor: '#6c757d', padding: '4px 10px', fontSize: '0.8rem' }}
        >
          Cancel
        </button>
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#555' }}>Select Date:</label>
          <input 
            type="date" 
            min={minDate}
            value={appointmentDate} 
            onChange={(e) => setAppointmentDate(e.target.value)} 
            required 
            style={STYLES.input} 
          />
        </div>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#555' }}>Select Time Slot:</label>
          <input 
            type="time" 
            value={appointmentTime} 
            onChange={(e) => setAppointmentTime(e.target.value)} 
            required 
            style={STYLES.input} 
          />
        </div>
        <button type="submit" style={{ ...STYLES.button, marginTop: '10px' }}>
          Confirm Request
        </button>
      </form>
    </div>
  );
};

function PatientDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('appointments');

  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [doctors, setDoctors] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  const [activeRecordingUrl, setActiveRecordingUrl] = useState(null);

  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const activeAptIdRef = useRef(activeAppointmentId);

  useEffect(() => {
    activeAptIdRef.current = activeAppointmentId;
  }, [activeAppointmentId]);

  const fetchAppointments = useCallback(async (signal) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/appointments/patient/${user.id}`, { signal });
      if (res.data.status === 'success') setAppointments(res.data.appointments);
    } catch (err) {
      if (!axios.isCancel(err)) console.error('Failed to fetch appointments:', err);
    }
  }, [user?.id]);

  const fetchRecordsAndPrescriptions = useCallback(async (signal) => {
    try {
      const [recRes, prescRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/records/${user.id}`, { signal }),
        axios.get(`${API_BASE_URL}/prescriptions/patient/${user.id}`, { signal })
      ]);
      if (recRes.data.status === 'success') setRecords(recRes.data.records);
      if (prescRes.data.status === 'success') setPrescriptions(prescRes.data.prescriptions);
    } catch (err) {
      if (!axios.isCancel(err)) console.error('Failed to fetch records/prescriptions:', err);
    }
  }, [user?.id]);

  const fetchAccessRequests = useCallback(async (signal) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/records/access-requests/${user.id}`, { signal });
      if (res.data.status === 'success') setAccessRequests(res.data.requests || []);
    } catch (err) {
      if (!axios.isCancel(err)) console.error('Failed to fetch access requests:', err);
    }
  }, [user?.id]);

  const fetchDoctorsAndBookmarks = useCallback(async (signal) => {
    try {
      const [docRes, markRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/doctors`, { signal }),
        axios.get(`${API_BASE_URL}/bookmarks/${user.id}`, { signal })
      ]);

      if (docRes.data.status === 'success') setDoctors(docRes.data.doctors);
      if (markRes.data.status === 'success') setBookmarks(markRes.data.bookmarks);
    } catch (err) {
      if (!axios.isCancel(err)) console.error('Failed to fetch doctors/bookmarks:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    
    const controller = new AbortController();
    
    fetchAppointments(controller.signal);
    fetchRecordsAndPrescriptions(controller.signal);
    fetchAccessRequests(controller.signal);
    fetchDoctorsAndBookmarks(controller.signal);

    return () => controller.abort();
  }, [user?.id, fetchAppointments, fetchRecordsAndPrescriptions, fetchAccessRequests, fetchDoctorsAndBookmarks]);

  useEffect(() => {
    const scriptId = 'jitsi-external-api-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleAccessRequest = async (requestId, status) => {
    const payload = {
      request_id: requestId,
      status: status
    };

    const headers = { 'Content-Type': 'application/json' };

    try {
      let res;
      try {
        res = await axios.post(`${API_BASE_URL}/records/access-requests/respond`, payload, { headers });
      } catch (firstErr) {
        res = await axios.post(`${API_BASE_URL}/records/access-request/respond`, payload, { headers });
      }

      if (res.data.status === 'success') {
        alert(`Request ${status.toLowerCase()} successfully!`);
        setAccessRequests((prev) =>
          prev.map((req) => (req.id === requestId ? { ...req, status: status } : req))
        );
        fetchAccessRequests();
      }
    } catch (err) {
      console.error('Access Request Error:', err);
      alert(err.response?.data?.message || 'Failed to update access request status');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "browser" },
        audio: true
      });

      streamRef.current = stream;
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.warn('Display capture permissions denied or cancelled:', err);
    }
  };

  const stopAndUploadRecording = () => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      const cleanUpTracks = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        cleanUpTracks();
        resolve();
        return;
      }

      mediaRecorder.onstop = async () => {
        cleanUpTracks();

        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const currentAptId = activeAptIdRef.current;
        if (blob.size > 0 && currentAptId) {
          const formData = new FormData();
          formData.append('recording', blob, `recording_apt_${currentAptId}.webm`);
          formData.append('appointment_id', currentAptId);

          try {
            await axios.post(`${API_BASE_URL}/telemedicine/upload`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (err) {
            console.error('Failed to upload call recording:', err);
          }
        }
        resolve();
      };

      mediaRecorder.stop();
    });
  };

  const handleEndCall = async () => {
    await stopAndUploadRecording();
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setActiveRoom(null);
    setActiveAppointmentId(null);
  };

  useEffect(() => {
    if (activeRoom && jitsiContainerRef.current && window.JitsiMeetExternalAPI) {
      const domain = 'meet.jit.si';
      const options = {
        roomName: activeRoom,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Patient'
        }
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      jitsiApiRef.current = api;

      startRecording();

      api.addEventListener('videoConferenceLeft', () => {
        handleEndCall();
      });
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [activeRoom]);

  const handleJoinCall = async (appointmentId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/telemedicine/join-room`, {
        appointment_id: appointmentId
      });
      if (res.data.status === 'success') {
        setActiveAppointmentId(appointmentId);
        setActiveRoom(res.data.room_name);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join telemedicine call');
    }
  };

  const handleViewRecording = (appointmentId) => {
    setActiveRecordingUrl(`${API_BASE_URL}/telemedicine/get-recording/${appointmentId}`);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', user.id);
    formData.append('description', description);

    setIsUploading(true);
    try {
      await axios.post(`${API_BASE_URL}/records/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      setDescription('');
      fetchRecordsAndPrescriptions();
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/records/delete/${recordId}`);
      fetchRecordsAndPrescriptions();
    } catch (err) {
      alert('Failed to delete record');
    }
  };

  const handleBookmark = async (doctorId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/bookmarks/add`, {
        patient_id: user.id,
        doctor_id: doctorId
      });
      if (res.data.status === 'success') fetchDoctorsAndBookmarks();
    } catch (err) {
      alert(err.response?.data?.message || 'Error bookmarking doctor');
    }
  };

  const handleRemoveBookmark = async (doctorId) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/bookmarks/delete`, {
        data: { patient_id: user.id, doctor_id: doctorId }
      });
      if (res.data.status === 'success') fetchDoctorsAndBookmarks();
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing bookmark');
    }
  };

  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    if (!bookingDoctor || !appointmentDate || !appointmentTime) {
      alert('Please fill out all booking fields.');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/appointments/schedule`, {
        patient_id: user.id,
        doctor_id: bookingDoctor.user_id || bookingDoctor.id,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime
      });

      if (res.data.status === 'success') {
        alert('Appointment requested successfully!');
        setBookingDoctor(null);
        setAppointmentDate('');
        setAppointmentTime('');
        fetchAppointments();
        setActiveTab('appointments');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule appointment');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/appointments/update-status`, {
        appointment_id: appointmentId,
        status: 'Cancelled'
      });

      if (res.data.status === 'success') fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'completed':
      case 'approved':
        return '#28a745';
      case 'cancelled':
      case 'expired':
      case 'rejected':
        return '#dc3545';
      default:
        return '#007bff';
    }
  };

  const sortedAppointments = [...appointments].sort((a, b) => Number(b.id) - Number(a.id));

  const filteredDoctors = doctors.filter(doc => 
    doc.name?.toLowerCase().includes(search.toLowerCase()) || 
    doc.specialty?.toLowerCase().includes(search.toLowerCase()) ||
    doc.email?.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarBtnStyle = (tabName) => ({
    width: '100%',
    padding: '14px 20px',
    textAlign: 'left',
    backgroundColor: activeTab === tabName ? '#1e3c72' : 'transparent',
    color: activeTab === tabName ? '#ffffff' : '#333333',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: activeTab === tabName ? '600' : 'normal',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'all 0.2s ease'
  });

  const rawFullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const displayName = rawFullName || user?.name || user?.email || 'Patient';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>

      <div style={{
        height: '70px',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 30px',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <h1 style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>
          MediBuddy
        </h1>
        <button onClick={onLogout} style={{ ...STYLES.button, backgroundColor: '#dc3545', marginLeft: 'auto' }}>
          Logout
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <div style={{
          width: '260px',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #e0e0e0',
          padding: '20px 15px',
          boxSizing: 'border-box'
        }}>
          {['appointments', 'findDoctors', 'bookmarks', 'medicalRecords'].map((tab) => (
            <button key={tab} style={sidebarBtnStyle(tab)} onClick={() => setActiveTab(tab)}>
              {tab === 'appointments' && 'Your Appointments'}
              {tab === 'findDoctors' && 'Find Doctors'}
              {tab === 'bookmarks' && 'Bookmarks'}
              {tab === 'medicalRecords' && 'Medical Records'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, backgroundColor: '#ffffff', padding: '30px', overflowY: 'auto', boxSizing: 'border-box' }}>
          
          <div style={{
            backgroundColor: '#eef4ff',
            border: '1px solid #cce0ff',
            borderRadius: '8px',
            padding: '12px 20px',
            marginBottom: '25px',
            color: '#1e3c72',
            fontWeight: '600',
            fontSize: '1rem',
            maxWidth: '800px'
          }}>
            Welcome, {displayName}!
          </div>

          {activeTab === 'appointments' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginTop: 0, color: '#1e3c72', fontSize: '1.6rem' }}>Your Appointments</h2>
              <div style={STYLES.card}>
                {sortedAppointments.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>No upcoming appointments scheduled.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {sortedAppointments.map(apt => (
                      <li key={apt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                        <div>
                          <strong>Doctor: {apt.doctor_name || 'Dr. Assigned'}</strong>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                            Specialty: {apt.specialty || 'General Practitioner'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                            Date: {apt.appointment_date} | Time: {apt.appointment_time}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: getStatusColor(apt.status), marginTop: '4px' }}>
                            Status: {apt.status || 'Pending'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {apt.status?.toLowerCase() === 'accepted' && (
                            <button
                              onClick={() => handleJoinCall(apt.id)}
                              style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#28a745' }}
                            >
                              Join Call
                            </button>
                          )}

                          {(apt.status?.toLowerCase() === 'accepted' || apt.status?.toLowerCase() === 'completed') && (
                            <button
                              onClick={() => handleViewRecording(apt.id)}
                              style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#17a2b8' }}
                            >
                              Watch Recording
                            </button>
                          )}

                          {(apt.status?.toLowerCase() === 'pending' || apt.status?.toLowerCase() === 'accepted') && (
                            <button 
                              onClick={() => handleCancelAppointment(apt.id)}
                              style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#dc3545' }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'findDoctors' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginTop: 0, color: '#1e3c72', fontSize: '1.6rem' }}>Find Doctors</h2>
              
              <div style={STYLES.card}>
                <input 
                  type="text" 
                  placeholder="Search by name, specialty, or email..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ ...STYLES.input, marginBottom: '15px' }}
                />

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {filteredDoctors.length === 0 ? (
                    <p style={{ color: '#666', margin: 0 }}>No doctors found matching your search.</p>
                  ) : (
                    filteredDoctors.map(doc => (
                      <li key={doc.user_id || doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                        <div>
                          <strong 
                            style={{ color: '#1e3c72', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setSelectedDoctor(doc)}
                          >
                            {doc.name || `Dr. ${doc.first_name || ''} ${doc.last_name || ''}`.trim() || 'Dr. Assigned'}
                          </strong>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>{doc.specialty || 'General Practitioner'}</div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => setBookingDoctor(doc)}
                            style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#007bff' }}
                          >
                            Book
                          </button>
                          <button 
                            onClick={() => setSelectedDoctor(doc)}
                            style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#17a2b8' }}
                          >
                            Details
                          </button>
                          <button 
                            onClick={() => handleBookmark(doc.user_id || doc.id)} 
                            style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#28a745' }}
                          >
                            Bookmark
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {bookingDoctor && (
                <BookingFormCard 
                  bookingDoctor={bookingDoctor}
                  appointmentDate={appointmentDate}
                  setAppointmentDate={setAppointmentDate}
                  appointmentTime={appointmentTime}
                  setAppointmentTime={setAppointmentTime}
                  onCancel={() => setBookingDoctor(null)}
                  onSubmit={handleScheduleAppointment}
                />
              )}

              {selectedDoctor && (
                <DoctorDetailsCard 
                  doctor={selectedDoctor} 
                  onClose={() => setSelectedDoctor(null)} 
                />
              )}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginTop: 0, color: '#1e3c72', fontSize: '1.6rem' }}>Bookmarked Doctors</h2>
              <div style={STYLES.card}>
                {bookmarks.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>No bookmarked doctors yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {bookmarks.map(b => (
                      <li key={b.user_id || b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                        <div>
                          <strong 
                            style={{ color: '#1e3c72', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setSelectedDoctor(b)}
                          >
                            {b.name || `Dr. ${b.first_name || ''} ${b.last_name || ''}`.trim()}
                          </strong> 
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>{b.specialty || 'General Practitioner'}</div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => setBookingDoctor(b)}
                            style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#007bff' }}
                          >
                            Book
                          </button>
                          <button 
                            onClick={() => setSelectedDoctor(b)}
                            style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#17a2b8' }}
                          >
                            Details
                          </button>
                          <button 
                            onClick={() => handleRemoveBookmark(b.user_id || b.id)}
                            style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#dc3545' }}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {bookingDoctor && (
                <BookingFormCard 
                  bookingDoctor={bookingDoctor}
                  appointmentDate={appointmentDate}
                  setAppointmentDate={setAppointmentDate}
                  appointmentTime={appointmentTime}
                  setAppointmentTime={setAppointmentTime}
                  onCancel={() => setBookingDoctor(null)}
                  onSubmit={handleScheduleAppointment}
                />
              )}

              {selectedDoctor && (
                <DoctorDetailsCard 
                  doctor={selectedDoctor} 
                  onClose={() => setSelectedDoctor(null)} 
                />
              )}
            </div>
          )}

          {activeTab === 'medicalRecords' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginTop: 0, color: '#1e3c72', fontSize: '1.6rem' }}>Medical Records & Prescriptions</h2>

              <div style={STYLES.card}>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '1.2rem' }}>Doctor Access Requests</h3>
                {accessRequests.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>No pending record access requests from doctors.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {accessRequests.map(req => {
                      const reqStatus = req.status?.toLowerCase();
                      const isPending = reqStatus === 'pending';

                      return (
                        <li key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                          <div>
                            <strong>{req.doctor_name || `Dr. ${req.doctor_first_name || ''} ${req.doctor_last_name || ''}`.trim() || 'Dr. Assigned'}</strong>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                              Requested on: {req.request_date || req.created_at || 'Recently'}
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: getStatusColor(req.status), marginTop: '4px' }}>
                              Status: {req.status || 'Pending'}
                            </div>
                          </div>

                          {isPending ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => handleAccessRequest(req.id, 'Approved')}
                                style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#28a745' }}
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleAccessRequest(req.id, 'Rejected')}
                                style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#dc3545' }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: getStatusColor(req.status) }}>
                              {req.status}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div style={STYLES.card}>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '1.2rem' }}>Upload Personal Record (PDF Only)</h3>
                <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#555' }}>Select PDF File:</label>
                    <input 
                      type="file" 
                      accept=".pdf,application/pdf" 
                      onChange={(e) => setFile(e.target.files[0])} 
                      required 
                      style={STYLES.input} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#555' }}>Record Description:</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Lab Results, External Prescription..." 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={STYLES.input}
                    />
                  </div>
                  <button type="submit" disabled={isUploading} style={{ ...STYLES.button, opacity: isUploading ? 0.7 : 1 }}>
                    {isUploading ? 'Uploading...' : 'Upload Record'}
                  </button>
                </form>
              </div>

              <div style={STYLES.card}>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '1.2rem' }}>Doctor Prescriptions</h3>
                {prescriptions.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>No prescriptions uploaded by doctors yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {prescriptions.map(presc => (
                      <li key={presc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                        <div>
                          <strong>Prescription from {presc.doctor_name || 'Doctor'}</strong>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                            Uploaded: {presc.created_at || 'Post-Appointment'}
                          </div>
                          {presc.notes && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#333' }}>
                              <strong>Notes:</strong> {presc.notes}
                            </p>
                          )}
                        </div>
                        <a 
                          href={`http://localhost:8080/uploads/${presc.file_name}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#007bff', textDecoration: 'none', display: 'inline-block' }}
                        >
                          View Prescription
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={STYLES.card}>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '1.2rem' }}>Saved Personal Records</h3>
                {records.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>No medical records uploaded yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {records.map(rec => (
                      <li key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                        <div>
                          <a 
                            href={`http://localhost:8080/uploads/${rec.file_name}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}
                          >
                            {rec.file_name}
                          </a>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>{rec.description || 'No description'}</p>
                        </div>
                        <button 
                          onClick={() => handleDelete(rec.id)} 
                          style={{ ...STYLES.button, ...STYLES.actionBtn, backgroundColor: '#dc3545' }}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {activeRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '90%',
            height: '85%',
            backgroundColor: '#000',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <button 
              onClick={handleEndCall}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 10000,
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              End Call
            </button>
            <div ref={jitsiContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      )}

      {activeRecordingUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '80%',
            maxWidth: '700px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '20px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setActiveRecordingUrl(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <video 
              src={activeRecordingUrl} 
              controls 
              style={{ width: '100%', borderRadius: '8px', marginTop: '30px' }} 
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default PatientDashboard;