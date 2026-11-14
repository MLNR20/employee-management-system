import { permissionKey } from "./Role";

// Pure helpers for the permission matrix. A selection is a Set of "<module>:<action>" keys.

/** Every action used anywhere in the catalog, in first-seen order: the matrix columns. */
export const catalogActions = (catalog = []) => [...new Set(catalog.flatMap((module) => module.actions))];

export const moduleKeys = (module) => module.actions.map((action) => permissionKey(module.key, action));

export const allKeys = (catalog = []) => catalog.flatMap(moduleKeys);

/** Flips one permission, returning a new Set. */
export const toggle = (selected, key) => {
  const next = new Set(selected);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

/** Grants or revokes a group of permissions at once (a whole row or column). */
export const setMany = (selected, keys, granted) => {
  const next = new Set(selected);
  keys.forEach((key) => (granted ? next.add(key) : next.delete(key)));
  return next;
};

export const hasAll = (selected, keys) => keys.length > 0 && keys.every((key) => selected.has(key));

export const hasSome = (selected, keys) => keys.some((key) => selected.has(key));

/** True when the draft differs from what the role already has saved. */
export const isDirty = (selected, saved = []) =>
  selected.size !== new Set(saved).size || saved.some((key) => !selected.has(key));
