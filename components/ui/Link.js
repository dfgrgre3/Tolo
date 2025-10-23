import React from 'react';

export const Link = ({ href, children, className, onClick }) => (
  <a 
    href={href} 
    className={className} 
    onClick={(e) => {
      e.preventDefault();
      if (onClick) onClick();
      console.log('Simulated navigation to:', href);
    }}
  >
    {children}
  </a>
);

export default Link;