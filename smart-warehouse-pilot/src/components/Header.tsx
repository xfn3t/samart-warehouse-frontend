import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Warehouse } from "lucide-react";

interface HeaderProps {
  warehouseCode?: string;
}

const Header = ({ warehouseCode }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("selectedWarehouse");
    navigate("/login");
  };

  const handleLogoClick = () => {
    navigate("/warehouses");
  };

  return (
    <header className="bg-white border-b px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1
            className="text-xl font-semibold cursor-pointer hover:text-primary transition-colors"
            onClick={handleLogoClick}
          >
            Умный склад
          </h1>
          {warehouseCode && (
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              <span className="text-sm">Склад: {warehouseCode}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
