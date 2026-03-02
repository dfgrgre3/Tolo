export interface User {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
    createdAt?: Date | string;
    grade?: string;
    school?: string;
    bio?: string;
    [key: string]: any;
}

export interface AuthUser extends User { }

export type LoginCredentials = any;
export type RegisterCredentials = any;
export type AuthResponse = any;
