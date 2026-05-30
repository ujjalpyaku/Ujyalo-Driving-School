import { useState, useEffect } from 'react';
import { db } from '../db';
import { Phone, User, Moon, Sun, ArrowLeft, Send } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(^|\s|-)\S/g, l => l.toUpperCase());
};

export default function StudentEnrolment({ theme, toggleTheme, onBackToHome }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  
  const [avail, setAvail] = useState({
    Monday: { morning: false, afternoon: false },
    Tuesday: { morning: false, afternoon: false },
    Wednesday: { morning: false, afternoon: false },
    Thursday: { morning: false, afternoon: false },
    Friday: { morning: false, afternoon: false },
    Saturday: { morning: false, afternoon: false },
    Sunday: { morning: false, afternoon: false }
  });

  const [hasTest, setHasTest] = useState(false);
  const [testDate, setTestDate] = useState('');
  const [testTime, setTestTime] = useState('');
  const [notes, setNotes] = useState('');
  
  const [existingPhones, setExistingPhones] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: '', cancelText: '', isDanger: false });

  // Load existing phone numbers from students and pending enrolment requests
  useEffect(() => {
    const fetchPhones = async () => {
      try {
        const [students, enrolments] = await Promise.all([
          db.students.toArray(),
          db.enrolments.toArray()
        ]);
        const phones = new Set();
        students.forEach(s => {
          if (s.phone) phones.add(s.phone);
        });
        enrolments.forEach(e => {
          if (e.phone) phones.add(e.phone);
        });
        setExistingPhones(phones);
      } catch (err) {
        console.error('Error fetching existing phone numbers:', err);
      }
    };
    fetchPhones();
  }, []);

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

  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  const phoneRegex = /^(?:\+?61|0)4\d{8}$/;
  
  const isPhoneDirty = phone.length > 0;
  const isPhoneInvalid = isPhoneDirty && !phoneRegex.test(cleanPhone);
  
  let normalizedPhone = cleanPhone;
  if (cleanPhone.startsWith('+61')) {
    normalizedPhone = '0' + cleanPhone.slice(3);
  } else if (cleanPhone.startsWith('61')) {
    normalizedPhone = '0' + cleanPhone.slice(2);
  }
  
  const isPhoneDuplicate = isPhoneDirty && existingPhones.has(normalizedPhone);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      setConfirmState({
        show: true,
        title: 'Required Fields Missing',
        message: 'Please fill out your Name and Phone Number.',
        showCancel: false,
        confirmText: 'OK',
        isDanger: false
      });
      return;
    }

    if (isPhoneInvalid) {
      setConfirmState({
        show: true,
        title: 'Invalid Phone Number',
        message: 'Please enter a valid Australian mobile number.',
        showCancel: false,
        confirmText: 'OK',
        isDanger: true
      });
      return;
    }

    if (isPhoneDuplicate) {
      setConfirmState({
        show: true,
        title: 'Number Already Registered',
        message: `The phone number ${normalizedPhone} is already registered in our record. If you are already enrolled, please contact our support team.`,
        showCancel: false,
        confirmText: 'OK',
        isDanger: true
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await db.enrolments.add({
        id: crypto.randomUUID(),
        name: toTitleCase(name.trim()),
        phone: normalizedPhone,
        gender,
        availability: buildAvailString(avail),
        testDate: hasTest ? testDate : '',
        testTime: hasTest ? testTime : '',
        notes: notes.trim(),
        status: 'new',
        createdAt: new Date().toISOString()
      });

      setSubmitSuccess(true);
      // Reset form
      setName('');
      setPhone('');
      setGender('Male');
      setHasTest(false);
      setTestDate('');
      setTestTime('');
      setNotes('');
      setAvail({
        Monday: { morning: false, afternoon: false },
        Tuesday: { morning: false, afternoon: false },
        Wednesday: { morning: false, afternoon: false },
        Thursday: { morning: false, afternoon: false },
        Friday: { morning: false, afternoon: false },
        Saturday: { morning: false, afternoon: false },
        Sunday: { morning: false, afternoon: false }
      });
    } catch (err) {
      console.error('Error submitting enrolment:', err);
      setConfirmState({
        show: true,
        title: 'Error Submitting Enrolment',
        message: 'Failed to submit enrolment request. Please try again. ' + err.message,
        showCancel: false,
        confirmText: 'OK',
        isDanger: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', transition: 'background-color var(--transition-normal)' }}>
      {/* Top Header Navigation */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(var(--glass-blur))',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onBackToHome}
            style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} /> Home
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚗</span>
            <h2 style={{ fontSize: '1.25rem', margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Ujyalo Driving School
            </h2>
          </div>
        </div>

        <button 
          className="btn btn-secondary btn-sm" 
          onClick={toggleTheme}
          style={{ padding: '0.4rem', borderRadius: '50%', display: 'flex', width: '36px', height: '36px', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {submitSuccess ? (
          <div className="card animate-fade-in" style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Enrolment Request Submitted!</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', fontSize: '1rem', lineHeight: '1.6' }}>
              Thank you for enrolling with **Ujyalo Driving School**. Your request has been successfully queued for admin approval. 
              We will verify your details and get in touch with you shortly to schedule your first lesson.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setSubmitSuccess(false)}>
                Submit Another Enrolment
              </button>
              <button className="btn btn-secondary" onClick={onBackToHome}>
                Back to Home Page
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{
            padding: '2.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-glass)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Student Enrolment</h1>
              <p style={{ color: 'var(--text-muted)' }}>Fill in your details below to register and book lessons with us</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Name */}
              <div className="form-group">
                <label htmlFor="student-fullname" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    id="student-fullname"
                    type="text" 
                    className="form-control" 
                    placeholder="Enter your full name"
                    style={{ paddingLeft: '36px' }}
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                  />
                </div>
              </div>

              {/* Phone and Gender */}
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="student-phone" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Phone Number *</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      id="student-phone"
                      type="tel" 
                      className="form-control" 
                      placeholder="e.g. 0412 345 678"
                      style={{ paddingLeft: '36px' }}
                      required 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                    />
                  </div>
                  {isPhoneInvalid && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                      ⚠️ Please enter a valid Australian mobile number.
                    </span>
                  )}
                  {isPhoneDuplicate && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block', fontWeight: 500 }}>
                      ⚠️ This phone number already exists in our record.
                    </span>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="student-gender" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Gender</label>
                  <select 
                    id="student-gender" 
                    className="form-control" 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Availability Checks */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Your Preferred Availability</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                  gap: '0.75rem', 
                  background: 'var(--bg-hover)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px', 
                  padding: '1.25rem' 
                }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day} style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.4rem', 
                      padding: '0.65rem 0.85rem', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px' 
                    }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{day}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0, fontSize: '0.8rem' }}>
                          <input 
                            type="checkbox" 
                            checked={avail[day]?.morning || false} 
                            onChange={(e) => setAvail(prev => ({
                              ...prev,
                              [day]: { ...prev[day], morning: e.target.checked }
                            }))}
                          />
                          Morning
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0, fontSize: '0.8rem' }}>
                          <input 
                            type="checkbox" 
                            checked={avail[day]?.afternoon || false} 
                            onChange={(e) => setAvail(prev => ({
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

              {/* Driving Test Scheduling */}
              <div style={{ 
                border: '1px solid var(--border)', 
                borderRadius: '10px', 
                padding: '1.25rem',
                background: hasTest ? 'rgba(var(--primary-hue), 85%, 3%)' : 'transparent',
                borderColor: hasTest ? 'var(--primary)' : 'var(--border)',
                transition: 'all var(--transition-normal)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={hasTest} 
                    onChange={(e) => setHasTest(e.target.checked)} 
                  />
                  I have a driving test already scheduled
                </label>

                {hasTest && (
                  <div className="form-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
                    <div className="form-group">
                      <label htmlFor="student-testDate" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Test Date</label>
                      <input 
                        id="student-testDate" 
                        type="date"
                        className="form-control" 
                        required={hasTest}
                        value={testDate} 
                        onChange={(e) => setTestDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="student-testTime" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Test Time</label>
                      <input 
                        id="student-testTime" 
                        type="time"
                        className="form-control" 
                        required={hasTest}
                        value={testTime} 
                        onChange={(e) => setTestTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="form-group">
                <label htmlFor="student-notes" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Additional Comments / Requirements (Optional)</label>
                <textarea
                  id="student-notes"
                  className="form-control"
                  placeholder="Tell us about your driving experience, transmission preference (auto/manual), or any other requests..."
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || isPhoneInvalid || isPhoneDuplicate}
                style={{
                  padding: '0.85rem',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  fontWeight: '600'
                }}
              >
                {isSubmitting ? (
                  <span>Submitting request...</span>
                ) : (
                  <>
                    <Send size={18} /> Submit Enrolment Request
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      <ConfirmationModal confirmState={confirmState} setConfirmState={setConfirmState} />
    </div>
  );
}
