/**
 * Types and interfaces for the Auth Forms (Login/Register)
 */

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface RegisterFormData {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    acceptTerms: boolean;
}

export interface FieldErrors {
    email?: string;
    password?: string;
    name?: string;
    confirmPassword?: string;
    [key: string]: string | undefined;
}
