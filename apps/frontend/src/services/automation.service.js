import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
});

export async function getAutomations() {
  const { data } = await api.get("/automations");
  return data;
}

export async function createAutomation(payload) {
  const { data } = await api.post(
    "/automations",
    payload,
  );

  return data;
}

export async function updateAutomation(
  id,
  payload,
) {
  const { data } = await api.put(
    `/automations/${id}`,
    payload,
  );

  return data;
}

export async function deleteAutomation(id) {
  const { data } = await api.delete(
    `/automations/${id}`,
  );

  return data;
}

export async function toggleAutomation(
  id,
  isActive,
) {
  const { data } = await api.patch(
    `/automations/${id}/status`,
    {
      isActive,
    },
  );

  return data;
}