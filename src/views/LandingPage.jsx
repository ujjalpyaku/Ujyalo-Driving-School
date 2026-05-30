import { useState, useEffect } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Car, 
  Shield, 
  Award, 
  CheckCircle, 
  ArrowRight, 
  Calendar, 
  Globe, 
  Clock, 
  UserCheck,
  Sun,
  Moon,
  AlertCircle
} from 'lucide-react';

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(^|\s|-)\S/g, l => l.toUpperCase());
};

export default function LandingPage({ theme, toggleTheme, navigateTo }) {
  const handleEnrolClick = () => {
    if (navigateTo) {
      navigateTo('/student-enrolment');
    } else {
      window.history.pushState({}, '', '/student-enrolment');
      window.dispatchEvent(new Event('popstate'));
    }
  };
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryCourse, setInquiryCourse] = useState('Beginner Course (No experience)');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState({ show: false, message: '' });

  // Fetch settings dynamically from database
  const pricingSettings = useLiveQuery(() => db.settings.get('pricing'));
  const schoolDetails = useLiveQuery(() => db.settings.get('schoolDetails'));

  // Standard fallback default rates if not loaded yet
  const rates = pricingSettings || { normalRate: 63, packageRate: 63, testRate: 210 };
  const details = schoolDetails || {};
  const phone = details.phone || '+61 400 000 000';
  const email = details.email || 'info@ujyalodriving.com.au';
  const serviceLocations = details.serviceLocations || 'Sydney CBD, Inner West, Eastern Suburbs, St George Area';
  const pickupLocations = details.pickupLocations || 'Home, School, Work, or nearest Train Station';

  useEffect(() => {
    // Set dynamic SEO-friendly page title
    document.title = 'Ujyalo Driving School - Learn to Drive Confidently';
  }, []);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();

    const cleanPhone = inquiryPhone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(?:\+?61|0)4\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setShowErrorModal({ show: true, message: 'Please enter a valid Australian mobile number (e.g. 0412 345 678 or +61 412 345 678).' });
      return;
    }

    let normalizedPhone = cleanPhone;
    if (cleanPhone.startsWith('+61')) {
      normalizedPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('61')) {
      normalizedPhone = '0' + cleanPhone.slice(2);
    }

    setSubmitted(true);
    try {
      await db.inquiries.add({
        id: Date.now().toString(),
        name: toTitleCase(inquiryName.trim()),
        phone: normalizedPhone,
        course: inquiryCourse,
        message: inquiryMsg.trim(),
        status: 'new',
        createdAt: new Date().toISOString()
      });
      
      setTimeout(() => {
        setInquiryName('');
        setInquiryPhone('');
        setInquiryCourse('Beginner Course (No experience)');
        setInquiryMsg('');
        setSubmitted(false);
        setShowSuccessModal(true);
      }, 600);
    } catch (err) {
      setShowErrorModal({ show: true, message: err.message });
      setSubmitted(false);
    }
  };

  return (
    <div style={{
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-main)',
      backgroundColor: 'var(--bg-app)',
      minHeight: '100vh',
      lineHeight: 1.6,
      overflowX: 'hidden'
    }}>
      {/* Dynamic Background Circles */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, rgba(124,58,237,0) 70%)',
        top: '-100px',
        left: '-100px',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(180,256,180,0.04) 0%, rgba(180,256,180,0) 70%)',
        top: '600px',
        right: '-100px',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 100,
        padding: '0.75rem 2rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Logo and Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <img 
              src="/ujyalo_logo.png" 
              alt="Ujyalo Driving School Logo" 
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                boxShadow: 'var(--shadow-sm)',
                border: '2px solid var(--primary)',
                objectFit: 'cover'
              }}
            />
            <div>
              <span style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: '1.25rem', 
                fontWeight: 800, 
                color: 'var(--primary)',
                letterSpacing: '-0.3px',
                display: 'block'
              }}>
                UJYALO
              </span>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                color: 'var(--text-muted)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                display: 'block',
                marginTop: '-3px'
              }}>
                Driving School
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <a href="#features" className="nav-link-landing">Features</a>
            <a href="#pricing" className="nav-link-landing">Pricing</a>
            <a href="#locations" className="nav-link-landing">Locations</a>
            <button onClick={handleEnrolClick} className="nav-link-landing" style={{ background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}>Online Enrolment</button>
            <a href="#contact" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem' }}>Book Lesson</a>
            <button 
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title="Toggle light/dark mode"
              aria-label="Toggle light and dark mode"
              style={{ color: 'var(--text-muted)' }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '5rem 2rem 4rem 2rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '4rem',
          alignItems: 'center'
        }}>
          {/* Hero Left Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(124,58,237,0.08)', padding: '0.4rem 0.85rem', borderRadius: '30px', border: '1px solid rgba(124,58,237,0.15)', alignSelf: 'flex-start' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sydney Accredited Driving Instructors
              </span>
            </div>
            
            <h1 style={{
              fontSize: '3.25rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              lineHeight: 1.15,
              color: 'var(--text-main)',
              letterSpacing: '-1px',
              margin: 0
            }}>
              Drive Safely. Learn Confidently with <span style={{ color: 'var(--primary)' }}>Ujyalo</span>.
            </h1>
            
            <p style={{
              fontSize: '1.1rem',
              color: 'var(--text-muted)',
              maxWidth: '550px',
              margin: 0
            }}>
              Whether you are a nervous beginner getting behind the wheel for the first time, or an experienced international driver looking for a fast overseas licence conversion, Ujyalo Driving School provides tailored, stress-free driver education in Sydney.
            </p>

            {/* Beginner & Overseas Licences Panels */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              marginTop: '0.5rem'
            }}>
              <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} />
                  <strong style={{ fontSize: '0.95rem' }}>For Beginners</strong>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Nervous drivers welcome. Master vehicle control step-by-step in modern, dual-controlled automatic vehicles.
                </span>
              </div>
              <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={20} />
                  <strong style={{ fontSize: '0.95rem' }}>Licence Conversion</strong>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Overseas conversion specialists. Learn practical RMS test requirements and Australian road guidelines quickly.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <a href="#contact" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', gap: '0.5rem', borderRadius: '30px', textDecoration: 'none' }}>
                Book Your First Lesson <ArrowRight size={18} />
              </a>
              <button onClick={handleEnrolClick} className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', borderRadius: '30px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Online Enrolment
              </button>
            </div>
          </div>

          {/* Hero Right Banner Image */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              opacity: 0.08,
              borderRadius: '24px',
              transform: 'rotate(-3deg)',
              zIndex: 0
            }} />
            <img 
              src="/driving_hero_new.png" 
              alt="Ujyalo Driving School Lesson Hero" 
              style={{
                width: '100%',
                maxHeight: '480px',
                borderRadius: '24px',
                objectFit: 'cover',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                zIndex: 1,
                position: 'relative'
              }}
            />
          </div>
        </div>
      </section>

      {/* Trust & Features Section */}
      <section id="features" style={{
        padding: '3rem 2rem',
        background: 'var(--bg-hover)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Car size={32} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Dual-Control Cars</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Maximum safety & control</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Award size={32} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>RMS Accredited</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Highly qualified training</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Clock size={32} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Flexible Hours</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Learn at your convenience</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <UserCheck size={32} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Patient Instructors</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Friendly, calm coaching</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{
        padding: '5rem 2rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3rem'
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)' }}>
              Transparent, Professional Pricing
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, maxWidth: '600px' }}>
              Select a lesson format that suits your learning goals. No hidden fees, clear pricing models, and locked-in rates.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
            width: '100%'
          }}>
            {/* Class Rate Card */}
            <div className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '2rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  Single Lesson
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Class Lesson Rate</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>${rates.normalRate}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ hour</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, minHeight: '60px' }}>
                  Perfect for beginners starting out, nervous drivers looking to build initial confidence, or refresher sessions.
                </p>
              </div>
              <ul style={{ padding: 0, margin: '1.5rem 0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> 1-on-1 private tuition</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> Dual-controlled modern automatic car</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> Custom lesson plan & feedback</li>
              </ul>
              <a href="#contact" className="btn btn-secondary" style={{ textDecoration: 'none', justifyContent: 'center' }}>Book Lesson</a>
            </div>

            {/* Package Rate Card */}
            <div className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '2rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--primary)',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
              background: 'var(--bg-card)'
            }}>
              {/* Popular Badge */}
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Best Value Package
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                  Multi-Class Discount
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>5-Lesson Block Package</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>${rates.packageRate}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ hour</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '-0.25rem' }}>
                  Total Package price: ${(rates.packageRate * 5).toFixed(0)} (Min. 5 classes)
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, minHeight: '60px' }}>
                  Best for comprehensive training, logging supervised hours, and building structured safe driving habits.
                </p>
              </div>
              <ul style={{ padding: 0, margin: '1.5rem 0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> Structured 5-lesson log curriculum</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> 3-for-1 Logbook hours (3 hours logged per hour class)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> Pick-up & drop-off flexibility</li>
              </ul>
              <a href="#contact" className="btn btn-primary" style={{ textDecoration: 'none', justifyContent: 'center' }}>Buy Package</a>
            </div>

            {/* Test Prep Card */}
            <div className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '2rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  Assessment Prep
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Test Day & Car Hire</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>${rates.testRate}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}> flat rate</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, minHeight: '60px' }}>
                  Ensure peace of mind on test day. Includes mock-test practice run and vehicle rental for your practical driving exam.
                </p>
              </div>
              <ul style={{ padding: 0, margin: '1.5rem 0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> 60-min pre-test warm-up lesson</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> Car rental for RMS Practical Test</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--primary)" /> Expert support & transport on the day</li>
              </ul>
              <a href="#contact" className="btn btn-secondary" style={{ textDecoration: 'none', justifyContent: 'center' }}>Book Test Day</a>
            </div>
          </div>
        </div>
      </section>

      {/* Locations & Logistics Section */}
      <section id="locations" style={{
        padding: '5rem 2rem',
        background: 'var(--bg-hover)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4rem',
          alignItems: 'center'
        }}>
          {/* Service Areas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <MapPin size={24} />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)' }}>
                Our Service Locations
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              We provide professional driving tuition across a wide array of suburbs. Our core serviced locations are managed dynamically and include:
            </p>
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>ACTIVE COVERAGE REGIONS:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {serviceLocations.split(',').map((loc, idx) => (
                  <span key={idx} style={{
                    background: 'rgba(124,58,237,0.06)',
                    border: '1px solid rgba(124,58,237,0.15)',
                    color: 'var(--primary)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    {loc.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Pickup/Drop-off Logistics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Car size={24} />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)' }}>
                Convenient Pick-up & Drop-off
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              We want to make fitting lessons into your busy schedule as simple as possible. Our instructors offer flexible pick-up and drop-off logistics to suit your day:
            </p>
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>FLEXIBLE MEETING POINTS:</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {pickupLocations}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Form / Inquiry Section */}
      <section id="contact" style={{
        padding: '5rem 2rem',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div className="card" style={{
          padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>
              <Calendar size={32} />
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)' }}>
              Request a Driving Lesson Booking
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Fill in your details below and we will contact you to confirm a structured slot.
            </p>
          </div>

          <form onSubmit={handleInquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="inq-name" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Full Name *</label>
                <input 
                  id="inq-name"
                  type="text" 
                  className="form-control" 
                  placeholder="Your Name" 
                  required 
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="inq-phone" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Phone Number *</label>
                <input 
                  id="inq-phone"
                  type="tel" 
                  className="form-control" 
                  placeholder="e.g. 0400000000" 
                  required 
                  value={inquiryPhone}
                  onChange={(e) => setInquiryPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="inq-course" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Interested Course *</label>
              <select
                id="inq-course"
                className="form-control"
                required
                value={inquiryCourse}
                onChange={(e) => setInquiryCourse(e.target.value)}
              >
                <option value="Beginner Course (No experience)">Beginner Course (No experience)</option>
                <option value="Intermediate Course (Some experience, working on specific skills)">Intermediate Course (Some experience, working on specific skills)</option>
                <option value="Refresher Course (Licensed driver needing practice/Overseas licence convert)">Refresher Course (Licensed driver needing practice/Overseas licence convert)</option>
                <option value="Pre-Test Assessment/Lesson">Pre-Test Assessment/Lesson</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="inq-msg" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Message / Preferred Schedule Days</label>
              <textarea 
                id="inq-msg"
                className="form-control" 
                placeholder="Let us know your availability (e.g. Monday Morning, Friday Evening) or if you are preparing for overseas conversion." 
                rows="4"
                value={inquiryMsg}
                onChange={(e) => setInquiryMsg(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: 600 }} disabled={submitted}>
              {submitted ? 'Submitting Inquiry...' : 'Submit Booking Inquiry'}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#0b0f19',
        color: 'rgba(255, 255, 255, 0.65)',
        padding: '3rem 2rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          {/* Logo & Contact details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
              UJYALO DRIVING SCHOOL
            </span>
            <span style={{ fontSize: '0.85rem' }}>Safe, patient driver education tailored for you.</span>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Phone size={14} /> {phone}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Mail size={14} /> {email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem' }}>
              © {new Date().getFullYear()} Ujyalo Driving School. All Rights Reserved.
            </span>
          </div>
        </div>
      </footer>

      {/* Success Modal */}
      {showSuccessModal && (
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
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1.25rem'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.25rem'
            }}>
              <CheckCircle size={36} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
              Inquiry Submitted!
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Thank you for your booking request! We will contact you shortly to confirm your scheduled driving lesson.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowSuccessModal(false)}
              style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', fontWeight: 600, marginTop: '0.5rem' }}
            >
              Great, thank you!
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal.show && (
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
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1.25rem'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.25rem'
            }}>
              <AlertCircle size={36} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
              Submission Failed
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {showErrorModal.message}
            </p>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowErrorModal({ show: false, message: '' })}
              style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', fontWeight: 600, marginTop: '0.5rem' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
