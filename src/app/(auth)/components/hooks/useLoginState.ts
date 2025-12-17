import { useState, useCallback, useRef } from 'react';
import { LoginFormData, FieldErrors, RiskLevel, DeviceFingerprint } from '../types/login-form.types';

export const useLoginState = () => {
    // Form Data
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
        rememberMe: false,
    });

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);

    // Error State
    const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
    const [formErrorCode, setFormErrorCode] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    // Security State
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [loginAttemptId, setLoginAttemptId] = useState('');
    const [requiresCaptcha, setRequiresCaptcha] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
    const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
    const [riskLevel, setRiskLevel] = useState<RiskLevel>(null);
    const [isGoogleOAuthEnabled, setIsGoogleOAuthEnabled] = useState<boolean>(true);
    const [isFacebookOAuthEnabled, setIsFacebookOAuthEnabled] = useState<boolean>(true);
    const [isAppleOAuthEnabled, setIsAppleOAuthEnabled] = useState<boolean>(false); // Will be enabled when Apple credentials are configured

    // Refs
    const emailInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    const resetErrors = useCallback(() => {
        setFieldErrors({});
        setFormErrorMessage(null);
        setFormErrorCode(null);
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    }, []);

    return {
        formData,
        setFormData,
        showPassword,
        setShowPassword,
        isLoading,
        setIsLoading,
        isCreatingAccount,
        setIsCreatingAccount,
        focusedField,
        setFocusedField,
        isShaking,
        setIsShaking,
        formErrorMessage,
        setFormErrorMessage,
        formErrorCode,
        setFormErrorCode,
        fieldErrors,
        setFieldErrors,
        showTwoFactor,
        setShowTwoFactor,
        twoFactorCode,
        setTwoFactorCode,
        loginAttemptId,
        setLoginAttemptId,
        requiresCaptcha,
        setRequiresCaptcha,
        captchaToken,
        setCaptchaToken,
        failedAttempts,
        setFailedAttempts,
        lockoutSeconds,
        setLockoutSeconds,
        deviceFingerprint,
        setDeviceFingerprint,
        riskLevel,
        setRiskLevel,
        isGoogleOAuthEnabled,
        setIsGoogleOAuthEnabled,
        isFacebookOAuthEnabled,
        setIsFacebookOAuthEnabled,
        isAppleOAuthEnabled,
        setIsAppleOAuthEnabled,
        emailInputRef,
        passwordInputRef,
        resetErrors,
        handleInputChange,
    };
};
