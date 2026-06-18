import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  LogOut,
  Warehouse,
  Bot,
  Shield,
  User,
  Loader2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { apiBaseUrl } from "@/lib/api";

interface UserDTO {
  id: number;
  email: string;
  name: string;
  role: { id?: number; code?: string; name?: string } | string;
  deleted: boolean;
}

interface WarehouseDTO {
  id: number;
  code: string;
  name: string;
}

// Safe role extraction: b/e may return string "ADMIN" or object {code: "ADMIN", name: "..."}
const getRoleString = (role: any): string => {
  if (!role)
    return "\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e";
  if (typeof role === "string") {
    return role.replace("ROLE_", "");
  }
  if (typeof role === "object") {
    if (role.code) return role.code.replace("ROLE_", "");
    if (role.name) return role.name;
  }
  return String(role);
};

const UsersPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "VIEWER",
  });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (warehouses.length > 0) {
      fetchAllUsers();
    }
  }, [warehouses]);

  const fetchAllUsers = async () => {
    try {
      const allUsers = [];
      for (const wh of warehouses) {
        try {
          const response = await fetch(
            apiBaseUrl + `/${wh.code}/users`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              allUsers.push(...data);
            }
          }
        } catch {
        }
      }
      const unique = allUsers.filter(
        (u, i, arr) => arr.findIndex((x) => x.id === u.id) === i
      );
      setUsers(unique);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(apiBaseUrl + "/warehouse", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
        if (data.length > 0 && !selectedWarehouse) {
          setSelectedWarehouse(data[0].code);
        }
      } else {
        toast.error("Не удалось загрузить склады");
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("selectedWarehouse");
    navigate("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) {
      toast.error("Выберите склад");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        apiBaseUrl + `/${selectedWarehouse}/users/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        },
      );

      if (response.status === 201) {
        toast.success("Пользователь создан");
        setCreateModalOpen(false);
        resetForm();
        // Add the created user to local list optimistically
        setUsers((prev) => [
          ...prev,
          {
            id: Date.now(),
            email: formData.email,
            name: formData.name || "",
            role: formData.role,
            deleted: false,
          },
        ]);
      } else if (response.status === 403) {
        toast.error("Недостаточно прав для создания пользователя");
      } else {
        const errorText = await response.text();
        let message = "Ошибка создания";
        try {
          const err = JSON.parse(errorText);
          message = err.message || message;
        } catch {}
        throw new Error(message);
      }
    } catch (error: any) {
      toast.error(error.message || "Не удалось создать пользователя");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      role: "VIEWER",
    });
  };

  const getRoleBadge = (rawRole: any) => {
    const role = getRoleString(rawRole);
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
            <Shield className="h-3 w-3" />
            Админ
          </span>
        );
      case "WAREHOUSE_WORKER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
            <Warehouse className="h-3 w-3" />
            Кладовщик
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            <User className="h-3 w-3" />
            {role}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin) {
    navigate("/warehouses");
    return null;
  }

  // Redirect to login if no token
  if (!token) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Управление пользователями</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Все пользователи</h2>
              <p className="text-gray-600">
                Управляйте доступом пользователей к складам
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить пользователя
            </Button>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Пользователи не найдены
              </h3>
              <p className="text-gray-500 mb-6">
                Добавьте пользователей для доступа к системе
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить первого пользователя
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <Card
                  key={user.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="truncate">{user.name || "Без имени"}</div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center justify-between">
                      {getRoleBadge(user.role)}
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          !user.deleted
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {!user.deleted ? "Активен" : "Отключён"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create User Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Добавить пользователя
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-select">Склад *</Label>
              <Select
                value={selectedWarehouse}
                onValueChange={setSelectedWarehouse}
              >
                <SelectTrigger id="wh-select">
                  <SelectValue placeholder="Выберите склад" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.code} value={wh.code}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {warehouses.length === 0 && (
                <p className="text-xs text-destructive">
                  Нет доступных складов. Сначала создайте склад.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="user@example.com"
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Иван"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••"
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAREHOUSE_WORKER">Кладовщик</SelectItem>
                  <SelectItem value="VIEWER">Наблюдатель</SelectItem>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                По умолчанию: Наблюдатель (только чтение)
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateModalOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Создать"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
