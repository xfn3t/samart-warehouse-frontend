import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import AppSidebar from "@/components/AppSidebar";

interface ReportMetadataDTO {
  reportUid: string;
  warehouseCode: string;
  warehouseName: string;
  reportType: string;
  skuCodes: string[];
  createdAt: string;
  downloadUrl: string;
}

const Reports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportMetadataDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/reports/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setReports(await res.json());
    } catch {
      toast.error("Не удалось загрузить отчёты");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (
    reportUid: string,
    warehouseCode: string,
    createdAt: string,
  ) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/reports/download/${reportUid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${warehouseCode}-${createdAt.slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error("Не удалось скачать отчёт");
      }
    } catch {
      toast.error("Ошибка скачивания");
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("ru-RU");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Отчёты</h1>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </header>

      <div className="flex">
        <AppSidebar />

        <main className="flex-1 p-6">
          <h2 className="text-2xl font-bold mb-2">Все отчёты</h2>
          <p className="text-gray-600 mb-6">
            Сформированные PDF-отчёты по всем складам
          </p>

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Отчётов пока нет</p>
              <p className="text-sm text-gray-500 mt-2">
                Перейдите в историю склада чтобы сформировать отчёт
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((r) => (
                <Card
                  key={r.reportUid}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {r.warehouseName || r.warehouseCode}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(r.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Тип: {r.reportType || "PDF"}{" "}
                      {r.skuCodes?.length
                        ? `(${r.skuCodes.length} SKU)`
                        : "(полный)"}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() =>
                        handleDownload(
                          r.reportUid,
                          r.warehouseCode,
                          r.createdAt,
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Скачать
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Reports;
