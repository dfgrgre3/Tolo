package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	hash := "$2a$12$JwmkdHLv/Ruy.ndkN//8zObwtCFOaw./T8G8wTGAi8M91ALxUv61."
	password := "Admin@123456"
	
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		fmt.Printf("Verification failed: %v\n", err)
	} else {
		fmt.Println("Verification successful!")
	}
}
