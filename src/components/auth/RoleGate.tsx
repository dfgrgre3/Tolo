'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface RoleGateProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallback?: React.ReactNode;
    showError?: boolean;
}

/**
 * RoleGate - Professional UI component for Role-Based Access Control (RBAC).
 * 
 * Usage:
 * <RoleGate allowedRoles={['ADMIN', 'TEACHER']}>
 *   <SecretAdminPanel />
 * </RoleGate>
 */
export function RoleGate({ 
    children, 
    allowedRoles, 
    fallback,
    showError = false 
}: RoleGateProps) {
    const { user, isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return null; // Or a professional shimmer/spinner
    }

    if (!isAuthenticated || !user) {
        return null;
    }

    const hasAccess = allowedRoles.includes(user.role);

    if (hasAccess) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (showError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-red-500/5 border border-red-500/10 rounded-3xl backdrop-blur-xl">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
                <h3 className="text-2xl font-black text-white mb-2">منطقة محظورة ⚔️</h3>
                <p className="text-gray-500 mb-8 max-w-sm">
                    ليست لديك الصلاحيات الكافية لدخول هذه الغرفة. يرجى العودة للساحة العامة.
                </p>
                <Link 
                    href="/" 
                    className="px-8 h-12 flex items-center bg-primary text-black font-black rounded-xl hover:scale-105 transition-transform"
                >
                    العودة للرئيسية
                </Link>
            </div>
        );
    }

    return null;
}
