// What the screens show an administrator. The server enforces every permission itself: this only
// keeps people from being offered things that would be refused.

/** Whether `held` includes `required`, or any one of them when it is a list. Nothing required: yes. */
export const allows = (held = [], required) => !required || [required].flat().some((permission) => held.includes(permission));

/**
 * The permission each action on a resource screen (see src/resources) needs. By default they are the
 * four of the module named like the resource; a resource lists its own in `access` where that differs.
 */
export const resourceAccess = (resource) => ({
  view: resource.permission ?? `${resource.key}:view`,
  create: `${resource.key}:create`,
  edit: `${resource.key}:edit`,
  remove: `${resource.key}:delete`,
  ...resource.access,
});
