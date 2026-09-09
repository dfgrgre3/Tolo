/** Boundary adapter for the HTTP body returned by openapi-fetch. */
export function unwrapOpenApiPayload<T>(body: unknown): T {
  if (
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "success" in body &&
    "data" in body
  ) {
    return (body as { data: T }).data;
  }

  return body as T;
}
