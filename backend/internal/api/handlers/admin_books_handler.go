package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/storage"

	"github.com/gin-gonic/gin"
)

const headerContentType = "Content-Type"

func AdminGetBooks(c *gin.Context) {
	var books []models.Book
	if err := db.DB.Preload("Subject").Order("created_at DESC").Find(&books).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch books")
		return
	}
	api_response.Success(c, books)
}

func AdminCreateBook(c *gin.Context) {
	var book models.Book

	if strings.Contains(c.GetHeader(headerContentType), "multipart/form-data") {
		book = parseBookFromForm(c)
		if url, err := uploadMultipartFile(c, "cover", "book_cover"); err == nil {
			book.CoverUrl = url
		}
		if url, err := uploadMultipartFile(c, "file", "book"); err == nil {
			book.DownloadUrl = url
		}
	} else {
		if err := c.ShouldBindJSON(&book); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
	}

	if book.Title == "" {
		api_response.Error(c, http.StatusBadRequest, "Book title is required")
		return
	}

	if err := SafeCreate(db.DB, &book); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Book already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create book")
		return
	}

	LogAudit(c, "CREATE", "book", book.ID, book)
	api_response.Created(c, book)
}

func AdminUpdateBook(c *gin.Context) {
	id := c.Param("id")
	var book models.Book
	if err := db.DB.Where(queryID, id).First(&book).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Book not found")
		return
	}

	var input struct {
		Title       *string                 `json:"title" form:"title"`
		Author      *string                 `json:"author" form:"author"`
		Description *string                 `json:"description" form:"description"`
		SubjectID   *string                 `json:"subjectId" form:"subjectId"`
		Price       *float64                `json:"price" form:"price"`
		IsFree      *bool                   `json:"isFree" form:"isFree"`
		Tags        *models.JSONStringArray `json:"tags" form:"tags"`
	}

	if err := c.ShouldBind(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Author != nil {
		updates["author"] = *input.Author
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.SubjectID != nil {
		updates["subject_id"] = *input.SubjectID
	}
	if input.Price != nil {
		updates["price"] = *input.Price
	}
	if input.IsFree != nil {
		updates["is_free"] = *input.IsFree
	}
	if input.Tags != nil {
		updates["tags"] = *input.Tags
	}

	if url, err := uploadMultipartFile(c, "cover", "book_cover"); err == nil {
		updates["cover_url"] = url
	}
	if url, err := uploadMultipartFile(c, "file", "book"); err == nil {
		updates["download_url"] = url
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Book{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update book")
			return
		}
	}

	LogAudit(c, "UPDATE", "book", id, updates)
	api_response.Success(c, book)
}

func AdminDeleteBook(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Book{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete book")
		return
	}
	LogAudit(c, "DELETE", "book", id, nil)
	api_response.Success(c, nil)
}

func parseBookFromForm(c *gin.Context) models.Book {
	var book models.Book
	book.Title = c.PostForm("title")
	book.Author = c.PostForm("author")
	book.Description = c.PostForm("description")
	subjectId := c.PostForm("subjectId")
	if subjectId != "" {
		book.SubjectID = &subjectId
	}
	price, _ := strconv.ParseFloat(c.PostForm("price"), 64)
	book.Price = price
	book.IsFree = c.PostForm("isFree") == "true"
	return book
}

func uploadMultipartFile(c *gin.Context, fieldName, prefix string) (string, error) {
	header, err := c.FormFile(fieldName)
	if err != nil {
		return "", err
	}

	f, err := header.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	filename := fmt.Sprintf("%s_%d%s", prefix, time.Now().UnixNano(), ext)

	return storage.GlobalStorage.Upload(c.Request.Context(), filename, f, header.Size, header.Header.Get(headerContentType))
}
