'use client';

import { useState, useRef } from 'react';

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export function useLoginFormState() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const clearFieldErrors = () => {
    setFieldErrors({});
  };

  const setFieldError = (field: keyof LoginFormErrors, message?: string) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  };

  return {
    formData,
    showPassword,
    focusedField,
    fieldErrors,
    emailInputRef,
    passwordInputRef,
    setFormData,
    setShowPassword,
    setFocusedField,
    handleInputChange,
    clearFieldErrors,
    setFieldError,
    setFieldErrors,
  };
}

