import { API_BASE_URL } from "@/config";
export const apiBaseUrl = API_BASE_URL;
﻿import { toast } from "sonner";

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
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

    const config: RequestInit = { ...options, headers };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      if (!response.ok) {
        let errorMessage = `Ошибка ${response.status}`;
        try {
          const errorText = await response.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {}

        switch (response.status) {
          case 401:
            localStorage.removeItem("token");
            localStorage.removeItem("selectedWarehouse");
            toast.error("Сессия истекла. Авторизуйтесь заново.");
            setTimeout(() => {
              window.location.href = "/login";
            }, 1500);
            throw new Error(errorMessage);
          case 403:
            toast.error(errorMessage || "Доступ запрещён");
            throw new Error(errorMessage);
          case 404:
            toast.error(errorMessage || "Ресурс не найден");
            throw new Error(errorMessage);
          case 409:
            toast.error(errorMessage || "Конфликт данных");
            throw new Error(errorMessage);
          case 422:
            toast.error(errorMessage || "Невалидные данные");
            throw new Error(errorMessage);
          default:
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast.error("Сервер недоступен. Проверьте подключение.");
      }
      throw error;
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint);
  }

  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    const isFormData = data instanceof FormData;
    const requestOptions: RequestInit = { method: "POST", ...options };
    if (data && !isFormData) requestOptions.body = JSON.stringify(data);
    else if (data && isFormData) {
      if (requestOptions.headers && "Content-Type" in requestOptions.headers)
        delete (requestOptions.headers as any)["Content-Type"];
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
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
