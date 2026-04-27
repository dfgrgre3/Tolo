export function setCircuitBreaker(name: string, state: 'closed' | 'open' | 'half-open') {
  // Dummy implementation since Prometheus metrics are disabled in this environment
  console.log(`[Metrics:CircuitBreaker] ${name} -> ${state}`);
}
