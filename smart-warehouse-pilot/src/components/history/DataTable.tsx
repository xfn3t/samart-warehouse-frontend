import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import ProductHistoryModal from "./ProductHistoryModal";

interface DataRow {
  productCode: string;
  productName: string;
  category: string;
  expectedQuantity: number;
  actualQuantity: number;
  difference: number;
  lastScannedAt: string;
  statusCode: string;
  robotCode: string;
}

interface ProductLastInventoryPageDTO {
  total: number;
  page: number;
  size: number;
  items: DataRow[];
}

interface DataTableProps {
  warehouseCode: string;
  filters: any;
  onExportExcel: (selected: string[]) => void;
  onExportPDF: (selected: string[]) => void;
  onShowChart: (selected: string[]) => void;
  onSelectionChange: (selected: string[]) => void;
  selectedProducts: string[];
}

const DataTable = ({
  warehouseCode,
  filters,
  onExportExcel,
  onExportPDF,
  onShowChart,
  onSelectionChange,
  selectedProducts,
}: DataTableProps) => {
  const [data, setData] = useState<ProductLastInventoryPageDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string>("lastScannedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductsModal, setSelectedProductsModal] = useState<string[]>(
    [],
  );
  const rowsPerPage = 20;

  useEffect(() => {
    if (!warehouseCode) return;
    fetchData();
  }, [warehouseCode, currentPage, sortColumn, sortDirection, filters]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage.toString(),
        size: rowsPerPage.toString(),
        sort: sortColumn,
        order: sortDirection,
      };

      if (filters.q) params.q = filters.q;
      if (filters.status && filters.status !== "all")
        params.statuses = [filters.status];
      if (filters.robotCode && filters.robotCode !== "all")
        params.robots = [filters.robotCode];
      if (filters.categories && filters.categories.length > 0)
        params.categories = filters.categories;

      const queryString = new URLSearchParams(params).toString();
      const data = await apiClient.get(
        `/${warehouseCode}/inventory/history/last?${queryString}`,
      );
      setData(data);
    } catch (error) {
      console.error("Failed to fetch last inventory data:", error);
      setError("Не удалось загрузить данные. Пожалуйста, попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(0);
  };

  const handleSelectAll = () => {
    if (!data?.items) return;

    if (selectedProducts.length === data.items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.items.map((row) => row.productCode));
    }
  };

  const handleSelectRow = (productCode: string) => {
    onSelectionChange(
      selectedProducts.includes(productCode)
        ? selectedProducts.filter((code) => code !== productCode)
        : [...selectedProducts, productCode],
    );
  };

  const handleProductClick = (productCode: string) => {
    setSelectedProductsModal([productCode]);
  };

  const handleShowChart = () => {
    if (selectedProducts.length > 0) {
      onShowChart(selectedProducts);
    } else {
      onShowChart([]);
    }
  };

  const getStatusBadge = (statusCode: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" =
      "default";

    switch (statusCode) {
      case "OK":
        variant = "default";
        break;
      case "LOW_STOCK":
        variant = "secondary";
        break;
      case "CRITICAL":
        variant = "destructive";
        break;
      default:
        variant = "outline";
    }

    const statusLabels: Record<string, string> = {
      "OK": "OK",
      "LOW_STOCK": "Низкий запас",
      "CRITICAL": "Критический",
    };

    return <Badge variant={variant}>{statusLabels[statusCode] || statusCode || "Неизвестно"}</Badge>;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const formatDateSafe = (dateString: string): string => {
    if (!dateString) return "Н/Д";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Некорректная дата";
      }

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Ошибка даты";
    }
  };

  const totalPages = data ? Math.ceil(data.total / rowsPerPage) : 0;

  if (loading) {
    return (
      <div className="bg-card border rounded-lg">
        <div className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline">
          Повторить
        </Button>
      </div>
    );
  }

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          {Object.keys(filters).length > 0
            ? "Нет данных по текущим фильтрам"
            : "Нет данных"}
        </p>
        {Object.keys(filters).length > 0 && (
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mt-4"
          >
            Очистить фильтры и перезагрузить
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportExcel(selectedProducts)}
            disabled={selectedProducts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportPDF(selectedProducts)}
            disabled={selectedProducts.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowChart}
            disabled={selectedProducts.length === 0}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            График
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          Выбрано: {selectedProducts.length} из {data.total}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedProducts.length === data.items.length &&
                    data.items.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead
                onClick={() => handleSort("lastScannedAt")}
                className="cursor-pointer hover:bg-muted/50"
              >
                <div className="flex items-center gap-1">
                  Дата/Время
                  <SortIcon column="lastScannedAt" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("robotCode")}
                className="cursor-pointer hover:bg-muted/50"
              >
                <div className="flex items-center gap-1">
                  Робот
                  <SortIcon column="robotCode" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("productCode")}
                className="cursor-pointer hover:bg-muted/50"
              >
                <div className="flex items-center gap-1">
                  Код товара
                  <SortIcon column="productCode" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("productName")}
                className="cursor-pointer hover:bg-muted/50"
              >
                <div className="flex items-center gap-1">
                  Название товара
                  <SortIcon column="productName" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("category")}
                className="cursor-pointer hover:bg-muted/50"
              >
                <div className="flex items-center gap-1">
                  Категория
                  <SortIcon column="category" />
                </div>
              </TableHead>
              <TableHead className="text-right">Ожидаемое</TableHead>
              <TableHead className="text-right">Фактическое</TableHead>
              <TableHead className="text-right">Разница</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => (
              <TableRow key={row.productCode} className="hover:bg-muted/50">
                <TableCell>
                  <Checkbox
                    checked={selectedProducts.includes(row.productCode)}
                    onCheckedChange={() => handleSelectRow(row.productCode)}
                  />
                </TableCell>
                <TableCell>{formatDateSafe(row.lastScannedAt)}</TableCell>
                <TableCell>{row.robotCode || "Н/Д"}</TableCell>
                <TableCell
                  className="font-mono cursor-pointer text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  onClick={() => handleProductClick(row.productCode)}
                >
                  {row.productCode || "Н/Д"}
                </TableCell>
                <TableCell>{row.productName || "Н/Д"}</TableCell>
                <TableCell>{row.category || "Н/Д"}</TableCell>
                <TableCell className="text-right">
                  {row.expectedQuantity ?? 0}
                </TableCell>
                <TableCell className="text-right">
                  {row.actualQuantity ?? 0}
                </TableCell>
                <TableCell
                  className={`text-right font-semibold ${
                    row.difference !== 0 ? "text-destructive" : ""
                  }`}
                >
                  {row.difference > 0 ? "+" : ""}
                  {row.difference ?? 0}
                </TableCell>
                <TableCell>{getStatusBadge(row.statusCode)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Страница {currentPage + 1} из {totalPages} • Всего записей: {data.total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Предыдущая
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
            }
            disabled={currentPage >= totalPages - 1}
          >
            Следующая
          </Button>
        </div>
      </div>

      {selectedProductsModal.length > 0 && (
        <ProductHistoryModal
          warehouseCode={warehouseCode}
          productCodes={selectedProductsModal}
          open={selectedProductsModal.length > 0}
          onClose={() => setSelectedProductsModal([])}
        />
      )}
    </div>
  );
};

export default DataTable;
