//go:build ignore
package main

import (
	"fmt"
	"os"
	"regexp"
)

func main() {
	f := "internal/api/handlers/admin_misc_handler.go"
	content, _ := os.ReadFile(f)
	
	toRemove := []string{
		`(?m)^[ \t]*const[ \t]+queryRole[ \t]*=[ \t]*"role = \?"\r?\n?`,
		`(?m)^[ \t]*const[ \t]+createdAtGte[ \t]*=[ \t]*"created_at >= \?"\r?\n?`,
		`(?m)^[ \t]*const[ \t]+createdAtGte[ \t]*=[ \t]*"\\"createdAt\\" >= \?"\r?\n?`,
		`(?m)^[ \t]*const[ \t]+createdAtDescSort[ \t]*=[ \t]*"created_at desc"\r?\n?`,
		`(?m)^[ \t]*const[ \t]+createdAtDescSort[ \t]*=[ \t]*"\\"createdAt\\" desc"\r?\n?`,
		`(?m)^[ \t]*const[ \t]+createdAtRangeQuery[ \t]*=[ \t]*"created_at >= \? AND created_at < \?"\r?\n?`,
		`(?m)^[ \t]*const[ \t]+createdAtRangeQuery[ \t]*=[ \t]*"\\"createdAt\\" >= \? AND \\"createdAt\\" < \?"\r?\n?`,
		`(?m)^[ \t]*const[ \t]+dateFormat[ \t]*=[ \t]*"2006-01-02"\r?\n?`,
	}
	
	mod := string(content)
	for _, r := range toRemove {
		mod = regexp.MustCompile(r).ReplaceAllString(mod, "")
	}
	
	// String func removal
	mod = regexp.MustCompile(`(?s)func stringOrEmpty\(value \*string\) string \{.*?\}\r?\n?`).ReplaceAllString(mod, "")
	mod = regexp.MustCompile(`(?s)func firstNonEmpty\(values \.\.\.string\) string \{.*?\}\r?\n?`).ReplaceAllString(mod, "")
	
	if mod != string(content) {
		os.WriteFile(f, []byte(mod), 0644)
		fmt.Println("Cleaned", f)
	}

	// subject_handler
	f2 := "internal/api/handlers/subject_handler.go"
	content2, _ := os.ReadFile(f2)
	mod2 := regexp.MustCompile(`(?s)func stringOrEmpty\(value \*string\) string \{.*?\}\r?\n?`).ReplaceAllString(string(content2), "")
	if mod2 != string(content2) {
		os.WriteFile(f2, []byte(mod2), 0644)
		fmt.Println("Cleaned", f2)
	}
}
