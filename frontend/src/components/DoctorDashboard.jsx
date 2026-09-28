// ==============================================================================
// src/components/DoctorDashboard.jsx
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

function DoctorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [accessStatuses, setAccessStatuses] = useState({});
  const [viewingHistory, setViewingHistory] = useState({ records: [], prescriptions: [] });
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [activePatientName, setActivePatientName] = useState('');
  const [historySubTab, setHistorySubTab] = useState('records');
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxFile, setRxFile] = useState(null);
  const [rxNotes, setRxNotes] = useState('');
  const [rxTargetApt, setRxTargetApt] = useState(null);
  const [rxUploading, setRxUploading] = useState(false);

  const fetchAppointmentsAndAccess = useCallback(async (signal) => {
    if (!user?.id) return;

    try {
      const [aptRes, accessRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/appointments/doctor/${user.id}`, { signal }),
        axios.get(`${API_BASE_URL}/records/access-requests/doctor/${user.id}`, { signal })
      ]);

      if (aptRes.data.status === 'success') {
        setAppointments(aptRes.data.appointments);
      }

      if (accessRes.data.status === 'success' && Array.isArray(accessRes.data.requests)) {
        const statusMap = {};
        accessRes.data.requests.forEach((req) => {
          if (req.appointment_id) {
            statusMap[req.appointment_id] = req.status?.toLowerCase();
          }
        });
        setAccessStatuses(statusMap);
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Failed to fetch doctor dashboard data:', err);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAppointmentsAndAccess(controller.signal);
    return () => controller.abort();
  }, [fetchAppointmentsAndAccess]);

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/appointments/update-status`, {
        appointment_id: appointmentId,
        status: newStatus
      });

      if (res.data.status === 'success') {
        fetchAppointmentsAndAccess();
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to update status to ${newStatus}`);
    }
  };

  const handleJoinCall = async (appointmentId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/telemedicine/join-room`, {
        appointment_id: appointmentId
      });
      if (res.data.status === 'success') {
        setActiveRoom(res.data.room_name);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join telemedicine call');
    }
  };

  const handleRequestAccess = async (apt) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/records/request-access`, {
        appointment_id: apt.id,
        doctor_id: user.id,
        patient_id: apt.patient_id
      });

      if (res.data.status === 'success') {
        alert(res.data.message || 'Request sent successfully!');
        const updatedStatus = (res.data.data?.status || 'pending').toLowerCase();
        setAccessStatuses((prev) => ({
          ...prev,
          [apt.id]: updatedStatus
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request record access');
    }
  };

  const handleViewRecords = async (apt) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/records/doctor-view/${apt.patient_id}?doctor_id=${user.id}`
      );
      if (res.data.status === 'success') {
        setViewingHistory(res.data.history || { records: [], prescriptions: [] });
        setActivePatientName(apt.patient_name || 'Patient');
        setRecordsModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Access denied or failed to fetch records.');
    }
  };

  const openPrescriptionModal = (apt) => {
    setRxTargetApt(apt);
    setRxFile(null);
    setRxNotes('');
    setRxModalOpen(true);
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    if (!rxFile || !rxTargetApt) {
      alert('Please select a PDF file to upload.');
      return;
    }

    setRxUploading(true);
    const formData = new FormData();
    formData.append('file', rxFile);
    formData.append('patient_id', rxTargetApt.patient_id);
    formData.append('doctor_id', user.id);
    formData.append('appointment_id', rxTargetApt.id);
    formData.append('notes', rxNotes);

    try {
      const res = await axios.post(`${API_BASE_URL}/prescriptions/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        alert('Prescription uploaded successfully!');
        setRxModalOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload prescription.');
    } finally {
      setRxUploading(false);
    }
  };

  const pendingAppointments = appointments.filter((apt) => apt.status?.toLowerCase() === 'pending');
  const confirmedAppointments = appointments.filter((apt) => apt.status?.toLowerCase() === 'accepted');
  const historyAppointments = appointments.filter((apt) =>
    ['completed', 'rejected', 'cancelled', 'expired'].includes(apt.status?.toLowerCase())
  );

  const rawFullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const displayName = rawFullName || user?.name || user?.email?.split('@')[0] || 'Doctor';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>MediBuddy</h1>
        <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <button 
            style={activeTab === 'appointments' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
          </button>
          <button 
            style={activeTab === 'waiting' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('waiting')}
          >
            Waiting List ({pendingAppointments.length})
          </button>
          <button 
            style={activeTab === 'history' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </aside>

        <main style={styles.content}>
          <div style={styles.welcomeBanner}>
            Welcome, Dr. {displayName}!
          </div>

          <div style={styles.card}>
            {activeTab === 'appointments' && (
              <>
                <h2 style={styles.sectionTitle}>Upcoming Appointments</h2>
                {confirmedAppointments.length === 0 ? (
                  <p style={styles.placeholderText}>No upcoming accepted appointments.</p>
                ) : (
                  <ul style={styles.list}>
                    {confirmedAppointments.map((apt) => {
                      const currentAccessStatus = accessStatuses[apt.id]?.toLowerCase();
                      const isApproved = currentAccessStatus === 'approved';
                      const isPending = currentAccessStatus === 'pending';

                      return (
                        <li key={apt.id} style={styles.listItem}>
                          <div>
                            <strong>Patient: {apt.patient_name || 'N/A'}</strong>
                            <div style={styles.subText}>Date: {apt.appointment_date} | Time: {apt.appointment_time}</div>
                            <div style={styles.subText}>Email: {apt.patient_email || 'N/A'}</div>
                          </div>
                          <div style={styles.actionGroup}>
                            {isApproved ? (
                              <button 
                                onClick={() => handleViewRecords(apt)}
                                style={{ ...styles.actionBtn, backgroundColor: '#6f42c1' }}
                              >
                                View Records & Prescriptions
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleRequestAccess(apt)}
                                disabled={isPending}
                                style={{ 
                                  ...styles.actionBtn, 
                                  backgroundColor: isPending ? '#6c757d' : '#007bff',
                                  cursor: isPending ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {isPending ? 'Access Pending' : 'Request Record Access'}
                              </button>
                            )}

                            <button 
                              onClick={() => handleJoinCall(apt.id)}
                              style={{ ...styles.actionBtn, backgroundColor: '#28a745' }}
                            >
                              Start / Join Call
                            </button>
                            <button 
                              onClick={() => openPrescriptionModal(apt)}
                              style={{ ...styles.actionBtn, backgroundColor: '#fd7e14' }}
                            >
                              Upload Prescription
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(apt.id, 'Completed')}
                              style={{ ...styles.actionBtn, backgroundColor: '#17a2b8' }}
                            >
                              Mark Completed
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(apt.id, 'Cancelled')}
                              style={{ ...styles.actionBtn, backgroundColor: '#dc3545' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {activeTab === 'waiting' && (
              <>
                <h2 style={styles.sectionTitle}>Waiting List (Pending Requests)</h2>
                {pendingAppointments.length === 0 ? (
                  <p style={styles.placeholderText}>No pending appointment requests.</p>
                ) : (
                  <ul style={styles.list}>
                    {pendingAppointments.map((apt) => (
                      <li key={apt.id} style={styles.listItem}>
                        <div>
                          <strong>Patient: {apt.patient_name || 'N/A'}</strong>
                          <div style={styles.subText}>Requested Date: {apt.appointment_date}</div>
                          <div style={styles.subText}>Requested Time: {apt.appointment_time}</div>
                        </div>
                        <div style={styles.actionGroup}>
                          <button 
                            onClick={() => handleUpdateStatus(apt.id, 'Accepted')}
                            style={{ ...styles.actionBtn, backgroundColor: '#007bff' }}
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(apt.id, 'Rejected')}
                            style={{ ...styles.actionBtn, backgroundColor: '#dc3545' }}
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {activeTab === 'history' && (
              <>
                <h2 style={styles.sectionTitle}>Appointment History</h2>
                {historyAppointments.length === 0 ? (
                  <p style={styles.placeholderText}>No past appointment history.</p>
                ) : (
                  <ul style={styles.list}>
                    {historyAppointments.map((apt) => (
                      <li key={apt.id} style={styles.listItem}>
                        <div>
                          <strong>Patient: {apt.patient_name || 'N/A'}</strong>
                          <div style={styles.subText}>Date: {apt.appointment_date} | Time: {apt.appointment_time}</div>
                        </div>
                        <div style={styles.actionGroup}>
                          {apt.status?.toLowerCase() === 'completed' && (
                            <button 
                              onClick={() => openPrescriptionModal(apt)}
                              style={{ ...styles.actionBtn, backgroundColor: '#fd7e14' }}
                            >
                              Upload Prescription
                            </button>
                          )}
                          <span style={{ 
                            fontWeight: 'bold', 
                            color: apt.status?.toLowerCase() === 'completed' ? '#28a745' : '#dc3545',
                            alignSelf: 'center'
                          }}>
                            {apt.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {activeRoom && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContainer}>
            <button 
              onClick={() => setActiveRoom(null)}
              style={styles.closeCallBtn}
            >
              End Call
            </button>
            <iframe 
              src={`https://meet.jit.si/${activeRoom}`}
              title="Telemedicine Video Call"
              style={styles.iframe}
              allow="camera; microphone; display-capture; autoplay"
            />
          </div>
        </div>
      )}

      {recordsModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.recordsModalContainer}>
            <div style={styles.recordsHeader}>
              <h3>Patient History: {activePatientName}</h3>
              <button onClick={() => setRecordsModalOpen(false)} style={styles.closeRecordsBtn}>✕</button>
            </div>
            
            <div style={styles.subTabNav}>
              <button 
                style={historySubTab === 'records' ? styles.activeSubTab : styles.subTab}
                onClick={() => setHistorySubTab('records')}
              >
                Uploaded Records ({viewingHistory.records.length})
              </button>
              <button 
                style={historySubTab === 'prescriptions' ? styles.activeSubTab : styles.subTab}
                onClick={() => setHistorySubTab('prescriptions')}
              >
                Prescriptions ({viewingHistory.prescriptions.length})
              </button>
            </div>

            <div style={styles.recordsBody}>
              {historySubTab === 'records' && (
                viewingHistory.records.length === 0 ? (
                  <p style={styles.placeholderText}>No uploaded medical records found for this patient.</p>
                ) : (
                  <ul style={styles.list}>
                    {viewingHistory.records.map((rec) => (
                      <li key={rec.id} style={styles.listItem}>
                        <div>
                          <strong>{rec.file_name}</strong>
                          <div style={styles.subText}>{rec.description || 'No description provided'}</div>
                          <div style={styles.subText}>Uploaded: {rec.uploaded_at}</div>
                        </div>
                        <a 
                          href={`http://localhost:8080/uploads/${rec.file_name}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ ...styles.actionBtn, backgroundColor: '#007bff', textDecoration: 'none' }}
                        >
                          Open File
                        </a>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {historySubTab === 'prescriptions' && (
                viewingHistory.prescriptions.length === 0 ? (
                  <p style={styles.placeholderText}>No prescriptions uploaded for this patient.</p>
                ) : (
                  <ul style={styles.list}>
                    {viewingHistory.prescriptions.map((rx) => (
                      <li key={rx.id} style={styles.listItem}>
                        <div>
                          <strong>{rx.file_name}</strong>
                          <div style={styles.subText}>Doctor: {rx.doctor_name || 'N/A'}</div>
                          <div style={styles.subText}>Notes: {rx.notes || 'None'}</div>
                          <div style={styles.subText}>Issued: {rx.created_at}</div>
                        </div>
                        <a 
                          href={`http://localhost:8080/uploads/${rx.file_name}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ ...styles.actionBtn, backgroundColor: '#28a745', textDecoration: 'none' }}
                        >
                          View Prescription
                        </a>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {rxModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.rxModalContainer}>
            <div style={styles.recordsHeader}>
              <h3>Upload Prescription for {rxTargetApt?.patient_name}</h3>
              <button onClick={() => setRxModalOpen(false)} style={styles.closeRecordsBtn}>✕</button>
            </div>
            <form onSubmit={handlePrescriptionSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Prescription (PDF):</label>
                <input 
                  type="file" 
                  accept=".pdf"
                  required 
                  onChange={(e) => setRxFile(e.target.files[0])}
                  style={styles.fileInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notes / Dosage Instructions:</label>
                <textarea 
                  rows="3"
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                  placeholder="e.g. Take 1 tablet every 8 hours after meals."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  onClick={() => setRxModalOpen(false)} 
                  style={{ ...styles.actionBtn, backgroundColor: '#6c757d' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={rxUploading}
                  style={{ ...styles.actionBtn, backgroundColor: '#fd7e14' }}
                >
                  {rxUploading ? 'Uploading...' : 'Submit Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    fontFamily: 'sans-serif'
  },
  header: {
    backgroundColor: '#2b529a',
    color: '#fff',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 'bold'
  },
  logoutBtn: {
    backgroundColor: '#d9534f',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1.2rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  body: {
    display: 'flex',
    flex: 1
  },
  sidebar: {
    width: '240px',
    padding: '1.5rem 1rem',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  tab: {
    textAlign: 'left',
    padding: '0.75rem 1rem',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#333'
  },
  activeTab: {
    textAlign: 'left',
    padding: '0.75rem 1rem',
    border: 'none',
    backgroundColor: '#1d3e75',
    color: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  content: {
    flex: 1,
    padding: '2rem',
    backgroundColor: '#f9fbfd'
  },
  welcomeBanner: {
    backgroundColor: '#eef4ff',
    color: '#2b529a',
    padding: '1rem 1.5rem',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    fontSize: '1rem'
  },
  card: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e0e0e0'
  },
  sectionTitle: {
    marginTop: 0,
    color: '#1d3e75',
    marginBottom: '1rem'
  },
  placeholderText: {
    color: '#666'
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #eee'
  },
  subText: {
    fontSize: '0.85rem',
    color: '#666',
    marginTop: '2px'
  },
  actionGroup: {
    display: 'flex',
    gap: '8px'
  },
  actionBtn: {
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalContainer: {
    width: '90%',
    height: '85%',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative'
  },
  closeCallBtn: {
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
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none'
  },
  recordsModalContainer: {
    width: '650px',
    maxHeight: '80vh',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column'
  },
  rxModalContainer: {
    width: '500px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.5rem'
  },
  recordsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #ddd',
    paddingBottom: '0.5rem',
    marginBottom: '1rem'
  },
  subTabNav: {
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid #eee',
    paddingBottom: '0.5rem',
    marginBottom: '1rem'
  },
  subTab: {
    border: 'none',
    backgroundColor: '#f1f3f5',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'normal'
  },
  activeSubTab: {
    border: 'none',
    backgroundColor: '#1d3e75',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  recordsBody: {
    overflowY: 'auto',
    flex: 1
  },
  closeRecordsBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem'
  },
  label: {
    fontWeight: 'bold',
    fontSize: '0.9rem',
    color: '#333'
  },
  fileInput: {
    padding: '6px',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },
  textarea: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: 'inherit'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '1rem'
  }
};

export default DoctorDashboard;