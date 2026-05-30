import { useState } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { Trash2, RotateCcw, Search, User, Calendar, AlertCircle, Mail } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minStr} ${ampm}`;
};

export default function Trash() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: '', cancelText: '', isDanger: false });

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

  const rawTrashItems = useLiveQuery(() => db.trash.toArray()) || [];

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(^|\s|-)\S/g, l => l.toUpperCase());
  };

  const trashItems = rawTrashItems.map(item => {
    const dataClone = { ...item.data };
    if (item.type === 'student' && dataClone.student) {
      dataClone.student = { ...dataClone.student, name: toTitleCase(dataClone.student.name) };
    } else if ((item.type === 'inquiry' || item.type === 'enrolment') && dataClone.name) {
      dataClone.name = toTitleCase(dataClone.name);
    } else if (item.type === 'booking' && dataClone.studentName) {
      dataClone.studentName = toTitleCase(dataClone.studentName);
    }
    return { ...item, data: dataClone };
  });

  const handleRestore = async (item) => {
    try {
      if (item.type === 'student') {
        setConfirmState({
          show: true,
          title: 'Restore Student Profile',
          message: `Are you sure you want to restore the student profile for "${item.data.student.name}" along with all their linked bookings and payments?`,
          onConfirm: async () => {
            try {
              // Check for duplicate phone number
              const allStudents = await db.students.toArray();
              const targetPhone = item.data.student.phone;
              const duplicate = allStudents.find(s => s.phone === targetPhone);
              if (duplicate) {
                showAlert("Duplicate Phone Number", `Cannot restore "${item.data.student.name}". A student named "${duplicate.name}" is already registered with the phone number ${targetPhone}. Please delete or edit the active student first.`, true);
                return;
              }

              // Restore student
              await db.students.put(item.data.student);
              // Restore bookings
              if (item.data.bookings && item.data.bookings.length > 0) {
                await Promise.all(item.data.bookings.map(b => db.bookings.put(b)));
              }
              // Restore payments
              if (item.data.payments && item.data.payments.length > 0) {
                await Promise.all(item.data.payments.map(p => db.payments.put(p)));
              }
              // Delete from trash
              await db.trash.delete(item.id);
            } catch (err) {
              console.error("Failed to restore student profile:", err);
              showAlert("Error Restoring Student", err.message, true);
            }
          },
          confirmText: 'Restore',
          isDanger: false
        });
      } else if (item.type === 'booking') {
        const booking = item.data;
        
        // 1. Validate student profile still exists
        const studentExists = await db.students.get(booking.studentId);
        if (!studentExists) {
          showAlert("Cannot Restore Booking", `Cannot Restore Booking!\nThe associated student profile "${booking.studentName}" has been permanently deleted.\n\nYou must recreate a student profile for them first.`, true);
          return;
        }

        // 2. Validate time slot overlap conflict
        const activeBookings = await db.bookings.toArray();
        const conflictingBooking = activeBookings.find(b => 
          b.status !== 'cancelled' &&
          b.id !== booking.id &&
          b.date === booking.date &&
          ((booking.timeFrom < b.timeTo && b.timeFrom < booking.timeTo))
        );
        if (conflictingBooking) {
          showAlert("Cannot Restore Booking Conflict", `Cannot Restore Booking Conflict!\nThere is already an active booking for ${conflictingBooking.studentName} on this day from ${formatTime12Hour(conflictingBooking.timeFrom)} to ${formatTime12Hour(conflictingBooking.timeTo)}.\n\nPlease resolve the conflict first.`, true);
          return;
        }

        setConfirmState({
          show: true,
          title: 'Restore Booking',
          message: `Are you sure you want to restore the booking for "${booking.studentName}" on ${booking.date}?`,
          onConfirm: async () => {
            try {
              await db.bookings.put(booking);
              await db.trash.delete(item.id);
            } catch (err) {
              console.error("Failed to restore booking:", err);
              showAlert("Error Restoring Booking", err.message, true);
            }
          },
          confirmText: 'Restore',
          isDanger: false
        });
      } else if (item.type === 'enrolment') {
        setConfirmState({
          show: true,
          title: 'Restore Enrolment Request',
          message: `Are you sure you want to restore the enrolment request from "${item.data.name}"?`,
          onConfirm: async () => {
            try {
              // Check if a student or enrolment with the same phone number already exists
              const allStudents = await db.students.toArray();
              const allEnrolments = await db.enrolments.toArray();
              const targetPhone = item.data.phone;
              const dupStudent = allStudents.find(s => s.phone === targetPhone);
              const dupEnrolment = allEnrolments.find(e => e.phone === targetPhone);
              if (dupStudent || dupEnrolment) {
                showAlert("Duplicate Phone Number", `Cannot restore "${item.data.name}". A record with the phone number ${targetPhone} is already active in ${dupStudent ? 'Students' : 'Enrolments'}.`, true);
                return;
              }

              await db.enrolments.put(item.data);
              await db.trash.delete(item.id);
            } catch (err) {
              console.error("Failed to restore enrolment:", err);
              showAlert("Error Restoring Enrolment", err.message, true);
            }
          },
          confirmText: 'Restore',
          isDanger: false
        });
      }
    } catch (err) {
      console.error("Failed to restore item:", err);
      showAlert("Error Restoring Item", err.message, true);
    }
  };

  const handlePermanentDelete = (item) => {
    const confirmationMsg = item.type === 'student' 
      ? `Are you sure you want to PERMANENTLY delete "${item.data.student.name}" and all historical bookings/payments? This action is irreversible.`
      : item.type === 'enquiry'
        ? `Are you sure you want to PERMANENTLY delete this booking inquiry from "${item.data.name}"? This action is irreversible.`
        : item.type === 'enrolment'
          ? `Are you sure you want to PERMANENTLY delete the enrolment request from "${item.data.name}"? This action is irreversible.`
          : `Are you sure you want to PERMANENTLY delete this booking slot for "${item.data.studentName}"? This action is irreversible.`;

    setConfirmState({
      show: true,
      title: 'Permanently Delete Record',
      message: confirmationMsg,
      onConfirm: async () => {
        try {
          await db.trash.delete(item.id);
        } catch (err) {
          console.error("Failed to purge item:", err);
          showAlert("Error Purging Item", err.message, true);
        }
      },
      confirmText: 'Delete Permanently',
      isDanger: true
    });
  };

  const handleEmptyTrash = () => {
    setConfirmState({
      show: true,
      title: 'Empty Recycle Bin',
      message: 'Are you sure you want to permanently delete all items in the Trash? This action is irreversible.',
      onConfirm: async () => {
        try {
          await db.trash.clear();
        } catch (err) {
          console.error("Failed to empty trash:", err);
          showAlert("Error Emptying Trash", err.message, true);
        }
      },
      confirmText: 'Empty Trash',
      isDanger: true
    });
  };

  // Filtering list items
  const filteredTrash = trashItems.filter(item => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    
    let matchesSearch = false;
    if (item.type === 'student') {
      const student = item.data.student;
      matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      student.phone.includes(searchTerm);
    } else if (item.type === 'booking') {
      const booking = item.data;
      matchesSearch = booking.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      booking.date.includes(searchTerm);
    } else if (item.type === 'enquiry') {
      const inquiry = item.data;
      matchesSearch = inquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      inquiry.phone.includes(searchTerm) ||
                      inquiry.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (inquiry.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    } else if (item.type === 'enrolment') {
      const enrolment = item.data;
      matchesSearch = enrolment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      enrolment.phone.includes(searchTerm) ||
                      (enrolment.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    }

    return matchesType && matchesSearch;
  });

  // Sort chronological descending (most recently deleted first)
  const sortedTrash = [...filteredTrash].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Recycle Bin</h1>
          <p style={{ color: 'var(--text-muted)' }}>Restore or permanently delete student profiles and bookings</p>
        </div>
        {trashItems.length > 0 && (
          <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleEmptyTrash}>
            <Trash2 size={16} /> Empty Trash Bin
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search trash by name or phone/date..." 
            style={{ border: 'none', background: 'transparent', padding: '0.25rem 0' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Category:</span>
            <select 
              className="form-control" 
              style={{ width: '200px', padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Records</option>
              <option value="student">Student Profiles</option>
              <option value="booking">Lesson Booking Slots</option>
              <option value="enquiry">Booking Enquiries</option>
              <option value="enrolment">Enrolment Requests</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trash Contents Card */}
      <div className="card" style={{ padding: 0 }}>
        {sortedTrash.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Record Type</th>
                  <th>Description / Info</th>
                  <th style={{ width: '220px' }}>Deleted On</th>
                  <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrash.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={`badge badge-${item.type === 'student' ? 'primary' : item.type === 'enquiry' ? 'success' : item.type === 'enrolment' ? 'warning' : 'info'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {item.type === 'student' ? <User size={13} /> : item.type === 'enquiry' ? <Mail size={13} /> : item.type === 'enrolment' ? <User size={13} /> : <Calendar size={13} />}
                        {item.type === 'student' ? 'Student' : item.type === 'enquiry' ? 'Enquiry' : item.type === 'enrolment' ? 'Enrolment' : 'Booking'}
                      </span>
                    </td>
                    <td>
                      {item.type === 'student' ? (
                        <div>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{item.data.student.name}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Phone: {item.data.student.phone} | Gender: {item.data.student.gender} | Contains {item.data.bookings?.length || 0} bookings, {item.data.payments?.length || 0} payments
                          </div>
                        </div>
                      ) : item.type === 'enquiry' ? (
                        <div>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{item.data.name}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Phone: {item.data.phone} | Course: {item.data.course} | Message: {item.data.message || 'None'}
                          </div>
                        </div>
                      ) : item.type === 'enrolment' ? (
                        <div>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{item.data.name} (Self Enrolment)</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Phone: {item.data.phone} | Gender: {item.data.gender} | Availability: {item.data.availability || 'Not specified'} | Notes: {item.data.notes || 'None'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{item.data.studentName}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {item.data.date} @ {formatTime12Hour(item.data.timeFrom)} – {formatTime12Hour(item.data.timeTo)} | Type: <span style={{ textTransform: 'capitalize' }}>{item.data.type}</span> (${item.data.totalPrice.toFixed(2)})
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(item.deletedAt).toLocaleString('en-US', {
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
                          style={{ color: 'var(--success)' }}
                          onClick={() => handleRestore(item)}
                          title="Restore Record"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handlePermanentDelete(item)}
                          title="Delete Permanently"
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
            <AlertCircle size={36} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.5 }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>Recycle Bin is empty</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Deleted student profiles and booking slots will appear here.</div>
          </div>
        )}
      </div>
      
      {/* Generic Confirmation Modal */}
      <ConfirmationModal confirmState={confirmState} setConfirmState={setConfirmState} />
    </div>
  );
}
