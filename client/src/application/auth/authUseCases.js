// Auth use cases. Each takes the repository contract, never a concrete implementation.
export const createAuthUseCases = (authRepository) => ({
  login: (credentials) => authRepository.login(credentials),
  register: (administrator) => authRepository.register(administrator),
  logout: () => authRepository.logout(),
  ensureAdministratorsExist: () => authRepository.ensureAdministratorsExist(),
  getCurrentAdministrator: () => authRepository.getCurrentAdministrator(),
  isAuthenticated: () => authRepository.isAuthenticated(),
});
