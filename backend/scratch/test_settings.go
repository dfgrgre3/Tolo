package main

import (
	"encoding/json"
	"fmt"
	"log"
)

func extractString(m map[string]interface{}, key string, fallback string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return fallback
}

func extractMap(m map[string]interface{}, key string, fallback map[string]interface{}) map[string]interface{} {
	if val, ok := m[key]; ok {
		if res, ok := val.(map[string]interface{}); ok {
			return res
		}
	}
	return fallback
}

func main() {
	defaultSettings := map[string]interface{}{
		"siteName":        "Thanawy",
		"siteDescription": "منصة تعليمية لإدارة التعلم والمحتوى.",
		"features": map[string]interface{}{
			"registration": true,
			"engagement":   true,
			"forum":        true,
			"blog":         true,
			"events":       true,
			"aiAssistant":  true,
		},
		"maintenance": map[string]interface{}{
			"enabled": false,
			"message": "",
		},
	}

	testCases := []struct {
		name  string
		value string
	}{
		{"Empty", ""},
		{"Null", "null"},
		{"Invalid", "invalid"},
		{"Missing keys", "{}"},
		{"Partial features", `{"features": {"registration": false}}`},
		{"Full", `{"siteName": "Test", "features": {"registration": false}, "maintenance": {"enabled": true, "message": "Down"}}`},
	}

	for _, tc := range testCases {
		fmt.Printf("--- Case: %s ---\n", tc.name)
		var settings map[string]interface{}
		err := json.Unmarshal([]byte(tc.value), &settings)
		if err != nil || settings == nil {
			fmt.Printf("Error or nil settings: %v. Using defaults.\n", err)
			settings = defaultSettings
		}

		publicSettings := map[string]interface{}{
			"siteName":        extractString(settings, "siteName", defaultSettings["siteName"].(string)),
			"siteDescription": extractString(settings, "siteDescription", defaultSettings["siteDescription"].(string)),
			"features":        extractMap(settings, "features", defaultSettings["features"].(map[string]interface{})),
			"maintenance":     extractMap(settings, "maintenance", defaultSettings["maintenance"].(map[string]interface{})),
		}

		out, _ := json.MarshalIndent(publicSettings, "", "  ")
		fmt.Println(string(out))
	}
}
