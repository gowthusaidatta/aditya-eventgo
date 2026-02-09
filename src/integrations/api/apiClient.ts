import axios, { AxiosInstance, AxiosConfig } from "axios";

const USERS_DEFAULTS = {
  full_name: "",
  email: "",
  phone: "",
  avatar_url: "",
  user_type: "student",
  college_name: "",
  graduation_year: 0,
  roll_number: "",
  branch: "",
  college_id: "",
  is_verified: false,
  college_role: "",
  permissions: [],
};

const EVENTS_DEFAULTS = {
  title: "",
  description: "",
  short_description: "",
  full_description: "",
  event_type: "",
  start_date: "",
  end_date: "",
  location: "",
  max_participants: 0,
  image_url: "",
  video_url: "",
  college_id: "",
  created_by: "",
  is_featured: false,
  mode: "offline",
  status: "draft",
  participation_type: "individual",
  difficulty_level: "Beginner",
  registration_deadline: "",
  registration_fee: 0,
  waitlist_enabled: false,
  waitlist_count: 0,
  tags: [],
  skills: [],
  venue_details: {},
  online_link: "",
  is_hackathon: false,
  team_size_min: 1,
  team_size_max: 1,
  event_config: {},
  prizes: [],
  sponsors: [],
  faqs: [],
};

const OPPORTUNITIES_DEFAULTS = {
  title: "",
  description: "",
  type: "",
  company: "",
  location: "",
  apply_url: "",
  stipend: 0,
  salary: 0,
  deadline: "",
  image_url: "",
  status: "",
  tags: [],
  created_by: "",
};

const REGISTRATIONS_DEFAULTS = {
  event_id: "",
  user_id: "",
  qr_code: "",
  registration_status: "",
  registered_at: "",
  created_at: "",
  createdAt: "",
  registrant: {},
};

function cloneDefault(value: any) {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...value };
  return value;
}

function normalizePayload(payload: any, defaults: Record<string, any>) {
  const result = { ...(payload || {}) };
  Object.keys(defaults).forEach((key) => {
    if (result[key] === null || result[key] === undefined) {
      result[key] = cloneDefault(defaults[key]);
    }
  });
  return result;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
    const authClient = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("cognito_access_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle 401 and refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          try {
            const refreshToken = localStorage.getItem("cognito_refresh_token");
            if (refreshToken) {
              // Call refresh endpoint on your backend
              const storedUser = localStorage.getItem("cognito_user");
              const storedUsername = localStorage.getItem("cognito_username");
              const username = storedUsername || (storedUser ? JSON.parse(storedUser)?.email : undefined);
              const refreshResponse = await authClient.post("/auth/refresh", {
                refreshToken,
                username,
              });

              if (refreshResponse.data.accessToken) {
                localStorage.setItem(
                  "cognito_access_token",
                  refreshResponse.data.accessToken
                );
                // Retry original request with new token
                const config = error.config;
                config.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
                return this.client(config);
              }
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          }

          // If refresh fails, redirect to login
          localStorage.removeItem("cognito_access_token");
          localStorage.removeItem("cognito_id_token");
          localStorage.removeItem("cognito_refresh_token");
          localStorage.removeItem("cognito_user");
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }
    );
  }

  async authLogin(data: { username: string; password: string }) {
    const response = await this.client.post("/auth/login", data);
    return response.data;
  }

  async authSignup(data: { email: string; password: string; name?: string; phone?: string }) {
    const response = await this.client.post("/auth/signup", data);
    return response.data;
  }

  async confirmSignup(data: { username: string; code: string }) {
    const response = await this.client.post("/auth/confirm-signup", data);
    return response.data;
  }

  async resendConfirmation(data: { username: string }) {
    const response = await this.client.post("/auth/resend-confirmation", data);
    return response.data;
  }

  async forgotPassword(data: { username: string }) {
    const response = await this.client.post("/auth/forgot-password", data);
    return response.data;
  }

  async confirmForgotPassword(data: { username: string; code: string; newPassword: string }) {
    const response = await this.client.post("/auth/confirm-forgot-password", data);
    return response.data;
  }

  async authRefresh(data: { refreshToken: string; username?: string }) {
    const response = await this.client.post("/auth/refresh", data);
    return response.data;
  }

  // User endpoints
  async getUser(userId: string) {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, data: any) {
    try {
      const response = await this.client.put(
        `/users/${userId}`,
        normalizePayload(data, USERS_DEFAULTS)
      );
      return response.data;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  async listUsers(params?: { userType?: string; verified?: boolean }) {
    try {
      const response = await this.client.get("/users", {
        params: {
          userType: params?.userType,
          verified: params?.verified !== undefined ? String(params.verified) : undefined,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching users list:", error);
      throw error;
    }
  }

  async deleteUser(userId: string) {
    try {
      await this.client.delete(`/users/${userId}`);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Event endpoints
  async getEvents(params?: any) {
    try {
      const response = await this.client.get("/events", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  }

  async getEvent(eventId: string) {
    try {
      const response = await this.client.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching event:", error);
      throw error;
    }
  }

  async getEventSchema(eventId: string) {
    try {
      const response = await this.client.get(`/events/${eventId}/schema`);
      return response.data;
    } catch (error) {
      console.error("Error fetching event schema:", error);
      throw error;
    }
  }

  async createEvent(data: any) {
    try {
      const response = await this.client.post(
        "/events",
        normalizePayload(data, EVENTS_DEFAULTS)
      );
      return response.data;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  }

  async updateEvent(eventId: string, data: any) {
    try {
      const response = await this.client.put(
        `/events/${eventId}`,
        normalizePayload(data, EVENTS_DEFAULTS)
      );
      return response.data;
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.client.delete(`/events/${eventId}`);
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  }

  async getRegistrationCount(eventId: string) {
    try {
      const response = await this.client.get(`/registrations/count`, {
        params: { eventId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching registration count:", error);
      throw error;
    }
  }

  async getRegistrations(eventId?: string) {
    try {
      const response = await this.client.get("/registrations", {
        params: eventId ? { eventId } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching registrations:", error);
      throw error;
    }
  }

  async getEventRegistrations(eventId: string) {
    try {
      const response = await this.client.get("/registrations", {
        params: { eventId, all: true },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching event registrations:", error);
      throw error;
    }
  }

  async getAllRegistrations(params?: { startDate?: string; endDate?: string }) {
    try {
      const response = await this.client.get("/registrations/all", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching registrations:", error);
      throw error;
    }
  }

  async cancelRegistration(eventId: string) {
    try {
      await this.client.delete(`/registrations/${eventId}`);
    } catch (error) {
      console.error("Error canceling registration:", error);
      throw error;
    }
  }

  async registerForEvent(eventId: string, payload: any) {
    try {
      const response = await this.client.post(
        "/registrations",
        normalizePayload({ eventId, ...payload }, REGISTRATIONS_DEFAULTS)
      );
      return response.data;
    } catch (error) {
      console.error("Error registering for event:", error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const response = await this.client.get("/users/me");
      return response.data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  async updateProfile(data: any) {
    try {
      const response = await this.client.put(
        "/users/me",
        normalizePayload(data, USERS_DEFAULTS)
      );
      return response.data;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  async createMediaUploadUrl(payload: { fileName: string; contentType: string; folder?: string }) {
    try {
      const response = await this.client.post("/media/presign", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating upload URL:", error);
      throw error;
    }
  }

  async getTeams(eventId: string) {
    try {
      const response = await this.client.get("/teams", { params: { eventId } });
      return response.data;
    } catch (error) {
      console.error("Error fetching teams:", error);
      throw error;
    }
  }

  async getTeamsByMentor(mentorId: string) {
    try {
      const response = await this.client.get("/teams", { params: { mentorId } });
      return response.data;
    } catch (error) {
      console.error("Error fetching mentor teams:", error);
      throw error;
    }
  }

  async getTeamByInviteCode(eventId: string, inviteCode: string) {
    try {
      const response = await this.client.get("/teams", {
        params: { eventId, inviteCode },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching team by invite code:", error);
      throw error;
    }
  }

  async createTeam(payload: any) {
    try {
      const response = await this.client.post("/teams", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating team:", error);
      throw error;
    }
  }

  async updateTeam(teamId: string, payload: any) {
    try {
      const response = await this.client.put(`/teams/${teamId}`, payload);
      return response.data;
    } catch (error) {
      console.error("Error updating team:", error);
      throw error;
    }
  }

  async deleteTeam(teamId: string, eventId: string) {
    try {
      await this.client.delete(`/teams/${teamId}`, { params: { event_id: eventId } });
    } catch (error) {
      console.error("Error deleting team:", error);
      throw error;
    }
  }

  async getTeamMembers(teamId: string) {
    try {
      const response = await this.client.get(`/teams/${teamId}/members`);
      return response.data;
    } catch (error) {
      console.error("Error fetching team members:", error);
      throw error;
    }
  }

  async addTeamMember(teamId: string, payload: any) {
    try {
      const response = await this.client.post(`/teams/${teamId}/members`, payload);
      return response.data;
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  }

  async removeTeamMember(teamId: string, userId: string) {
    try {
      await this.client.delete(`/teams/${teamId}/members/${userId}`);
    } catch (error) {
      console.error("Error removing team member:", error);
      throw error;
    }
  }

  async getUsersByIds(userIds: string[]) {
    try {
      const response = await this.client.get("/users", {
        params: { ids: userIds.join(","), t: Date.now() },
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      });
      const items = Array.isArray(response.data) ? response.data : [];
      return items.map((item) => ({
        ...item,
        userId: item.userId || item.user_id,
      }));
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async getNotifications() {
    try {
      const response = await this.client.get("/notifications");
      return response.data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  async markNotificationRead(notificationId: string) {
    try {
      const response = await this.client.post("/notifications/mark-read", {
        notification_id: notificationId,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating notification:", error);
      throw error;
    }
  }

  async markAllNotificationsRead() {
    try {
      const response = await this.client.post("/notifications/mark-all-read");
      return response.data;
    } catch (error) {
      console.error("Error updating notifications:", error);
      throw error;
    }
  }

  async getSubmissions(params: { eventId: string; teamId?: string; round?: string }) {
    try {
      const response = await this.client.get("/submissions", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching submissions:", error);
      throw error;
    }
  }

  async createSubmission(payload: any) {
    try {
      const response = await this.client.post("/submissions", payload);
      return response.data;
    } catch (error) {
      console.error("Error creating submission:", error);
      throw error;
    }
  }

  async updateSubmission(submissionId: string, payload: any) {
    try {
      const response = await this.client.put(`/submissions/${submissionId}`, payload);
      return response.data;
    } catch (error) {
      console.error("Error updating submission:", error);
      throw error;
    }
  }

  async getRubrics(eventId: string) {
    try {
      const response = await this.client.get("/rubrics", { params: { eventId } });
      return response.data;
    } catch (error) {
      console.error("Error fetching rubrics:", error);
      throw error;
    }
  }

  async saveJudgingScore(payload: any) {
    try {
      const response = await this.client.post("/judging/scores", payload);
      return response.data;
    } catch (error) {
      console.error("Error saving score:", error);
      throw error;
    }
  }

  async getJudgingScores(submissionId: string) {
    try {
      const response = await this.client.get("/judging/scores", {
        params: { submissionId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching scores:", error);
      throw error;
    }
  }

  async getPlatformRoles(params?: { role?: string; eventId?: string }) {
    try {
      const response = await this.client.get("/roles/platform", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching platform roles:", error);
      throw error;
    }
  }

  async getRolePermissions() {
    try {
      const response = await this.client.get("/permissions/roles");
      return response.data;
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      throw error;
    }
  }

  async updateRolePermissions(roleId: string, permissions: string[]) {
    try {
      const response = await this.client.put(`/permissions/roles/${roleId}`, { permissions });
      return response.data;
    } catch (error) {
      console.error("Error updating role permissions:", error);
      throw error;
    }
  }

  async createSchedule(eventId: string, items: any[]) {
    try {
      const response = await this.client.post(`/events/${eventId}/schedule`, { items });
      return response.data;
    } catch (error) {
      console.error("Error saving schedule:", error);
      throw error;
    }
  }

  async checkInRegistration(payload: { eventId: string; qrCode: string }) {
    try {
      const response = await this.client.post("/registrations/checkin", payload);
      return response.data;
    } catch (error) {
      console.error("Error checking in registration:", error);
      throw error;
    }
  }

  // Opportunities endpoints
  async getOpportunities() {
    try {
      const response = await this.client.get("/opportunities");
      return response.data;
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      throw error;
    }
  }

  async getOpportunity(oppId: string) {
    try {
      const response = await this.client.get(`/opportunities/${oppId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      throw error;
    }
  }

  async createOpportunity(data: any) {
    try {
      const response = await this.client.post(
        "/opportunities",
        normalizePayload(data, OPPORTUNITIES_DEFAULTS)
      );
      return response.data;
    } catch (error) {
      console.error("Error creating opportunity:", error);
      throw error;
    }
  }

  async updateOpportunity(oppId: string, data: any) {
    try {
      const response = await this.client.put(
        `/opportunities/${oppId}`,
        normalizePayload(data, OPPORTUNITIES_DEFAULTS)
      );
      return response.data;
    } catch (error) {
      console.error("Error updating opportunity:", error);
      throw error;
    }
  }

  async deleteOpportunity(oppId: string) {
    try {
      await this.client.delete(`/opportunities/${oppId}`);
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      throw error;
    }
  }

  // Generic request method for custom endpoints
  async request(method: string, url: string, data?: any, config?: AxiosConfig) {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
        ...(config || {}),
      });
      return response.data;
    } catch (error) {
      console.error(`Error in ${method} request to ${url}:`, error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
