import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function SystemSettings() {
  const [settings, setSettings] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/admin/settings').then((res) => setSettings(res.data.settings));
  }, []);

  const handleChange = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    await api.put('/admin/settings', settings);
    setMsg('Settings updated successfully.');
  };

  return (
    <>
      <h3 className="fw-bold mb-4">System Settings</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card shadow-sm border-0" style={{ maxWidth: 600 }}>
        <div className="card-body">
          <form onSubmit={save}>
            <div className="mb-3">
              <label className="form-label">Site Name</label>
              <input className="form-control" value={settings.site_name || ''} onChange={(e) => handleChange('site_name', e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Max File Size (MB)</label>
              <input type="number" className="form-control" value={settings.max_file_size_mb || ''} onChange={(e) => handleChange('max_file_size_mb', e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Allowed File Types (comma separated)</label>
              <input className="form-control" value={settings.allowed_file_types || ''} onChange={(e) => handleChange('allowed_file_types', e.target.value)} />
            </div>
            <button className="btn btn-brand">Save Settings</button>
          </form>
        </div>
      </div>
    </>
  );
}
