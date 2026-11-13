import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { employeeTokenStorage } from "../storage/employeeTokenStorage";
import { InvalidCredentialsError } from "../../domain/errors";

const client = axios.create({ baseURL: API_BASE_URL });

// Employee tokens are short-lived and have no refresh: an expired or rejected one just ends the session.
client.interceptors.request.use((config) => {
  const token = employeeTokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) employeeTokenStorage.clear();
    return Promise.reject(error);
  }
);

/** Sign-in and the signed-in employee's own details. */
export class HttpEmployeePortalRepository {
  async login({ email, password }) {
    try {
      const { data } = await client.post("/employee-auth/login", { email, password });
      employeeTokenStorage.set(data.token);
    } catch (error) {
      if (error.response?.status === 400) throw new InvalidCredentialsError("Incorrect email or password.");
      throw error;
    }
  }

  logout() {
    employeeTokenStorage.clear();
  }

  isSignedIn() {
    return employeeTokenStorage.has();
  }

  /** { _id, first_name, last_name, email, position, department } */
  async getMe() {
    const { data } = await client.get("/employee-portal/me");
    return data;
  }
}
