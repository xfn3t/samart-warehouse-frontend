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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Умный Склад</h1>
            <p className="text-gray-600">Система управления складом</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Электронная почта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-11"
            />

            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-11"
            />

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
