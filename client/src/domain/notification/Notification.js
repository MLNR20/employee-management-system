import { Entity, baseProps } from "../Entity";

/** A message for the navbar bell. `dateCreated` is when it was raised; `isRead` is true once it has been seen. */
export class Notification extends Entity {
  constructor({ title, subtitle = "", body = "", isRead = false, ...base } = {}) {
    super(base);
    this.title = title;
    this.subtitle = subtitle;
    this.body = body;
    this.isRead = isRead;
  }

  static fromApi(raw = {}) {
    return new Notification({
      ...baseProps(raw),
      title: raw.title,
      subtitle: raw.subtitle,
      body: raw.body,
      isRead: raw.isRead,
    });
  }
}
