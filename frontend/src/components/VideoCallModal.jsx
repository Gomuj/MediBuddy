// ==============================================================================
// src/components/VideoCallModal.jsx
// ==============================================================================

import React, { useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:8080/api';

export default function VideoCallModal({ roomName, displayName, appointmentId, onClose }) {
  const containerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    let script = document.querySelector('script[src="https://meet.jit.si/external_api.js"]');

    const handleUploadRecording = async () => {
      if (recordedChunksRef.current.length === 0) return;

      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', blob, `call_${appointmentId}.webm`);
      formData.append('appointment_id', appointmentId);

      try {
        await fetch(`${API_BASE_URL}/telemedicine/upload`, {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.error('Failed to upload recording:', err);
      }
    };

    const startLocalRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        recordedChunksRef.current = [];
        
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.onstop = handleUploadRecording;
        
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.warn('Could not start screen/audio recorder:', e);
      }
    };

    const initJitsi = () => {
      if (window.JitsiMeetExternalAPI && roomName && containerRef.current) {
        if (jitsiApiRef.current) {
          jitsiApiRef.current.dispose();
        }

        const domain = 'meet.jit.si';
        const options = {
          roomName: roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: {
            displayName: displayName || 'User'
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false
          }
        };

        jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);

        startLocalRecording();

        jitsiApiRef.current.addEventListener('videoConferenceLeft', () => {
          stopRecordingAndClose();
        });
      }
    };

    const stopRecordingAndClose = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (onClose) onClose();
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      document.body.appendChild(script);
    } else {
      initJitsi();
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [roomName, displayName, appointmentId, onClose]);

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContainer}>
        <button onClick={onClose} style={styles.closeCallBtn}>
          End Call
        </button>
        <div ref={containerRef} style={styles.jitsiWrapper} />
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalContainer: {
    width: '90%',
    height: '85%',
    backgroundColor: '#000000',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  closeCallBtn: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    zIndex: 10000,
    backgroundColor: '#dc3545',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  jitsiWrapper: {
    width: '100%',
    height: '100%'
  }
};