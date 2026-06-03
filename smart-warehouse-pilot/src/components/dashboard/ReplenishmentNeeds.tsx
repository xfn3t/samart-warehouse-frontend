import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ReplenishmentNeedsProps {
  warehouseCode: string;
}

interface Product {
  productCode: string;
  productName: string;
  minStock: number;
  quantity: number;
  replenish: number;
}

const ReplenishmentNeeds = ({ warehouseCode }: ReplenishmentNeedsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [showAllProducts, setShowAllProducts] = useState(false);

  useEffect(() => {
    if (warehouseCode) {
      fetchReplenishmentNeeds();
    }
  }, [warehouseCode]);

  const fetchReplenishmentNeeds = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get(`/${warehouseCode}/inventory/history/low-stock`);
      const unique = data.filter((p,i,a) => a.findIndex(x => x.productCode === p.productCode) === i);
      setProducts(unique);

      // Calculate total products needing replenishment
      const total = data.filter((product: Product) => product.quantity < product.minStock).length;
      setTotalNeeded(total);
    } catch (error) {
      console.error('Failed to fetch replenishment needs:', error);
      setError('Не удалось загрузить данные о пополнении');
      toast.error("Ошибка загрузки данных о пополнении запасов");
    } finally {
      setLoading(false);
    }
  };

  const needsReplenishment = (product: Product) => {
    return product.quantity < product.minStock;
  };

  const getUrgencyLevel = (product: Product) => {
    const stockRatio = product.quantity / product.minStock;
    if (stockRatio <= 0.1) return "critical";
    if (stockRatio <= 0.3) return "high";
    if (stockRatio <= 0.5) return "medium";
    return "low";
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      default:
        return "text-blue-500";
    }
  };

  const getUrgencyBgColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  const shouldShowAlertIcon = (urgency: string) => {
    return urgency === "critical" || urgency === "high";
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "Критично";
      case "high":
        return "Высокий";
      case "medium":
        return "Средний";
      case "low":
        return "Низкий";
      default:
        return "Низкий";
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Потребности в пополнении - {warehouseCode}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Загрузка данных...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Потребности в пополнении - {warehouseCode}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 text-destructive">
          <p>{error}</p>
          <Button onClick={fetchReplenishmentNeeds} variant="outline" className="mt-2">
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    );
  }

  const productsNeedingReplenishment = products.filter(needsReplenishment);
  const remainingCount = Math.max(0, productsNeedingReplenishment.length - 4);

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Потребности в пополнении - {warehouseCode}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Товары, требующие пополнения</p>
                <p className="text-3xl font-bold text-primary">{totalNeeded}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  из {products.length} отслеживаемых товаров
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="space-y-3">
            {productsNeedingReplenishment.slice(0, 4).map((product) => {
              const urgency = getUrgencyLevel(product);
              const urgencyColor = getUrgencyColor(urgency);
              const showAlertIcon = shouldShowAlertIcon(urgency);

              return (
                <div key={product.productCode} className="p-3 border rounded-lg bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {showAlertIcon && <AlertTriangle className={`h-4 w-4 ${urgencyColor}`} />}
                        <p className="font-medium text-sm">{product.productName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{product.productCode}</p>
                    </div>
                    <span className={`text-sm font-semibold ${urgencyColor}`}>
                      {getUrgencyText(urgency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Текущий</p>
                      <p className={`font-semibold ${urgencyColor}`}>{product.quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Мин. запас</p>
                      <p className="font-semibold">{product.minStock}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Пополнить</p>
                      <p className="font-semibold text-primary">{product.replenish}</p>
                    </div>
                  </div>

                  {/* Progress bar showing stock level */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Заполнение запаса</span>
                      <span>{Math.round((product.quantity / product.minStock) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUrgencyBgColor(urgency)}`}
                        style={{ width: `${Math.min((product.quantity / product.minStock) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {productsNeedingReplenishment.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Все товары в достаточном количестве</p>
              <p className="text-sm">Нет товаров, требующих пополнения</p>
            </div>
          )}

          {remainingCount > 0 && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllProducts(true)}
                className="text-foreground hover:bg-primary hover:text-primary-foreground border-border"
              >
                и еще {remainingCount} товаров...
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for all products */}
      <Dialog open={showAllProducts} onOpenChange={setShowAllProducts}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Все товары, требующие пополнения - {warehouseCode}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {productsNeedingReplenishment.map((product) => {
              const urgency = getUrgencyLevel(product);
              const urgencyColor = getUrgencyColor(urgency);
              const urgencyBgColor = getUrgencyBgColor(urgency);
              const showAlertIcon = shouldShowAlertIcon(urgency);

              return (
                <div key={product.productCode} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {showAlertIcon && <AlertTriangle className={`h-4 w-4 ${urgencyColor}`} />}
                        <p className="font-medium">{product.productName}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{product.productCode}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${urgencyColor} bg-opacity-10 ${urgencyBgColor} bg-opacity-20`}>
                      {getUrgencyText(urgency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Текущий запас</p>
                      <p className={`text-lg font-semibold ${urgencyColor}`}>{product.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Минимальный запас</p>
                      <p className="text-lg font-semibold">{product.minStock}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Рекомендуемое пополнение</p>
                      <p className="text-lg font-semibold text-primary">{product.replenish}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Заполнение</p>
                      <p className="text-lg font-semibold">{Math.round((product.quantity / product.minStock) * 100)}%</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Уровень запаса относительно минимального</span>
                      <span>{product.quantity} / {product.minStock}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${urgencyBgColor}`}
                        style={{ width: `${Math.min((product.quantity / product.minStock) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReplenishmentNeeds;
