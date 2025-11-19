// Mock Next.js server components
export const NextRequest = jest.fn().mockImplementation((url, init) => {
  return {
    url,
    method: init?.method || 'GET',
    headers: new Map(Object.entries(init?.headers || {})),
    json: jest.fn().mockResolvedValue(JSON.parse(init?.body || '{}')),
    text: jest.fn().mockResolvedValue(init?.body || ''),
    nextUrl: new URL(url),
  };
});

export const NextResponse = {
  json: jest.fn((data, init) => ({
    json: jest.fn().mockResolvedValue(data),
    status: init?.status || 200,
    headers: new Map(),
  })),
  redirect: jest.fn((url) => ({
    status: 307,
    headers: { Location: url },
  })),
};

