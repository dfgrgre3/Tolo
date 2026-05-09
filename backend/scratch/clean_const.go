//go:build ignore
package main

import (
	"fmt"
	"os"
	"regexp"
)

func main() {
	files := []string{
		"internal/api/handlers/subject_handler.go",
		"internal/api/handlers/payment_handler.go",
		"internal/api/handlers/user_handler.go",
	}

	for _, f := range files {
		content, _ := os.ReadFile(f)
		re := regexp.MustCompile(`(?m)^[ \t]*idQuery[ \t]*=[ \t]*"id = \?"\r?\n?`)
		mod := re.ReplaceAllString(string(content), "")
		
		re2 := regexp.MustCompile(`(?m)^[ \t]*authRequired[ \t]*=[ \t]*"Authentication required"\r?\n?`)
		mod = re2.ReplaceAllString(mod, "")
		
		re3 := regexp.MustCompile(`(?m)^[ \t]*errUserNotFound[ \t]*=[ \t]*"User not found"\r?\n?`)
		mod = re3.ReplaceAllString(mod, "")
		
		if mod != string(content) {
			os.WriteFile(f, []byte(mod), 0644)
			fmt.Println("Cleaned constants in", f)
		}
	}
}
