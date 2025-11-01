const redis = jest.createMockFromModule('redis');

export const createClient = jest.fn(() => ({
  on: jest.fn(),
  connect: jest.fn()
}));

export const Cluster = jest.fn(() => ({
  on: jest.fn()
}));

export default redis;
