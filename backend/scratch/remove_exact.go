//go:build ignore
package main

import (
	"fmt"
	"os"
	"strings"
)

func replaceInFile(path, oldStr, newStr string) {
	content, err := os.ReadFile(path)
	if err != nil { return }
	modified := strings.Replace(string(content), oldStr, newStr, -1)
	if string(content) != modified {
		os.WriteFile(path, []byte(modified), 0644)
		fmt.Println("Fixed", path)
	}
}

func main() {
	replaceInFile("internal/api/handlers/payment_handler.go", "const idQuery = \"id = ?\"", "")
	replaceInFile("internal/api/handlers/payment_handler.go", "const authRequired = \"Authentication required\"", "")
	
	replaceInFile("internal/api/handlers/subject_handler.go", "const idQuery = \"id = ?\"", "")
	
	replaceInFile("internal/api/handlers/user_handler.go", "const idQuery = \"id = ?\"", "")
	replaceInFile("internal/api/handlers/user_handler.go", "const errUserNotFound = \"User not found\"", "")
	
	replaceInFile("internal/api/handlers/subscription_handler.go", "const errUserNotFound = \"User not found\"", "")
	replaceInFile("internal/api/handlers/subscription_handler.go", "const idQuery = \"id = ?\"", "")
	
	replaceInFile("internal/api/handlers/subject_handler.go", "func stringOrEmpty(value *string) string {\n\tif value == nil {\n\t\treturn \"\"\n\t}\n\treturn *value\n}", "")
	
	// Subscription handler has duplicates of functions from payment_handler
	// Since subscription_handler.go uses them, maybe I shouldn't delete them from payment_handler.go
	// But `go build` said `subscription_handler.go:139:6: deductUserBalance redeclared`. I will rename them in subscription_handler to subDeductUserBalance etc.
	replaceInFile("internal/api/handlers/subscription_handler.go", "func deductUserBalance(", "func subDeductUserBalance(")
	replaceInFile("internal/api/handlers/subscription_handler.go", "deductUserBalance(", "subDeductUserBalance(")
	
	replaceInFile("internal/api/handlers/subscription_handler.go", "func handlePurchaseError(", "func subHandlePurchaseError(")
	replaceInFile("internal/api/handlers/subscription_handler.go", "handlePurchaseError(", "subHandlePurchaseError(")
}
