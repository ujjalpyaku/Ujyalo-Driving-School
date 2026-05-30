import { LayoutDashboard, Users, Calendar, CreditCard, Settings, Sun, Moon, Trash2, LogOut, Mail, UserCheck } from 'lucide-react';
import { useLiveQuery } from '../db';
import { db } from '../db';

export default function Sidebar({ activeTab, setActiveTab, theme, toggleTheme, onLogout }) {
  const newEnquiriesCount = useLiveQuery(
    async () => {
      try {
        const list = await db.inquiries.toArray();
        return list.filter(item => item.status === 'new').length;
      } catch {
        return 0;
      }
    },
    [],
    0
  );

  const pendingEnrolmentsCount = useLiveQuery(
    async () => {
      try {
        const list = await db.enrolments.toArray();
        return list.filter(item => item.status === 'pending').length;
      } catch {
        return 0;
      }
    },
    [],
    0
  );

  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'enrolments', label: 'Enrolments', icon: UserCheck },
    { id: 'enquiries', label: 'Enquiries', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="logo-section">
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            U
          </div>
          <h2 style={{ margin: 0 }}>Ujyalo Driving</h2>
        </div>
        <nav className="nav-links" style={{ display: 'flex', flexDirection: 'column' }}>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                className={`nav-link ${activeTab === link.id ? 'active' : ''}`}
                onClick={() => setActiveTab(link.id)}
              >
                <Icon size={20} />
                <span>{link.label}</span>
                {link.id === 'enquiries' && newEnquiriesCount > 0 && (
                  <span style={{
                    background: 'var(--danger)',
                    color: 'var(--text-on-primary)',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '10px',
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '18px',
                    height: '18px'
                  }}>
                    {newEnquiriesCount}
                  </span>
                )}
                {link.id === 'enrolments' && pendingEnrolmentsCount > 0 && (
                  <span style={{
                    background: 'var(--warning)',
                    color: 'white',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '10px',
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '18px',
                    height: '18px'
                  }}>
                    {pendingEnrolmentsCount}
                  </span>
                )}
              </button>
            );
          })}
          
          <button
            className="nav-link"
            onClick={onLogout}
            style={{ 
              color: 'var(--danger)', 
              marginTop: '1rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '0.75rem',
              borderRadius: 0
            }}
            title="Log out and return to landing page"
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </nav>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderTop: '1px solid var(--border)', 
        paddingTop: '1rem', 
        marginTop: '2rem' 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged in as</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Owner / Admin</span>
        </div>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label="Toggle theme"
          title="Toggle light/dark mode"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </aside>
  );
}
