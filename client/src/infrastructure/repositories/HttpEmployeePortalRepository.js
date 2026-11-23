import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { employeeTokenStorage } from "../storage/employeeTokenStorage";
import { InvalidCredentialsError } from "../../domain/errors";
import { Notification } from "../../domain/notification/Notification";

const client = axios.create({ baseURL: API_BASE_URL });

let onSessionExpired = () => {};

/** The auth context registers here so it learns when the server turns the employee's token down. */
export function setEmployeeSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Employee tokens are short-lived and have no refresh: an expired or rejected one just ends the session.
client.interceptors.request.use((config) => {
  const token = employeeTokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      employeeTokenStorage.clear();
      onSessionExpired();
    }
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

  /**
   * { today, recent }: today's record (null before timing in) and the latest records, newest first.
   * A record is { _id, date, timeIn, lunchOut, lunchIn, timeOut, hoursWorked, lateMinutes }.
   */
  async getAttendance() {
    const { data } = await client.get("/employee-portal/attendance");
    return data;
  }

  /** @param {"time-in" | "lunch-out" | "lunch-in" | "time-out"} step */
  async clock(step) {
    const { data } = await client.post(`/employee-portal/attendance/${step}`);
    return data;
  }

  /** Leave types an employee can apply for: [{ _id, name, isPaid }] */
  async getLeaveTypes() {
    const { data } = await client.get("/employee-portal/leave-types");
    return data.data;
  }

  /** The employee's own balances: [{ _id, leaveTypeId, maxLeaves, availableLeaves }] */
  async getLeaveBalances() {
    const { data } = await client.get("/employee-portal/leave-balances");
    return data.data;
  }

  /**
   * The employee's own leave: [{ _id, leaveTypeId, startDate, endDate, days, reason, status, decision }].
   * `decision` is null until an administrator decides, then { decision, decidedBy, decidedAt, remarks }.
   */
  async getLeaveRequests() {
    const { data } = await client.get("/employee-portal/leave-requests");
    return data.data;
  }

  /** Files leave for the signed-in employee. Dates are "YYYY-MM-DD". */
  async applyForLeave({ leaveTypeId, startDate, endDate, reason }) {
    const { data } = await client.post("/employee-portal/leave-requests", { leaveTypeId, startDate, endDate, reason });
    return data;
  }

  async cancelLeave(id) {
    const { data } = await client.post(`/employee-portal/leave-requests/${id}/cancel`);
    return data;
  }

  /** The signed-in employee's own notifications (e.g. a report's leave request), newest first. */
  async getNotifications({ page = 1, pageSize = 20 } = {}) {
    const { data } = await client.get("/employee-portal/notifications", { params: { page, pageSize } });
    return { items: data.data.map(Notification.fromApi), total: data.count };
  }

  async getNotificationCount() {
    const { data } = await client.get("/employee-portal/notifications/unread-count");
    return data.count;
  }

  async markNotificationRead(id) {
    const { data } = await client.patch(`/employee-portal/notifications/${id}/read`);
    return Notification.fromApi(data);
  }

  async markAllNotificationsRead() {
    await client.post("/employee-portal/notifications/read-all");
  }

  /** { available: [...], borrowed: [...] }: what can be borrowed, and what this employee holds. */
  async getEquipment() {
    const { data } = await client.get("/employee-portal/equipment");
    return data;
  }

  async borrowEquipment(id) {
    const { data } = await client.post(`/employee-portal/equipment/${id}/borrow`);
    return data;
  }

  async returnEquipment(id) {
    const { data } = await client.post(`/employee-portal/equipment/${id}/return`);
    return data;
  }
}
