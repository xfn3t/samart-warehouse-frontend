import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import FilterPanel from "@/components/history/FilterPanel";
import DataTable from "@/components/history/DataTable";
import SelectedProductsTrendChart from "@/components/history/SelectedProductsTrendChart";
import CSVUploadModal from "@/components/CSVUploadModal";
import StockDepletionForecast from "@/components/dashboard/StockDepletionForecast";
import ReplenishmentNeeds from "@/components/dashboard/ReplenishmentNeeds";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient, apiBaseUrl } from "@/lib/api";

interface HistorySummaryDTO {
  total: number;
  uniqueProducts: number;
  discrepancies: number;
  avgZoneScanMinutes: number;
}

const History = () => {
  const navigate = useNavigate();
  const { warehouseCode } = useParams();
  const { isObserver } = useAuth();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [summary, setSummary] = useState<HistorySummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
    if (warehouseCode) {
      fetchSummary();
    }
  }, [navigate, warehouseCode]);

  const fetchSummary = async () => {
    try {
      const data = await apiClient.get(
        `/${warehouseCode}/inventory/history/summary`,
      );
      setSummary(data);
    } catch (error) {
      console.error("Failed to load history summary:", error);
      toast.error("Не удалось загрузить сводку истории");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    toast.success("Фильтры применены");
  };

  const handleExportExcel = async (selected: string[]) => {
    try {
      const token = localStorage.getItem("token");
      let url;
      const opts: RequestInit = {
        headers: { Authorization: `Bearer ${token}` },
      };
      if (selected.length > 0) {
        url = apiBaseUrl + `/reports/warehouses/${warehouseCode}/excel/by-skus`;
        opts.method = "POST";
        (opts.headers as Record<string, string>)["Content-Type"] =
          "application/json";
        opts.body = JSON.stringify(selected);
      } else {
        url = apiBaseUrl + `/reports/warehouses/${warehouseCode}/excel`;
      }
      const res = await fetch(url, opts);
      if (res.ok) {
        const data = await res.json();
        if (data.reportUid) {
          const dl = await fetch(
            apiBaseUrl + `/reports/download/${data.reportUid}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (dl.ok) {
            const blob = await dl.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `report-${warehouseCode}-${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            toast.success(
              selected.length > 0
                ? `Excel-отчёт по ${selected.length} товарам скачан`
                : "Полный Excel-отчёт скачан",
            );
          }
        }
      } else {
        toast.error("Не удалось сформировать отчёт");
      }
    } catch {
      toast.error("Ошибка скачивания");
    }
  };

  const handleExportPDF = async (selected: string[]) => {
    try {
      const token = localStorage.getItem("token");
      let url: string;
      const options: RequestInit = {
        headers: { Authorization: `Bearer ${token}` },
      };

      if (selected.length > 0) {
        url = apiBaseUrl + `/reports/warehouses/${warehouseCode}/pdf/by-skus`;
        options.method = "POST";
        (options.headers as Record<string, string>)["Content-Type"] =
          "application/json";
        options.body = JSON.stringify(selected);
      } else {
        url = apiBaseUrl + `/reports/warehouses/${warehouseCode}/pdf`;
      }

      const response = await fetch(url, options);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `report-${warehouseCode}-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
        toast.success(
          selected.length > 0
            ? `PDF-отчёт по ${selected.length} товарам скачан`
            : "Полный PDF-отчёт скачан",
        );
      } else {
        toast.error("Не удалось сформировать отчёт");
      }
    } catch {
      toast.error("Ошибка скачивания отчёта");
    }
  };

  const handleShowChart = (selected: string[]) => {
    if (selected.length === 0) {
      toast.info("Пожалуйста, выберите товары для просмотра графика");
    } else {
      setSelectedProducts(selected);
      toast.success(`Показан график для ${selected.length} товаров`);
    }
  };

  const handleSelectionChange = (selected: string[]) => {
    setSelectedProducts(selected);
  };

  if (!warehouseCode) {
    return <div>Склад не выбран</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header warehouseCode={warehouseCode} />
      <Navigation
        warehouseCode={warehouseCode}
        onUploadClick={isObserver ? undefined : () => setUploadModalOpen(true)}
      />

      <main className="p-6 space-y-6">
        <FilterPanel
          warehouseCode={warehouseCode}
          onFilterChange={handleFilterChange}
        />

        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="grid grid-cols-4 gap-6 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : summary ? (
              <div className="grid grid-cols-4 gap-6 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Всего сканирований за период
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {summary.total}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Уникальных товаров
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {summary.uniqueProducts}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Найдено расхождений
                  </p>
                  <p className="text-2xl font-bold text-destructive">
                    {summary.discrepancies}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Среднее время сканирования
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {summary.avgZoneScanMinutes
                      ? `${Math.round(summary.avgZoneScanMinutes)} мин`
                      : "Н/Д"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Не удалось загрузить сводку
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <StockDepletionForecast warehouseCode={warehouseCode} />
          <ReplenishmentNeeds warehouseCode={warehouseCode} />
        </div>

        <DataTable
          warehouseCode={warehouseCode}
          filters={filters}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          onShowChart={handleShowChart}
          onSelectionChange={handleSelectionChange}
          selectedProducts={selectedProducts}
        />

        {/* График остатков по выбранным товарам */}
        <SelectedProductsTrendChart
          warehouseCode={warehouseCode}
          selectedProducts={selectedProducts}
        />
      </main>

      <CSVUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        warehouseCode={warehouseCode}
      />
    </div>
  );
};

export default History;
