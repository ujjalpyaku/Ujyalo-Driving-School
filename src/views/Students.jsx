import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { Search, Plus, User, Phone, Check, Eye, Trash2, Calendar, CreditCard, ArrowLeft, Image as ImageIcon, Pencil, Printer, Download, Mars, Venus, Ban, RotateCcw } from 'lucide-react';
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

export default function Students({ selectedStudentId, setSelectedStudentId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedDays, setSelectedDays] = useState([]);
  const [ledgerTab, setLedgerTab] = useState('statement');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [cancelConfirm, setCancelConfirm] = useState({ show: false, id: null, name: '', date: '' });
  
  // Quick Action Sub-Modals
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);

  // Form states for Add Student
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGender, setNewGender] = useState('Male');
  const [newAvailability, setNewAvailability] = useState('');
  const [newClassDiscount, setNewClassDiscount] = useState(0);
  const [newTestDiscount, setNewTestDiscount] = useState(0);
  const [newLicencePhoto, setNewLicencePhoto] = useState('');
  const [newTestDate, setNewTestDate] = useState('');
  const [newTestTime, setNewTestTime] = useState('');
  const [newStatus, setNewStatus] = useState('active');
  const [newNotes, setNewNotes] = useState('');
  const [compressing, setCompressing] = useState(false);
  
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // Form states for Quick Booking
  const [bDate, setBDate] = useState('');
  const [bTimeFrom, setBTimeFrom] = useState('');
  const [bTimeTo, setBTimeTo] = useState('');
  const [bType, setBType] = useState('package');

  // Form states for Quick Payment
  const [pDate, setPDate] = useState(new Date().toISOString().split('T')[0]);
  const [pAmount, setPAmount] = useState('');
  const [pType, setPType] = useState('bank');

  // Form states for Edit Student
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editAvailability, setEditAvailability] = useState('');
  const [editClassDiscount, setEditClassDiscount] = useState(0);
  const [editTestDiscount, setEditTestDiscount] = useState(0);
  const [editLicencePhoto, setEditLicencePhoto] = useState('');
  const [editTestDate, setEditTestDate] = useState('');
  const [editTestTime, setEditTestTime] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editNotes, setEditNotes] = useState('');

  const [newAvail, setNewAvail] = useState({
    Monday: { morning: false, afternoon: false },
    Tuesday: { morning: false, afternoon: false },
    Wednesday: { morning: false, afternoon: false },
    Thursday: { morning: false, afternoon: false },
    Friday: { morning: false, afternoon: false },
    Saturday: { morning: false, afternoon: false },
    Sunday: { morning: false, afternoon: false }
  });

  const [editAvail, setEditAvail] = useState({
    Monday: { morning: false, afternoon: false },
    Tuesday: { morning: false, afternoon: false },
    Wednesday: { morning: false, afternoon: false },
    Thursday: { morning: false, afternoon: false },
    Friday: { morning: false, afternoon: false },
    Saturday: { morning: false, afternoon: false },
    Sunday: { morning: false, afternoon: false }
  });

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

  // Form states for Edit Booking
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [ebDate, setEbDate] = useState('');
  const [ebTimeFrom, setEbTimeFrom] = useState('');
  const [ebTimeTo, setEbTimeTo] = useState('');
  const [ebType, setEbType] = useState('package');
  const [ebRateCharged, setEbRateCharged] = useState(0);
  const [ebDiscountApplied, setEbDiscountApplied] = useState(0);
  const [ebDuration, setEbDuration] = useState(0);
  const [ebTotalPrice, setEbTotalPrice] = useState(0);

  // Form states for Edit Payment
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [epDate, setEpDate] = useState('');
  const [epAmount, setEpAmount] = useState('');
  const [epType, setEpType] = useState('bank');

  // Sorting configurations
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [ledgerSortConfig, setLedgerSortConfig] = useState({ key: 'date', direction: 'ascending' });

  // Fetch db items
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const bookings = useLiveQuery(() => db.bookings.toArray()) || [];
  const payments = useLiveQuery(() => db.payments.toArray()) || [];
  const pricingSettings = useLiveQuery(() => db.settings.get('pricing'));
  const schoolDetails = useLiveQuery(() => db.settings.get('schoolDetails'));

  const rates = pricingSettings || { normalRate: 63, packageRate: 63, testRate: 210 };
  const schoolContact = schoolDetails || { phone: '+61 400 000 000', email: 'info@ujyalodriving.com.au' };

  // Image compressor tool
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressedBase64 = await compressImage(file);
      setNewLicencePhoto(compressedBase64);
    } catch (err) {
      alert('Error reading/compressing photo: ' + err.message);
    } finally {
      setCompressing(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800; // max width/height
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // compress as medium quality JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // Submit Add Student
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Please fill out student Name and Phone Number.');
      return;
    }

    const cleanedPhone = newPhone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    const studentId = crypto.randomUUID();
    await db.students.add({
      id: studentId,
      name: newName.trim(),
      phone: cleanedPhone,
      gender: newGender,
      availability: buildAvailString(newAvail),
      classRateDiscount: Number(newClassDiscount) || 0,
      testRateDiscount: Number(newTestDiscount) || 0,
      licencePhoto: newLicencePhoto,
      testDate: newTestDate || '',
      testTime: newTestTime || '',
      status: newStatus,
      notes: newNotes.trim(),
      createdAt: new Date().toISOString()
    });

    // Clear form
    setNewName('');
    setNewPhone('');
    setNewGender('Male');
    setNewNotes('');
    setNewAvailability('');
    setNewAvail({
      Monday: { morning: false, afternoon: false },
      Tuesday: { morning: false, afternoon: false },
      Wednesday: { morning: false, afternoon: false },
      Thursday: { morning: false, afternoon: false },
      Friday: { morning: false, afternoon: false },
      Saturday: { morning: false, afternoon: false },
      Sunday: { morning: false, afternoon: false }
    });
    setNewClassDiscount(0);
    setNewTestDiscount(0);
    setNewLicencePhoto('');
    setNewTestDate('');
    setNewTestTime('');
    setNewStatus('active');
    setIsAddStudentOpen(false);
  };

  // Student list search and status filter
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm);
    if (!matchesSearch) return false;
    
    if (statusFilter !== 'all') {
      if ((s.status || 'active') !== statusFilter) return false;
    }

    if (selectedDays.length > 0) {
      const studentAvail = parseAvailString(s.availability || '');
      const isAvailable = selectedDays.every(day => {
        const dayAvail = studentAvail[day];
        if (dayAvail && (dayAvail.morning || dayAvail.afternoon)) {
          return true;
        }
        const text = (s.availability || '').toLowerCase();
        return text.includes(day.toLowerCase());
      });
      if (!isAvailable) return false;
    }
    
    return true;
  });

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

  const getPriorityInfo = (testDate) => {
    if (!testDate) return { text: 'None', class: '', val: 3 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = testDate.split('-').map(Number);
    const test = new Date(year, month - 1, day);
    test.setHours(0, 0, 0, 0);
    
    const diffTime = test.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 25) {
      return { text: 'Green', class: 'badge badge-success', val: 2 };
    } else if (diffDays >= 15 && diffDays <= 25) {
      return { text: 'Yellow', class: 'badge badge-warning', val: 1 };
    } else {
      // 14 days or less (including today and past)
      return { text: 'Red', class: 'badge badge-danger', val: 0 };
    }
  };

  const getDaysToTestStr = (testDate) => {
    if (!testDate) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = testDate.split('-').map(Number);
    const test = new Date(year, month - 1, day);
    test.setHours(0, 0, 0, 0);
    
    const diffTime = test.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'In 1 day';
    } else if (diffDays > 1) {
      return `In ${diffDays} days`;
    } else if (diffDays === -1) {
      return '1 day ago';
    } else {
      return `${Math.abs(diffDays)} days ago`;
    }
  };

  const sortedStudents = [...filteredStudents].map(student => {
    const studBookings = bookings.filter(b => b.studentId === student.id && b.status !== 'cancelled');
    const studPayments = payments.filter(p => p.studentId === student.id);
    const bill = studBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const pay = studPayments.reduce((sum, p) => sum + p.amount, 0);
    const pInfo = getPriorityInfo(student.testDate);
    
    const totalNormalLessons = studBookings.filter(b => b.type === 'normal' || b.type === 'package').length;
    const testLessons = studBookings.filter(b => b.type === 'test').length;
    const totalHours = studBookings.reduce((sum, b) => sum + (b.duration || 0), 0);

    return {
      ...student,
      balance: bill - pay,
      priority: pInfo.text,
      priorityClass: pInfo.class,
      priorityVal: pInfo.val,
      totalNormalLessons,
      testLessons,
      totalHours,
      totalPaid: pay
    };
  });

  if (sortConfig.key !== null) {
    sortedStudents.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === 'priority') {
        aVal = a.priorityVal;
        bVal = b.priorityVal;
      } else if (sortConfig.key === 'testDate') {
        aVal = a.testDate || '9999-99-99';
        bVal = b.testDate || '9999-99-99';
      } else if (sortConfig.key === 'status') {
        aVal = a.status || 'active';
        bVal = b.status || 'active';
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

  // Active student detail retrieval
  const activeStudent = students.find(s => s.id === selectedStudentId);

  // Calculate student bookings & payments
  const activeBookings = bookings.filter(b => b.studentId === selectedStudentId);
  const activePayments = payments.filter(p => p.studentId === selectedStudentId);

  const totalBilled = activeBookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.totalPrice, 0);
  const totalPaid = activePayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalBilled - totalPaid;

  // Construct Chronological Ledger
  const ledgerItems = [
    ...activeBookings.map(b => ({
      id: b.id,
      date: b.date,
      type: 'charge',
      description: `${b.type.charAt(0).toUpperCase() + b.type.slice(1)} Booking (${b.duration ? `${b.duration} hrs @ $${b.rateCharged.toFixed(2)}/hr` : `$${b.rateCharged.toFixed(2)} flat`})${b.status === 'cancelled' ? ' (CANCELLED)' : ''}`,
      amount: b.status === 'cancelled' ? 0 : b.totalPrice,
      timestamp: new Date(`${b.date}T${b.timeFrom || '00:00'}:00`).getTime(),
      raw: b
    })),
    ...activePayments.map(p => ({
      id: p.id,
      date: p.date,
      type: 'credit',
      description: `${p.type.charAt(0).toUpperCase() + p.type.slice(1)} Payment Received`,
      amount: p.amount,
      timestamp: new Date(`${p.date}T00:00:00`).getTime(),
      raw: p
    }))
  ];

  // Sort ledger by date/timestamp
  ledgerItems.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));

  // Compute Running Balance
  let running = 0;
  const ledgerWithRunning = ledgerItems.map(item => {
    if (item.type === 'charge') {
      running += item.amount;
    } else {
      running -= item.amount;
    }
    return {
      ...item,
      runningBalance: running
    };
  });

  const requestLedgerSort = (key) => {
    let direction = 'ascending';
    if (ledgerSortConfig.key === key && ledgerSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setLedgerSortConfig({ key, direction });
  };

  const getLedgerSortIcon = (key) => {
    if (ledgerSortConfig.key !== key) return ' ↕';
    return ledgerSortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  const sortedLedger = [...ledgerWithRunning];
  if (ledgerSortConfig.key !== null) {
    sortedLedger.sort((a, b) => {
      let aVal = a[ledgerSortConfig.key];
      let bVal = b[ledgerSortConfig.key];

      if (ledgerSortConfig.key === 'debit') {
        aVal = a.type === 'charge' ? a.amount : 0;
        bVal = b.type === 'charge' ? b.amount : 0;
      } else if (ledgerSortConfig.key === 'credit') {
        aVal = a.type === 'credit' ? a.amount : 0;
        bVal = b.type === 'credit' ? b.amount : 0;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return ledgerSortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aVal > bVal) {
        return ledgerSortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }

  // Calculate hours booked
  const hoursBooked = activeBookings
    .filter(b => b.status !== 'cancelled' && (b.type === 'normal' || b.type === 'package'))
    .reduce((sum, b) => sum + (b.duration || 0), 0);

  const totalNormalLessons = activeBookings.filter(b => b.status !== 'cancelled' && (b.type === 'normal' || b.type === 'package')).length;
  const totalNormalHours = hoursBooked;
  const testLessonsCount = activeBookings.filter(b => b.status !== 'cancelled' && b.type === 'test').length;
  const totalTestHours = activeBookings.filter(b => b.status !== 'cancelled' && b.type === 'test').reduce((sum, b) => sum + (b.duration || 0), 0);

  // Quick Action Booking Submit
  const handleQuickBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bDate || !bTimeFrom || !bTimeTo) {
      alert('Please fill out date and times.');
      return;
    }

    // Calc duration
    const [hStart, mStart] = bTimeFrom.split(':').map(Number);
    const [hEnd, mEnd] = bTimeTo.split(':').map(Number);
    const durationMin = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);
    if (durationMin <= 0) {
      alert('End time must be after start time.');
      return;
    }
    const duration = parseFloat((durationMin / 60).toFixed(2));

    // Check for conflicts
    const conflictingBooking = bookings.find(b => 
      b.status !== 'cancelled' &&
      b.date === bDate && 
      ((bTimeFrom < b.timeTo && b.timeFrom < bTimeTo))
    );
    if (conflictingBooking) {
      alert(`Booking Conflict!\nThere is already a booking for ${conflictingBooking.studentName} on this day from ${formatTime12Hour(conflictingBooking.timeFrom)} to ${formatTime12Hour(conflictingBooking.timeTo)}.\n\nPlease choose a different time slot.`);
      return;
    }

    // Fetch active settings directly from DB to avoid any closure staleness
    const activePricing = await db.settings.get('pricing') || { normalRate: 63, packageRate: 63, testRate: 210 };

    // pricing setup
    let rateCharged = 0;
    let discountApplied = 0;

    if (bType === 'normal') {
      rateCharged = activePricing.normalRate;
      discountApplied = activeStudent.classRateDiscount || 0;
    } else if (bType === 'package') {
      rateCharged = activePricing.packageRate;
      discountApplied = activeStudent.classRateDiscount || 0;
    } else if (bType === 'test') {
      rateCharged = activePricing.testRate;
      discountApplied = activeStudent.testRateDiscount || 0;
    }

    // total price calc
    let totalPrice = 0;
    if (bType === 'test') {
      totalPrice = Math.max(0, rateCharged - discountApplied);
    } else {
      totalPrice = Math.max(0, duration * (rateCharged - discountApplied));
    }

    await db.bookings.add({
      id: crypto.randomUUID(),
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      studentPhone: activeStudent.phone,
      date: bDate,
      timeFrom: bTimeFrom,
      timeTo: bTimeTo,
      duration,
      type: bType,
      rateCharged,
      discountApplied,
      totalPrice,
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setBDate('');
    setBTimeFrom('');
    setBTimeTo('');
    setBType('package');
    setIsQuickBookingOpen(false);
  };

  // Quick Action Payment Submit
  const handleQuickPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!pAmount || Number(pAmount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    await db.payments.add({
      id: crypto.randomUUID(),
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      studentPhone: activeStudent.phone,
      date: pDate,
      amount: Number(pAmount),
      type: pType,
      createdAt: new Date().toISOString()
    });

    setPAmount('');
    setPType('bank');
    setIsQuickPaymentOpen(false);
  };

  // Delete student
  const handleDeleteStudentClick = (studentId, studentName) => {
    setDeleteConfirm({ show: true, id: studentId, name: studentName });
  };

  const handleConfirmDeleteStudent = async () => {
    const studentId = deleteConfirm.id;
    setDeleteConfirm({ show: false, id: null, name: '' });
    try {
      const studentData = await db.students.get(studentId);
      if (studentData) {
        const linkedBookings = await db.bookings.where('studentId').equals(studentId).toArray();
        const linkedPayments = await db.payments.where('studentId').equals(studentId).toArray();
        await db.trash.add({
          id: studentId,
          type: 'student',
          data: {
            student: studentData,
            bookings: linkedBookings,
            payments: linkedPayments
          },
          deletedAt: new Date().toISOString()
        });

        await db.students.delete(studentId);
        await Promise.all(linkedBookings.map(b => db.bookings.delete(b.id)));
        await Promise.all(linkedPayments.map(p => db.payments.delete(p.id)));
        setSelectedStudentId(null);
      }
    } catch (err) {
      console.error("Failed to delete student:", err);
      alert("Error deleting student: " + err.message);
    }
  };

  const handleEditPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressedBase64 = await compressImage(file);
      setEditLicencePhoto(compressedBase64);
    } catch (err) {
      alert('Error reading/compressing photo: ' + err.message);
    } finally {
      setCompressing(false);
    }
  };

  const openEditStudentModal = () => {
    setEditName(activeStudent.name);
    setEditPhone(activeStudent.phone);
    setEditGender(activeStudent.gender);
    setEditAvailability(activeStudent.availability);
    setEditAvail(parseAvailString(activeStudent.availability));
    setEditClassDiscount(activeStudent.classRateDiscount || 0);
    setEditTestDiscount(activeStudent.testRateDiscount || 0);
    setEditLicencePhoto(activeStudent.licencePhoto || '');
    setEditTestDate(activeStudent.testDate || '');
    setEditTestTime(activeStudent.testTime || '');
    setEditStatus(activeStudent.status || 'active');
    setEditNotes(activeStudent.notes || '');
    setIsEditStudentOpen(true);
  };

  const handleQuickBookingFromTable = (student) => {
    if (student.status === 'terminated') {
      alert('Cannot book lessons for a terminated student.');
      return;
    }
    setSelectedStudentId(student.id);
    setBDate('');
    setBTimeFrom('');
    setBTimeTo('');
    setBType('package');
    setIsQuickBookingOpen(true);
  };

  const handleEditStudentFromTable = (student) => {
    setSelectedStudentId(student.id);
    setEditName(student.name);
    setEditPhone(student.phone);
    setEditGender(student.gender);
    setEditAvailability(student.availability || '');
    setEditAvail(parseAvailString(student.availability || ''));
    setEditClassDiscount(student.classRateDiscount || 0);
    setEditTestDiscount(student.testRateDiscount || 0);
    setEditLicencePhoto(student.licencePhoto || '');
    setEditTestDate(student.testDate || '');
    setEditTestTime(student.testTime || '');
    setEditStatus(student.status || 'active');
    setEditNotes(student.notes || '');
    setIsEditStudentOpen(true);
  };

  const handleEditStudentSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) {
      alert('Please fill out student Name and Phone Number.');
      return;
    }

    const cleanedPhone = editPhone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    const originalName = activeStudent.name;
    const originalPhone = activeStudent.phone;
    const hasNameOrPhoneChanged = originalName !== editName.trim() || originalPhone !== cleanedPhone;

    await db.students.update(activeStudent.id, {
      name: editName.trim(),
      phone: cleanedPhone,
      gender: editGender,
      availability: buildAvailString(editAvail),
      classRateDiscount: Number(editClassDiscount) || 0,
      testRateDiscount: Number(editTestDiscount) || 0,
      licencePhoto: editLicencePhoto,
      testDate: editTestDate || '',
      testTime: editTestTime || '',
      status: editStatus,
      notes: editNotes.trim()
    });

    if (hasNameOrPhoneChanged) {
      // Cascade to bookings
      await db.bookings.where('studentId').equals(activeStudent.id).modify({
        studentName: editName.trim(),
        studentPhone: cleanedPhone
      });
      // Cascade to payments
      await db.payments.where('studentId').equals(activeStudent.id).modify({
        studentName: editName.trim(),
        studentPhone: cleanedPhone
      });
    }

    setIsEditStudentOpen(false);
  };

  // Edit Booking handlers
  const openEditBooking = (booking) => {
    setEditingBookingId(booking.id);
    setEbDate(booking.date);
    setEbTimeFrom(booking.timeFrom);
    setEbTimeTo(booking.timeTo);
    setEbType(booking.type);
    setEbRateCharged(booking.rateCharged);
    setEbDiscountApplied(booking.discountApplied);
    setEbDuration(booking.duration);
    setEbTotalPrice(booking.totalPrice);
    setIsEditBookingOpen(true);
  };

  const handleEditBookingTypeChange = async (newType) => {
    setEbType(newType);
    const activePricing = await db.settings.get('pricing') || { normalRate: 63, packageRate: 63, testRate: 210 };
    
    let rate = 0;
    let disc = 0;
    if (newType === 'normal') {
      rate = activePricing.normalRate;
      disc = activeStudent.classRateDiscount || 0;
    } else if (newType === 'package') {
      rate = activePricing.packageRate;
      disc = activeStudent.classRateDiscount || 0;
    } else if (newType === 'test') {
      rate = activePricing.testRate;
      disc = activeStudent.testRateDiscount || 0;
    }
    
    setEbRateCharged(rate);
    setEbDiscountApplied(disc);
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

  const handleEditBookingSubmit = async (e) => {
    e.preventDefault();
    if (!ebDate || !ebTimeFrom || !ebTimeTo) {
      alert('Please fill out date and times.');
      return;
    }

    if (ebDuration <= 0) {
      alert('End time must be after start time.');
      return;
    }

    // Check for conflicts
    const conflictingBooking = bookings.find(b => 
      b.status !== 'cancelled' &&
      b.id !== editingBookingId &&
      b.date === ebDate && 
      ((ebTimeFrom < b.timeTo && b.timeFrom < ebTimeTo))
    );
    if (conflictingBooking) {
      alert(`Booking Conflict!\nThere is already a booking for ${conflictingBooking.studentName} on this day from ${formatTime12Hour(conflictingBooking.timeFrom)} to ${formatTime12Hour(conflictingBooking.timeTo)}.\n\nPlease choose a different time slot.`);
      return;
    }

    await db.bookings.update(editingBookingId, {
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
  };

  // Cancel Booking
  const handleCancelBookingClick = (bookingId, studentName, date) => {
    setCancelConfirm({ show: true, id: bookingId, name: studentName, date });
  };

  const handleConfirmCancelBooking = async () => {
    const { id } = cancelConfirm;
    setCancelConfirm({ show: false, id: null, name: '', date: '' });
    try {
      await db.bookings.update(id, { status: 'cancelled' });
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      alert("Error cancelling booking: " + err.message);
    }
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
      alert(`Cannot Reinstate Booking Conflict!\nThere is already an active booking for ${conflictingBooking.studentName} on this day from ${formatTime12Hour(conflictingBooking.timeFrom)} to ${formatTime12Hour(conflictingBooking.timeTo)}.\n\nPlease reschedule or cancel the conflict first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to reinstate the booking for ${studentName} on ${date}?`)) {
      await db.bookings.update(bookingId, { status: 'scheduled' });
    }
  };

  // Edit Payment handlers
  const openEditPayment = (payment) => {
    setEditingPaymentId(payment.id);
    setEpDate(payment.date);
    setEpAmount(payment.amount);
    setEpType(payment.type);
    setIsEditPaymentOpen(true);
  };

  const handleEditPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!epAmount || Number(epAmount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    await db.payments.update(editingPaymentId, {
      date: epDate,
      amount: Number(epAmount),
      type: epType
    });

    setIsEditPaymentOpen(false);
    setEditingPaymentId(null);
  };

  const generateInvoiceHtml = (student, bookingsList, totalBill, totalPaidVal, bal) => {
    return `
      <html>
        <head>
          <title>Invoice - ${student.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1f2937;
              background: #ffffff;
              padding: 2.5cm;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 1.5rem;
              margin-bottom: 2rem;
            }
            .school-name {
              font-size: 1.75rem;
              font-weight: 800;
              margin: 0;
              color: #111827;
            }
            .school-sub {
              font-size: 0.85rem;
              color: #4b5563;
              margin: 0.25rem 0 0 0;
            }
            .inv-title {
              font-size: 2rem;
              font-weight: 900;
              margin: 0;
              color: #6b7280;
              letter-spacing: 1px;
              text-align: right;
            }
            .inv-details {
              font-size: 0.9rem;
              margin: 0.25rem 0 0 0;
              text-align: right;
            }
            .bill-to-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2rem;
            }
            .bill-title {
              font-size: 0.75rem;
              text-transform: uppercase;
              color: #6b7280;
              font-weight: 700;
              display: block;
              margin-bottom: 0.25rem;
            }
            .student-name {
              font-size: 1.1rem;
              font-weight: 700;
              color: #111827;
            }
            .student-details {
              font-size: 0.9rem;
              color: #4b5563;
              margin-top: 0.25rem;
            }
            .status-badge {
              display: inline-block;
              font-size: 0.85rem;
              padding: 0.25rem 0.75rem;
              border-radius: 9999px;
              font-weight: 600;
              border: 1px solid #e5e7eb;
            }
            .status-unpaid {
              color: #92400e;
              background: #fef3c7;
              border-color: #fde68a;
            }
            .status-paid {
              color: #065f46;
              background: #d1fae5;
              border-color: #a7f3d0;
            }
            .items-section {
              margin-bottom: 2rem;
            }
            .section-title {
              font-size: 1rem;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 0.5rem;
              margin-bottom: 1rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.9rem;
            }
            th {
              border-bottom: 2px solid #e5e7eb;
              color: #4b5563;
              font-weight: 600;
              padding: 0.5rem 0;
            }
            td {
              border-bottom: 1px solid #e5e7eb;
              padding: 0.75rem 0;
            }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .summary-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 1.5rem;
            }
            .summary-table {
              width: 250px;
              font-size: 0.95rem;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 0.35rem 0;
            }
            .summary-row-bold {
              font-size: 1.1rem;
              font-weight: 700;
              border-top: 2px solid #e5e7eb;
              padding-top: 0.5rem;
              margin-top: 0.5rem;
            }
            .footer {
              margin-top: 4rem;
              border-top: 1px solid #e5e7eb;
              padding-top: 1rem;
              text-align: center;
              font-size: 0.8rem;
              color: #6b7280;
              font-style: italic;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 class="school-name">UJYALO DRIVING SCHOOL</h2>
              <p class="school-sub">Professional Driving Lessons & Test Preparation</p>
              <p class="school-sub">Phone: ${schoolContact.phone} | Email: ${schoolContact.email}</p>
            </div>
            <div>
              <h1 class="inv-title">INVOICE</h1>
              <p class="inv-details">Invoice No: <strong>INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${student.id.slice(0, 8).toUpperCase()}</strong></p>
              <p class="inv-details">Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div class="bill-to-row">
            <div>
              <span class="bill-title">BILLED TO:</span>
              <div class="student-name">${student.name}</div>
              <div class="student-details">Phone: ${student.phone}</div>
              <div class="student-details">Gender: ${student.gender}</div>
            </div>
            <div>
              <span class="bill-title">PAYMENT STATUS:</span>
              <span class="status-badge ${bal > 0 ? 'status-unpaid' : 'status-paid'}">
                ${bal > 0 ? 'Payment Outstanding' : 'Fully Paid'}
              </span>
            </div>
          </div>

          <div class="items-section">
            <h4 class="section-title">Billed Driving Lessons</h4>
            <table>
               <thead>
                 <tr>
                   <th class="text-left">Date</th>
                   <th class="text-left">Description</th>
                   <th class="text-center">Qty (hrs)</th>
                   <th class="text-right">Rate</th>
                   <th class="text-right">Disc.</th>
                   <th class="text-right">Amount</th>
                 </tr>
               </thead>
               <tbody>
                 ${bookingsList.map(b => `
                   <tr>
                     <td>${b.date}</td>
                     <td style="text-transform: capitalize;">${b.type} Lesson ${b.type === 'test' ? 'Preparation' : ''}</td>
                     <td class="text-center">${b.type === 'test' ? '—' : b.duration.toFixed(1)}</td>
                     <td class="text-right">$${b.rateCharged.toFixed(2)}${b.type !== 'test' ? '/hr' : ''}</td>
                     <td class="text-right" style="color: #059669;">${b.discountApplied > 0 ? `-$${b.discountApplied.toFixed(2)}` : '—'}</td>
                     <td class="text-right" style="font-weight: 600;">$${b.totalPrice.toFixed(2)}</td>
                   </tr>
                 `).join('')}
               </tbody>
            </table>
          </div>

          <div class="summary-container">
            <div class="summary-table">
              <div class="summary-row">
                <span style="color: #4b5563;">Total Amount Billed:</span>
                <span style="font-weight: 600;">$${totalBill.toFixed(2)}</span>
              </div>
              <div class="summary-row" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
                <span style="color: #4b5563;">Total Payments Logged:</span>
                <span style="color: #059669; font-weight: 600;">-$${totalPaidVal.toFixed(2)}</span>
              </div>
              <div class="summary-row summary-row-bold">
                <span>Balance Due:</span>
                <span style="color: ${bal > 0 ? '#b91c1c' : '#059669'}">$${bal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            Thank you for choosing Ujyalo Driving School. Safe driving!
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Pop-up blocker is active. Please enable pop-ups to print invoices.');
      return;
    }
    const nonCancelledBookings = activeBookings.filter(b => b.status !== 'cancelled');
    const html = generateInvoiceHtml(activeStudent, nonCancelledBookings, totalBilled, totalPaid, balance);
    const printedHtml = html + `
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    `;
    printWindow.document.open();
    printWindow.document.write(printedHtml);
    printWindow.document.close();
  };

  const handleDownloadInvoice = () => {
    const nonCancelledBookings = activeBookings.filter(b => b.status !== 'cancelled');
    const html = generateInvoiceHtml(activeStudent, nonCancelledBookings, totalBilled, totalPaid, balance);
    // Add print button inside downloaded page for ease of use
    const finalHtml = html.replace('</body>', `
      <div style="display: flex; justify-content: center; margin-top: 2rem; margin-bottom: 3rem;" class="no-print-btn-container">
        <button 
          onclick="window.print()" 
          style="padding: 0.75rem 2rem; font-size: 1rem; font-weight: 600; background-color: #7c3aed; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.15);"
        >
          Print Invoice
        </button>
      </div>
      <style>
        @media print {
          .no-print-btn-container { display: none !important; }
        }
      </style>
      </body>
    `);
    
    const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_${activeStudent.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeConflict = bDate && bTimeFrom && bTimeTo ? bookings.find(b => 
    b.status !== 'cancelled' &&
    b.date === bDate && 
    ((bTimeFrom < b.timeTo && b.timeFrom < bTimeTo))
  ) : null;

  const activeEditConflict = ebDate && ebTimeFrom && ebTimeTo ? bookings.find(b => 
    b.status !== 'cancelled' &&
    b.id !== editingBookingId &&
    b.date === ebDate && 
    ((ebTimeFrom < b.timeTo && b.timeFrom < ebTimeTo))
  ) : null;

  return (
    <div>
      {activeStudent ? (
        /* ================== STUDENT PROFILE VIEW ================== */
        <div>
          <div className="header-row" style={{ marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedStudentId(null)}>
              <ArrowLeft size={16} /> Back to List
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setIsQuickBookingOpen(true)}
                disabled={activeStudent.status === 'terminated'}
                title={activeStudent.status === 'terminated' ? 'Cannot book lessons for a terminated student' : 'Record Booking'}
              >
                <Calendar size={16} /> Record Booking
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setIsQuickPaymentOpen(true)}>
                <CreditCard size={16} /> Record Payment
              </button>
              <button className="btn btn-secondary btn-sm" onClick={openEditStudentModal}>
                Edit Profile
              </button>
              <button 
                className="btn btn-danger btn-sm" 
                style={{ padding: '0.4rem' }} 
                onClick={() => handleDeleteStudentClick(activeStudent.id, activeStudent.name)}
                title="Delete Student"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          {activeBookings.filter(b => b.type === 'package').length > 0 && 
           activeBookings.filter(b => b.type === 'package').length < 5 && (
            <div className="card" style={{
              background: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'var(--warning)',
              color: '#d97706',
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              fontSize: '0.9rem'
            }}>
              <span>⚠️ Package Limit: {activeStudent.name} has only {activeBookings.filter(b => b.type === 'package').length} package lesson{activeBookings.filter(b => b.type === 'package').length > 1 ? 's' : ''} booked (minimum 5 required).</span>
            </div>
          )}

          <div className="split-layout" style={{ marginBottom: '1.5rem' }}>
            {/* Student info and Licence preview */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.5rem'
                }}>
                  {activeStudent.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{activeStudent.name}</h2>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <span className="badge badge-primary">{activeStudent.gender}</span>
                    <span className={`badge badge-${
                      activeStudent.status === 'active' ? 'primary' :
                      activeStudent.status === 'passed' ? 'success' :
                      activeStudent.status === 'terminated' ? 'danger' :
                      'warning'
                    }`} style={{ textTransform: 'capitalize' }}>
                      {activeStudent.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Phone size={16} color="var(--text-muted)" />
                  <span>{activeStudent.phone}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Availability:</span>
                  <span style={{ fontSize: '0.95rem' }}>{activeStudent.availability}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Scheduled Driving Test:</span>
                  {activeStudent.testDate ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                        {activeStudent.testDate} at {activeStudent.testTime || 'Not specified'} ({getDaysToTestStr(activeStudent.testDate)})
                      </span>
                      <span className={getPriorityInfo(activeStudent.testDate).class}>
                        {getPriorityInfo(activeStudent.testDate).text} Priority
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No driving test scheduled.
                    </span>
                  )}
                </div>
                <div className="form-grid" style={{ gap: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ padding: '0.5rem', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Class Discount</span>
                    <strong>${activeStudent.classRateDiscount}/hr off</strong>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Test Discount</span>
                    <strong>${activeStudent.testRateDiscount} off</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notes:</span>
                  <div style={{ 
                    fontSize: '0.9rem', 
                    padding: '0.6rem 0.8rem', 
                    background: 'var(--bg-hover)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)',
                    whiteSpace: 'pre-wrap',
                    minHeight: '40px',
                    color: activeStudent.notes ? 'var(--text-main)' : 'var(--text-muted)',
                    fontStyle: activeStudent.notes ? 'normal' : 'italic'
                  }}>
                    {activeStudent.notes || 'No notes added for this student.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Licence Photo view */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={18} color="var(--primary)" /> Learner's Licence Photo
              </h3>
              {activeStudent.licencePhoto ? (
                <div 
                  className="licence-preview-container" 
                  onClick={() => setIsZoomOpen(true)}
                  style={{ border: 'none' }}
                  title="Click to zoom photo"
                >
                  <img src={activeStudent.licencePhoto} alt="Licence" />
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    padding: '4px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex'
                  }}>
                    <Eye size={16} />
                  </div>
                </div>
              ) : (
                <div 
                  style={{
                    height: '160px',
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}
                >
                  <span>No licence photo uploaded.</span>
                </div>
              )}
            </div>
          </div>

          {/* Balance Cards */}
          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Billed</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.1rem', color: 'var(--text-main)' }}>${totalBilled.toFixed(2)}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                Normal: {totalNormalHours.toFixed(1)} hrs ({totalNormalLessons} lesson{totalNormalLessons !== 1 ? 's' : ''})
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                Test: {totalTestHours.toFixed(1)} hrs ({testLessonsCount} lesson{testLessonsCount !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid</span>
              <h3 style={{ fontSize: '1.5rem', marginTop: '0.1rem', color: 'var(--success)' }}>${totalPaid.toFixed(2)}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({activePayments.length} transactions)</span>
            </div>
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding Balance</span>
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginTop: '0.1rem', 
                color: balance > 0 ? 'var(--danger)' : 'var(--success)'
              }}>${balance.toFixed(2)}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {balance > 0 ? 'Payment outstanding' : 'Fully paid'}
              </span>
            </div>
          </div>

          {/* Unified Ledger Log */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setLedgerTab('statement')}
                  className={`btn ${ledgerTab === 'statement' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ borderRadius: '20px', padding: '0.4rem 1rem' }}
                >
                  Account Statement
                </button>
                <button
                  onClick={() => setLedgerTab('invoice')}
                  className={`btn ${ledgerTab === 'invoice' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ borderRadius: '20px', padding: '0.4rem 1rem' }}
                >
                  Invoice Preview
                </button>
              </div>
              
              {ledgerTab === 'invoice' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handlePrintInvoice}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Printer size={16} /> Print Invoice
                  </button>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={handleDownloadInvoice}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Download size={16} /> Download HTML
                  </button>
                </div>
              )}
            </div>

            {ledgerTab === 'statement' && (
              ledgerWithRunning.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => requestLedgerSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Date {getLedgerSortIcon('date')}
                        </th>
                        <th onClick={() => requestLedgerSort('description')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Details / Transaction {getLedgerSortIcon('description')}
                        </th>
                        <th onClick={() => requestLedgerSort('debit')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                          Debit (+) {getLedgerSortIcon('debit')}
                        </th>
                        <th onClick={() => requestLedgerSort('credit')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                          Credit (-) {getLedgerSortIcon('credit')}
                        </th>
                        <th onClick={() => requestLedgerSort('runningBalance')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                          Balance {getLedgerSortIcon('runningBalance')}
                        </th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLedger.map((item, idx) => (
                        <tr key={idx} style={item.raw?.status === 'cancelled' ? { opacity: 0.6 } : {}}>
                          <td>{item.date}</td>
                          <td style={{ fontSize: '0.9rem', textDecoration: item.raw?.status === 'cancelled' ? 'line-through' : 'none' }}>{item.description}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-main)', fontWeight: item.type === 'charge' ? '600' : 'normal', textDecoration: item.raw?.status === 'cancelled' ? 'line-through' : 'none' }}>
                            {item.type === 'charge' ? `$${item.amount.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: item.type === 'credit' ? '600' : 'normal' }}>
                            {item.type === 'credit' ? `$${item.amount.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            fontWeight: 'bold', 
                            color: item.runningBalance > 0 ? 'var(--danger)' : 'var(--success)' 
                          }}>
                            ${item.runningBalance.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                onClick={() => {
                                  if (item.type === 'charge') {
                                    openEditBooking(item.raw);
                                  } else {
                                    openEditPayment(item.raw);
                                  }
                                }}
                                disabled={item.raw?.status === 'cancelled'}
                              >
                                Edit
                              </button>
                              {item.type === 'charge' && item.raw?.status !== 'cancelled' && (
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--warning)' }}
                                  onClick={() => handleCancelBookingClick(item.id, activeStudent.name, item.date)}
                                >
                                  Cancel
                                </button>
                              )}
                              {item.type === 'charge' && item.raw?.status === 'cancelled' && (
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--success)' }}
                                  onClick={() => handleReinstateBooking(item.id, activeStudent.name, item.date, item.raw.timeFrom, item.raw.timeTo)}
                                >
                                  Reinstate
                                </button>
                              )}
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                                onClick={async () => {
                                  if (item.type === 'charge') {
                                    if (window.confirm(`Are you sure you want to delete this booking on ${item.date}?`)) {
                                      const bookingData = await db.bookings.get(item.id);
                                      if (bookingData) {
                                        await db.trash.add({
                                          id: item.id,
                                          type: 'booking',
                                          data: bookingData,
                                          deletedAt: new Date().toISOString()
                                        });
                                      }
                                      await db.bookings.delete(item.id);
                                    }
                                  } else {
                                    if (window.confirm(`Are you sure you want to delete this payment of $${item.amount.toFixed(2)}?`)) {
                                      await db.payments.delete(item.id);
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No ledger transactions found. Add a booking or payment to generate records.
                </div>
              )
            )}

            {ledgerTab === 'invoice' && (
              <div 
                style={{ 
                  background: 'var(--bg-hover)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '2rem', 
                  color: 'var(--text-main)',
                  boxShadow: 'var(--shadow-sm)' 
                }}
              >
                {/* School Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      UJYALO DRIVING SCHOOL
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                      Professional Driving Lessons & Test Preparation
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
                      Phone: {schoolContact.phone} | Email: {schoolContact.email}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                      INVOICE
                    </h1>
                    <p style={{ fontSize: '0.9rem', margin: '0.25rem 0 0 0', color: 'var(--text-main)' }}>
                      Invoice No: <strong>INV-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}-{activeStudent.id.slice(0, 8).toUpperCase()}</strong>
                    </p>
                    <p style={{ fontSize: '0.9rem', margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>
                      Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Bill To & Status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      BILLED TO:
                    </span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {activeStudent.name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Phone: {activeStudent.phone}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Gender: {activeStudent.gender}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      PAYMENT STATUS:
                    </span>
                    <span 
                      className={`badge badge-${balance > 0 ? 'warning' : 'success'}`} 
                      style={{ 
                        display: 'inline-block', 
                        fontSize: '0.85rem', 
                        padding: '0.35rem 0.85rem', 
                        borderRadius: '20px', 
                        fontWeight: '600' 
                      }}
                    >
                      {balance > 0 ? 'Payment Outstanding' : 'Fully Paid'}
                    </span>
                  </div>
                </div>

                {/* Items table */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Billed Driving Lessons
                  </h4>
                  <div className="table-container" style={{ margin: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Date</th>
                          <th style={{ textAlign: 'left' }}>Description</th>
                          <th style={{ textAlign: 'center' }}>Qty (hrs)</th>
                          <th style={{ textAlign: 'right' }}>Rate</th>
                          <th style={{ textAlign: 'right' }}>Disc.</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeBookings.filter(b => b.status !== 'cancelled').length > 0 ? (
                          activeBookings.filter(b => b.status !== 'cancelled').map((b, idx) => (
                            <tr key={idx}>
                              <td>{b.date}</td>
                              <td style={{ textTransform: 'capitalize' }}>
                                {b.type} Lesson {b.type === 'test' ? 'Preparation' : ''}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {b.type === 'test' ? '—' : b.duration.toFixed(1)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                ${b.rateCharged.toFixed(2)}{b.type !== 'test' ? '/hr' : ''}
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--success)' }}>
                                {b.discountApplied > 0 ? `-$${b.discountApplied.toFixed(2)}` : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                ${b.totalPrice.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                              No billed lessons found for this student.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <div style={{ width: '300px', fontSize: '0.95rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Amount Billed:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>${totalBilled.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Payments Logged:</span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>-${totalPaid.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                      <span>Balance Due:</span>
                      <span style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Thank you for choosing Ujyalo Driving School. Safe driving!
                </div>
              </div>
            )}
          </div>

          {/* Modal zooms image */}
          {isZoomOpen && (
            <Modal isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} title="Learner's Licence Photo">
              <div className="licence-zoom-container">
                <img src={activeStudent.licencePhoto} alt="Licence Full View" />
              </div>
            </Modal>
          )}

          {/* Quick Add Booking modal */}
          {isQuickBookingOpen && (
            <Modal isOpen={isQuickBookingOpen} onClose={() => setIsQuickBookingOpen(false)} title={`Book Driving Lesson for ${activeStudent.name}`}>
              <form onSubmit={handleQuickBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="btype">Lesson Type</label>
                  <select 
                    id="btype" 
                    className="form-control" 
                    value={bType} 
                    onChange={(e) => setBType(e.target.value)}
                  >
                    <option value="normal">Normal Lesson (${rates.normalRate}/hr)</option>
                    <option value="package">Package Lesson (${rates.packageRate}/hr - min 5)</option>
                    <option value="test">Test preparation + Car hire (${rates.testRate} flat)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="bdate">Lesson Date</label>
                  <input 
                    id="bdate"
                    type="date" 
                    className="form-control" 
                    required 
                    value={bDate} 
                    onChange={(e) => setBDate(e.target.value)} 
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="bfrom">From Time</label>
                    <input 
                      id="bfrom"
                      type="time" 
                      step="900"
                      className="form-control" 
                      required 
                      value={bTimeFrom} 
                      onChange={(e) => setBTimeFrom(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bto">To Time</label>
                    <input 
                      id="bto"
                      type="time" 
                      step="900"
                      className="form-control" 
                      required 
                      value={bTimeTo} 
                      onChange={(e) => setBTimeTo(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Booking Conflict Warning Panel */}
                {activeConflict && (
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid var(--danger)', 
                    color: 'var(--danger)', 
                    padding: '0.75rem', 
                    borderRadius: 'var(--radius-sm)', 
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    width: '100%'
                  }}>
                    <strong>⚠️ Booking Conflict Alert:</strong> there is already an active booking for <strong>{activeConflict.studentName}</strong> on this day from <strong>{formatTime12Hour(activeConflict.timeFrom)}</strong> to <strong>{formatTime12Hour(activeConflict.timeTo)}</strong>. You cannot book this slot.
                  </div>
                )}

                <div className="dialog-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsQuickBookingOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!!activeConflict}>Book Lesson</button>
                </div>
              </form>
            </Modal>
          )}

          {/* Quick Add Payment modal */}
          {isQuickPaymentOpen && (
            <Modal isOpen={isQuickPaymentOpen} onClose={() => setIsQuickPaymentOpen(false)} title={`Log Payment for ${activeStudent.name}`}>
              <form onSubmit={handleQuickPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="pdate">Payment Date</label>
                  <input 
                    id="pdate"
                    type="date" 
                    className="form-control" 
                    required 
                    value={pDate} 
                    onChange={(e) => setPDate(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pamount">Payment Amount ($)</label>
                  <input 
                    id="pamount"
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    className="form-control" 
                    placeholder="Enter amount paid"
                    required 
                    value={pAmount} 
                    onChange={(e) => setPAmount(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ptype">Payment Type</label>
                  <select 
                    id="ptype" 
                    className="form-control" 
                    value={pType} 
                    onChange={(e) => setPType(e.target.value)}
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash in Hand</option>
                  </select>
                </div>

                <div className="dialog-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsQuickPaymentOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Log Payment</button>
                </div>
              </form>
            </Modal>
          )}

          {/* Edit Student Modal */}
          {isEditStudentOpen && (
            <Modal isOpen={isEditStudentOpen} onClose={() => setIsEditStudentOpen(false)} title={`Edit Profile for ${activeStudent.name}`}>
              <form onSubmit={handleEditStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="editfullname">Full Name *</label>
                  <input 
                    id="editfullname"
                    type="text" 
                    className="form-control" 
                    placeholder="Enter student's full name"
                    required 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="editphone">Phone Number *</label>
                    <input 
                      id="editphone"
                      type="tel" 
                      className="form-control" 
                      placeholder="e.g. 0400000000"
                      required 
                      value={editPhone} 
                      onChange={(e) => setEditPhone(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editgender">Gender</label>
                    <select 
                      id="editgender" 
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

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Availability Description</label>
                  
                  {editAvailability && editAvailability !== 'Not specified' && buildAvailString(editAvail) === 'Not specified' && (
                    <div style={{ 
                      background: 'rgba(245, 158, 11, 0.1)', 
                      border: '1px solid var(--warning)', 
                      color: '#d97706', 
                      padding: '0.5rem 0.75rem', 
                      borderRadius: '6px', 
                      fontSize: '0.85rem', 
                      marginBottom: '0.75rem' 
                    }}>
                      ⚠️ Current custom availability: <strong>"{editAvailability}"</strong>. Selecting checkboxes below will override this value.
                    </div>
                  )}

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '0.75rem', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    padding: '1rem' 
                  }}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{day}</span>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
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
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
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

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="editstatus">Status</label>
                    <select 
                      id="editstatus" 
                      className="form-control" 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="terminated">Terminated</option>
                      <option value="inactive">Inactive</option>
                      <option value="passed">Passed</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="edittestDate">Test Date (Optional)</label>
                    <input 
                      id="edittestDate" 
                      type="date"
                      className="form-control" 
                      value={editTestDate} 
                      onChange={(e) => setEditTestDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edittestTime">Test Time (Optional)</label>
                    <input 
                      id="edittestTime" 
                      type="time"
                      className="form-control" 
                      value={editTestTime} 
                      onChange={(e) => setEditTestTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="editclassdisc">Class Rate Discount ($/hr)</label>
                    <input 
                      id="editclassdisc"
                      type="number" 
                      min="0" 
                      className="form-control" 
                      placeholder="Discount per hour"
                      value={editClassDiscount} 
                      onChange={(e) => setEditClassDiscount(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edittestdisc">Test Rate Discount ($)</label>
                    <input 
                      id="edittestdisc"
                      type="number" 
                      min="0" 
                      className="form-control" 
                      placeholder="Discount on test lesson"
                      value={editTestDiscount} 
                      onChange={(e) => setEditTestDiscount(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="editstudentNotes">Notes</label>
                  <textarea
                    id="editstudentNotes"
                    className="form-control"
                    placeholder="Enter any reminder notes, lessons feedback, or special requirements for the student..."
                    rows="3"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label>Learner's Licence Photo</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={editFileInputRef} 
                    onChange={handleEditPhotoUpload}
                  />
                  <div 
                    className="licence-preview-container"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    {compressing ? (
                      <span style={{ fontSize: '0.85rem' }}>Compressing image...</span>
                    ) : editLicencePhoto ? (
                      <img src={editLicencePhoto} alt="Licence Preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <ImageIcon size={28} />
                        <span>Upload photo (JPEG/PNG)</span>
                      </div>
                    )}
                  </div>
                  {editLicencePhoto && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                      onClick={() => setEditLicencePhoto('')}
                    >
                      Clear Image
                    </button>
                  )}
                </div>

                <div className="dialog-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditStudentOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </Modal>
          )}

          {/* Edit Booking Modal */}
          {isEditBookingOpen && (
            <Modal isOpen={isEditBookingOpen} onClose={() => setIsEditBookingOpen(false)} title={`Edit Booking for ${activeStudent.name}`}>
              <form onSubmit={handleEditBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="ebtype">Lesson Type</label>
                  <select 
                    id="ebtype" 
                    className="form-control" 
                    value={ebType} 
                    onChange={(e) => handleEditBookingTypeChange(e.target.value)}
                  >
                    <option value="normal">Normal Lesson</option>
                    <option value="package">Package Lesson</option>
                    <option value="test">Test preparation + Car hire</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ebdate">Lesson Date</label>
                  <input 
                    id="ebdate"
                    type="date" 
                    className="form-control" 
                    required 
                    value={ebDate} 
                    onChange={(e) => setEbDate(e.target.value)} 
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="ebfrom">From Time</label>
                    <input 
                      id="ebfrom"
                      type="time" 
                      step="900"
                      className="form-control" 
                      required 
                      value={ebTimeFrom} 
                      onChange={(e) => setEbTimeFrom(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ebto">To Time</label>
                    <input 
                      id="ebto"
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
                    <label htmlFor="ebrate">Rate Charged ($/hr or flat)</label>
                    <input 
                      id="ebrate"
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
                    <label htmlFor="ebdisc">Discount Applied ($)</label>
                    <input 
                      id="ebdisc"
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
                    marginBottom: '1rem',
                    width: '100%'
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

          {/* Edit Payment Modal */}
          {isEditPaymentOpen && (
            <Modal isOpen={isEditPaymentOpen} onClose={() => setIsEditPaymentOpen(false)} title={`Edit Payment for ${activeStudent.name}`}>
              <form onSubmit={handleEditPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="epdate">Payment Date</label>
                  <input 
                    id="epdate"
                    type="date" 
                    className="form-control" 
                    required 
                    value={epDate} 
                    onChange={(e) => setEpDate(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="epamount">Payment Amount ($)</label>
                  <input 
                    id="epamount"
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    className="form-control" 
                    required 
                    value={epAmount} 
                    onChange={(e) => setEpAmount(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="eptype">Payment Type</label>
                  <select 
                    id="eptype" 
                    className="form-control" 
                    value={epType} 
                    onChange={(e) => setEpType(e.target.value)}
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash in Hand</option>
                  </select>
                </div>

                <div className="dialog-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditPaymentOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      ) : (
        /* ================== STUDENTS LIST VIEW ================== */
        <div>
          <div className="header-row">
            <div>
              <h1 style={{ fontSize: '2rem', margin: 0 }}>Student Records</h1>
              <p style={{ color: 'var(--text-muted)' }}>Manage student information, ledger status, and licence files</p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsAddStudentOpen(true)}>
              <Plus size={16} /> Add New Student
            </button>
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {[
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Inactive' },
              { id: 'terminated', label: 'Terminated' },
              { id: 'passed', label: 'Passed' },
              { id: 'all', label: 'All Students' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`btn ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                style={{ 
                  padding: '0.4rem 1rem', 
                  fontSize: '0.85rem',
                  borderRadius: '20px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Filter bar */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Search size={20} color="var(--text-muted)" />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search students by full name or phone number..." 
                style={{ border: 'none', background: 'transparent', padding: '0.25rem 0', width: '100%' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} color="var(--text-muted)" /> Filter by Availability (Days):
                </span>
                {selectedDays.length > 0 && (
                  <button 
                    onClick={() => setSelectedDays([])}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--primary)', 
                      fontSize: '0.75rem', 
                      cursor: 'pointer', 
                      fontWeight: 600,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <RotateCcw size={12} /> Clear Filter
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDays(prev => 
                          prev.includes(day) 
                            ? prev.filter(d => d !== day) 
                            : [...prev, day]
                        );
                      }}
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{
                        borderRadius: '20px',
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? '600' : 'normal',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Students Grid/Table */}
          <div className="card" style={{ padding: 0 }}>
            {sortedStudents.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => requestSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Full Name {getSortIcon('name')}
                      </th>
                      <th onClick={() => requestSort('phone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Phone Number {getSortIcon('phone')}
                      </th>
                      <th>Availability</th>
                      <th onClick={() => requestSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Status {getSortIcon('status')}
                      </th>
                      <th onClick={() => requestSort('testDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Test Date/Time {getSortIcon('testDate')}
                      </th>
                      <th onClick={() => requestSort('priority')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Priority {getSortIcon('priority')}
                      </th>
                      <th onClick={() => requestSort('totalHours')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Total Hours {getSortIcon('totalHours')}
                      </th>
                      <th onClick={() => requestSort('totalPaid')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Total Paid {getSortIcon('totalPaid')}
                      </th>
                      <th onClick={() => requestSort('balance')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Outstanding Balance {getSortIcon('balance')}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((student) => {
                      // Calc balance for this student in the loop
                      const studBookings = bookings.filter(b => b.studentId === student.id);
                      const studPayments = payments.filter(p => p.studentId === student.id);
                      const bill = studBookings.reduce((sum, b) => sum + b.totalPrice, 0);
                      const pay = studPayments.reduce((sum, p) => sum + p.amount, 0);
                      const bal = bill - pay;

                      return (
                        <tr key={student.id}>
                          <td style={{ fontWeight: 600 }}>
                            <span 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center',
                                cursor: 'pointer',
                                color: 'var(--primary)',
                                transition: 'color var(--transition-fast)'
                              }}
                              onClick={() => setSelectedStudentId(student.id)}
                              title={`View ${student.name}'s details & ledger`}
                              className="student-table-name-link"
                            >
                              {student.gender === 'Male' ? (
                                <Mars size={16} color="#3b82f6" style={{ marginRight: '0.4rem', flexShrink: 0 }} />
                              ) : student.gender === 'Female' ? (
                                <Venus size={16} color="#ec4899" style={{ marginRight: '0.4rem', flexShrink: 0 }} />
                              ) : (
                                <User size={16} color="var(--text-muted)" style={{ marginRight: '0.4rem', flexShrink: 0 }} />
                              )}
                              <span>{student.name}</span>
                            </span>
                          </td>
                          <td>{student.phone}</td>
                          <td style={{ fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={student.availability}>
                            {student.availability}
                          </td>
                          <td>
                            <span className={`badge badge-${
                              student.status === 'active' ? 'primary' :
                              student.status === 'passed' ? 'success' :
                              student.status === 'terminated' ? 'danger' :
                              'warning'
                            }`} style={{ textTransform: 'capitalize' }}>
                              {student.status || 'active'}
                            </span>
                          </td>
                          <td>
                            {student.testDate ? `${student.testDate} ${student.testTime || ''} (${getDaysToTestStr(student.testDate)})` : '—'}
                          </td>
                          <td>
                            {student.testDate ? (
                              <span className={student.priorityClass}>
                                {student.priority}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                            )}
                          </td>
                          <td>
                            {student.totalHours.toFixed(1)} hrs ({student.totalNormalLessons} normal, {student.testLessons} test)
                          </td>
                          <td>${student.totalPaid.toFixed(2)}</td>
                          <td style={{ 
                            fontWeight: 'bold', 
                            color: student.balance > 0 ? 'var(--danger)' : 'var(--success)' 
                          }}>
                            ${student.balance.toFixed(2)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleQuickBookingFromTable(student)}
                                title="Book Lesson"
                                disabled={student.status === 'terminated'}
                                style={{ padding: '0.4rem' }}
                              >
                                <Calendar size={16} />
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleEditStudentFromTable(student)}
                                title="Edit Profile"
                                style={{ padding: '0.4rem' }}
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => setSelectedStudentId(student.id)}
                                title="View Account/Ledger"
                                style={{ padding: '0.4rem' }}
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                No student profiles found. Add a new student record to get started.
              </div>
            )}
          </div>

          {/* Add Student Modal */}
          {isAddStudentOpen && (
            <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title="Create Student Profile">
              <form onSubmit={handleAddStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="fullname">Full Name *</label>
                  <input 
                    id="fullname"
                    type="text" 
                    className="form-control" 
                    placeholder="Enter student's full name"
                    required 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input 
                      id="phone"
                      type="tel" 
                      className="form-control" 
                      placeholder="e.g. 0400000000"
                      required 
                      value={newPhone} 
                      onChange={(e) => setNewPhone(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gender">Gender</label>
                    <select 
                      id="gender" 
                      className="form-control" 
                      value={newGender} 
                      onChange={(e) => setNewGender(e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>Availability Description</label>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '0.75rem', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    padding: '1rem' 
                  }}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{day}</span>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={newAvail[day]?.morning || false} 
                              onChange={(e) => setNewAvail(prev => ({
                                ...prev,
                                [day]: { ...prev[day], morning: e.target.checked }
                              }))}
                            />
                            Morning
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={newAvail[day]?.afternoon || false} 
                              onChange={(e) => setNewAvail(prev => ({
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

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select 
                      id="status" 
                      className="form-control" 
                      value={newStatus} 
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="terminated">Terminated</option>
                      <option value="inactive">Inactive</option>
                      <option value="passed">Passed</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="testDate">Test Date (Optional)</label>
                    <input 
                      id="testDate" 
                      type="date"
                      className="form-control" 
                      value={newTestDate} 
                      onChange={(e) => setNewTestDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="testTime">Test Time (Optional)</label>
                    <input 
                      id="testTime" 
                      type="time"
                      className="form-control" 
                      value={newTestTime} 
                      onChange={(e) => setNewTestTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="classdisc">Class Rate Discount ($/hr)</label>
                    <input 
                      id="classdisc"
                      type="number" 
                      min="0" 
                      className="form-control" 
                      placeholder="Discount per hour"
                      value={newClassDiscount} 
                      onChange={(e) => setNewClassDiscount(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="testdisc">Test Rate Discount ($)</label>
                    <input 
                      id="testdisc"
                      type="number" 
                      min="0" 
                      className="form-control" 
                      placeholder="Discount on test lesson"
                      value={newTestDiscount} 
                      onChange={(e) => setNewTestDiscount(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="studentNotes">Notes</label>
                  <textarea
                    id="studentNotes"
                    className="form-control"
                    placeholder="Enter any reminder notes, lessons feedback, or special requirements for the student..."
                    rows="3"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label>Learner's Licence Photo</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload}
                  />
                  <div 
                    className="licence-preview-container"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {compressing ? (
                      <span style={{ fontSize: '0.85rem' }}>Compressing image...</span>
                    ) : newLicencePhoto ? (
                      <img src={newLicencePhoto} alt="Licence Preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <ImageIcon size={28} />
                        <span>Upload photo (JPEG/PNG)</span>
                      </div>
                    )}
                  </div>
                  {newLicencePhoto && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                      onClick={() => setNewLicencePhoto('')}
                    >
                      Clear Image
                    </button>
                  )}
                </div>

                <div className="dialog-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddStudentOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Profile</button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
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
          zIndex: 1000,
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
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Confirm Deletion</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? All associated bookings and payments will be moved to trash and can be restored later.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirmDeleteStudent}
                style={{ padding: '0.5rem 1rem' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirm.show && (
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
          zIndex: 1000,
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
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Cancel Booking</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Are you sure you want to cancel the booking for <strong>{cancelConfirm.name}</strong> on <strong>{cancelConfirm.date}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCancelConfirm({ show: false, id: null, name: '', date: '' })}
                style={{ padding: '0.5rem 1rem' }}
              >
                No, Keep It
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirmCancelBooking}
                style={{ padding: '0.5rem 1rem' }}
              >
                Yes, Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
