package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type PaymobService struct {
	APIKey              string
	HMACSecret          string
	CardIntegrationID   string
	WalletIntegrationID string
	FawryIntegrationID  string
	IframeID            string
	BaseURL             string
}

func NewPaymobService() *PaymobService {
	return &PaymobService{
		APIKey:              os.Getenv("PAYMOB_API_KEY"),
		HMACSecret:          os.Getenv("PAYMOB_HMAC_SECRET"),
		CardIntegrationID:   os.Getenv("PAYMOB_CARD_INTEGRATION_ID"),
		WalletIntegrationID: os.Getenv("PAYMOB_WALLET_INTEGRATION_ID"),
		FawryIntegrationID:  os.Getenv("PAYMOB_FAWRY_INTEGRATION_ID"),
		IframeID:            os.Getenv("PAYMOB_IFRAME_ID"),
		BaseURL:             "https://accept.paymob.com/api",
	}
}

// 1. Authentication with circuit breaker protection
func (s *PaymobService) Authenticate() (string, error) {
	service := GetCircuitBreakerService()

	var result string
	err := service.CallExternalAPI("paymob-api", func() error {
		payload := map[string]string{"api_key": s.APIKey}
		body, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", s.BaseURL+"/auth/tokens", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
			return fmt.Errorf("paymob authentication failed: %d", resp.StatusCode)
		}

		var resultStruct struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&resultStruct); err != nil {
			return err
		}

		result = resultStruct.Token
		return nil
	})

	return result, err
}

// 2. Order Registration
func (s *PaymobService) RegisterOrder(authToken string, amountCents int64, items []interface{}) (int64, error) {
	payload := map[string]interface{}{
		"auth_token":      authToken,
		"delivery_needed": "false",
		"amount_cents":    amountCents,
		"currency":        "EGP",
		"items":           items,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", s.BaseURL+"/ecommerce/orders", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var result struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, err
	}

	return result.ID, nil
}

// 3. Payment Key Generation
func (s *PaymobService) GetPaymentKey(authToken string, orderID int64, amountCents int64, integrationID string, billingData map[string]string) (string, error) {
	// Ensure billing data has required fields
	required := []string{"first_name", "last_name", "email", "phone_number"}
	for _, f := range required {
		if billingData[f] == "" {
			billingData[f] = "N/A"
		}
	}
	// Defaults if missing
	if billingData["apartment"] == "" {
		billingData["apartment"] = "803"
	}
	if billingData["floor"] == "" {
		billingData["floor"] = "42"
	}
	if billingData["street"] == "" {
		billingData["street"] = "Ethan Hunt"
	}
	if billingData["building"] == "" {
		billingData["building"] = "8028"
	}
	if billingData["shipping_method"] == "" {
		billingData["shipping_method"] = "PKG"
	}
	if billingData["postal_code"] == "" {
		billingData["postal_code"] = "01898"
	}
	if billingData["city"] == "" {
		billingData["city"] = "Cairo"
	}
	if billingData["country"] == "" {
		billingData["country"] = "EG"
	}
	if billingData["state"] == "" {
		billingData["state"] = "Cairo"
	}

	payload := map[string]interface{}{
		"auth_token":           authToken,
		"amount_cents":         amountCents,
		"expiration":           3600,
		"order_id":             orderID,
		"billing_data":         billingData,
		"currency":             "EGP",
		"integration_id":       integrationID,
		"lock_order_when_paid": "false",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", s.BaseURL+"/acceptance/payment_keys", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Token, nil
}

// Wallet Payment Request (for Vodafone Cash, etc.)
func (s *PaymobService) CreateWalletRequest(paymentKey string, phoneNumber string) (string, error) {
	payload := map[string]interface{}{
		"source": map[string]string{
			"identifier": phoneNumber,
			"subtype":    "WALLET",
		},
		"payment_token": paymentKey,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", s.BaseURL+"/acceptance/payments/pay", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		IframeRedirectionURL string `json:"iframe_redirection_url"`
		RedirectURL          string `json:"redirect_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.RedirectURL != "" {
		return result.RedirectURL, nil
	}
	return result.IframeRedirectionURL, nil
}

// VerifyHMAC verifies the HMAC hash from Paymob webhook
// Paymob sends "hmac" field in the webhook payload that needs to be verified
// The HMAC is computed from specific fields in the payload using SHA512
func (s *PaymobService) VerifyHMAC(payload map[string]interface{}) bool {
	if s.HMACSecret == "" {
		// CRITICAL SECURITY FIX: Never skip HMAC verification in production
		// If HMAC secret is not configured, reject the webhook
		return false
	}

	// Extract HMAC from payload
	hmacFromPayload, ok := payload["hmac"].(string)
	if !ok || hmacFromPayload == "" {
		return false
	}

	// Build the string to hash according to Paymob's documentation
	// The fields are concatenated with empty strings for missing values
	fields := []string{
		"amount_cents",
		"created_at",
		"currency",
		"error_occured",
		"has_parent_transaction",
		"id",
		"integration_id",
		"is_3d_secure",
		"is_auth",
		"is_capture",
		"is_refunded",
		"is_standalone_payment",
		"is_voided",
		"order",
		"owner",
		"pending",
		"source_data.pan",
		"source_data.sub_type",
		"source_data.type",
		"success",
	}

	var builder strings.Builder
	for _, field := range fields {
		val := getNestedValue(payload, field)
		builder.WriteString(val)
	}

	// Compute HMAC
	h := hmac.New(sha512.New, []byte(s.HMACSecret))
	h.Write([]byte(builder.String()))
	expectedHMAC := hex.EncodeToString(h.Sum(nil))

	// Compare (use constant time comparison to prevent timing attacks)
	return hmac.Equal([]byte(expectedHMAC), []byte(hmacFromPayload))
}

// getNestedValue extracts a value from a nested map using dot notation
func getNestedValue(data map[string]interface{}, key string) string {
	keys := strings.Split(key, ".")
	current := data
	for i, k := range keys {
		if i == len(keys)-1 {
			// Last key
			val, ok := current[k]
			if !ok {
				return ""
			}
			return fmt.Sprintf("%v", val)
		}
		// Navigate deeper
		next, ok := current[k].(map[string]interface{})
		if !ok {
			return ""
		}
		current = next
	}
	return ""
}
