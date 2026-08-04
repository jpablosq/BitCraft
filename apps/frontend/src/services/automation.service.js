const API_URL = "http://localhost:3000/api/automations";

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    window.location.href = "/login";

    throw new Error(
      "La sesión ha expirado.",
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      "No se pudo procesar la solicitud.",
    );
  }

  return data;
}

export async function getAutomations() {
  return request(API_URL, {
    method: "GET",
  });
}

export async function createAutomation(automation) {
  return request(API_URL, {
    method: "POST",
    body: JSON.stringify(automation),
  });
}

export async function updateAutomation(
  automationId,
  automation,
) {
  return request(
    `${API_URL}/${automationId}`,
    {
      method: "PUT",
      body: JSON.stringify(automation),
    },
  );
}

export async function deleteAutomation(
  automationId,
) {
  return request(
    `${API_URL}/${automationId}`,
    {
      method: "DELETE",
    },
  );
}

export async function toggleAutomation(
  automationId,
  isActive,
) {
  return request(
    `${API_URL}/${automationId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        isActive,
      }),
    },
  );
}