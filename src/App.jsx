import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Students from './views/Students';
import Bookings from './views/Bookings';
import Payments from './views/Payments';
import Settings from './views/Settings';
import Trash from './views/Trash';
import LandingPage from './views/LandingPage';
import AdminLogin from './components/AdminLogin';
import Enquiries from './views/Enquiries';
import { db } from './db';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAdminAuthenticated') === 'true';
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme class to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen to system prefers-color-scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Only adapt if the user hasn't pinned a manual theme preference in localStorage
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Dynamic document title based on routing and auth state
  useEffect(() => {
    if (currentPath === '/admin') {
      if (isAuthenticated) {
        document.title = 'Ujyalo Driving School - Admin Dashboard';
      } else {
        document.title = 'Ujyalo Driving School - Admin Login';
      }
    }
  }, [currentPath, isAuthenticated]);

  // Sync state with URL pathname changes (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to log out of the admin session?');
    if (confirmed) {
      setIsAuthenticated(false);
      sessionStorage.removeItem('isAdminAuthenticated');
      navigateTo('/');
    }
  };

  // Auto-update student status to inactive if they haven't taken lessons in last 15 days
  useEffect(() => {
    const updateStudentStatuses = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const students = await db.students.toArray();
        const bookings = await db.bookings.toArray();

        // Process active students only (default to active if no status is specified)
        const activeStudents = students.filter(s => s.status === 'active' || !s.status);

        for (const student of activeStudents) {
          const studentBookings = bookings.filter(b => b.studentId === student.id && b.status !== 'cancelled');

          if (studentBookings.length === 0) {
            // No bookings at all. Check profile creation date.
            const createdAtDate = student.createdAt ? new Date(student.createdAt) : null;
            if (createdAtDate) {
              const diffTime = today - createdAtDate;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 15) {
                await db.students.update(student.id, { status: 'inactive' });
              }
            }
            continue;
          }

          // Find the date of the most recent booking
          const bookingDates = studentBookings.map(b => new Date(b.date));
          const mostRecentBookingDate = new Date(Math.max(...bookingDates));

          // Days elapsed since the most recent booking
          const diffTime = today - mostRecentBookingDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 15) {
            await db.students.update(student.id, { status: 'inactive' });
          }
        }
      } catch (err) {
        console.error('Failed to auto-update student statuses:', err);
      }
    };

    updateStudentStatuses();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Render view based on active tab
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            setActiveTab={setActiveTab} 
            setSelectedStudentId={setSelectedStudentId} 
          />
        );
      case 'students':
        return (
          <Students 
            selectedStudentId={selectedStudentId} 
            setSelectedStudentId={setSelectedStudentId} 
          />
        );
      case 'bookings':
        return <Bookings />;
      case 'payments':
        return <Payments />;
      case 'enquiries':
        return <Enquiries />;
      case 'settings':
        return <Settings />;
      case 'trash':
        return <Trash />;
      default:
        return (
          <Dashboard 
            setActiveTab={setActiveTab} 
            setSelectedStudentId={setSelectedStudentId} 
          />
        );
    }
  };

  // Main page layout switcher based on URL path
  if (currentPath === '/admin') {
    if (!isAuthenticated) {
      return (
        <AdminLogin 
          onLoginSuccess={() => {
            setIsAuthenticated(true);
            sessionStorage.setItem('isAdminAuthenticated', 'true');
          }} 
          onBackToHome={() => navigateTo('/')} 
        />
      );
    }

    return (
      <div className="app-container">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            // Reset selected student context when switching tabs unless opening students
            if (tab !== 'students') {
              setSelectedStudentId(null);
            }
          }} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          onLogout={handleLogout}
        />
        <main className="main-content">
          {renderActiveView()}
        </main>
      </div>
    );
  }

  // Default to Landing Page for all other routes
  return <LandingPage theme={theme} toggleTheme={toggleTheme} />;
}

export default App;
