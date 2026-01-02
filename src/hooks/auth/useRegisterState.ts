import { useState, useRef } from 'react';
import { RegisterFormData } from '@/types/auth-form';


export const useRegisterState = () => {
    const [formData, setFormData] = useState<RegisterFormData>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isGoogleOAuthEnabled, setIsGoogleOAuthEnabled] = useState<boolean>(true);

    const passwordInputRef = useRef<HTMLInputElement>(null);
    const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        // Clear error for this field when user types
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    return {
        formData,
        setFormData,
        showPassword,
        setShowPassword,
        showConfirmPassword,
        setShowConfirmPassword,
        isLoading,
        setIsLoading,
        focusedField,
        setFocusedField,
        fieldErrors,
        setFieldErrors,
        isGoogleOAuthEnabled,
        setIsGoogleOAuthEnabled,
        passwordInputRef,
        confirmPasswordInputRef,
        handleInputChange,
    };
};
