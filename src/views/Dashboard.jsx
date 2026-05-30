import { useState, useEffect } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { DollarSign, Clock, Users, Calendar as CalendarIcon, ArrowLeft, ArrowRight, TrendingUp, Plus } from 'lucide-react';
import Modal from '../components/Modal';
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

export default function Dashboard({ setActiveTab, setSelectedStudentId }) {
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [debtorSortConfig, setDebtorSortConfig] = useState({ key: 'balance', direction: 'descending' });

  // Booking creation form states
  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [selectedStudentIdState, setSelectedStudentIdState] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [bookingType, setBookingType] = useState('package');
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  const [calculatedDuration, setCalculatedDuration] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [selectedStudentDiscount, setSelectedStudentDiscount] = useState({ classDisc: 0, testDisc: 0 });
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: '', cancelText: '', isDanger: false });
  
  // Fetch database entries
  const rawStudents = useLiveQuery(() => db.students.toArray()) || [];
  const rawBookings = useLiveQuery(() => db.bookings.toArray()) || [];
  const rawPayments = useLiveQuery(() => db.payments.toArray()) || [];
  const pricingSettings = useLiveQuery(() => db.settings.get('pricing'));
  const rates = pricingSettings || { normalRate: 63, packageRate: 63, testRate: 210 };

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(^|\s|-)\S/g, l => l.toUpperCase());
  };

  const students = rawStudents.map(s => ({ ...s, name: toTitleCase(s.name) }));
  const bookings = rawBookings.map(b => ({ ...b, studentName: toTitleCase(b.studentName) }));
  const payments = rawPayments.map(p => ({ ...p, studentName: toTitleCase(p.studentName) }));

  // Helper date calculations
  const getDaysOfWeek = (refDate) => {
    const start = new Date(refDate);
    const day = start.getDay();
    // Adjust Sunday (0) to be index 6, Monday (1) to be index 0
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(monday);
      next.setDate(monday.getDate() + i);
      days.push(next);
    }
    return days;
  };

  const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const daysOfWeek = getDaysOfWeek(currentWeekDate);
  const weekStartStr = formatDisplayDate(daysOfWeek[0]);
  const weekEndStr = formatDisplayDate(daysOfWeek[6]);

  const today = new Date();
  const todayStr = formatDateKey(today);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateKey(tomorrow);

  const day3 = new Date();
  day3.setDate(today.getDate() + 2);
  const day4 = new Date();
  day4.setDate(today.getDate() + 3);

  const timelineDays = [
    { label: 'Today', date: today, dateStr: todayStr },
    { label: 'Tomorrow', date: tomorrow, dateStr: tomorrowStr },
    { label: day3.toLocaleDateString('en-US', { weekday: 'long' }), date: day3, dateStr: formatDateKey(day3) },
    { label: day4.toLocaleDateString('en-US', { weekday: 'long' }), date: day4, dateStr: formatDateKey(day4) }
  ];

  // Navigate weeks
  const prevWeek = () => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekDate(newDate);
  };
  const nextWeek = () => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekDate(newDate);
  };
  const goToToday = () => {
    setCurrentWeekDate(new Date());
  };

  const handleCancelBookingClick = (bookingId, studentName, date) => {
    setConfirmState({
      show: true,
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel the booking for ${studentName} on ${date}?`,
      onConfirm: async () => {
        try {
          await db.bookings.update(bookingId, { status: 'cancelled' });
          setSelectedBooking(null);
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
          setSelectedBooking(null);
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

  // Sync student discount on selection
  useEffect(() => {
    if (!selectedStudentIdState) {
      setSelectedStudentDiscount({ classDisc: 0, testDisc: 0 });
      return;
    }
    const student = students.find(s => s.id === selectedStudentIdState);
    if (student) {
      setSelectedStudentDiscount({
        classDisc: student.classRateDiscount || 0,
        testDisc: student.testRateDiscount || 0
      });
    }
  }, [selectedStudentIdState, students]);

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

    let finalPrice;
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
    if (!selectedStudentIdState || !date || !timeFrom || !timeTo) {
      setConfirmState({
        show: true,
        title: 'Missing Information',
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

    const student = students.find(s => s.id === selectedStudentIdState);
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
    let finalPrice;
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
    setSelectedStudentIdState('');
    setStudentSearchQuery('');
    setBookingType('package');
    setDate('');
    setTimeFrom('');
    setTimeTo('');
    setIsAddBookingOpen(false);
  };

  const handleHourSlotClick = (dateStr, hourStr) => {
    const [h, m] = hourStr.split(':').map(Number);
    const nextHour = String(h + 1).padStart(2, '0');
    const endTimeStr = `${nextHour}:${String(m).padStart(2, '0')}`;

    setDate(dateStr);
    setTimeFrom(hourStr);
    setTimeTo(endTimeStr);
    setSelectedStudentIdState('');
    setBookingType('package');
    setIsAddBookingOpen(true);
  };

  const handleBookFromAvailability = (studentId) => {
    setSelectedStudentIdState(studentId);
    setDate(todayStr);
    setTimeFrom('');
    setTimeTo('');
    setBookingType('package');
    setIsAddBookingOpen(true);
  };

  const parseAvailString = (availStr) => {
    const defaultAvail = {
      Monday: { morning: false, evening: false },
      Tuesday: { morning: false, evening: false },
      Wednesday: { morning: false, evening: false },
      Thursday: { morning: false, evening: false },
      Friday: { morning: false, evening: false },
      Saturday: { morning: false, evening: false },
      Sunday: { morning: false, evening: false }
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
        defaultAvail[day].evening = slotsStr.includes('Evening');
      }
    });
    return defaultAvail;
  };

  const getTimelineCoords = (timeFrom, timeTo) => {
    if (!timeFrom || !timeTo) return { top: '0%', height: '0%' };
    const [hStart, mStart] = timeFrom.split(':').map(Number);
    const [hEnd, mEnd] = timeTo.split(':').map(Number);
    const startMin = hStart * 60 + mStart;
    const endMin = hEnd * 60 + mEnd;
    const dayStart = 6 * 60; // 06:00 AM
    const dayEnd = 20 * 60; // 08:00 PM
    const totalMin = dayEnd - dayStart; // 840 min

    const offset = Math.max(0, startMin - dayStart);
    const duration = Math.min(dayEnd, endMin) - Math.max(dayStart, startMin);

    const topPercent = (offset / totalMin) * 100;
    const heightPercent = (duration / totalMin) * 100;

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`
    };
  };

  // Compute student balances
  const studentBalances = students.map(student => {
    const studentBookings = bookings.filter(b => b.studentId === student.id && b.status !== 'cancelled');
    const studentPayments = payments.filter(p => p.studentId === student.id);
    
    const billed = studentBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const paid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    
    return {
      ...student,
      billed,
      paid,
      balance: billed - paid
    };
  });

  // KPI Calculations
  const totalBilled = bookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.totalPrice, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = totalBilled - totalPaid;
  
  const totalHours = bookings
    .filter(b => b.status !== 'cancelled' && (b.type === 'normal' || b.type === 'package'))
    .reduce((sum, b) => sum + (b.duration || 0), 0);

  const activeStudentsCount = students.filter(s => !s.status || s.status === 'active').length;
  const inactiveStudentsCount = students.filter(s => s.status === 'inactive').length;
  const terminatedStudentsCount = students.filter(s => s.status === 'terminated').length;
  const passedStudentsCount = students.filter(s => s.status === 'passed').length;

  const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };
  const todayDayName = getDayName(today);
  const tomorrowDayName = getDayName(tomorrow);

  const availableStudents = students
    .filter(s => !s.status || s.status === 'active')
    .map(s => {
      const availObj = parseAvailString(s.availability || '');
      const availToday = availObj[todayDayName] || { morning: false, evening: false };
      const availTomorrow = availObj[tomorrowDayName] || { morning: false, evening: false };
      return {
        ...s,
        availToday,
        availTomorrow,
        isAvailable: availToday.morning || availToday.evening || availTomorrow.morning || availTomorrow.evening
      };
    })
    .filter(s => s.isAvailable);

  // Payments breakdown
  const bankTotal = payments.filter(p => p.type === 'bank').reduce((sum, p) => sum + p.amount, 0);
  const cashTotal = payments.filter(p => p.type === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const grandTotalPayments = bankTotal + cashTotal;
  
  const bankPercentage = grandTotalPayments > 0 ? Math.round((bankTotal / grandTotalPayments) * 100) : 50;
  const cashPercentage = grandTotalPayments > 0 ? Math.round((cashTotal / grandTotalPayments) * 100) : 50;

  const requestDebtorSort = (key) => {
    let direction = 'ascending';
    if (debtorSortConfig.key === key && debtorSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setDebtorSortConfig({ key, direction });
  };

  const getDebtorSortIcon = (key) => {
    if (debtorSortConfig.key !== key) return ' ↕';
    return debtorSortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  // Outstanding alert list
  const filteredDebtors = studentBalances.filter(s => s.balance > 0);
  
  const sortedDebtors = [...filteredDebtors];
  if (debtorSortConfig.key !== null) {
    sortedDebtors.sort((a, b) => {
      let aVal = a[debtorSortConfig.key];
      let bVal = b[debtorSortConfig.key];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return debtorSortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aVal > bVal) {
        return debtorSortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }

  const navigateToStudentProfile = (studentId) => {
    setSelectedStudentId(studentId);
    setActiveTab('students');
  };

  const activeConflict = date && timeFrom && timeTo ? bookings.find(b => 
    b.status !== 'cancelled' &&
    b.date === date && 
    ((timeFrom < b.timeTo && b.timeFrom < timeTo))
  ) : null;

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome to your school metrics overview</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setActiveTab('bookings')}>
            <CalendarIcon size={16} /> Manage Bookings
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('students')}>
            <Users size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary)' }}>
            <DollarSign size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Billed</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.1rem' }}>${totalBilled.toFixed(2)}</h3>
          </div>
        </div>

        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <DollarSign size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.1rem' }}>${totalPaid.toFixed(2)}</h3>
          </div>
        </div>

        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            padding: '0.75rem', 
            borderRadius: '12px', 
            background: outstandingBalance > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
            color: outstandingBalance > 0 ? 'var(--danger)' : 'var(--success)' 
          }}>
            <DollarSign size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding Balance</span>
            <h3 style={{ 
              fontSize: '1.75rem', 
              marginTop: '0.1rem',
              color: outstandingBalance > 0 ? 'var(--danger)' : 'inherit'
            }}>${outstandingBalance.toFixed(2)}</h3>
          </div>
        </div>

        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent)' }}>
            <Clock size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hours Taught</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.1rem' }}>{totalHours.toFixed(1)} hrs</h3>
          </div>
        </div>

        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <Users size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Students</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.1rem' }}>{activeStudentsCount}</h3>
          </div>
        </div>

        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)' }}>
            <Users size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Inactive Students</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.1rem' }}>{inactiveStudentsCount}</h3>
          </div>
        </div>

        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <Users size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Terminated Students</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.1rem' }}>{terminatedStudentsCount}</h3>
          </div>
        </div>

        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <Users size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Passed Students</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.1rem' }}>{passedStudentsCount}</h3>
          </div>
        </div>
      </div>

      <div className="split-layout" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Timeline Schedule Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <Clock size={20} /> Today & Tomorrow Detailed Schedule
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Interactive Google Calendar-like timeline. Click empty slots to book.
                </span>
              </div>
            </div>

            <div className="timeline-container">
              {/* Axis Column */}
              <div className="timeline-axis">
                <div className="timeline-column-header" style={{ borderRight: 'none', background: 'transparent', visibility: 'hidden' }}>
                  Time
                </div>
                <div className="timeline-axis-body">
                  {hours.map((h) => (
                    <div key={h} className="timeline-axis-label">
                      {formatTime12Hour(h)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Columns Wrapper */}
              <div className="timeline-columns-wrapper">
                {timelineDays.map((td) => {
                  const dayBookings = bookings.filter(b => b.date === td.dateStr && b.status !== 'cancelled');
                  const sortedDayBookings = [...dayBookings].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));

                  return (
                    <div key={td.dateStr} className="timeline-column">
                      <div className="timeline-column-header">
                        {td.label} ({td.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})
                      </div>
                      <div className="timeline-column-body">
                        {hours.map((h) => (
                          <div 
                            key={h} 
                            className="timeline-hour-slot"
                            onClick={() => handleHourSlotClick(td.dateStr, h)}
                          >
                            <span className="plus-indicator">+ Book</span>
                          </div>
                        ))}
                        {sortedDayBookings.map((b) => {
                          const coords = getTimelineCoords(b.timeFrom, b.timeTo);
                          return (
                            <div
                              key={b.id}
                              className="timeline-booking-card"
                              style={{
                                top: coords.top,
                                height: coords.height,
                                background: b.type === 'normal' ? 'rgba(124, 58, 237, 0.12)' : b.type === 'package' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                color: b.type === 'normal' ? 'var(--primary)' : b.type === 'package' ? 'var(--accent)' : 'var(--warning)',
                                borderLeft: b.type === 'normal' ? '4px solid var(--primary)' : b.type === 'package' ? '4px solid var(--accent)' : '4px solid var(--warning)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(b);
                              }}
                            >
                              <div>
                                <div className="timeline-booking-card-title">{b.studentName}</div>
                                <div className="timeline-booking-card-time">
                                  {formatTime12Hour(b.timeFrom)} - {formatTime12Hour(b.timeTo)}
                                </div>
                              </div>
                              <div className="timeline-booking-card-type">{b.type}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weekly Calendar Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarIcon size={20} color="var(--primary)" /> Driving Lesson Calendar
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Week: {weekStartStr} – {weekEndStr}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.6rem' }} onClick={prevWeek} title="Previous Week">
                  <ArrowLeft size={16} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={goToToday}>Today</button>
                <button className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.6rem' }} onClick={nextWeek} title="Next Week">
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {daysOfWeek.map((day, idx) => {
                const dateStr = formatDateKey(day);
                const isToday = formatDateKey(new Date()) === dateStr;
                const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');
                
                // Sort day bookings by start time
                dayBookings.sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));

                return (
                  <div key={idx} className={`calendar-day-cell ${isToday ? 'today' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="calendar-day-num">{day.getDate()}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flexGrow: 1, marginTop: '0.25rem' }}>
                      {dayBookings.length > 0 ? (
                        dayBookings.map((b) => (
                          <div
                            key={b.id}
                            className={`calendar-event-card calendar-event-${b.type}`}
                            onClick={() => setSelectedBooking(b)}
                            title={`${b.studentName} (${formatTime12Hour(b.timeFrom)} - ${formatTime12Hour(b.timeTo)})`}
                          >
                            <strong>{formatTime12Hour(b.timeFrom)}</strong> {b.studentName}
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
                          No lessons
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Payment Chart and Available Students Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Payment Split Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <h3 style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--success)" /> Payment Method Split
            </h3>
            
            {grandTotalPayments > 0 ? (
              <>
                <svg width="180" height="180" viewBox="0 0 36 36" style={{ margin: '1rem 0' }}>
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3" />
                  
                  {/* Bank Arc */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="3.2" 
                    strokeDasharray={`${bankPercentage} ${100 - bankPercentage}`}
                    strokeDashoffset="25" 
                  />
                  
                  {/* Cash Arc */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="var(--accent)" 
                    strokeWidth="3.2" 
                    strokeDasharray={`${cashPercentage} ${100 - cashPercentage}`}
                    strokeDashoffset={25 - bankPercentage} 
                  />
                  
                  {/* Center Text */}
                  <g className="chart-text">
                    <text x="18" y="17.5" textAnchor="middle" fontSize="3" fontWeight="bold" fill="var(--text-main)">
                      Total Recd
                    </text>
                    <text x="18" y="21.5" textAnchor="middle" fontSize="4" fontWeight="800" fill="var(--primary)">
                      ${grandTotalPayments.toFixed(0)}
                    </text>
                  </g>
                </svg>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                      Bank Payments
                    </span>
                    <strong>${bankTotal.toFixed(2)} ({bankPercentage}%)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
                      Cash in Hand
                    </span>
                    <strong>${cashTotal.toFixed(2)} ({cashPercentage}%)</strong>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No payment entries recorded yet.
              </div>
            )}
          </div>

          {/* Available Students Today & Tomorrow Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Users size={20} /> Available Students Directory
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Active students available today ({todayDayName}) or tomorrow ({tomorrowDayName})
            </span>
            {availableStudents.length > 0 ? (
              <div className="table-container">
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Today</th>
                      <th>Tomorrow</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableStudents.map(student => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 600 }}>
                          <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); navigateToStudentProfile(student.id); }}
                            style={{ color: 'var(--primary)', textDecoration: 'none' }}
                          >
                            {student.name}
                          </a>
                        </td>
                        <td>
                          <a href={`tel:${student.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {student.phone}
                          </a>
                        </td>
                        <td>
                          {student.availToday.morning && <span className="badge badge-primary" style={{ marginRight: '2px' }}>Morning</span>}
                          {student.availToday.evening && <span className="badge badge-success">Evening</span>}
                          {!student.availToday.morning && !student.availToday.evening && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>}
                        </td>
                        <td>
                          {student.availTomorrow.morning && <span className="badge badge-primary" style={{ marginRight: '2px' }}>Morning</span>}
                          {student.availTomorrow.evening && <span className="badge badge-success">Evening</span>}
                          {!student.availTomorrow.morning && !student.availTomorrow.evening && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>}
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary btn-icon-only btn-sm" 
                            style={{ color: 'var(--primary)' }}
                            onClick={() => handleBookFromAvailability(student.id)}
                            title="Book Lesson"
                          >
                            <Plus size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No active students marked available today or tomorrow.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debtors List and upcoming agenda */}
      <div className="split-layout">
        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
            Outstanding Balances Alert
          </h3>
          {sortedDebtors.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => requestDebtorSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Student Name {getDebtorSortIcon('name')}
                    </th>
                    <th onClick={() => requestDebtorSort('phone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Phone {getDebtorSortIcon('phone')}
                    </th>
                    <th onClick={() => requestDebtorSort('balance')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Outstanding {getDebtorSortIcon('balance')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDebtors.slice(0, 5).map(student => (
                    <tr key={student.id}>
                      <td style={{ fontWeight: 600 }}>{student.name}</td>
                      <td>{student.phone}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>${student.balance.toFixed(2)}</td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => navigateToStudentProfile(student.id)}
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textTransform: 'capitalize', color: 'var(--success)', fontSize: '0.95rem', fontWeight: 500, padding: '1rem 0' }}>
              🎉 Excellent! No students have outstanding balances.
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Pricing Info Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="ledger-row" style={{ fontSize: '0.95rem' }}>
              <span>Normal Lesson</span>
              <strong>${Number(rates.normalRate || 63).toFixed(2)}/hr</strong>
            </div>
            <div className="ledger-row" style={{ fontSize: '0.95rem' }}>
              <span>Package (5+ Lessons)</span>
              <strong>${Number(rates.packageRate || 63).toFixed(2)}/hr</strong>
            </div>
            <div className="ledger-row" style={{ fontSize: '0.95rem' }}>
              <span>Test Lesson</span>
              <strong>${Number(rates.testRate || 210).toFixed(2)} flat</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
              Rates can be adjusted in the settings. Modifying rates will only apply to new bookings.
            </p>
          </div>
        </div>
      </div>

      {/* Booking Quick Details Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title="Booking Details"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="ledger-row">
              <span>Student Name:</span>
              <strong>{selectedBooking.studentName}</strong>
            </div>
            <div className="ledger-row">
              <span>Date:</span>
              <strong>{selectedBooking.date}</strong>
            </div>
            <div className="ledger-row">
              <span>Time Slot:</span>
              <strong>{formatTime12Hour(selectedBooking.timeFrom)} – {formatTime12Hour(selectedBooking.timeTo)} ({selectedBooking.duration} hrs)</strong>
            </div>
            <div className="ledger-row">
              <span>Lesson Type:</span>
              <span className={`badge badge-${
                selectedBooking.type === 'normal' ? 'primary' : selectedBooking.type === 'package' ? 'success' : 'warning'
              }`}>
                {selectedBooking.type} lesson
              </span>
            </div>
            <div className="ledger-row">
              <span>Rate Charged:</span>
              <strong>${selectedBooking.rateCharged.toFixed(2)}{selectedBooking.type !== 'test' ? '/hr' : ''}</strong>
            </div>
            <div className="ledger-row">
              <span>Discount Applied:</span>
              <strong style={{ color: 'var(--success)' }}>-${selectedBooking.discountApplied.toFixed(2)}</strong>
            </div>
            <div className="ledger-row" style={{ borderTop: '2px solid var(--border)', paddingTop: '0.75rem' }}>
              <span>Total Price:</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>${selectedBooking.totalPrice.toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary" 
                style={{ flexGrow: 1 }}
                onClick={() => {
                  navigateToStudentProfile(selectedBooking.studentId);
                  setSelectedBooking(null);
                }}
              >
                Go to Student Profile
              </button>
              {selectedBooking.status !== 'cancelled' ? (
                <button 
                  className="btn btn-secondary" 
                  style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
                  onClick={() => handleCancelBookingClick(selectedBooking.id, selectedBooking.studentName, selectedBooking.date)}
                >
                  Cancel Booking
                </button>
              ) : (
                <button 
                  className="btn btn-secondary" 
                  style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
                  onClick={() => handleReinstateBooking(selectedBooking.id, selectedBooking.studentName, selectedBooking.date, selectedBooking.timeFrom, selectedBooking.timeTo)}
                >
                  Reinstate Booking
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedBooking(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Lesson Booking Modal */}
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
                value={selectedStudentIdState}
                onChange={(e) => setSelectedStudentIdState(e.target.value)}
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
            {selectedStudentIdState && calculatedDuration > 0 && (
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

      {/* Generic Confirmation Modal */}
      <ConfirmationModal confirmState={confirmState} setConfirmState={setConfirmState} />
    </div>
  );
}
