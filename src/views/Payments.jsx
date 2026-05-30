import { useState, useEffect } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { Search, Plus, CreditCard, Calendar, Trash2, DollarSign, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('bank');

  // Edit Payment Form states
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [epStudentId, setEpStudentId] = useState('');
  const [epDate, setEpDate] = useState('');
  const [epAmount, setEpAmount] = useState('');
  const [epType, setEpType] = useState('bank');
  
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [editStudentSearchTerm, setEditStudentSearchTerm] = useState('');

  // Reset search terms when modals open/close
  useEffect(() => {
    if (!isAddPaymentOpen) {
      setStudentSearchTerm('');
    }
  }, [isAddPaymentOpen]);

  useEffect(() => {
    if (!isEditPaymentOpen) {
      setEditStudentSearchTerm('');
    }
  }, [isEditPaymentOpen]);

  // Filter students lists
  const filteredStudentsForSelect = students.filter(s => {
    if (s.id === selectedStudentId) return true;
    return s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
           s.phone.includes(studentSearchTerm);
  });

  const filteredStudentsForEditSelect = students.filter(s => {
    if (s.id === epStudentId) return true;
    return s.name.toLowerCase().includes(editStudentSearchTerm.toLowerCase()) ||
           s.phone.includes(editStudentSearchTerm);
  });

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });

  // Fetch db items
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const payments = useLiveQuery(() => db.payments.toArray()) || [];

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

  const openEditPayment = (payment) => {
    setEditingPaymentId(payment.id);
    setEpStudentId(payment.studentId);
    setEpDate(payment.date);
    setEpAmount(payment.amount);
    setEpType(payment.type);
    setIsEditPaymentOpen(true);
  };

  const handleEditPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!epStudentId || !epDate || !epAmount || Number(epAmount) <= 0) {
      setConfirmState({
        show: true,
        title: 'Invalid Input',
        message: 'Please fill out all fields with valid values.',
        showCancel: false,
        confirmText: 'OK',
        isDanger: false
      });
      return;
    }

    const student = students.find(s => s.id === epStudentId);
    if (!student) return;

    await db.payments.update(editingPaymentId, {
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      date: epDate,
      amount: Number(epAmount),
      type: epType
    });

    setIsEditPaymentOpen(false);
    setEditingPaymentId(null);
  };

  // Handle Add Payment Submit
  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !paymentDate || !paymentAmount || Number(paymentAmount) <= 0) {
      setConfirmState({
        show: true,
        title: 'Invalid Input',
        message: 'Please fill out all fields with valid values.',
        showCancel: false,
        confirmText: 'OK',
        isDanger: false
      });
      return;
    }

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    await db.payments.add({
      id: crypto.randomUUID(),
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      date: paymentDate,
      amount: Number(paymentAmount),
      type: paymentType,
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setSelectedStudentId('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentAmount('');
    setPaymentType('bank');
    setIsAddPaymentOpen(false);
  };

  // Delete Payment
  const handleDeletePayment = (paymentId, studentName, amount) => {
    setConfirmState({
      show: true,
      title: 'Delete Payment',
      message: `Are you sure you want to delete this payment of $${amount.toFixed(2)} from ${studentName}?`,
      onConfirm: async () => {
        try {
          await db.payments.delete(paymentId);
        } catch (err) {
          console.error("Failed to delete payment:", err);
          setConfirmState({
            show: true,
            title: 'Error Deleting Payment',
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

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const sortedPayments = [...filteredPayments];
  if (sortConfig.key !== null) {
    sortedPayments.sort((a, b) => {
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

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Payments Ledger</h1>
          <p style={{ color: 'var(--text-muted)' }}>Keep track of bank deposits and cash received from students</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddPaymentOpen(true)}>
          <Plus size={16} /> Log Payment
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search payments by student name..." 
            style={{ border: 'none', background: 'transparent', padding: '0.25rem 0' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Payment Mode:</span>
            <select 
              className="form-control" 
              style={{ width: '160px', padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash in Hand</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments List Card */}
      <div className="card" style={{ padding: 0 }}>
        {sortedPayments.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => requestSort('studentName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Student Name {getSortIcon('studentName')}
                  </th>
                  <th onClick={() => requestSort('studentPhone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Phone Number {getSortIcon('studentPhone')}
                  </th>
                  <th onClick={() => requestSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Payment Date {getSortIcon('date')}
                  </th>
                  <th onClick={() => requestSort('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Method {getSortIcon('type')}
                  </th>
                  <th onClick={() => requestSort('amount')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                    Amount Paid {getSortIcon('amount')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.studentName}</td>
                    <td>{p.studentPhone}</td>
                    <td>{p.date}</td>
                    <td>
                      <span className={`badge badge-${p.type === 'bank' ? 'primary' : 'success'}`}>
                        {p.type === 'bank' ? 'Bank Transfer' : 'Cash in Hand'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                      ${p.amount.toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--primary)' }}
                          onClick={() => openEditPayment(p)}
                          title="Edit Payment"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeletePayment(p.id, p.studentName, p.amount)}
                          title="Delete Payment"
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
            No payment records found. Record a payment to populate this statement.
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {isAddPaymentOpen && (
        <Modal isOpen={isAddPaymentOpen} onClose={() => setIsAddPaymentOpen(false)} title="Record Student Payment">
          <form onSubmit={handleAddPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="form-group">
              <label htmlFor="studentSearch">Search Student</label>
              <input 
                id="studentSearch"
                type="text"
                placeholder="Type name or phone number..."
                className="form-control"
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
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
                <option value="">
                  {filteredStudentsForSelect.length === 0 ? '-- No students match search --' : '-- Choose a student profile --'}
                </option>
                {filteredStudentsForSelect.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="pdate">Payment Date *</label>
              <input 
                id="pdate"
                type="date" 
                className="form-control" 
                required 
                value={paymentDate} 
                onChange={(e) => setPaymentDate(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="pamount">Payment Amount ($) *</label>
              <input 
                id="pamount"
                type="number" 
                step="0.01" 
                min="0.01" 
                className="form-control" 
                placeholder="0.00"
                required 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="ptype">Payment Method</label>
              <select 
                id="ptype" 
                className="form-control" 
                value={paymentType} 
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash in Hand</option>
              </select>
            </div>

            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddPaymentOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Log Payment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Payment Modal */}
      {isEditPaymentOpen && (
        <Modal isOpen={isEditPaymentOpen} onClose={() => setIsEditPaymentOpen(false)} title="Edit Student Payment">
          <form onSubmit={handleEditPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="form-group">
              <label htmlFor="editstudentSearch">Search Student</label>
              <input 
                id="editstudentSearch"
                type="text"
                placeholder="Type name or phone number..."
                className="form-control"
                value={editStudentSearchTerm}
                onChange={(e) => setEditStudentSearchTerm(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <label htmlFor="ebstudentSelect">Select Student *</label>
              <select 
                id="ebstudentSelect"
                className="form-control"
                required
                value={epStudentId}
                onChange={(e) => setEpStudentId(e.target.value)}
              >
                <option value="">
                  {filteredStudentsForEditSelect.length === 0 ? '-- No students match search --' : '-- Choose a student profile --'}
                </option>
                {filteredStudentsForEditSelect.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="epdateInput">Payment Date *</label>
              <input 
                id="epdateInput"
                type="date" 
                className="form-control" 
                required 
                value={epDate} 
                onChange={(e) => setEpDate(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="epamountInput">Payment Amount ($) *</label>
              <input 
                id="epamountInput"
                type="number" 
                step="0.01" 
                min="0.01" 
                className="form-control" 
                placeholder="0.00"
                required 
                value={epAmount} 
                onChange={(e) => setEpAmount(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="eptypeInput">Payment Method</label>
              <select 
                id="eptypeInput" 
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

      {/* Generic Confirmation Modal */}
      <ConfirmationModal confirmState={confirmState} setConfirmState={setConfirmState} />
    </div>
  );
}
