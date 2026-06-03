import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, History, Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  warehouseCode?: string;
  onUploadClick?: () => void;
}

const Navigation = ({ warehouseCode, onUploadClick }: NavigationProps) => {
  const location = useLocation();

  const getDashboardPath = () => {
    return warehouseCode ? `/dashboard/${warehouseCode}` : "/dashboard";
  };

  const getHistoryPath = () => {
    return warehouseCode ? `/history/${warehouseCode}` : "/history";
  };

  const getReportsPath = () => {
    return warehouseCode ? `/reports/${warehouseCode}` : "/reports";
  };

  return (
    <nav className="bg-card border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to={getDashboardPath()}>
            <Button
              variant={
                location.pathname.includes("/dashboard") ? "default" : "ghost"
              }
              className={cn(
                "space-x-2",
                location.pathname.includes("/dashboard") &&
                  "bg-primary text-primary-foreground",
              )}
            >
              <Activity className="h-4 w-4" />
              <span>Текущий мониторинг</span>
            </Button>
          </Link>
          <Link to={getHistoryPath()}>
            <Button
              variant={
                location.pathname.includes("/history") ? "default" : "ghost"
              }
              className={cn(
                "space-x-2",
                location.pathname.includes("/history") &&
                  "bg-primary text-primary-foreground",
              )}
            >
              <History className="h-4 w-4" />
              <span>История данных</span>
            </Button>
          </Link>
          <Link to={getReportsPath()}>
            <Button
              variant={location.pathname.includes("/reports") ? "default" : "ghost"}
              className={cn("space-x-2", location.pathname.includes("/reports") && "bg-primary text-primary-foreground")}
            >
              <FileText className="h-4 w-4" />
              <span>Отчёты</span>
            </Button>
          </Link>
        </div>

        {onUploadClick && (
          <Button
            onClick={onUploadClick}
            variant="outline"
            className="space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Загрузить CSV</span>
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
