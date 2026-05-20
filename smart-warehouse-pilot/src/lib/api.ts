import { toast } from "sonner";

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = "http://localhost:8080/api";
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("selectedWarehouse");
          window.location.href = "/login";
          throw new Error("Authentication required");
        }

        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // For file uploads, we might not have JSON response
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint);
  }

  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    const isFormData = data instanceof FormData;

    const requestOptions: RequestInit = {
      method: "POST",
      ...options,
    };

    if (data && !isFormData) {
      requestOptions.body = JSON.stringify(data);
    } else if (data && isFormData) {
      // Remove Content-Type for FormData to let browser set it with boundary
      if (requestOptions.headers && "Content-Type" in requestOptions.headers) {
        delete (requestOptions.headers as any)["Content-Type"];
      }
      requestOptions.body = data;
    }

    return this.request(endpoint, requestOptions);
  }

  async put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient();
