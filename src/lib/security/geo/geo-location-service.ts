/**
 * 🌍 GeoLocation Service - خدمة تحديد الموقع الجغرافي
 * 
 * تحديد موقع المستخدم من عنوان IP
 */

export interface GeoLocation {
    ip: string;
    country: string;
    countryCode: string;
    region: string;
    regionCode: string;
    city: string;
    zipCode?: string;
    lat: number;
    lng: number;
    timezone: string;
    isp?: string;
    org?: string;
    asn?: string;
    isVPN?: boolean;
    isProxy?: boolean;
    isTor?: boolean;
    isDatacenter?: boolean;
}

export interface GeoLocationSession {
    sessionId: string;
    userId: string;
    location: GeoLocation;
    timestamp: Date;
    device?: string;
    browser?: string;
    isCurrentSession: boolean;
    isSuspicious: boolean;
}

export interface GeoLocationHistory {
    locations: GeoLocationSession[];
    uniqueCountries: string[];
    uniqueCities: string[];
    lastLocation?: GeoLocation;
}

// Free IP Geolocation APIs
const GEO_APIS = {
    ipapi: 'https://ipapi.co/{ip}/json/',
    ipinfo: 'https://ipinfo.io/{ip}/json',
    ipgeolocation: 'https://api.ipgeolocation.io/ipgeo?apiKey={key}&ip={ip}',
};

export class GeoLocationService {
    private cache = new Map<string, { data: GeoLocation; expiry: number }>();
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    /**
     * Get location from IP address
     */
    async getLocationFromIP(ip: string): Promise<GeoLocation | null> {
        // Check cache first
        const cached = this.cache.get(ip);
        if (cached && cached.expiry > Date.now()) {
            return cached.data;
        }

        // Skip localhost/private IPs
        if (this.isPrivateIP(ip)) {
            return this.getDefaultLocation(ip);
        }

        try {
            // Try ipapi.co (free, no key required)
            const response = await fetch(
                GEO_APIS.ipapi.replace('{ip}', ip),
                {
                    headers: { 'Accept': 'application/json' },
                    next: { revalidate: 3600 }, // Cache for 1 hour
                }
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.reason || 'Unknown error');
            }

            const location: GeoLocation = {
                ip,
                country: data.country_name || 'Unknown',
                countryCode: data.country_code || 'XX',
                region: data.region || '',
                regionCode: data.region_code || '',
                city: data.city || 'Unknown',
                zipCode: data.postal,
                lat: data.latitude || 0,
                lng: data.longitude || 0,
                timezone: data.timezone || 'UTC',
                isp: data.org,
                org: data.org,
                asn: data.asn,
            };

            // Cache the result
            this.cache.set(ip, {
                data: location,
                expiry: Date.now() + this.CACHE_TTL,
            });

            return location;
        } catch (error) {
            console.error('GeoLocation lookup failed:', error);
            return this.getDefaultLocation(ip);
        }
    }

    /**
     * Get location from browser's Geolocation API
     */
    async getLocationFromBrowser(): Promise<{ lat: number; lng: number } | null> {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            return null;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                () => resolve(null),
                { timeout: 5000, enableHighAccuracy: false }
            );
        });
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(
        lat1: number, lng1: number,
        lat2: number, lng2: number
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Check if travel between two locations is possible in given time
     */
    isPossibleTravel(
        from: GeoLocation,
        to: GeoLocation,
        timeDiffHours: number
    ): boolean {
        const distance = this.calculateDistance(
            from.lat, from.lng,
            to.lat, to.lng
        );

        // Maximum travel speed: 1000 km/h (fast commercial aircraft)
        const maxPossibleDistance = timeDiffHours * 1000;

        return distance <= maxPossibleDistance;
    }

    /**
     * Get country flag emoji from country code
     */
    getCountryFlag(countryCode: string): string {
        if (!countryCode || countryCode === 'XX') return '🌍';

        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));

        return String.fromCodePoint(...codePoints);
    }

    /**
     * Format location for display
     */
    formatLocation(location: GeoLocation): {
        short: string;
        full: string;
        flag: string;
    } {
        const flag = this.getCountryFlag(location.countryCode);

        return {
            short: `${location.city}, ${location.countryCode}`,
            full: `${location.city}, ${location.region}, ${location.country}`,
            flag,
        };
    }

    // ============================================
    // Helper Methods
    // ============================================

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    private isPrivateIP(ip: string): boolean {
        // Check for private/local IPs
        const privatePatterns = [
            /^127\./,          // Loopback
            /^10\./,           // Class A private
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
            /^192\.168\./,     // Class C private
            /^::1$/,           // IPv6 loopback
            /^fe80:/i,         // IPv6 link-local
            /^fc00:/i,         // IPv6 unique local
        ];

        return privatePatterns.some(pattern => pattern.test(ip));
    }

    private getDefaultLocation(ip: string): GeoLocation {
        return {
            ip,
            country: 'Local',
            countryCode: 'XX',
            region: '',
            regionCode: '',
            city: 'Local Network',
            lat: 0,
            lng: 0,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }
}

// Singleton instance
let geoServiceInstance: GeoLocationService | null = null;

export function getGeoLocationService(): GeoLocationService {
    if (!geoServiceInstance) {
        geoServiceInstance = new GeoLocationService();
    }
    return geoServiceInstance;
}

export default GeoLocationService;
