function getStatus(error) {
  const value =
    error?.response?.status ??
    error?.status ??
    error?.code;

  const status = Number(value);

  return Number.isFinite(status)
    ? status
    : null;
}


function getHeader(
  error,
  headerName,
) {
  const headers =
    error?.response?.headers;

  if (!headers) {
    return null;
  }

  if (
    typeof headers.get ===
    "function"
  ) {
    return headers.get(
      headerName,
    );
  }

  const normalizedName =
    headerName.toLowerCase();

  const matchingKey =
    Object.keys(headers).find(
      (key) =>
        key.toLowerCase() ===
        normalizedName,
    );

  return matchingKey
    ? headers[matchingKey]
    : null;
}


function parseRetryAfterMs(
  value,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const seconds =
    Number(value);

  if (
    Number.isFinite(seconds) &&
    seconds >= 0
  ) {
    return Math.ceil(
      seconds * 1000,
    );
  }

  const retryDate =
    Date.parse(
      String(value),
    );

  if (
    Number.isNaN(retryDate)
  ) {
    return null;
  }

  return Math.max(
    0,
    retryDate -
      Date.now(),
  );
}


function getGitHubRateLimitDelay(
  error,
) {
  const status =
    getStatus(error);

  if (
    status !== 403 &&
    status !== 429
  ) {
    return null;
  }

  const retryAfter =
    parseRetryAfterMs(
      getHeader(
        error,
        "retry-after",
      ),
    );

  if (
    retryAfter !== null
  ) {
    return retryAfter;
  }

  const remaining =
    String(
      getHeader(
        error,
        "x-ratelimit-remaining",
      ) ?? "",
    );

  const reset =
    Number(
      getHeader(
        error,
        "x-ratelimit-reset",
      ),
    );

  if (
    remaining === "0" &&
    Number.isFinite(reset)
  ) {
    return Math.max(
      0,
      reset * 1000 -
        Date.now(),
    );
  }

  const message =
    String(
      error?.response?.data
        ?.message ??
        error?.message ??
        "",
    ).toLowerCase();

  if (
    status === 429 ||
    message.includes(
      "rate limit",
    ) ||
    message.includes(
      "secondary rate",
    )
  ) {
    return 60_000;
  }

  return null;
}


function getGoogleErrorReasons(
  error,
) {
  const errorData =
    error?.response?.data
      ?.error;

  const reasons = [];

  if (
    Array.isArray(
      errorData?.errors,
    )
  ) {
    for (
      const currentError
      of errorData.errors
    ) {
      if (
        currentError?.reason
      ) {
        reasons.push(
          String(
            currentError.reason,
          ),
        );
      }
    }
  }

  if (
    errorData?.status
  ) {
    reasons.push(
      String(
        errorData.status,
      ),
    );
  }

  return reasons;
}


function isGoogleRateLimitError(
  error,
) {
  const status =
    getStatus(error);

  if (status === 429) {
    return true;
  }

  if (status !== 403) {
    return false;
  }

  const rateLimitReasons =
    new Set([
      "rateLimitExceeded",
      "userRateLimitExceeded",
      "quotaExceeded",
      "RESOURCE_EXHAUSTED",
    ]);

  const reasons =
    getGoogleErrorReasons(
      error,
    );

  return reasons.some(
    (reason) =>
      rateLimitReasons.has(
        reason,
      ),
  );
}


function getGoogleRateLimitDelay(
  error,
) {
  if (
    !isGoogleRateLimitError(
      error,
    )
  ) {
    return null;
  }

  const retryAfter =
    parseRetryAfterMs(
      getHeader(
        error,
        "retry-after",
      ),
    );

  if (
    retryAfter !== null
  ) {
    return retryAfter;
  }

  /*
   * Si Google no envía
   * Retry-After dejamos el
   * valor en null para que
   * BullMQ aplique el
   * backoff exponencial.
   */
  return null;
}


function isNetworkError(
  error,
) {
  return [
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENETUNREACH",
    "EHOSTUNREACH",
  ].includes(
    String(
      error?.code ?? "",
    ),
  );
}


function getErrorMessage(
  error,
) {
  return (
    error?.response?.data
      ?.error?.message ||
    error?.response?.data
      ?.message ||
    error?.message ||
    "PROVIDER_REQUEST_FAILED"
  );
}


function normalizeProviderError(
  provider,
  error,
) {
  const status =
    getStatus(error);

  let retryable = false;
  let retryAfterMs = null;

  if (
    provider === "github"
  ) {
    retryAfterMs =
      getGitHubRateLimitDelay(
        error,
      );

    retryable =
      retryAfterMs !== null ||
      [
        500,
        502,
        503,
        504,
      ].includes(status) ||
      isNetworkError(error);
  }


  if (
    provider === "google"
  ) {
    const googleRateLimited =
      isGoogleRateLimitError(
        error,
      );

    retryAfterMs =
      getGoogleRateLimitDelay(
        error,
      );

    retryable =
      googleRateLimited ||
      [
        500,
        502,
        503,
        504,
      ].includes(status) ||
      isNetworkError(error);
  }


  const normalizedError =
    new Error(
      getErrorMessage(error),
    );

  normalizedError.name =
    "ProviderRequestError";

  normalizedError.provider =
    provider;

  normalizedError.status =
    status;

  normalizedError.retryable =
    retryable;

  normalizedError.retryAfterMs =
    retryAfterMs;

  normalizedError.originalCode =
    error?.code ?? null;

  return normalizedError;
}


module.exports = {
  normalizeProviderError,
};