import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import { apiBaseUrl } from "@/lib/api";

interface ReportMetadataDTO {
  reportUid: string;
  warehouseCode: string;
  warehouseName: string;
  reportType: string;
  skuCodes: string[];
  createdAt: string;
  downloadUrl: string;
}

const WarehouseReports = () => {
  const navigate = useNavigate();
  const { warehouseCode } = useParams();
  const [reports, setReports] = useState<ReportMetadataDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    if (warehouseCode) fetchReports();
  }, [warehouseCode]);

  const fetchReports = async () => {
    try {
      const res = await fetch(apiBaseUrl + `/reports/warehouses/${warehouseCode}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setReports(await res.json());
    } catch { toast.error("Не удалось загрузить отчёты"); }
    finally { setLoading(false); }
  };

  const handleDownload = async (reportUid: string) => {
    try {
      const res = await fetch(apiBaseUrl + `/reports/download/${reportUid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${warehouseCode}-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error("Не удалось скачать отчёт");
      }
    } catch { toast.error("Ошибка скачивания"); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("ru-RU");

  if (!warehouseCode) return <div>Склад не выбран</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header warehouseCode={warehouseCode} />
      <Navigation warehouseCode={warehouseCode} />
      <main className="p-6">
        <h2 className="text-2xl font-bold mb-2">Отчёты — {warehouseCode}</h2>
        <p className="text-gray-600 mb-6">Сформированные PDF-отчёты</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Отчётов пока нет</p>
            <p className="text-sm text-gray-500 mt-2">Сформируйте отчёт в разделе «История данных»</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/history/${warehouseCode}`)}>
              Перейти к истории
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <Card key={r.reportUid} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    {r.reportType || "PDF"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{formatDate(r.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.skuCodes?.length ? `${r.skuCodes.length} SKU` : "Полный отчёт"}
                  </p>
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => handleDownload(r.reportUid)}>
                    <Download className="mr-2 h-4 w-4" />Скачать
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default WarehouseReports;
