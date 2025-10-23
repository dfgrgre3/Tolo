// 'use client';
import React from 'react';

interface ClientLayoutProviderProps {
  children: React.ReactNode;
}

const ClientLayoutProvider: React.FC<ClientLayoutProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export default ClientLayoutProvider;
