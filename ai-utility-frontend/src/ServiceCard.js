import React from 'react';

export default function ServiceCard({ service, active, onClick }) {
  const initials = service.title.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();

  return (
    <div className={`service-card ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="service-icon">{initials}</div>
      <div>
        <h4 className="service-title">{service.title}</h4>
        <p className="service-desc">{service.desc}</p>
      </div>
    </div>
  );
}
