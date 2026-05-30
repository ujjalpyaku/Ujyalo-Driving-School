import { useState, useEffect } from 'react';
import { useLiveQuery } from '../db';
import { db } from '../db';
import { Trash2, Search, Phone, CheckCircle2 } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Enquiries() {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: '', cancelText: '', isDanger: false });

  const inquiries = useLiveQuery(() => db.inquiries.toArray()) || [];

  // Mark all new enquiries as read when viewing the page
  useEffect(() => {
    const markAsRead = async () => {
      try {
        await db.inquiries.where('status').equals('new').modify({ status: 'read' });
      } catch (err) {
        console.error("Failed to mark inquiries as read:", err);
      }
    };
    markAsRead();
  }, []);

  const handleDeleteClick = (id, name) => {
    setConfirmState({
      show: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete the booking inquiry from ${name}? It will be moved to the Recycle Bin.`,
      onConfirm: async () => {
        try {
          const item = await db.inquiries.get(id);
          if (item) {
            await db.trash.add({
              id: 'enquiry-' + id,
              type: 'enquiry',
              deletedAt: new Date().toISOString(),
              data: item
            });
            await db.inquiries.delete(id);
          }
        } catch (err) {
          console.error("Failed to delete inquiry:", err);
          setConfirmState({
            show: true,
            title: 'Error Deleting Inquiry',
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

  const filteredInquiries = inquiries.filter(item => {
    const query = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.phone.includes(query) ||
      item.course.toLowerCase().includes(query) ||
      (item.message || '').toLowerCase().includes(query)
    );
  });

  const sortedInquiries = [...filteredInquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Booking Enquiries</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage incoming lesson booking requests submitted from the landing page</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search enquiries by name, phone, course, or message..." 
            style={{ border: 'none', background: 'transparent', padding: '0.25rem 0' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0 }}>
        {sortedInquiries.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '200px' }}>Name & Contact</th>
                  <th style={{ width: '250px' }}>Interested Course</th>
                  <th>Message / Availability</th>
                  <th style={{ width: '180px' }}>Received Date</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedInquiries.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{item.name}</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={13} /> {item.phone}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.8rem', whiteSpace: 'normal', display: 'inline-block' }}>
                        {item.course}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                      {item.message || <em style={{ color: 'var(--text-muted)' }}>No availability/message provided</em>}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(item.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-icon-only btn-sm" 
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteClick(item.id, item.name)}
                          title="Delete Enquiry"
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
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.5, color: 'var(--success)' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>No enquiries found</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>When users submit the booking request form on the landing page, they will show up here.</div>
          </div>
        )}
      </div>

      {/* Generic Confirmation Modal */}
      <ConfirmationModal confirmState={confirmState} setConfirmState={setConfirmState} />
    </div>
  );
}
