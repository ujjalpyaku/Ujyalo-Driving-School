import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { Save, Download, Upload, Info, AlertTriangle, CheckCircle2, Shield, HelpCircle, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
  const [normalRate, setNormalRate] = useState('');
  const [packageRate, setPackageRate] = useState('');
  const [testRate, setTestRate] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [serviceLocations, setServiceLocations] = useState('');
  const [pickupLocations, setPickupLocations] = useState('');
  const [saveSchoolSuccess, setSaveSchoolSuccess] = useState(false);

  // Security Settings states
  const [q1, setQ1] = useState('');
  const [ans1, setAns1] = useState('');
  const [q2, setQ2] = useState('');
  const [ans2, setAns2] = useState('');
  const [q3, setQ3] = useState('');
  const [ans3, setAns3] = useState('');
  const [saveSecuritySuccess, setSaveSecuritySuccess] = useState(false);

  // Show/Hide answer toggle states
  const [showAns1, setShowAns1] = useState(false);
  const [showAns2, setShowAns2] = useState(false);
  const [showAns3, setShowAns3] = useState(false);

  const importFileRef = useRef(null);

  // Fetch settings
  const pricingSettings = useLiveQuery(() => db.settings.get('pricing'));
  const schoolDetails = useLiveQuery(() => db.settings.get('schoolDetails'));
  const securitySettings = useLiveQuery(() => db.settings.get('security'));

  const questionOptions = [
    'In what city or town did your parents meet?',
    'What was the make and model of your first car?',
    'What is your favorite childhood movie?',
    'What is the name of the hospital where you were born?',
    'In what city or town did you get your first job?',
    'What was the name of your first pet?',
    'What was the street name where you grew up?',
    'What is the name of your favorite book?',
    'What was the name of your primary school?',
    'What was your favorite subject in high school?'
  ];

  // Sync form inputs with DB values
  useEffect(() => {
    if (pricingSettings) {
      setNormalRate(pricingSettings.normalRate);
      setPackageRate(pricingSettings.packageRate);
      setTestRate(pricingSettings.testRate);
    }
  }, [pricingSettings]);

  useEffect(() => {
    if (schoolDetails) {
      setSchoolPhone(schoolDetails.phone || '');
      setSchoolEmail(schoolDetails.email || '');
      setServiceLocations(schoolDetails.serviceLocations || '');
      setPickupLocations(schoolDetails.pickupLocations || '');
    }
  }, [schoolDetails]);

  useEffect(() => {
    if (securitySettings) {
      setQ1(securitySettings.question1 || '');
      setAns1(securitySettings.answer1 || '');
      setQ2(securitySettings.question2 || '');
      setAns2(securitySettings.answer2 || '');
      setQ3(securitySettings.question3 || '');
      setAns3(securitySettings.answer3 || '');
    }
  }, [securitySettings]);

  // Handle Save Pricing Rates
  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!normalRate || !packageRate || !testRate || normalRate <= 0 || packageRate <= 0 || testRate <= 0) {
      alert('Please enter valid, positive numbers for all lesson rates.');
      return;
    }

    try {
      await db.settings.put({
        id: 'pricing',
        normalRate: Number(normalRate),
        packageRate: Number(packageRate),
        testRate: Number(testRate),
        updatedAt: new Date().toISOString()
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save rates: ' + err.message);
    }
  };

  // Handle Save School Details
  const handleSaveSchoolDetails = async (e) => {
    e.preventDefault();
    if (!schoolPhone.trim() || !schoolEmail.trim() || !serviceLocations.trim() || !pickupLocations.trim()) {
      alert('Please fill out all school details, service locations, and pickup locations.');
      return;
    }

    try {
      await db.settings.put({
        id: 'schoolDetails',
        phone: schoolPhone.trim(),
        email: schoolEmail.trim(),
        serviceLocations: serviceLocations.trim(),
        pickupLocations: pickupLocations.trim(),
        updatedAt: new Date().toISOString()
      });

      setSaveSchoolSuccess(true);
      setTimeout(() => setSaveSchoolSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save school details: ' + err.message);
    }
  };

  // Handle Save Security Settings
  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    if (!q1 || !ans1.trim() || !q2 || !ans2.trim() || !q3 || !ans3.trim()) {
      alert('Please configure all 3 security questions and provide answers.');
      return;
    }
    if (q1 === q2 || q1 === q3 || q2 === q3) {
      alert('Each security question must be unique.');
      return;
    }

    try {
      const currentSec = await db.settings.get('security') || { password: 'ujyalo2026' };
      const updatedSec = { ...currentSec };
      delete updatedSec.recoveryEmail; // Clean up old recoveryEmail if it exists
      
      await db.settings.put({
        ...updatedSec,
        id: 'security',
        question1: q1,
        answer1: ans1.trim(),
        question2: q2,
        answer2: ans2.trim(),
        question3: q3,
        answer3: ans3.trim(),
        updatedAt: new Date().toISOString()
      });

      setSaveSecuritySuccess(true);
      setTimeout(() => setSaveSecuritySuccess(false), 3000);
    } catch (err) {
      alert('Failed to save security settings: ' + err.message);
    }
  };

  // Export data as JSON file
  const handleExportBackup = async () => {
    try {
      const studentsData = await db.students.toArray();
      const bookingsData = await db.bookings.toArray();
      const paymentsData = await db.payments.toArray();
      const settingsData = await db.settings.toArray();

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        students: studentsData,
        bookings: bookingsData,
        payments: paymentsData,
        settings: settingsData
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ujyalo_driving_school_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export backup data: ' + err.message);
    }
  };

  // Import JSON backup file
  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmed = window.confirm(
      'WARNING: Importing this backup file will overwrite all current student details, bookings, payments, and settings in this browser database.\n\nAre you sure you want to proceed?'
    );

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);

        // Simple validation check
        if (!backup.students || !backup.bookings || !backup.payments || !backup.settings) {
          throw new Error('Invalid backup file format. Missing core databases.');
        }

        // Wipe existing tables
        await Promise.all([
          db.students.clear(),
          db.bookings.clear(),
          db.payments.clear(),
          db.settings.clear()
        ]);

        // Bulk load tables
        if (backup.students.length > 0) await db.students.bulkAdd(backup.students);
        if (backup.bookings.length > 0) await db.bookings.bulkAdd(backup.bookings);
        if (backup.payments.length > 0) await db.payments.bulkAdd(backup.payments);
        
        if (backup.settings.length > 0) {
          await Promise.all(backup.settings.map(s => db.settings.put(s)));
        } else {
          // re-seed settings if empty
          await db.settings.put({
            id: 'pricing',
            normalRate: 63,
            packageRate: 63,
            testRate: 210,
            updatedAt: new Date().toISOString()
          });
        }

        alert('Database successfully restored! The application will now reload to display the new data.');
        window.location.reload();
      } catch (err) {
        alert('Failed to restore backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>System Settings</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure pricing models and manage local database backups</p>
        </div>
      </div>

      <div className="split-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Pricing Editor Section */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Update Default Lesson Rates</h3>
            
            <div 
              style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                padding: '0.85rem', 
                background: 'rgba(124, 58, 237, 0.08)', 
                border: '1px solid rgba(124, 58, 237, 0.2)', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                lineHeight: 1.4
              }}
            >
              <Info size={28} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Pricing Protection:</strong> Updating these default rates will **only** affect new lessons scheduled going forward. All existing bookings will preserve their original pricing as they were locked-in at the time they were booked.
              </div>
            </div>

            <form onSubmit={handleSavePricing} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="normal">Default Normal Lesson Rate ($/hr)</label>
                <input 
                  id="normal"
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  className="form-control" 
                  required 
                  value={normalRate} 
                  onChange={(e) => setNormalRate(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label htmlFor="package">Default Package Lesson Rate ($/hr)</label>
                <input 
                  id="package"
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  className="form-control" 
                  required 
                  value={packageRate} 
                  onChange={(e) => setPackageRate(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label htmlFor="test">Default Test preparation + Car hire Rate ($ flat)</label>
                <input 
                  id="test"
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  className="form-control" 
                  required 
                  value={testRate} 
                  onChange={(e) => setTestRate(e.target.value)} 
                />
              </div>

              {saveSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <CheckCircle2 size={18} /> Pricing rates saved successfully!
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                <Save size={16} /> Save Pricing Changes
              </button>
            </form>
          </div>

          {/* Driving School Details Section */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Update Driving School Details</h3>
            
            <form onSubmit={handleSaveSchoolDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="schoolPhone">School Contact Number</label>
                <input 
                  id="schoolPhone"
                  type="text" 
                  className="form-control" 
                  required 
                  value={schoolPhone} 
                  onChange={(e) => setSchoolPhone(e.target.value)} 
                  placeholder="e.g. +61 400 000 000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolEmail">School Email Address</label>
                <input 
                  id="schoolEmail"
                  type="email" 
                  className="form-control" 
                  required 
                  value={schoolEmail} 
                  onChange={(e) => setSchoolEmail(e.target.value)} 
                  placeholder="e.g. info@ujyalodriving.com.au"
                />
              </div>

              <div className="form-group">
                <label htmlFor="serviceLocs">Service Locations (Comma-separated)</label>
                <textarea 
                  id="serviceLocs"
                  className="form-control" 
                  required 
                  value={serviceLocations} 
                  onChange={(e) => setServiceLocations(e.target.value)} 
                  placeholder="e.g. Sydney CBD, Inner West, Eastern Suburbs"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label htmlFor="pickupLocs">Pickup & Drop-off Locations</label>
                <textarea 
                  id="pickupLocs"
                  className="form-control" 
                  required 
                  value={pickupLocations} 
                  onChange={(e) => setPickupLocations(e.target.value)} 
                  placeholder="e.g. Home, School, Work, or nearest Train Station"
                  rows="2"
                />
              </div>

              {saveSchoolSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <CheckCircle2 size={18} /> Driving school details saved successfully!
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                <Save size={16} /> Save School Details
              </button>
            </form>
          </div>

          {/* Account & Security Section */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} color="var(--primary)" /> Account & Security
            </h3>
            
            <form onSubmit={handleSaveSecurity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.75rem' }}>
                  Configure 3 Security Questions
                </span>
                
                {/* Question 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label htmlFor="q1">Security Question 1</label>
                    <select
                      id="q1"
                      className="form-control"
                      value={q1}
                      onChange={(e) => setQ1(e.target.value)}
                      required
                    >
                      <option value="">Select Question 1...</option>
                      {questionOptions.map(q => (
                        <option key={q} value={q} disabled={q === q2 || q === q3}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="ans1">Answer 1</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <HelpCircle size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                      <input
                        id="ans1"
                        type={showAns1 ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Answer 1"
                        required
                        value={ans1}
                        onChange={(e) => setAns1(e.target.value)}
                        style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAns1(!showAns1)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                        tabIndex="-1"
                      >
                        {showAns1 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label htmlFor="q2">Security Question 2</label>
                    <select
                      id="q2"
                      className="form-control"
                      value={q2}
                      onChange={(e) => setQ2(e.target.value)}
                      required
                    >
                      <option value="">Select Question 2...</option>
                      {questionOptions.map(q => (
                        <option key={q} value={q} disabled={q === q1 || q === q3}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="ans2">Answer 2</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <HelpCircle size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                      <input
                        id="ans2"
                        type={showAns2 ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Answer 2"
                        required
                        value={ans2}
                        onChange={(e) => setAns2(e.target.value)}
                        style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAns2(!showAns2)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                        tabIndex="-1"
                      >
                        {showAns2 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label htmlFor="q3">Security Question 3</label>
                    <select
                      id="q3"
                      className="form-control"
                      value={q3}
                      onChange={(e) => setQ3(e.target.value)}
                      required
                    >
                      <option value="">Select Question 3...</option>
                      {questionOptions.map(q => (
                        <option key={q} value={q} disabled={q === q1 || q === q2}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="ans3">Answer 3</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <HelpCircle size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                      <input
                        id="ans3"
                        type={showAns3 ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Answer 3"
                        required
                        value={ans3}
                        onChange={(e) => setAns3(e.target.value)}
                        style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAns3(!showAns3)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                        tabIndex="-1"
                      >
                        {showAns3 ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {saveSecuritySuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <CheckCircle2 size={18} /> Security settings saved successfully!
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                <Save size={16} /> Save Security Settings
              </button>
            </form>
          </div>
        </div>

        {/* Database Backup Section */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3>Database Backup & Restore</h3>
          
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            All app data is currently stored locally in your browser's memory. To prevent data loss when clearing browser history or switching computers, make regular backups.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleExportBackup} style={{ justifyContent: 'center' }}>
              <Download size={16} /> Export Backup (.json)
            </button>
            
            <input 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              ref={importFileRef}
              onChange={handleImportBackup}
            />
            
            <button 
              className="btn btn-secondary" 
              onClick={() => importFileRef.current?.click()}
              style={{ justifyContent: 'center' }}
            >
              <Upload size={16} /> Import Backup File
            </button>
          </div>

          <div 
            style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              padding: '0.75rem', 
              background: 'rgba(245, 158, 11, 0.08)', 
              border: '1px solid rgba(245, 158, 11, 0.2)', 
              borderRadius: 'var(--radius-sm)', 
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginTop: '0.5rem'
            }}
          >
            <AlertTriangle size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Warning:</strong> Importing a file overwrites all database contents. Do not interrupt the page reload after completing the import.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
