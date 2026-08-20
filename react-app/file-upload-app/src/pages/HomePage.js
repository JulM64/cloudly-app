// src/pages/HomePage.js - WITH S3 INTEGRATION
import React from 'react';
import FileUpload from '../components/FileUpload';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import { IconMail, IconBuilding, IconRoles, IconFolder, IconUploadCloud, IconCheckCircle } from '../components/icons';

const HomePage = ({ user, setMessage }) => {
  return (
    <div>
      <PageHeader title={`Welcome back, ${user.firstName}`} subtitle="Upload files to your department's storage." />

      <div className="cl-split-layout">
        <Card>
          <CardHeader title="File upload" />
          <FileUpload user={user} onUploadSuccess={setMessage} />
        </Card>

        <Card>
          <CardHeader title="Your info" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="cl-info-row">
              <IconMail size={16} />
              <div><div className="cl-info-label">Email</div><div className="cl-info-value">{user.email}</div></div>
            </div>
            <div className="cl-info-row">
              <IconBuilding size={16} />
              <div><div className="cl-info-label">Department</div><div className="cl-info-value">{user.department}</div></div>
            </div>
            <div className="cl-info-row">
              <IconRoles size={16} />
              <div><div className="cl-info-label">Role</div><div className="cl-info-value" style={{ textTransform: 'capitalize' }}>{user.role.toLowerCase().replace('_', ' ')}</div></div>
            </div>
            <div className="cl-info-row">
              <IconFolder size={16} />
              <div><div className="cl-info-label">S3 bucket</div><div className="cl-info-value" style={{ fontSize: '12px', fontFamily: 'monospace' }}>cloudly-dept-{user.department?.toLowerCase()}</div></div>
            </div>
          </div>

          <div className="ui-banner ui-banner--info" style={{ marginTop: '20px', display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600 }}>
              <IconUploadCloud size={15} /> Upload information
            </div>
            <ul style={{ fontSize: 'var(--fs-xs)', margin: 0, paddingLeft: '18px' }}>
              <li>Files stored in AWS S3</li>
              <li>Department-based buckets</li>
              <li>Secure cloud storage</li>
              <li>Max size: 100MB per file</li>
            </ul>
          </div>
        </Card>
      </div>

      <style>{`
        .cl-info-row { display:flex; align-items:flex-start; gap:10px; padding:12px; background:var(--c-bg); border-radius:var(--radius-md); color: var(--c-text-faint); }
        .cl-info-label { font-size:11px; color:var(--c-text-muted); margin-bottom:2px; }
        .cl-info-value { font-weight:600; color:var(--c-text); font-size: var(--fs-sm); }
      `}</style>
    </div>
  );
};

export default HomePage;