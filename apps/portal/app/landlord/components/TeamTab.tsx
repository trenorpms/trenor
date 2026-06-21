'use client';

import React, { useState, useEffect } from 'react';

interface TeamTabProps {
  user: any;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PendingInvite {
  id: string;
  email: string;
  expires_at: string;
  used: boolean;
}

export default function TeamTab({ user, addToast }: TeamTabProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [invitations, setInvitations] = useState<PendingInvite[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    
    // Load team data
    fetch('http://localhost:4000/api/auth/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ landlordId: user.id }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load team');
        return res.json();
      })
      .then((data) => {
        setManagers(data.managers || []);
        setInvitations(data.invitations || []);
      })
      .catch((err) => {
        console.error('Error fetching team:', err);
      });
  }, [user?.id, refreshKey]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      const landlordName = user?.name || 'Sarah Jenkins';
      const response = await fetch('http://localhost:4000/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          landlordId: user.id,
          landlordName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Invitation failed');
      }

      addToast(`Invitation sent to ${email} successfully.`, 'success');
      setEmail('');
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      addToast(err.message || 'Failed to send invite', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `http://localhost:3002/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link)
      .then(() => addToast('Invitation link copied to clipboard!', 'success'))
      .catch(() => addToast('Failed to copy invitation link.', 'error'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style jsx>{`
        .team-card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-muted);
          border-radius: 4px;
          padding: 24px;
        }
        .form-input {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-muted);
          color: var(--text-primary);
          padding: 10px 14px;
          border-radius: 4px;
          font-size: 13px;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          border-color: var(--accent-coral);
        }
        .btn-primary {
          background-color: var(--accent-coral);
          color: var(--bg-primary);
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-primary:hover {
          background-color: #ff8276;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-muted);
          color: var(--text-primary);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-secondary:hover {
          background-color: var(--bg-tertiary);
        }
        .team-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }
        .team-table th {
          color: var(--text-tertiary);
          font-weight: 500;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-muted);
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .team-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border-muted);
          color: var(--text-secondary);
        }
        .team-table tr:last-child td {
          border-bottom: none;
        }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-manager {
          background-color: rgba(255, 107, 107, 0.1);
          color: var(--accent-coral);
          border: 1px solid rgba(255, 107, 107, 0.2);
        }
        .badge-pending {
          background-color: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Team & Access</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Invite property managers to help list and oversee your real estate portfolio.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Side: Existing Team */}
        <div className="team-card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Active Team Members</h2>
          
          {managers.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              No active team members. Invite property managers using the invite form.
            </div>
          ) : (
            <table className="team-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((manager) => (
                  <tr key={manager.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{manager.name}</div>
                    </td>
                    <td>{manager.email}</td>
                    <td>
                      <span className="badge badge-manager">{manager.role}</span>
                    </td>
                    <td style={{ color: '#10b981', fontWeight: 500 }}>Active</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Side: Invite & Pending */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Invite Form */}
          <div className="team-card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Invite Property Manager</h3>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="manager@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Sending Invite...' : 'Send Access Invite'}
              </button>
            </form>
          </div>

          {/* Pending Invites */}
          <div className="team-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Pending Invites</h3>
            
            {invitations.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                No pending invitations.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{invite.email}</span>
                      <span className="badge badge-pending">Pending</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        Expires: {new Date(invite.expires_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => copyInviteLink(invite.id)}
                        className="btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
