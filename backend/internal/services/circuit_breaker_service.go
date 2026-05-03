package services

import (
	"fmt"
	"sync"
	"time"

	"thanawy-backend/internal/middleware"
)

// CircuitBreakerService wraps external service calls with circuit breakers
type CircuitBreakerService struct {
	breakers map[string]*middleware.CircuitBreaker
	mu       sync.RWMutex
}

var circuitServiceInstance *CircuitBreakerService
var circuitOnce sync.Once

// GetCircuitBreakerService returns the singleton instance
func GetCircuitBreakerService() *CircuitBreakerService {
	circuitOnce.Do(func() {
		circuitServiceInstance = &CircuitBreakerService{
			breakers: make(map[string]*middleware.CircuitBreaker),
		}
	})
	return circuitServiceInstance
}

// CallAIService executes an AI service call with circuit breaker protection
func (s *CircuitBreakerService) CallAIService(fn func() (string, error)) (string, error) {
	cb := middleware.GetCircuitBreaker("ai-service", 3, 60*time.Second)

	var result string
	err := cb.Execute(func() error {
		var err error
		result, err = fn()
		return err
	})

	return result, err
}

// CallPaymentService executes a payment service call with circuit breaker protection
func (s *CircuitBreakerService) CallPaymentService(fn func() error) error {
	cb := middleware.GetCircuitBreaker("payment-service", 5, 30*time.Second)

	return cb.Execute(fn)
}

// CallExternalAPI executes an external API call with circuit breaker protection
func (s *CircuitBreakerService) CallExternalAPI(name string, fn func() error) error {
	cb := middleware.GetCircuitBreaker(name, 3, 60*time.Second)
	return cb.Execute(fn)
}

// GetStatus returns the status of all circuit breakers
func (s *CircuitBreakerService) GetStatus() map[string]string {
	states := make(map[string]string)

	// List of known circuit breakers
	names := []string{"ai-service", "payment-service", "paymob-api", "openrouter-api"}
	
	for _, name := range names {
		cb := middleware.GetCircuitBreaker(name, 0, 0)
		state := cb.State()
		var stateStr string
		switch state {
		case 0: // StateClosed
			stateStr = "closed"
		case 1: // StateOpen
			stateStr = "open"
		case 2: // StateHalfOpen
			stateStr = "half-open"
		}
		states[name] = stateStr
	}

	return states
}

// ResetCircuitBreaker resets a specific circuit breaker
func (s *CircuitBreakerService) ResetCircuitBreaker(name string) {
	cb := middleware.GetCircuitBreaker(name, 0, 0)
	cb.Reset()
}

// WrapAICall wraps the AI service call with circuit breaker
func WrapAICall(provider string, callFn func() (string, error)) (string, error) {
	service := GetCircuitBreakerService()
	
	var result string
	err := service.CallExternalAPI("ai-"+provider, func() error {
		var err error
		result, err = callFn()
		return err
	})
	
	return result, err
}

// Example usage in ai_service.go:
// Instead of directly calling s.callOpenAICompatible(ctx, ...)
// Use:
// result, err := WrapAICall("openai", func() (string, error) {
//     return s.callOpenAICompatible(ctx, systemPrompt, userMessage, temperature, maxTokens)
// })