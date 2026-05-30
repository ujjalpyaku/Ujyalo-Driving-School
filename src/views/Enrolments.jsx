import { useState, useEffect } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { Search, Trash2, User, Phone, Eye, Pencil, ThumbsUp } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(^|\s|-)\S/g, l => l.toUpperCase());
};

export default function Enrolments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: '', cancelText: '', isDanger: false });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);

  // Form states for editing request
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editAvail, setEditAvail] = useState({
    Monday: { morning: false, afternoon: false },
    Tuesday: { morning: false, afternoon: false },
    Wednesday: { morning: false, afternoon: false },
    Thursday: { morning: false, afternoon: false },
    Friday: { morning: false, afternoon: false },
    Saturday: { morning: false, afternoon: false },
    Sunday: { morning: false, afternoon: false }
  });
  const [editHasTest, setEditHasTest] = useState(false);
  const [editTestDate, setEditTestDate] = useState('');
  const [editTestTime, setEditTestTime] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const enrolments = useLiveQuery(() => db.enrolments.toArray()) || [];

  // Mark all new enrolment requests as read when viewing the page
  useEffect(() => {
    const markAsRead = async () => {
      try {
        await db.enrolments.where('status').equals('new').modify({ status: 'read' });
      } catch (err) {
        console.error("Failed to mark enrolment requests as read:", err);
      }
    };
    markAsRead();
  }, []);

  const showAlert = (title, message, isDanger = false) => {
    setConfirmState({
      show: true,
      title,
      message,
      showCancel: false,
      confirmText: 'OK',
      isDanger
    });
  };

  const buildAvailString = (availObj) => {
    const parts = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
      const slots = [];
      if (availObj[day]?.morning) slots.push('Morning');
      if (availObj[day]?.afternoon) slots.push('Afternoon');
      if (slots.length > 0) {
        parts.push(`${day}: ${slots.join(', ')}`);
      }
    });
    return parts.join(' | ') || 'Not specified';
  };

  const parseAvailString = (availStr) => {
    const defaultAvail = {
      Monday: { morning: false, afternoon: false },
      Tuesday: { morning: false, afternoon: false },
      Wednesday: { morning: false, afternoon: false },
      Thursday: { morning: false, afternoon: false },
      Friday: { morning: false, afternoon: false },
      Saturday: { morning: false, afternoon: false },
      Sunday: { morning: false, afternoon: false }
    };
    if (!availStr || availStr === 'Not specified') return defaultAvail;
    
    const parts = availStr.split('|');
    parts.forEach(part => {
      const trimmed = part.trim();
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) return;
      const day = trimmed.substring(0, colonIdx).trim();
      const slotsStr = trimmed.substring(colonIdx + 1).trim();
      if (defaultAvail[day]) {
        defaultAvail[day].morning = slotsStr.includes('Morning');
        defaultAvail[day].afternoon = slotsStr.includes('Afternoon') || slotsStr.includes('Evening');
      }
    });
    return defaultAvail;
  };

  const handleApprove = (request) => {
    setConfirmState({
      show: true,
      title: 'Approve Enrolment Request',
      message: `Are you sure you want to approve "${toTitleCase(request.name)}"'s enrolment? This will create an active student profile with their details.`,
      onConfirm: async () => {
        try {
          // Double check: does a student with this phone number already exist?
          const students = await db.students.toArray();
          const duplicate = students.find(s => s.phone === request.phone);
          if (duplicate) {
            setConfirmState({
              show: true,
              title: 'Duplicate Phone Number',
              message: `A student named "${toTitleCase(duplicate.name)}" is already registered with the phone number ${request.phone}. You cannot approve this enrolment request unless you edit or delete the existing student.`,
              showCancel: false,
              confirmText: 'OK',
              isDanger: true
            });
            return;
          }

          // Create the student profile
          await db.students.add({
            id: request.id,
            name: toTitleCase(request.name),
            phone: request.phone,
            gender: request.gender,
            availability: request.availability || 'Not specified',
            testDate: request.testDate || '',
            testTime: request.testTime || '',
            notes: request.notes || '',
            status: 'active',
            classRateDiscount: 0,
            testRateDiscount: 0,
            createdAt: new Date().toISOString()
          });

          // Delete enrolment request
          await db.enrolments.delete(request.id);
          
          showAlert('Enrolment Approved', `"${toTitleCase(request.name)}" has been successfully added as an active student.`);
        } catch (err) {
          console.error("Failed to approve enrolment request:", err);
          showAlert("Error", "Failed to approve enrolment request: " + err.message, true);
        }
      },
      confirmText: 'Approve',
      isDanger: false
    });
  };

  const handleDelete = (request) => {
    setConfirmState({
      show: true,
      title: 'Delete Enrolment Request',
      message: `Are you sure you want to delete "${toTitleCase(request.name)}"'s enrolment request? It will be moved to the Recycle Bin.`,
      onConfirm: async () => {
        try {
          await db.trash.add({
            id: request.id,
            type: 'enrolment',
            deletedAt: new Date().toISOString(),
            data: request
          });
          await db.enrolments.delete(request.id);
        } catch (err) {
          console.error("Failed to delete enrolment request:", err);
          showAlert("Error", "Failed to delete enrolment request: " + err.message, true);
        }
      },
      confirmText: 'Delete',
      isDanger: true
    });
  };

  const openEditModal = (request) => {
    setEditingRequest(request);
    setEditName(toTitleCase(request.name));
    setEditPhone(request.phone);
    setEditGender(request.gender);
    setEditAvail(parseAvailString(request.availability));
    setEditHasTest(!!request.testDate);
    setEditTestDate(request.testDate || '');
    setEditTestTime(request.testTime || '');
    setEditNotes(request.notes || '');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) {
      showAlert('Missing Fields', 'Name and Phone are required.', true);
      return;
    }

    const cleanPhone = editPhone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(?:\+?61|0)4\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      showAlert('Invalid Phone Number', 'Please enter a valid Australian mobile number (e.g. 0412 345 678).', true);
      return;
    }

    let normalizedPhone = cleanPhone;
    if (cleanPhone.startsWith('+61')) {
      normalizedPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('61')) {
      normalizedPhone = '0' + cleanPhone.slice(2);
    }

    // Check for duplicate phone number in active students or other enrolment requests
    const [students, allEnrolments] = await Promise.all([
      db.students.toArray(),
      db.enrolments.toArray()
    ]);
    const dupStudent = students.find(s => s.phone === normalizedPhone);
    const dupEnrolment = allEnrolments.find(e => e.phone === normalizedPhone && e.id !== editingRequest.id);
    if (dupStudent || dupEnrolment) {
      showAlert('Duplicate Phone Number', `A record with the phone number ${normalizedPhone} is already registered under ${dupStudent ? `Student: "${dupStudent.name}"` : `Enrolment: "${dupEnrolment.name}"`}.`, true);
      return;
    }

    try {
      await db.enrolments.update(editingRequest.id, {
        name: toTitleCase(editName.trim()),
        phone: normalizedPhone,
        gender: editGender,
        availability: buildAvailString(editAvail),
        testDate: editHasTest ? editTestDate : '',
        testTime: editHasTest ? editTestTime : '',
        notes: editNotes.trim()
      });
      setEditingRequest(null);
    } catch (err) {
      console.error("Failed to update enrolment request:", err);
      showAlert("Error", "Failed to update enrolment request: " + err.message, true);
    }
  };

  const isEditPhoneDirty = editPhone.length > 0;
  const isEditPhoneInvalid = isEditPhoneDirty && !/^(?:\+?61|0)4\d{8}$/.test(editPhone.replace(/[\s\-()]/g, ''));

  const filteredEnrolments = enrolments.filter(item => {
    const query = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.phone.includes(query) ||
      (item.availability || '').toLowerCase().includes(query) ||
      (item.notes || '').toLowerCase().includes(query)
    );
  });

  const sortedEnrolments = [...filteredEnrolments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Student Enrolment Requests</h1>
          <p style={{ color: 'var(--text-muted)' }}>Review and approve self-enrolled student profile submissions</p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search enrolments by name, phone, availability..." 
            style={{ border: 'none', background: 'transparent', padding: '0.25rem 0' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Enrolments Table */}
      <div className="card" style={{ padding: 0 }}>
        {sortedEnrolments.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>Name & Contact</th>
                  <th style={{ width: '120px' }}>Gender</th>
                  <th>Availability</th>
                  <th style={{ width: '180px' }}>Scheduled Test</th>
                  <th style={{ width: '180px' }}>Submitted Date</th>
                  <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEnrolments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{toTitleCase(item.name)}</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={13} /> {item.phone}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontSize: '0.8rem' }}>
                        {item.gender}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-main)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.availability}>
                      {item.availability || 'Not specified'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {item.testDate ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.testDate}</span>
                          <span>at {item.testTime || 'Not specified'}</span>
                        </div>
                      ) : (
                        <span>None</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(item.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--primary)' }}
                          onClick={() => setSelectedRequest(item)}
                          title="View Request Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          onClick={() => openEditModal(item)}
                          title="Edit Details"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--success)' }}
                          onClick={() => handleApprove(item)}
                          title="Approve & Create Student Profile"
                        >
                          <ThumbsUp size={15} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDelete(item)}
                          title="Reject / Delete Request"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <User size={36} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.5 }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>No enrolment requests found</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Student submissions from the self-enrolment page will appear here.</div>
          </div>
        )}
      </div>

      {/* View Request Modal */}
      {selectedRequest && (
        <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Enrolment Request Details">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header Avatar and Basic Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.25rem'
              }}>
                {toTitleCase(selectedRequest.name).charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{toTitleCase(selectedRequest.name)}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{selectedRequest.gender}</span>
                  <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Pending Approval</span>
                </div>
              </div>
            </div>

            {/* Structured Grid Info */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1.25rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '1rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Phone Number:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={14} color="var(--text-muted)" /> {selectedRequest.phone}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Submitted Date:</span>
                <span style={{ fontSize: '0.9rem' }}>
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Preferred Availability:</span>
                <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{selectedRequest.availability || 'Not specified'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Scheduled Driving Test:</span>
                {selectedRequest.testDate ? (
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {selectedRequest.testDate} at {selectedRequest.testTime || 'Not specified'}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None scheduled</span>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Comments / Notes:</span>
              <div style={{ 
                fontSize: '0.9rem', 
                padding: '0.75rem 1rem', 
                background: 'var(--bg-hover)', 
                borderRadius: '8px', 
                border: '1px solid var(--border)',
                whiteSpace: 'pre-wrap',
                minHeight: '40px',
                color: selectedRequest.notes ? 'var(--text-main)' : 'var(--text-muted)',
                fontStyle: selectedRequest.notes ? 'normal' : 'italic'
              }}>
                {selectedRequest.notes || 'No comments provided by applicant.'}
              </div>
            </div>

            <div className="dialog-footer" style={{ marginTop: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => {
                  const req = selectedRequest;
                  setSelectedRequest(null);
                  handleDelete(req);
                }}
              >
                Reject Request
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => {
                  const req = selectedRequest;
                  setSelectedRequest(null);
                  handleApprove(req);
                }}
              >
                Approve & Enrol Student
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedRequest(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Request Modal */}
      {editingRequest && (
        <Modal isOpen={!!editingRequest} onClose={() => setEditingRequest(null)} title="Edit Enrolment Request Details">
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="edit-enrol-name">Full Name *</label>
              <input 
                id="edit-enrol-name"
                type="text" 
                className="form-control" 
                required 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
              />
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="edit-enrol-phone">Phone Number *</label>
                <input 
                  id="edit-enrol-phone"
                  type="tel" 
                  className="form-control" 
                  required 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)} 
                />
                {isEditPhoneInvalid && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    Please enter a valid Australian mobile number.
                  </span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="edit-enrol-gender">Gender</label>
                <select 
                  id="edit-enrol-gender" 
                  className="form-control" 
                  value={editGender} 
                  onChange={(e) => setEditGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Availability */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Preferred Availability</label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: '0.5rem', 
                background: 'var(--bg-hover)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                padding: '0.75rem' 
              }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.35rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{day}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', margin: 0, fontSize: '0.75rem' }}>
                        <input 
                          type="checkbox" 
                          checked={editAvail[day]?.morning || false} 
                          onChange={(e) => setEditAvail(prev => ({
                            ...prev,
                            [day]: { ...prev[day], morning: e.target.checked }
                          }))}
                        />
                        Morning
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', margin: 0, fontSize: '0.75rem' }}>
                        <input 
                          type="checkbox" 
                          checked={editAvail[day]?.afternoon || false} 
                          onChange={(e) => setEditAvail(prev => ({
                            ...prev,
                            [day]: { ...prev[day], afternoon: e.target.checked }
                          }))}
                        />
                        Afternoon
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Scheduling */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', margin: 0 }}>
                <input 
                  type="checkbox" 
                  checked={editHasTest} 
                  onChange={(e) => setEditHasTest(e.target.checked)} 
                />
                Applicant has scheduled a driving test
              </label>
              {editHasTest && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label htmlFor="edit-test-date" style={{ fontSize: '0.8rem' }}>Test Date</label>
                    <input 
                      id="edit-test-date" 
                      type="date"
                      className="form-control" 
                      required={editHasTest}
                      value={editTestDate} 
                      onChange={(e) => setEditTestDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-test-time" style={{ fontSize: '0.8rem' }}>Test Time</label>
                    <input 
                      id="edit-test-time" 
                      type="time"
                      className="form-control" 
                      required={editHasTest}
                      value={editTestTime} 
                      onChange={(e) => setEditTestTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-enrol-notes">Comments / Notes</label>
              <textarea
                id="edit-enrol-notes"
                className="form-control"
                rows="2"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingRequest(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isEditPhoneInvalid}>Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal confirmState={confirmState} setConfirmState={setConfirmState} />
    </div>
  );
}
