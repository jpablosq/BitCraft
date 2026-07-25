import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
});

export async function login(email, password) {
  const { data } = await api.post("/auth/login", {
    email,
    password,
  });

  return data;
}

export async function register(
  name,
  username,
  email,
  password,
) {
  const { data } = await api.post("/auth/register", {
    name,
    username,
    email,
    password,
  });

  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");

  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");

  return data;
}