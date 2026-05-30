import { useState, useEffect } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { Search, Plus, Calendar, Clock, DollarSign, Trash2, Edit2, Ban, RotateCcw } from 'lucide-react';
import Modal from '../components/Modal';

const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minStr} ${ampm}`;
};

export default function Bookings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: '', cancelText: '', isDanger: false });
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [ebStudentSearchQuery, setEbStudentSearchQuery] = useState('');

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [bookingType, setBookingType] = useState('package');
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  
  // Edit Booking Form states
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [ebStudentId, setEbStudentId] = useState('');
  const [ebType, setEbType] = useState('normal');
  const [ebDate, setEbDate] = useState('');
  const [ebTimeFrom, setEbTimeFrom] = useState('');
  const [ebTimeTo, setEbTimeTo] = useState('');
  const [ebRateCharged, setEbRateCharged] = useState(0);
  const [ebDiscountApplied, setEbDiscountApplied] = useState(0);
  const [ebDuration, setEbDuration] = useState(0);
  const [ebTotalPrice, setEbTotalPrice] = useState(0);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });

  // Real-time calculation state
  const [calculatedDuration, setCalculatedDuration] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [selectedStudentDiscount, setSelectedStudentDiscount] = useState({ classDisc: 0, testDisc: 0 });

  // Fetch db items
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const bookings = useLiveQuery(() => db.bookings.toArray()) || [];
  const pricingSettings = useLiveQuery(() => db.settings.get('pricing'));

  const rates = pricingSettings || { normalRate: 63, packageRate: 63, testRate: 210 };

  // Sync student discount on selection
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudentDiscount({ classDisc: 0, testDisc: 0 });
      return;
    }
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
      setSelectedStudentDiscount({
        classDisc: student.classRateDiscount || 0,
        testDisc: student.testRateDiscount || 0
      });
    }
  }, [selectedStudentId, students]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  const handleEditStudentChange = async (studentId) => {
    setEbStudentId(studentId);
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const activePricing = await db.settings.get('pricing') || { normalRate: 63, packageRate: 63, testRate: 210 };
    
    let rate = 0;
    let disc = 0;
    if (ebType === 'normal') {
      rate = activePricing.normalRate;
      disc = student.classRateDiscount || 0;
    } else if (ebType === 'package') {
      rate = activePricing.packageRate;
      disc = student.classRateDiscount || 0;
    } else if (ebType === 'test') {
      rate = activePricing.testRate;
      disc = student.testRateDiscount || 0;
    }
    setEbRateCharged(rate);
    setEbDiscountApplied(disc);
  };

  const handleEditTypeChange = async (newType) => {
    setEbType(newType);
    const student = students.find(s => s.id === ebStudentId);
    if (!student) return;

    const activePricing = await db.settings.get('pricing') || { normalRate: 63, packageRate: 63, testRate: 210 };
    
    let rate = 0;
    let disc = 0;
    if (newType === 'normal') {
      rate = activePricing.normalRate;
      disc = student.classRateDiscount || 0;
    } else if (newType === 'package') {
      rate = activePricing.packageRate;
      disc = student.classRateDiscount || 0;
    } else if (newType === 'test') {
      rate = activePricing.testRate;
      disc = student.testRateDiscount || 0;
    }
    setEbRateCharged(rate);
    setEbDiscountApplied(disc);
  };

  const openEditBooking = (booking) => {
    setEditingBookingId(booking.id);
    setEbStudentId(booking.studentId);
    setEbType(booking.type);
    setEbDate(booking.date);
    setEbTimeFrom(booking.timeFrom);
    setEbTimeTo(booking.timeTo);
    setEbRateCharged(booking.rateCharged);
    setEbDiscountApplied(booking.discountApplied);
    setEbDuration(booking.duration);
    setEbTotalPrice(booking.totalPrice);
    setIsEditBookingOpen(true);
  };

  const handleEditBookingSubmit = async (e) => {
    e.preventDefault();
    if (!ebStudentId || !ebDate || !ebTimeFrom || !ebTimeTo) {
      setConfirmState({
        show: true,
        title: 'Missing Fields',
        message: 'Please fill out all booking fields.',
        showCancel: false,
        confirmText: 'OK',
        isDanger: false
      });
      return;
    }

    if (ebDuration <= 0) {
      setConfirmState({
        show: true,
        title: 'Invalid Time Range',
        message: 'End time must be after start time.',
        showCancel: false,
        confirmText: 'OK',
        isDanger: false
      });
      return;
    }

    const student = students.find(s => s.id === ebStudentId);
    if (!student) return;

    // Check for conflicts
    const conflictingBooking = bookings.find(b => 
      b.status !== 'cancelled' &&
      b.id !== editingBookingId &&
      b.date === ebDate && 
      ((ebTimeFrom < b.timeTo && b.timeFrom < ebTimeTo))
    );
    if (conflictingBooking) {
      setConfirmState({
        show: true,
        title: 'Booking Conflict',
        message: `There is already a booking for ${conflictingBooking.studentName} on this day from ${formatTime12Hour(conflictingBooking.timeFrom)} to ${formatTime12Hour(conflictingBooking.timeTo)}.\n\nPlease choose a different time slot.`,
        showCancel: false,
        confirmText: 'OK',
        isDanger: true
      });
      return;
    }

    await db.bookings.update(editingBookingId, {
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      date: ebDate,
      timeFrom: ebTimeFrom,
      timeTo: ebTimeTo,
      duration: ebDuration,
      type: ebType,
      rateCharged: Number(ebRateCharged),
      discountApplied: Number(ebDiscountApplied),
      totalPrice: ebTotalPrice
    });

    setIsEditBookingOpen(false);
    setEditingBookingId(null);
    setEbStudentSearchQuery('');
  };

  // Recalculate duration & pricing dynamically in edit booking form
  useEffect(() => {
    if (!ebTimeFrom || !ebTimeTo) {
      setEbDuration(0);
      setEbTotalPrice(0);
      return;
    }

    const [hStart, mStart] = ebTimeFrom.split(':').map(Number);
    const [hEnd, mEnd] = ebTimeTo.split(':').map(Number);
    const durationMin = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);

    if (durationMin <= 0) {
      setEbDuration(0);
      setEbTotalPrice(0);
      return;
    }

    const duration = parseFloat((durationMin / 60).toFixed(2));
    setEbDuration(duration);

    let price = 0;
    if (ebType === 'test') {
      price = Math.max(0, ebRateCharged - ebDiscountApplied);
    } else {
      price = Math.max(0, duration * (ebRateCharged - ebDiscountApplied));
    }
    setEbTotalPrice(price);
  }, [ebTimeFrom, ebTimeTo, ebType, ebRateCharged, ebDiscountApplied]);

  // Recalculate duration & pricing dynamically in form
  useEffect(() => {
    if (!timeFrom || !timeTo) {
      setCalculatedDuration(0);
      setEstimatedPrice(0);
      return;
    }

    const [hStart, mStart] = timeFrom.split(':').map(Number);
    const [hEnd, mEnd] = timeTo.split(':').map(Number);
    const durationMin = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);

    if (durationMin <= 0) {
      setCalculatedDuration(0);
      setEstimatedPrice(0);
      return;
    }

    const duration = parseFloat((durationMin / 60).toFixed(2));
    setCalculatedDuration(duration);

    // Apply appropriate pricing
    let rate = 0;
    let disc = 0;

    if (bookingType === 'normal') {
      rate = rates.normalRate;
      disc = selectedStudentDiscount.classDisc;
    } else if (bookingType === 'package') {
      rate = rates.packageRate;
      disc = selectedStudentDiscount.classDisc;
    } else if (bookingType === 'test') {
      rate = rates.testRate;
      disc = selectedStudentDiscount.testDisc;
    }

    let finalPrice = 0;
    if (bookingType === 'test') {
      finalPrice = Math.max(0, rate - disc);
    } else {
      finalPrice = Math.max(0, duration * (rate - disc));
    }

    setEstimatedPrice(finalPrice);
  }, [timeFrom, timeTo, bookingType, selectedStudentDiscount, rates]);

  // Handle Add Booking Submit
  const handleAddBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !date || !timeFrom || !timeTo) {
      setConfirmState({
        show: true,
        title: 'Missing Fields',
        message: 'Please fill out all booking fields.',
        showCancel: false,
        confirmText: 'OK',
        isDanger: false
      });
      return;
    }

    if (calculatedDuration <= 0) {
      setConfirmState({
        show: true,
        title: 'Invalid Time Range',
        message: 'End time must be after start time.',
        showCancel: false,
        confirmText: 'OK',
        isDanger: false
      });
      return;
    }

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    // Check for conflicts
    const conflictingBooking = bookings.find(b => 
      b.status !== 'cancelled' &&
      b.date === date && 
      ((timeFrom < b.timeTo && b.timeFrom < timeTo))
    );
    if (conflictingBooking) {
      setConfirmState({
        show: true,
        title: 'Booking Conflict',
        message: `There is already a booking for ${conflictingBooking.studentName} on this day from ${formatTime12Hour(conflictingBooking.timeFrom)} to ${formatTime12Hour(conflictingBooking.timeTo)}.\n\nPlease choose a different time slot.`,
        showCancel: false,
        confirmText: 'OK',
        isDanger: true
      });
      return;
    }

    // Fetch active settings directly from DB to avoid any closure staleness
    const activePricing = await db.settings.get('pricing') || { normalRate: 63, packageRate: 63, testRate: 210 };

    let rateCharged = 0;
    let discountApplied = 0;

    if (bookingType === 'normal') {
      rateCharged = activePricing.normalRate;
      discountApplied = student.classRateDiscount || 0;
    } else if (bookingType === 'package') {
      rateCharged = activePricing.packageRate;
      discountApplied = student.classRateDiscount || 0;
    } else if (bookingType === 'test') {
      rateCharged = activePricing.testRate;
      discountApplied = student.testRateDiscount || 0;
    }

    // Recompute total price at submission time using direct values
    let finalPrice = 0;
    if (bookingType === 'test') {
      finalPrice = Math.max(0, rateCharged - discountApplied);
    } else {
      finalPrice = Math.max(0, calculatedDuration * (rateCharged - discountApplied));
    }

    await db.bookings.add({
      id: crypto.randomUUID(),
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      date,
      timeFrom,
      timeTo,
      duration: calculatedDuration,
      type: bookingType,
      rateCharged,
      discountApplied,
      totalPrice: finalPrice,
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setSelectedStudentId('');
    setStudentSearchQuery('');
    setBookingType('package');
    setDate('');
    setTimeFrom('');
    setTimeTo('');
    setIsAddBookingOpen(false);
  };

  // Delete Booking
  const handleDeleteBooking = (bookingId, studentName, date) => {
    setConfirmState({
      show: true,
      title: 'Delete Booking',
      message: `Are you sure you want to delete the booking for ${studentName} on ${date}?`,
      onConfirm: async () => {
        try {
          const bookingData = await db.bookings.get(bookingId);
          if (bookingData) {
            await db.trash.add({
              id: bookingId,
              type: 'booking',
              data: bookingData,
              deletedAt: new Date().toISOString()
            });
          }
          await db.bookings.delete(bookingId);
        } catch (err) {
          console.error("Failed to delete booking:", err);
          setConfirmState({
            show: true,
            title: 'Error Deleting Booking',
            message: err.message,
            showCancel: false,
            confirmText: 'OK',
            isDanger: true
          });
        }
      },
      confirmText: 'Delete',
      isDanger: true
    });
  };

  // Cancel Booking
  const handleCancelBookingClick = (bookingId, studentName, date) => {
    setConfirmState({
      show: true,
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel the booking for ${studentName} on ${date}?`,
      onConfirm: async () => {
        try {
          await db.bookings.update(bookingId, { status: 'cancelled' });
        } catch (err) {
          console.error("Failed to cancel booking:", err);
          setConfirmState({
            show: true,
            title: 'Error Cancelling Booking',
            message: err.message,
            showCancel: false,
            confirmText: 'OK',
            isDanger: true
          });
        }
      },
      confirmText: 'Cancel Booking',
      isDanger: true
    });
  };

  // Reinstate Booking
  const handleReinstateBooking = async (bookingId, studentName, date, timeFrom, timeTo) => {
    // Check for conflicts
    const conflictingBooking = bookings.find(b => 
      b.status !== 'cancelled' &&
      b.id !== bookingId &&
      b.date === date && 
      ((timeFrom < b.timeTo && b.timeFrom < timeTo))
    );
    if (conflictingBooking) {
      setConfirmState({
        show: true,
        title: 'Reinstate Booking Conflict',
        message: `There is already an active booking for ${conflictingBooking.studentName} on this day from ${formatTime12Hour(conflictingBooking.timeFrom)} to ${formatTime12Hour(conflictingBooking.timeTo)}.\n\nPlease reschedule or cancel the conflict first.`,
        showCancel: false,
        confirmText: 'OK',
        isDanger: true
      });
      return;
    }

    setConfirmState({
      show: true,
      title: 'Reinstate Booking',
      message: `Are you sure you want to reinstate the booking for ${studentName} on ${date}?`,
      onConfirm: async () => {
        try {
          await db.bookings.update(bookingId, { status: 'scheduled' });
        } catch (err) {
          console.error("Failed to reinstate booking:", err);
          setConfirmState({
            show: true,
            title: 'Error Reinstating Booking',
            message: err.message,
            showCancel: false,
            confirmText: 'OK',
            isDanger: true
          });
        }
      },
      confirmText: 'Reinstate',
      isDanger: false
    });
  };

  // Filter Bookings
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || b.type === typeFilter;
    
    let matchesTimeline = true;
    if (timelineFilter === 'upcoming') {
      matchesTimeline = b.date >= todayStr;
    } else if (timelineFilter === 'past') {
      matchesTimeline = b.date < todayStr;
    }

    return matchesSearch && matchesType && matchesTimeline;
  });

  const sortedBookings = [...filteredBookings];
  if (sortConfig.key !== null) {
    sortedBookings.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === 'studentName') {
        aVal = a.studentName;
        bVal = b.studentName;
      } else if (sortConfig.key === 'studentPhone') {
        aVal = a.studentPhone;
        bVal = b.studentPhone;
      } else if (sortConfig.key === 'date') {
        aVal = `${a.date}T${a.createdAt || '00:00:00'}`;
        bVal = `${b.date}T${b.createdAt || '00:00:00'}`;
      } else if (sortConfig.key === 'timeSlot') {
        aVal = a.timeFrom || '';
        bVal = b.timeFrom || '';
      } else {
        aVal = a[sortConfig.key];
        bVal = b[sortConfig.key];
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }

  const activeConflict = date && timeFrom && timeTo ? bookings.find(b => 
    b.status !== 'cancelled' &&
    b.date === date && 
    ((timeFrom < b.timeTo && b.timeFrom < timeTo))
  ) : null;

  const activeEditConflict = ebDate && ebTimeFrom && ebTimeTo ? bookings.find(b => 
    b.status !== 'cancelled' &&
    b.id !== editingBookingId &&
    b.date === ebDate && 
    ((ebTimeFrom < b.timeTo && b.timeFrom < ebTimeTo))
  ) : null;

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Driving Bookings</h1>
          <p style={{ color: 'var(--text-muted)' }}>Create and manage scheduled student driving lessons</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddBookingOpen(true)}>
          <Plus size={16} /> New Booking
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search bookings by student name..." 
            style={{ border: 'none', background: 'transparent', padding: '0.25rem 0' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Lesson Type:</span>
            <select 
              className="form-control" 
              style={{ width: '160px', padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="normal">Normal Lessons</option>
              <option value="package">Package Lessons</option>
              <option value="test">Driving Tests</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Schedule:</span>
            <select 
              className="form-control" 
              style={{ width: '160px', padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming & Today</option>
              <option value="past">Past Lessons</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings List Card */}
      <div className="card" style={{ padding: 0 }}>
        {sortedBookings.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => requestSort('studentName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Student Name {getSortIcon('studentName')}
                  </th>
                  <th onClick={() => requestSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Date {getSortIcon('date')}
                  </th>
                  <th onClick={() => requestSort('timeSlot')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Time Slot {getSortIcon('timeSlot')}
                  </th>
                  <th onClick={() => requestSort('duration')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Duration {getSortIcon('duration')}
                  </th>
                  <th onClick={() => requestSort('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Lesson Type {getSortIcon('type')}
                  </th>
                  <th onClick={() => requestSort('rateCharged')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Rate Applied {getSortIcon('rateCharged')}
                  </th>
                  <th onClick={() => requestSort('discountApplied')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Discount {getSortIcon('discountApplied')}
                  </th>
                  <th onClick={() => requestSort('totalPrice')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                    Total Price {getSortIcon('totalPrice')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBookings.map((b) => (
                  <tr key={b.id} style={b.status === 'cancelled' ? { opacity: 0.6 } : {}}>
                    <td style={{ fontWeight: 600 }}>{b.studentName}</td>
                    <td>{b.date}</td>
                    <td>{formatTime12Hour(b.timeFrom)} – {formatTime12Hour(b.timeTo)}</td>
                    <td>{b.duration ? `${b.duration} hrs` : '—'}</td>
                    <td>
                      <span className={`badge badge-${
                        b.type === 'normal' ? 'primary' : b.type === 'package' ? 'success' : 'warning'
                      }`}>
                        {b.type}
                      </span>
                      {b.status === 'cancelled' && (
                        <span className="badge badge-danger" style={{ marginLeft: '0.4rem' }}>
                          cancelled
                        </span>
                      )}
                    </td>
                    <td>${b.rateCharged.toFixed(2)}{b.type !== 'test' ? '/hr' : ''}</td>
                    <td style={{ color: 'var(--success)' }}>
                      {b.discountApplied > 0 ? `-$${b.discountApplied.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: b.status === 'cancelled' ? 'var(--text-muted)' : 'var(--primary)', textDecoration: b.status === 'cancelled' ? 'line-through' : 'none' }}>
                      ${b.totalPrice.toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--primary)' }}
                          onClick={() => openEditBooking(b)}
                          title="Edit Booking"
                          disabled={b.status === 'cancelled'}
                        >
                          <Edit2 size={15} />
                        </button>
                        {b.status !== 'cancelled' ? (
                          <button 
                            className="btn btn-secondary btn-icon-only btn-sm" 
                            style={{ color: 'var(--warning)' }}
                            onClick={() => handleCancelBookingClick(b.id, b.studentName, b.date)}
                            title="Cancel Booking"
                          >
                            <Ban size={15} />
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary btn-icon-only btn-sm" 
                            style={{ color: 'var(--success)' }}
                            onClick={() => handleReinstateBooking(b.id, b.studentName, b.date, b.timeFrom, b.timeTo)}
                            title="Reinstate Booking"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteBooking(b.id, b.studentName, b.date)}
                          title="Delete Booking"
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
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            No driving lessons found matching the filters. Create a new booking to get started.
          </div>
        )}
      </div>

      {/* Add Booking Modal */}
      {isAddBookingOpen && (
        <Modal isOpen={isAddBookingOpen} onClose={() => { setIsAddBookingOpen(false); setStudentSearchQuery(''); }} title="Schedule Lesson Booking">
          <form onSubmit={handleAddBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="form-group">
              <label htmlFor="studentSearch">Search Student</label>
              <input 
                type="text" 
                id="studentSearch"
                className="form-control" 
                placeholder="Type name or phone to filter..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <label htmlFor="studentSelect">Select Student *</label>
              <select 
                id="studentSelect"
                className="form-control"
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">-- Choose a student profile --</option>
                {students
                  .filter(s => s.status !== 'terminated')
                  .filter(s => {
                    const q = studentSearchQuery.toLowerCase();
                    return s.name.toLowerCase().includes(q) || s.phone.includes(q);
                  })
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                  ))
                }
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="btype">Lesson Type</label>
              <select 
                id="btype" 
                className="form-control" 
                value={bookingType} 
                onChange={(e) => setBookingType(e.target.value)}
              >
                <option value="normal">Normal Lesson (${rates.normalRate}/hr)</option>
                <option value="package">Package Lesson (${rates.packageRate}/hr - min 5)</option>
                <option value="test">Test preparation + Car hire (${rates.testRate} flat)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bdate">Lesson Date *</label>
              <input 
                id="bdate"
                type="date" 
                className="form-control" 
                required 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="bfrom">From Time *</label>
                <input 
                  id="bfrom"
                  type="time" 
                  step="900"
                  className="form-control" 
                  required 
                  value={timeFrom} 
                  onChange={(e) => setTimeFrom(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="bto">To Time *</label>
                <input 
                  id="bto"
                  type="time" 
                  step="900"
                  className="form-control" 
                  required 
                  value={timeTo} 
                  onChange={(e) => setTimeTo(e.target.value)} 
                />
              </div>
            </div>

            {/* Estimated Pricing Panel */}
            {selectedStudentId && calculatedDuration > 0 && (
              <div 
                className="card" 
                style={{ 
                  background: 'var(--primary-light)', 
                  borderColor: 'var(--primary)', 
                  padding: '1rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                <h4 style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>Billing Summary Preview</h4>
                <div className="ledger-row" style={{ fontSize: '0.85rem' }}>
                  <span>Duration:</span>
                  <strong>{calculatedDuration} hours</strong>
                </div>
                <div className="ledger-row" style={{ fontSize: '0.85rem' }}>
                  <span>Rate:</span>
                  <strong>
                    {bookingType === 'test' ? `$${rates.testRate} flat` : `$${bookingType === 'normal' ? rates.normalRate : rates.packageRate}/hr`}
                  </strong>
                </div>
                <div className="ledger-row" style={{ fontSize: '0.85rem' }}>
                  <span>Student Discount:</span>
                  <strong style={{ color: 'var(--success)' }}>
                    {bookingType === 'test' 
                      ? `-$${selectedStudentDiscount.testDisc} flat off` 
                      : `-$${selectedStudentDiscount.classDisc}/hr off`}
                  </strong>
                </div>
                <div className="ledger-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontSize: '0.95rem' }}>
                  <span>Total Bill Amount:</span>
                  <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>${estimatedPrice.toFixed(2)}</strong>
                </div>
              </div>
            )}

            {/* Booking Conflict Warning Panel */}
            {activeConflict && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid var(--danger)', 
                color: 'var(--danger)', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)', 
                fontSize: '0.85rem',
                marginTop: '0.5rem'
              }}>
                <strong>⚠️ Booking Conflict Alert:</strong> there is already an active booking for <strong>{activeConflict.studentName}</strong> on this day from <strong>{formatTime12Hour(activeConflict.timeFrom)}</strong> to <strong>{formatTime12Hour(activeConflict.timeTo)}</strong>. You cannot book this slot.
              </div>
            )}

            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddBookingOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!!activeConflict || calculatedDuration <= 0}>Book Lesson</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Booking Modal */}
      {isEditBookingOpen && (
        <Modal isOpen={isEditBookingOpen} onClose={() => { setIsEditBookingOpen(false); setEbStudentSearchQuery(''); }} title="Edit Lesson Booking">
          <form onSubmit={handleEditBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="form-group">
              <label htmlFor="ebstudentSearch">Search Student</label>
              <input 
                type="text" 
                id="ebstudentSearch"
                className="form-control" 
                placeholder="Type name or phone to filter..."
                value={ebStudentSearchQuery}
                onChange={(e) => setEbStudentSearchQuery(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <label htmlFor="ebstudentSelect">Select Student *</label>
              <select 
                id="ebstudentSelect"
                className="form-control"
                required
                value={ebStudentId}
                onChange={(e) => handleEditStudentChange(e.target.value)}
              >
                <option value="">-- Choose a student profile --</option>
                {students
                  .filter(s => s.status !== 'terminated' || s.id === ebStudentId)
                  .filter(s => {
                    const q = ebStudentSearchQuery.toLowerCase();
                    return s.name.toLowerCase().includes(q) || s.phone.includes(q);
                  })
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                  ))
                }
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ebtypeSelect">Lesson Type</label>
              <select 
                id="ebtypeSelect" 
                className="form-control" 
                value={ebType} 
                onChange={(e) => handleEditTypeChange(e.target.value)}
              >
                <option value="normal">Normal Lesson</option>
                <option value="package">Package Lesson</option>
                <option value="test">Test preparation + Car hire</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ebdateInput">Lesson Date *</label>
              <input 
                id="ebdateInput"
                type="date" 
                className="form-control" 
                required 
                value={ebDate} 
                onChange={(e) => setEbDate(e.target.value)} 
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="ebfromInput">From Time *</label>
                <input 
                  id="ebfromInput"
                  type="time" 
                  step="900"
                  className="form-control" 
                  required 
                  value={ebTimeFrom} 
                  onChange={(e) => setEbTimeFrom(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="ebtoInput">To Time *</label>
                <input 
                  id="ebtoInput"
                  type="time" 
                  step="900"
                  className="form-control" 
                  required 
                  value={ebTimeTo} 
                  onChange={(e) => setEbTimeTo(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="ebrateInput">Rate Charged ($/hr or flat)</label>
                <input 
                  id="ebrateInput"
                  type="number" 
                  step="1"
                  min="0"
                  className="form-control" 
                  required 
                  value={ebRateCharged} 
                  onChange={(e) => setEbRateCharged(Number(e.target.value))} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="ebdiscInput">Discount Applied ($)</label>
                <input 
                  id="ebdiscInput"
                  type="number" 
                  step="1"
                  min="0"
                  className="form-control" 
                  required 
                  value={ebDiscountApplied} 
                  onChange={(e) => setEbDiscountApplied(Number(e.target.value))} 
                />
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: '8px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Calculated Duration:</span>
                <strong>{ebDuration} hrs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Price:</span>
                <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>${ebTotalPrice.toFixed(2)}</strong>
              </div>
            </div>

            {/* Booking Conflict Warning Panel */}
            {activeEditConflict && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid var(--danger)', 
                color: 'var(--danger)', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)', 
                fontSize: '0.85rem',
                marginTop: '0.5rem'
              }}>
                <strong>⚠️ Booking Conflict Alert:</strong> there is already an active booking for <strong>{activeEditConflict.studentName}</strong> on this day from <strong>{formatTime12Hour(activeEditConflict.timeFrom)}</strong> to <strong>{formatTime12Hour(activeEditConflict.timeTo)}</strong>. You cannot book this slot.
              </div>
            )}

            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditBookingOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!!activeEditConflict || ebDuration <= 0}>Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Generic Confirmation Modal */}
      {confirmState.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '1.75rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {confirmState.title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {confirmState.message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              {confirmState.showCancel !== false && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  {confirmState.cancelText || 'Cancel'}
                </button>
              )}
              <button 
                className={`btn ${confirmState.isDanger ? 'btn-danger' : 'btn-primary'}`} 
                onClick={() => {
                  if (confirmState.onConfirm) {
                    confirmState.onConfirm();
                  }
                  setConfirmState(prev => ({ ...prev, show: false }));
                }}
                style={{ padding: '0.5rem 1rem' }}
              >
                {confirmState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
