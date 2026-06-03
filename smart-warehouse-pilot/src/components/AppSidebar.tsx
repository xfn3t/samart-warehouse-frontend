import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Warehouse, Bot, Users, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/warehouses", label: "Склады", icon: Warehouse },
  { path: "/robots", label: "Роботы", icon: Bot },
  { path: "/users", label: "Пользователи", icon: Users, adminOnly: true },
  { path: "/reports", label: "Отчёты", icon: FileText },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <div className="w-64 bg-white border-r min-h-[calc(100vh-65px)]">
      <div className="p-4 space-y-2">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <Button
              key={item.path}
              variant={location.pathname.startsWith(item.path) ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          ))}
      </div>
    </div>
  );
};

export default AppSidebar;
