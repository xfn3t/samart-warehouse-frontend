import { useMemo } from "react";

interface AuthInfo {
  role: string;
  email: string;
  isAdmin: boolean;
  isWorker: boolean;
  isStorekeeper: boolean;
  isObserver: boolean;
}

const decodeJwt = (token: string): any => {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const useAuth = (): AuthInfo => {
  const token = localStorage.getItem("token");

  return useMemo(() => {
    if (!token) {
      return {
        role: "",
        email: "",
        isAdmin: false,
        isWorker: false,
        isStorekeeper: false,
        isObserver: false,
      };
    }

    const decoded = decodeJwt(token);
    if (!decoded) {
      return {
        role: "",
        email: "",
        isAdmin: false,
        isWorker: false,
        isStorekeeper: false,
        isObserver: false,
      };
    }

    // JWT claims: role could be in "role", "ROLE_...", "roles", or "scope"
    let role = decoded.role || decoded.scope || "";
    if (typeof role === "string" && role.startsWith("ROLE_")) {
      role = role.replace("ROLE_", "");
    }
    if (Array.isArray(decoded.roles)) {
      const adminRole = decoded.roles.find((r: string) => r.includes("ADMIN"));
      if (adminRole) role = "ADMIN";
      else if (
        decoded.roles.some((r: string) => r.includes("WAREHOUSE_WORKER"))
      )
        role = "WAREHOUSE_WORKER";
      else if (decoded.roles.some((r: string) => r.includes("VIEWER")))
        role = "VIEWER";
    }

    return {
      role,
      email: decoded.sub || decoded.email || "",
      isAdmin: role === "ADMIN",
      isWorker: role === "WAREHOUSE_WORKER",
      isStorekeeper: role === "WAREHOUSE_WORKER",
      isObserver: role === "VIEWER",
    };
  }, [token]);
};
