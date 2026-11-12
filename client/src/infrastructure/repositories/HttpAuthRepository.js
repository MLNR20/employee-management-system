import { AuthRepository } from "../../domain/auth/AuthRepository";
import { createAdministrator } from "../../domain/auth/Administrator";
import { InvalidCredentialsError } from "../../domain/errors";
import { apiClient, publicClient } from "../http/apiClient";
import { tokenStorage } from "../storage/tokenStorage";

export class HttpAuthRepository extends AuthRepository {
  async login({ username, password }) {
    try {
      const { data } = await publicClient.post("/admin/login", {
        username,
        password,
      });
      tokenStorage.setTokens({
        accessToken: data.token,
        refreshToken: data.refreshToken,
      });
    } catch (error) {
      if (error.response?.status === 400) throw new InvalidCredentialsError();
      throw error;
    }
  }

  async logout() {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) await publicClient.post("/admin/logout", { refreshToken });
    } catch (error) {
      // The local session is cleared regardless of what the server says.
    } finally {
      tokenStorage.clear();
    }
  }

  async ensureAdministratorsExist() {
    await publicClient.get("/admin/");
  }

  async getCurrentAdministrator() {
    const { data } = await apiClient.get("/employees/protected");
    return createAdministrator(data.user);
  }

  isAuthenticated() {
    return tokenStorage.hasSession();
  }
}
