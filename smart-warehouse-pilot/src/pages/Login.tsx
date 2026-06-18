import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Введите email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Некорректный email";
    }
    if (!password) {
      newErrors.password = "Введите пароль";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    setLoading(true);

    try {
      const data = await apiClient.post("/auth/login", { email, password });
      localStorage.setItem("token", data.accessToken);
      toast.success("Вход выполнен успешно");
      navigate("/warehouses");
    } catch {
      // apiClient already shows toast
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password)
      setErrors((prev) => ({ ...prev, password: undefined }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Умный Склад</h1>
            <p className="text-gray-600">Система управления складом</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Input
                type="email"
                placeholder="Электронная почта"
                value={email}
                onChange={handleEmailChange}
                disabled={loading}
                className={`h-11 ${errors.email ? "border-destructive" : ""}`}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1">
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
                className={`h-11 ${errors.password ? "border-destructive" : ""}`}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Выполняется вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-gray-600">
              Нет учетной записи?{" "}
              <Link
                to="/register"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Создать учетную запись
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
