import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface HistoryItem {
  id: number;
  robotCode?: string;
  skuCode: string;
  productName: string;
  quantity: number;
  messageId: string;
  expectedQuantity: number;
  difference: number;
  status: string;
  scannedAt: string;
  createdAt: string;
}

interface ProductHistoryResponse {
  skuCode: string;
  history: HistoryItem[];
}

interface SelectedProductsTrendChartProps {
  warehouseCode: string;
  selectedProducts: string[];
}

const SelectedProductsTrendChart = ({ warehouseCode, selectedProducts }: SelectedProductsTrendChartProps) => {
  const [historyData, setHistoryData] = useState<ProductHistoryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProducts.length > 0) {
      fetchProductHistory();
    } else {
      setHistoryData([]);
    }
  }, [selectedProducts, warehouseCode]);

  const fetchProductHistory = async () => {
    if (selectedProducts.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      selectedProducts.forEach(code => params.append('productCodes', code));

      const data = await apiClient.get(`/${warehouseCode}/inventory/history/bySkus?${params.toString()}`);
      setHistoryData(data);
    } catch (error) {
      console.error('Failed to fetch product history:', error);
      setError('Не удалось загрузить данные истории товаров');
      toast.error("Не удалось загрузить данные для графика");
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    const chartData: any[] = [];

    historyData.forEach(product => {
      product.history.forEach(item => {
        const timestamp = new Date(item.scannedAt).getTime();
        const date = new Date(item.scannedAt).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });

        // Find or create entry for this timestamp
        let entry = chartData.find(d => d.timestamp === timestamp);
        if (!entry) {
          entry = { timestamp, date };
          chartData.push(entry);
        }

        // Add data for this product
        entry[`${product.skuCode}_quantity`] = item.quantity;
        entry[`${product.skuCode}_expected`] = item.expectedQuantity;
        entry[`${product.skuCode}_difference`] = item.difference;
      });
    });

    return chartData.sort((a, b) => a.timestamp - b.timestamp);
  };

  const chartData = formatChartData();

  // Generate colors for each product
  const colors = [
    '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6'
  ];

  const handleRefresh = () => {
    fetchProductHistory();
    toast.info("Обновление данных графика...");
  };

  if (selectedProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>График остатков по выбранным товарам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64 text-muted-foreground">
            Выберите товары в таблице выше, чтобы построить график
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>График остатков по выбранным товарам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Загрузка данных для графиков...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>График остатков по выбранным товарам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
            <p>{error}</p>
            <Button onClick={fetchProductHistory} variant="outline" className="mt-4">
              Попробовать снова
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (historyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>График остатков по выбранным товарам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64 text-muted-foreground">
            Нет данных для построения графика по выбранным товарам
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>График остатков по выбранным товарам</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Фактические остатки */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Фактические остатки</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis
                  label={{
                    value: 'Количество',
                    angle: -90,
                    position: 'insideLeft',
                    offset: -10
                  }}
                />
                <Tooltip />
                <Legend />
                {historyData.map((product, index) => (
                  <Line
                    key={`${product.skuCode}_quantity`}
                    type="monotone"
                    dataKey={`${product.skuCode}_quantity`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
                    name={`${product.skuCode} - Факт`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ожидаемые vs Фактические остатки */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ожидаемые vs Фактические остатки</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis
                  label={{
                    value: 'Количество',
                    angle: -90,
                    position: 'insideLeft',
                    offset: -10
                  }}
                />
                <Tooltip />
                <Legend />
                {historyData.map((product, index) => (
                  <>
                    <Line
                      key={`${product.skuCode}_expected`}
                      type="monotone"
                      dataKey={`${product.skuCode}_expected`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 3 }}
                      name={`${product.skuCode} - Ожидаемый`}
                    />
                    <Line
                      key={`${product.skuCode}_quantity_compare`}
                      type="monotone"
                      dataKey={`${product.skuCode}_quantity`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
                      name={`${product.skuCode} - Фактический`}
                    />
                  </>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Расхождения */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Расхождения (Факт - Ожидаемый)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis
                  label={{
                    value: 'Расхождение',
                    angle: -90,
                    position: 'insideLeft',
                    offset: -10
                  }}
                />
                <Tooltip />
                <Legend />
                {historyData.map((product, index) => (
                  <Line
                    key={`${product.skuCode}_difference`}
                    type="monotone"
                    dataKey={`${product.skuCode}_difference`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
                    name={`${product.skuCode} - Расхождение`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Легенда товаров */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Выбранные товары:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {historyData.map((product, index) => (
                <div key={product.skuCode} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="font-mono">{product.skuCode}</span>
                  <span className="text-muted-foreground">
                    - {product.history[0]?.productName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelectedProductsTrendChart;
