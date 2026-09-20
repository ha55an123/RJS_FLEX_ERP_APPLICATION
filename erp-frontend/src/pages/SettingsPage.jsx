import { useState } from 'react';
import { Settings, User, Bell, Shield, Database, Palette, Save, Check } from 'lucide-react';

const STORAGE_KEY = 'gym_erp_settings';

const defaults = {
  gymName: 'RJS Flex Gym',
  gymEmail: 'info@rjsflexgym.com',
  gymPhone: '+92 300 1234567',
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  language: 'en',
  theme: 'dark',
  notificationsEnabled: true,
  emailNotifications: true,
  smsNotifications: false,
  autoBackup: true,
  backupFrequency: 'daily',
  sessionTimeout: 30,
  fullName: 'Admin User',
  adminEmail: 'admin@rjsflexgym.com',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  thermalPrinterWidth: 80,
};

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const tabs = [
    { id: 'general',       name: 'General',       icon: Settings },
    { id: 'profile',       name: 'Profile',        icon: User },
    { id: 'notifications', name: 'Notifications',  icon: Bell },
    { id: 'security',      name: 'Security',       icon: Shield },
    { id: 'data',          name: 'Data & Backup',  icon: Database },
    { id: 'appearance',    name: 'Appearance',     icon: Palette },
    { id: 'printer',       name: 'Printer',        icon: Settings },
  ];

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = () => {
    setError('');
    if (activeTab === 'profile' && settings.newPassword) {
      if (settings.newPassword !== settings.confirmPassword) {
        setError('New passwords do not match.');
        return;
      }
      if (settings.newPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }
    const toSave = { ...settings, currentPassword: '', newPassword: '', confirmPassword: '' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Field = ({ label, children }) => (
    <div className="settings-field">{label && <label>{label}</label>}{children}</div>
  );

  const ToggleRow = ({ label, desc, checked, onChange }) => (
    <div className="settings-toggle-row">
      <div className="toggle-info">
        <p>{label}</p>
        {desc && <span>{desc}</span>}
      </div>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your gym ERP preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); }}
              className={activeTab === tab.id ? 'active' : ''}
            >
              <tab.icon size={17} />
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="settings-panel">
          {error && (
            <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: '#ff4757', padding: '.6rem .9rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '.85rem' }}>
              {error}
            </div>
          )}

          {activeTab === 'general' && (
            <>
              <h2>General Settings</h2>
              <div className="form-grid">
                <Field label="Gym Name">
                  <input type="text" value={settings.gymName} onChange={e => set('gymName', e.target.value)} />
                </Field>
                <Field label="Gym Email">
                  <input type="email" value={settings.gymEmail} onChange={e => set('gymEmail', e.target.value)} />
                </Field>
                <Field label="Gym Phone">
                  <input type="text" value={settings.gymPhone} onChange={e => set('gymPhone', e.target.value)} />
                </Field>
                <Field label="Currency">
                  <select value={settings.currency} onChange={e => set('currency', e.target.value)}>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                  </select>
                </Field>
                <Field label="Timezone">
                  <select value={settings.timezone} onChange={e => set('timezone', e.target.value)}>
                    <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </Field>
                <Field label="Language">
                  <select value={settings.language} onChange={e => set('language', e.target.value)}>
                    <option value="en">English</option>
                    <option value="ur">Urdu</option>
                  </select>
                </Field>
              </div>
            </>
          )}

          {activeTab === 'profile' && (
            <>
              <h2>Profile Settings</h2>
              <div className="form-grid">
                <Field label="Full Name">
                  <input type="text" value={settings.fullName} onChange={e => set('fullName', e.target.value)} />
                </Field>
                <Field label="Email">
                  <input type="email" value={settings.adminEmail} onChange={e => set('adminEmail', e.target.value)} />
                </Field>
                <Field label="Current Password">
                  <input type="password" value={settings.currentPassword} onChange={e => set('currentPassword', e.target.value)} placeholder="Enter current password" />
                </Field>
                <Field label="New Password">
                  <input type="password" value={settings.newPassword} onChange={e => set('newPassword', e.target.value)} placeholder="Enter new password" />
                </Field>
                <Field label="Confirm New Password">
                  <input type="password" value={settings.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Confirm new password" />
                </Field>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <h2>Notification Settings</h2>
              <ToggleRow label="Enable Notifications" desc="Receive notifications for important events" checked={settings.notificationsEnabled} onChange={v => set('notificationsEnabled', v)} />
              <ToggleRow label="Email Notifications" desc="Receive notifications via email" checked={settings.emailNotifications} onChange={v => set('emailNotifications', v)} />
              <ToggleRow label="SMS Notifications" desc="Receive notifications via SMS" checked={settings.smsNotifications} onChange={v => set('smsNotifications', v)} />
            </>
          )}

          {activeTab === 'security' && (
            <>
              <h2>Security Settings</h2>
              <Field label="Session Timeout (minutes)">
                <input type="number" value={settings.sessionTimeout} onChange={e => set('sessionTimeout', parseInt(e.target.value))} style={{ maxWidth: '200px' }} />
              </Field>
              <div className="settings-toggle-row" style={{ marginTop: '1rem' }}>
                <div className="toggle-info">
                  <p>Two-Factor Authentication</p>
                  <span>Add an extra layer of security to your account</span>
                </div>
                <button className="btn-primary" style={{ padding: '.45rem 1rem', fontSize: '.8rem' }}>Enable 2FA</button>
              </div>
              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <p>Login History</p>
                  <span>View recent login activity</span>
                </div>
                <button className="btn-secondary" style={{ padding: '.45rem 1rem', fontSize: '.8rem' }}>View History</button>
              </div>
            </>
          )}

          {activeTab === 'data' && (
            <>
              <h2>Data & Backup</h2>
              <ToggleRow label="Auto Backup" desc="Automatically backup data on schedule" checked={settings.autoBackup} onChange={v => set('autoBackup', v)} />
              <Field label="Backup Frequency">
                <select value={settings.backupFrequency} onChange={e => set('backupFrequency', e.target.value)} style={{ maxWidth: '240px' }}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
              <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
                <button className="btn-primary">Backup Now</button>
                <button className="btn-secondary">Restore Backup</button>
              </div>
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <h2>Appearance</h2>
              <Field label="Theme">
                <select value={settings.theme} onChange={e => set('theme', e.target.value)} style={{ maxWidth: '240px' }}>
                  <option value="dark">Dark (Default)</option>
                  <option value="light">Light</option>
                  <option value="system">System Default</option>
                </select>
              </Field>
              <Field label="Language">
                <select value={settings.language} onChange={e => set('language', e.target.value)} style={{ maxWidth: '240px' }}>
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                </select>
              </Field>
            </>
          )}

          {activeTab === 'printer' && (
            <>
              <h2>Printer Settings</h2>
              <Field label="Thermal Printer Width (mm)">
                <select value={settings.thermalPrinterWidth} onChange={e => set('thermalPrinterWidth', parseInt(e.target.value))} style={{ maxWidth: '240px' }}>
                  <option value="58">58mm (Small)</option>
                  <option value="80">80mm (Standard)</option>
                  <option value="100">100mm (Large)</option>
                </select>
              </Field>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Select the width of your thermal printer for payment receipts. This will adjust the receipt layout accordingly.
              </p>
            </>
          )}

          <div className="settings-footer">
            <button className="btn-secondary" onClick={() => { setSettings(loadSettings()); setError(''); }}>
              Reset
            </button>
            <button className="btn-primary" onClick={handleSave}>
              {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
