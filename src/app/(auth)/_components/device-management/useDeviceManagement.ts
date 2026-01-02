'use client';

/**
 * 📱 useDeviceManagement - Hook لإدارة الأجهزة
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface Device {
    id: string;
    name: string;
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser: string;
    os: string;
    ip: string;
    location?: string;
    lastActive: Date;
    isCurrent: boolean;
    isTrusted: boolean;
    createdAt: Date;
}

export interface DeviceManagementState {
    devices: Device[];
    isLoading: boolean;
    error: string | null;
    selectedDevice: Device | null;
}

export interface UseDeviceManagementReturn extends DeviceManagementState {
    fetchDevices: () => Promise<void>;
    revokeDevice: (deviceId: string) => Promise<boolean>;
    revokeAllOther: () => Promise<boolean>;
    trustDevice: (deviceId: string) => Promise<boolean>;
    untrustDevice: (deviceId: string) => Promise<boolean>;
    renameDevice: (deviceId: string, name: string) => Promise<boolean>;
    selectDevice: (device: Device | null) => void;
}

export function useDeviceManagement(): UseDeviceManagementReturn {
    const [state, setState] = useState<DeviceManagementState>({
        devices: [],
        isLoading: true,
        error: null,
        selectedDevice: null,
    });

    const fetchDevices = useCallback(async (): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch('/api/auth/sessions');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'فشل في جلب الأجهزة');
            }

            interface ApiSession {
                id: string;
                deviceName?: string;
                userAgent?: string;
                ipAddress?: string;
                location?: string;
                lastActive?: string | Date;
                createdAt: string | Date;
                isCurrent?: boolean;
                isTrusted?: boolean;
            }

            const devices: Device[] = (data.sessions || []).map((session: ApiSession) => ({
                id: session.id,
                name: session.deviceName || 'جهاز غير معروف',
                type: parseDeviceType(session.userAgent),
                browser: parseBrowser(session.userAgent),
                os: parseOS(session.userAgent),
                ip: session.ipAddress || 'غير معروف',
                location: session.location,
                lastActive: new Date(session.lastActive || session.createdAt),
                isCurrent: session.isCurrent || false,
                isTrusted: session.isTrusted || false,
                createdAt: new Date(session.createdAt),
            }));

            setState(prev => ({ ...prev, devices, isLoading: false }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
            setState(prev => ({ ...prev, isLoading: false, error: message }));
        }
    }, []);

    const revokeDevice = useCallback(async (deviceId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/auth/sessions/${deviceId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل في حذف الجلسة');
            }

            setState(prev => ({
                ...prev,
                devices: prev.devices.filter(d => d.id !== deviceId),
                selectedDevice: prev.selectedDevice?.id === deviceId ? null : prev.selectedDevice,
            }));

            toast.success('تم إنهاء الجلسة بنجاح');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
            toast.error(message);
            return false;
        }
    }, []);

    const revokeAllOther = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/sessions/revoke-all', {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل في إنهاء الجلسات');
            }

            setState(prev => ({
                ...prev,
                devices: prev.devices.filter(d => d.isCurrent),
                selectedDevice: null,
            }));

            toast.success('تم إنهاء جميع الجلسات الأخرى');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
            toast.error(message);
            return false;
        }
    }, []);

    const trustDevice = useCallback(async (deviceId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/auth/sessions/${deviceId}/trust`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل في الوثوق بالجهاز');
            }

            setState(prev => ({
                ...prev,
                devices: prev.devices.map(d =>
                    d.id === deviceId ? { ...d, isTrusted: true } : d
                ),
            }));

            toast.success('تم إضافة الجهاز للأجهزة الموثوقة');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
            toast.error(message);
            return false;
        }
    }, []);

    const untrustDevice = useCallback(async (deviceId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/auth/sessions/${deviceId}/trust`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل في إزالة الثقة بالجهاز');
            }

            setState(prev => ({
                ...prev,
                devices: prev.devices.map(d =>
                    d.id === deviceId ? { ...d, isTrusted: false } : d
                ),
            }));

            toast.success('تم إزالة الجهاز من الأجهزة الموثوقة');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
            toast.error(message);
            return false;
        }
    }, []);

    const renameDevice = useCallback(async (deviceId: string, name: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/auth/sessions/${deviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل في تغيير اسم الجهاز');
            }

            setState(prev => ({
                ...prev,
                devices: prev.devices.map(d =>
                    d.id === deviceId ? { ...d, name } : d
                ),
            }));

            toast.success('تم تغيير اسم الجهاز');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
            toast.error(message);
            return false;
        }
    }, []);

    const selectDevice = useCallback((device: Device | null) => {
        setState(prev => ({ ...prev, selectedDevice: device }));
    }, []);

    // Fetch devices on mount
    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    return {
        ...state,
        fetchDevices,
        revokeDevice,
        revokeAllOther,
        trustDevice,
        untrustDevice,
        renameDevice,
        selectDevice,
    };
}

// Helper functions
function parseDeviceType(userAgent?: string): Device['type'] {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return 'mobile';
    if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
    if (/mac|win|linux/i.test(ua)) return 'desktop';

    return 'unknown';
}

function parseBrowser(userAgent?: string): string {
    if (!userAgent) return 'غير معروف';

    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'Safari';
    if (/edge/i.test(userAgent)) return 'Edge';
    if (/opera|opr/i.test(userAgent)) return 'Opera';

    return 'غير معروف';
}

function parseOS(userAgent?: string): string {
    if (!userAgent) return 'غير معروف';

    if (/windows/i.test(userAgent)) return 'Windows';
    if (/macintosh|mac os/i.test(userAgent)) return 'macOS';
    if (/linux/i.test(userAgent) && !/android/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';

    return 'غير معروف';
}

export default useDeviceManagement;
