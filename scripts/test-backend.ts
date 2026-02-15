import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

// --- Type Definitions for API Responses ---
interface ApiUser {
    id: string;
    name: string | null;
    email: string;
    role: string;
    avatar: string | null;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    lastLogin: string | null;
    createdAt: string;
    provider?: string;
}

interface CreateSubjectResponse {
    success?: boolean;
    error?: string;
    data?: {
        id: string;
        name: string;
        description: string;
        color: string;
        icon: string;
    };
}

interface GetSubjectsResponse {
    success?: boolean;
    data?: Array<{
        id: string;
        name: string;
        description?: string;
        color?: string;
        icon?: string;
    }>;
    error?: string;
}

async function testBackend() {
    console.log('Starting Backend Verification...');

    // 1. Test Subjects API
    console.log('\n--- Testing Subjects API ---');

    // Create Subject
    const subjectData = {
        name: `Test Subject ${Date.now()}`,
        description: 'Created by verification script',
        color: '#ff0000',
        icon: 'TestIcon'
    };

    console.log('Creating subject:', subjectData);
    const createRes = await fetch(`${BASE_URL}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectData)
    });

    const createJson: CreateSubjectResponse = await createRes.json() as CreateSubjectResponse;
    console.log('Create Response:', createRes.status, createJson);

    if (createRes.status !== 201) {
        console.error('Failed to create subject');
    }

    // Get Subjects
    console.log('Fetching subjects...');
    const getRes = await fetch(`${BASE_URL}/courses`);
    const getJson: GetSubjectsResponse = await getRes.json() as GetSubjectsResponse;
    console.log('Get Response:', getRes.status, getJson.data?.length ? `Found ${getJson.data.length} subjects` : getJson);

    // 2. Test Users API
    console.log('\n--- Testing Users API ---');
    // Note: Users API requires auth, so this might fail with 401, which is expected/correct behavior for unauthenticated request.
    const usersRes = await fetch(`${BASE_URL}/users`);
    console.log('Get Users Response (Expected 401):', usersRes.status);

    console.log('\nVerification Complete.');
}

testBackend().catch(console.error);
