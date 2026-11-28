/**
 * @typedef {Object} Administrator
 * @property {string} id
 * @property {string} username
 * @property {string} first_name
 * @property {string} last_name
 * @property {string[]} roles the names of their roles when they signed in
 */

export function createAdministrator(raw = {}) {
  return {
    id: raw.id,
    username: raw.username,
    first_name: raw.first_name,
    last_name: raw.last_name,
    roles: raw.roles ?? [],
  };
}

export const administratorFullName = (admin) =>
  `${admin.first_name} ${admin.last_name}`;
