import { useState, useEffect, useRef } from 'react';
import { useLiveQuery, db, auth } from '../db';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Save, Download, Upload, Info, AlertTriangle, CheckCircle2, Shield, Eye, EyeOff, Key } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

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

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const importFileRef = useRef(null);
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null });

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

  // Fetch settings
  const pricingSettings = useLiveQuery(() => db.settings.get('pricing'));
  const schoolDetails = useLiveQuery(() => db.settings.get('schoolDetails'));

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



  // Handle Save Pricing Rates
  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!normalRate || !packageRate || !testRate || normalRate <= 0 || packageRate <= 0 || testRate <= 0) {
      showAlert('Invalid Lesson Rates', 'Please enter valid, positive numbers for all lesson rates.');
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
      showAlert('Error Saving Rates', 'Failed to save rates: ' + err.message, true);
    }
  };

  // Handle Save School Details
  const handleSaveSchoolDetails = async (e) => {
    e.preventDefault();
    if (!schoolPhone.trim() || !schoolEmail.trim() || !serviceLocations.trim() || !pickupLocations.trim()) {
      showAlert('Missing Information', 'Please fill out all school details, service locations, and pickup locations.');
      return;
    }

    const cleanPhone = schoolPhone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(?:\+?61|0)4\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      showAlert('Invalid Phone Number', 'Please enter a valid Australian mobile number for the school contact (e.g. 0412 345 678 or +61 412 345 678).');
      return;
    }

    let normalizedPhone = cleanPhone;
    if (cleanPhone.startsWith('+61')) {
      normalizedPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('61')) {
      normalizedPhone = '0' + cleanPhone.slice(2);
    }

    try {
      await db.settings.put({
        id: 'schoolDetails',
        phone: normalizedPhone,
        email: schoolEmail.trim(),
        serviceLocations: serviceLocations.trim(),
        pickupLocations: pickupLocations.trim(),
        updatedAt: new Date().toISOString()
      });

      setSaveSchoolSuccess(true);
      setTimeout(() => setSaveSchoolSuccess(false), 3000);
    } catch (err) {
      showAlert('Error Saving Details', 'Failed to save school details: ' + err.message, true);
    }
  };

  // Handle Change Password (Firebase Auth)
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setChangePasswordError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setChangePasswordError('No authenticated user found. Please re-login.');
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setChangePasswordSuccess(true);
      setCurrentPassword('');
      newPassword && setNewPassword('');
      confirmPassword && setConfirmPassword('');
      setTimeout(() => setChangePasswordSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setChangePasswordError('Incorrect current password.');
      } else {
        setChangePasswordError(err.message || 'Failed to update password.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Export data as JSON file
  const handleExportBackup = async () => {
    try {
      const studentsData = await db.students.toArray();
      const bookingsData = await db.bookings.toArray();
      const paymentsData = await db.payments.toArray();
      const settingsData = (await db.settings.toArray()).filter(s => s.id !== 'security');

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
      showAlert('Export Failed', 'Failed to export backup data: ' + err.message, true);
    }
  };

  // Import JSON backup file
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const target = e.target;

    setConfirmState({
      show: true,
      title: 'Import Backup Database',
      message: 'WARNING: Importing this backup file will overwrite all current student details, bookings, payments, and settings in your database.\n\nAre you sure you want to proceed?',
      showCancel: true,
      confirmText: 'Import & Overwrite',
      isDanger: true,
      onConfirm: () => {
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
              const filteredSettings = backup.settings.filter(s => s.id !== 'security');
              if (filteredSettings.length > 0) {
                await Promise.all(filteredSettings.map(s => db.settings.put(s)));
              }
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

            setConfirmState({
              show: true,
              title: 'Success',
              message: 'Database successfully restored! The application will now reload to display the new data.',
              showCancel: false,
              confirmText: 'OK',
              onConfirm: () => {
                window.location.reload();
              }
            });
          } catch (err) {
            setConfirmState({
              show: true,
              title: 'Error Restoring Backup',
              message: 'Failed to restore backup: ' + err.message,
              showCancel: false,
              confirmText: 'OK',
              isDanger: true
            });
          } finally {
            target.value = '';
          }
        };
        reader.readAsText(file);
      }
    });
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
            
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.75rem' }}>
                  Change Admin Password
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Update the master password for the active Firebase account (<strong>{auth.currentUser?.email}</strong>).
                </p>

                {/* Current Password */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="currentPassword">Current Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                    <input
                      id="currentPassword"
                      type={showCurrentPass ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter current password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                      disabled={changingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
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
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="newPassword">New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                    <input
                      id="newPassword"
                      type={showNewPass ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Minimum 6 characters"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                      disabled={changingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
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
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                    <input
                      id="confirmPassword"
                      type={showConfirmPass ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Repeat new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                      disabled={changingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
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
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {changePasswordError && (
                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  {changePasswordError}
                </div>
              )}

              {changePasswordSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  <CheckCircle2 size={18} /> Password updated successfully!
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }} disabled={changingPassword}>
                <Save size={16} /> {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Database Backup Section */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3>Database Backup & Restore</h3>
          
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            All application data is securely stored in your Google Firebase cloud database. You can export a JSON backup file for offline archiving, reporting, or migrating environment configurations.
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

      {/* Generic Confirmation Modal */}
      <ConfirmationModal confirmState={confirmState} setConfirmState={setConfirmState} />
    </div>
  );
}
