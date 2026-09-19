import { describe, it, expect } from "vitest";
import {
  AppError,
  TransportError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  ContractError,
  mapStatusToDomainError,
  isAuthError,
  isAuthzError,
  isValidationError,
  isNotFoundError,
  isConflictError,
  isRateLimitError,
  isServerError,
  isTransportError,
  isContractError,
  isAppError,
} from "@/lib/errors/domain-errors";
import { isCriticalError } from "@/lib/error-utils";

describe("Domain Errors Taxonomy (P0-9)", () => {
  describe("Class hierarchy and inheritance", () => {
    it("all domain errors inherit from AppError and Error", () => {
      const errors = [
        new TransportError("Network down"),
        new AuthenticationError("Login required"),
        new AuthorizationError("No permission"),
        new ValidationError("Invalid input"),
        new NotFoundError("Resource not found"),
        new ConflictError("Already exists"),
        new RateLimitError("Too many requests", 5000),
        new ServerError("Internal error", 500),
        new ContractError("Invalid schema"),
      ];

      for (const err of errors) {
        expect(err).toBeInstanceOf(AppError);
        expect(err).toBeInstanceOf(Error);
        expect(isAppError(err)).toBe(true);
      }
    });

    it("ValidationError includes structured field errors", () => {
      const err = new ValidationError("Validation failed", [
        { field: "email", message: "Email is invalid" },
        { field: "password", message: "Password too short" },
      ]);
      expect(err.statusCode).toBe(422);
      expect(err.fields).toHaveLength(2);
      expect(err.fields[0]!.field).toBe("email");
    });

    it("RateLimitError includes retryAfterMs", () => {
      const err = new RateLimitError("Slow down", 3000);
      expect(err.statusCode).toBe(429);
      expect(err.retryAfterMs).toBe(3000);
    });
  });

  describe("mapStatusToDomainError", () => {
    it("maps 400 to ValidationError", () => {
      const err = mapStatusToDomainError(400, "Bad Request", undefined, {
        errors: [{ field: "name", message: "Required" }],
      });
      expect(err).toBeInstanceOf(ValidationError);
      expect(isValidationError(err)).toBe(true);
      expect((err as ValidationError).fields).toHaveLength(1);
    });

    it("maps 401 to AuthenticationError", () => {
      const err = mapStatusToDomainError(401, "Unauthorized");
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(isAuthError(err)).toBe(true);
      expect(err.statusCode).toBe(401);
    });

    it("maps 403 to AuthorizationError", () => {
      const err = mapStatusToDomainError(403, "Forbidden");
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(isAuthzError(err)).toBe(true);
      expect(err.statusCode).toBe(403);
    });

    it("maps 404 to NotFoundError", () => {
      const err = mapStatusToDomainError(404, "Not Found", "NOT_FOUND");
      expect(err).toBeInstanceOf(NotFoundError);
      expect(isNotFoundError(err)).toBe(true);
      expect(err.statusCode).toBe(404);
    });

    it("maps 409 to ConflictError", () => {
      const err = mapStatusToDomainError(409, "Conflict");
      expect(err).toBeInstanceOf(ConflictError);
      expect(isConflictError(err)).toBe(true);
      expect(err.statusCode).toBe(409);
    });

    it("maps 422 to ValidationError", () => {
      const err = mapStatusToDomainError(422, "Unprocessable Entity");
      expect(err).toBeInstanceOf(ValidationError);
      expect(isValidationError(err)).toBe(true);
    });

    it("maps 429 to RateLimitError with retryAfterMs", () => {
      const err = mapStatusToDomainError(429, "Rate limited", undefined, { retryAfterMs: 4000 });
      expect(err).toBeInstanceOf(RateLimitError);
      expect(isRateLimitError(err)).toBe(true);
      expect((err as RateLimitError).retryAfterMs).toBe(4000);
    });

    it("maps 500, 502, 503 to ServerError", () => {
      for (const code of [500, 502, 503]) {
        const err = mapStatusToDomainError(code, "Server Error");
        expect(err).toBeInstanceOf(ServerError);
        expect(isServerError(err)).toBe(true);
        expect(err.statusCode).toBe(code);
      }
    });

    it("maps unexpected 4xx to generic AppError", () => {
      const err = mapStatusToDomainError(418, "I'm a teapot", "TEAPOT");
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(418);
      expect(err.errorCode).toBe("TEAPOT");
    });
  });

  describe("isCriticalError integration", () => {
    it("marks client-side errors as critical (non-retryable)", () => {
      expect(isCriticalError(new ValidationError("bad input"))).toBe(true);
      expect(isCriticalError(new AuthenticationError("expired"))).toBe(true);
      expect(isCriticalError(new AuthorizationError("forbidden"))).toBe(true);
      expect(isCriticalError(new NotFoundError("not found"))).toBe(true);
      expect(isCriticalError(new ConflictError("conflict"))).toBe(true);
    });

    it("marks server/network/rate-limit errors as non-critical (retryable)", () => {
      expect(isCriticalError(new ServerError("internal error", 500))).toBe(false);
      expect(isCriticalError(new TransportError("timeout"))).toBe(false);
      expect(isCriticalError(new RateLimitError("rate limited", 1000))).toBe(false);
    });
  });

  describe("type guards", () => {
    it("correctly differentiates error types", () => {
      const auth = new AuthenticationError();
      const notFound = new NotFoundError();

      expect(isAuthError(auth)).toBe(true);
      expect(isNotFoundError(auth)).toBe(false);

      expect(isNotFoundError(notFound)).toBe(true);
      expect(isAuthError(notFound)).toBe(false);

      expect(isTransportError(new TransportError())).toBe(true);
      expect(isContractError(new ContractError("contract"))).toBe(true);
    });
  });
});
