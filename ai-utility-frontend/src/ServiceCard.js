import React from 'react';

export default function ServiceCard({ service, active, onClick }) {
  return (
    <div className={`service-card ${active ? 'active' : ''}`} onClick={onClick}>
      <h4>{service.title}</h4>
      <p>{service.desc}</p>
    </div>
  );
}
