package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}

		cfg := config.Load()
		if cfg.Environment == "development" || cfg.Environment == "" {
			return true
		}

		allowedOrigins := []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"https://thanawy.net",
			"https://www.thanawy.net",
		}

		for _, o := range allowedOrigins {
			if origin == o {
				return true
			}
		}
		return false
	},
}

type Client struct {
	UserID string
	Role   string
	Conn   *websocket.Conn
	Send   chan []byte
}

type Hub struct {
	clients     map[string][]*Client
	broadcast   chan []byte
	register    chan *Client
	unregister  chan *Client
	mu          sync.RWMutex
	redisPubSub *redis.PubSub
	redisCtx    context.Context
}

var GlobalHub = &Hub{
	clients:    make(map[string][]*Client),
	broadcast:  make(chan []byte),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func InitHub() {
	if db.Redis == nil {
		log.Println("Redis not available, running WebSocket hub without Pub/Sub (single instance mode)")
		go GlobalHub.Run()
		return
	}

	log.Println("Initializing WebSocket hub with Redis Pub/Sub support")

	GlobalHub.redisCtx = context.Background()
	GlobalHub.redisPubSub = db.Redis.Subscribe(GlobalHub.redisCtx, "websocket:broadcast")

	go GlobalHub.Run()
	go GlobalHub.redisSubscribe()
}

func (h *Hub) redisSubscribe() {
	if h.redisPubSub == nil {
		return
	}

	ch := h.redisPubSub.Channel()
	for msg := range ch {
		var envelope map[string]interface{}
		if err := json.Unmarshal([]byte(msg.Payload), &envelope); err == nil {
			if targetUser, ok := envelope["targetUser"].(string); ok {
				h.sendToUserLocal(targetUser, []byte(envelope["payload"].(string)))
			} else {
				h.broadcastLocal([]byte(envelope["payload"].(string)))
			}
		} else {
			h.broadcastLocal([]byte(msg.Payload))
		}
	}
}

func (h *Hub) broadcastLocal(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, clients := range h.clients {
		for _, client := range clients {
			select {
			case client.Send <- message:
			default:
				close(client.Send)
			}
		}
	}
}

func (h *Hub) sendToUserLocal(userID string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.clients[userID]; ok {
		for _, client := range clients {
			select {
			case client.Send <- message:
			default:
			}
		}
	}
}

func (h *Hub) BroadcastToUser(userID string, message []byte) {
	h.sendToUserLocal(userID, message)

	if db.Redis != nil {
		envelope := map[string]interface{}{
			"targetUser": userID,
			"payload":    string(message),
		}
		envelopeJSON, _ := json.Marshal(envelope)
		db.Redis.Publish(context.Background(), "websocket:broadcast", string(envelopeJSON))
	}
}

func (h *Hub) BroadCastToRole(role string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	// In a real multi-instance setup, you'd publish this to Redis 
	// and have instances check user roles before sending.
	// For simplicity, we broadcast locally and if Redis is used, 
	// we'd need a way to filter by role on other instances too.
	
	for _, clients := range h.clients {
		if len(clients) > 0 {
			// Check role of the first client (they all have same UserID)
			// This requires a way to look up roles efficiently or having it in the Client struct
			// Let's just broadcast to everyone and let the client-side filter for now, 
			// OR fetch roles from DB (less efficient).
			// Better: add Role to Client struct during registration.
		}
	}
	
	// Implementation below assumes we add Role to Client
}

func (h *Hub) NotifyAdmins(message interface{}) {
	payload, _ := json.Marshal(message)
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, userClients := range h.clients {
		for _, client := range userClients {
			if client.Role == "ADMIN" {
				select {
				case client.Send <- payload:
				default:
				}
			}
		}
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = append(h.clients[client.UserID], client)
			h.mu.Unlock()
			log.Printf("User %s registered. Total connections: %d", client.UserID, len(h.clients[client.UserID]))

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.UserID]; ok {
				for i, c := range clients {
					if c == client {
						h.clients[client.UserID] = append(clients[:i], clients[i+1:]...)
						break
					}
				}
				if len(h.clients[client.UserID]) == 0 {
					delete(h.clients, client.UserID)
				}
			}
			h.mu.Unlock()
			close(client.Send)
			log.Printf("User %s unregistered.", client.UserID)

		case message := <-h.broadcast:
			h.broadcastLocal(message)

			if db.Redis != nil {
				db.Redis.Publish(context.Background(), "websocket:broadcast", string(message))
			}
		}
	}
}

func (h *Hub) NotifyUser(userID string, message interface{}) {
	payload, _ := json.Marshal(message)
	h.BroadcastToUser(userID, payload)
}

func GlobalNotifyAdmins(title string, message string, typeStr string) {
	msg := map[string]interface{}{
		"type":    "admin_notification",
		"title":   title,
		"message": message,
		"style":   typeStr,
		"time":    time.Now(),
	}
	GlobalHub.NotifyAdmins(msg)
}

func (c *Client) readPump() {
	defer func() {
		GlobalHub.unregister <- c
		c.Conn.Close()
	}()
	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()
	for message := range c.Send {
		err := c.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			return
		}
	}
	c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
}

func WSHandler(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIdValue.(string)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to websocket: %v", err)
		return
	}

	role, _ := c.Get("role")
	roleStr := ""
	if role != nil {
		roleStr = role.(string)
	}

	client := &Client{
		UserID: userID,
		Role:   roleStr,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}
	GlobalHub.register <- client

	go client.writePump()
	go client.readPump()
}
