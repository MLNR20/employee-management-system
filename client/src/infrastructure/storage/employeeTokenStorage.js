// Where the employee portal keeps its sign-in token. Deliberately separate from the administrator
// session (tokenStorage), so one kind of sign-in can never be mistaken for the other.
const KEY = "employeeToken";

export const employeeTokenStorage = {
  get: () => sessionStorage.getItem(KEY),
  set: (token) => sessionStorage.setItem(KEY, token),
  clear: () => sessionStorage.removeItem(KEY),
  has: () => Boolean(sessionStorage.getItem(KEY)),
};
