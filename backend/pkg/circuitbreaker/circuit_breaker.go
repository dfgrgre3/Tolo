// Package circuitbreaker provides circuit breaker pattern implementation
package circuitbreaker

import (
	"errors"
	"sync"
	"time"
)

// CircuitState represents the state of a circuit breaker
type CircuitState int

const (
	StateClosed   CircuitState = iota // Normal operation
	StateOpen                         // Failing, reject requests
	StateHalfOpen                     // Testing if service recovered
)

// CircuitBreaker implements the circuit breaker pattern
type CircuitBreaker struct {
	name         string
	state        CircuitState
	failureCount int
	successCount int
	lastFailure  time.Time
	mu           sync.Mutex

	// Configuration
	failureThreshold int           // Failures before opening
	timeout          time.Duration // How long to stay open
	successThreshold int           // Successes needed to close from half-open
}

// NewCircuitBreaker creates a new circuit breaker
func NewCircuitBreaker(name string, failureThreshold int, timeout time.Duration) *CircuitBreaker {
	if failureThreshold == 0 {
		failureThreshold = 5
	}
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	return &CircuitBreaker{
		name:             name,
		state:            StateClosed,
		failureThreshold: failureThreshold,
		timeout:          timeout,
		successThreshold: 2,
	}
}

// Execute runs the given function with circuit breaker protection
func (cb *CircuitBreaker) Execute(fn func() error) error {
	cb.mu.Lock()

	// Check if we should transition from Open to HalfOpen
	if cb.state == StateOpen {
		if time.Since(cb.lastFailure) > cb.timeout {
			cb.state = StateHalfOpen
			cb.successCount = 0
		} else {
			cb.mu.Unlock()
			return errors.New("circuit breaker is open")
		}
	}

	cb.mu.Unlock()

	// Execute the function
	err := fn()

	cb.mu.Lock()
	defer cb.mu.Unlock()

	if err != nil {
		cb.onFailure()
		return err
	}

	cb.onSuccess()
	return nil
}

// onFailure handles a failure
func (cb *CircuitBreaker) onFailure() {
	cb.failureCount++
	cb.lastFailure = time.Now()

	if cb.state == StateHalfOpen {
		// If we fail in half-open, go back to open
		cb.state = StateOpen
		cb.successCount = 0
	} else if cb.failureCount >= cb.failureThreshold {
		cb.state = StateOpen
	}
}

// onSuccess handles a success
func (cb *CircuitBreaker) onSuccess() {
	cb.failureCount = 0

	if cb.state == StateHalfOpen {
		cb.successCount++
		if cb.successCount >= cb.successThreshold {
			cb.state = StateClosed
			cb.successCount = 0
		}
	}
}

// State returns the current state
func (cb *CircuitBreaker) State() CircuitState {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	return cb.state
}

// Reset forces the circuit breaker to closed state
func (cb *CircuitBreaker) Reset() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.state = StateClosed
	cb.failureCount = 0
	cb.successCount = 0
}

// CircuitBreakerRegistry manages multiple circuit breakers
type CircuitBreakerRegistry struct {
	breakers map[string]*CircuitBreaker
	mu       sync.RWMutex
}

var globalRegistry = &CircuitBreakerRegistry{
	breakers: make(map[string]*CircuitBreaker),
}

// GetCircuitBreaker returns or creates a circuit breaker for the given name
func GetCircuitBreaker(name string, failureThreshold int, timeout time.Duration) *CircuitBreaker {
	globalRegistry.mu.RLock()
	if cb, ok := globalRegistry.breakers[name]; ok {
		globalRegistry.mu.RUnlock()
		return cb
	}
	globalRegistry.mu.RUnlock()

	globalRegistry.mu.Lock()
	defer globalRegistry.mu.Unlock()

	// Double-check after acquiring write lock
	if cb, ok := globalRegistry.breakers[name]; ok {
		return cb
	}

	cb := NewCircuitBreaker(name, failureThreshold, timeout)
	globalRegistry.breakers[name] = cb
	return cb
}
