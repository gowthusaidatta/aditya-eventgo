import axios, { AxiosInstance, AxiosConfig } from "axios";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
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
              const refreshResponse = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
                { refreshToken }
              );

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
      const response = await this.client.put(`/users/${userId}`, data);
      return response.data;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // Event endpoints
  async getEvents() {
    try {
      const response = await this.client.get("/events");
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

  async createEvent(data: any) {
    try {
      const response = await this.client.post("/events", data);
      return response.data;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  }

  async updateEvent(eventId: string, data: any) {
    try {
      const response = await this.client.put(`/events/${eventId}`, data);
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
      const response = await this.client.post("/opportunities", data);
      return response.data;
    } catch (error) {
      console.error("Error creating opportunity:", error);
      throw error;
    }
  }

  async updateOpportunity(oppId: string, data: any) {
    try {
      const response = await this.client.put(`/opportunities/${oppId}`, data);
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
  async request(method: string, url: string, data?: any) {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
      });
      return response.data;
    } catch (error) {
      console.error(`Error in ${method} request to ${url}:`, error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
