import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, ImageOff, Camera, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

// ---- types ----

interface DataPoint {
  timestamp: string;
  quantity: number;
}

interface ProductHistoryResponse {
  skuCode: string;
  product: ProductDTO;
  warehouse: any;
  dataPoints: DataPoint[];
}

interface ProductWarehouseParam {
  minStock: number;
  optimalStock: number;
}

interface ProductDTO {
  id: number;
  code: string;
  name: string;
  category: string;
  imageUrl?: string;
  description?: string;
  warehouseParameters?: ProductWarehouseParam[];
}

interface Props {
  warehouseCode: string;
  productCodes: string[];
  open: boolean;
  onClose: () => void;
}


const ProductHistoryModal = ({
  warehouseCode,
  productCodes,
  open,
  onClose,
}: Props) => {
  const [historyData, setHistoryData] = useState<ProductHistoryResponse[]>([]);
  const [productInfo, setProductInfo] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [aggregation, setAggregation] = useState<"hour" | "day" | "week">(
    "day",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productCode = productCodes[0] || "";
  const productName = productInfo?.name || productCode;
  const whParams = productInfo?.warehouseParameters?.[0];

  // fetch
  useEffect(() => {
    if (open && productCodes.length > 0) fetchProductHistory();
  }, [open, productCodes, aggregation]);

  // sync description + image
  useEffect(() => {
    if (!productInfo) return;
    setDescriptionDraft(productInfo.description || "");
    if (productInfo.imageUrl) {
      const url = `http://localhost:8080/api/images/upload/${encodeURIComponent(productCode)}`;
      fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((r) => r.blob())
        .then((b) => setImageSrc(URL.createObjectURL(b)))
        .catch(() => setImageSrc(null));
    }
  }, [productInfo]);

  const fetchProductHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      productCodes.forEach((c) => params.append("productCodes", c));
      params.append("aggregation", aggregation);
      const data = await apiClient.get(
        `/${warehouseCode}/inventory/history/bySkus?${params.toString()}`,
      );
      const arr = Array.isArray(data) ? data : [];
      setHistoryData(arr);
      if (arr.length > 0 && arr[0].product) setProductInfo(arr[0].product);
    } catch {
      toast.error("Не удалось загрузить историю");
    } finally {
      setLoading(false);
    }
  };

  // upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `http://localhost:8080/api/images/upload/${encodeURIComponent(productCode)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: fd,
        },
      );
      if (res.ok) {
        const key = await res.text(); setProductInfo((p) => (p ? { ...p, imageUrl: key } : p));
        toast.success("Изображение загружено");
      } else {
        toast.error("Не удалось загрузить изображение");
      }
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // save description
  const handleSaveDescription = async () => {
    setSavingDescription(true);
    setProductInfo((p) => (p ? { ...p, description: descriptionDraft } : p));
    setEditingDescription(false);
    toast.success("Описание обновлено");
    setSavingDescription(false);
  };

  // chart data
  const chartData = (() => {
    const map: any[] = [];
    historyData.forEach((p) => {
      if (!p.dataPoints) return;
      p.dataPoints.forEach((dp) => {
        const ts = new Date(dp.timestamp).getTime();
        const date = new Date(dp.timestamp).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
        });
        let entry = map.find((d) => d.timestamp === ts);
        if (!entry) {
          entry = { timestamp: ts, date };
          map.push(entry);
        }
        entry[`${p.skuCode}_qty`] = dp.quantity;
      });
    });
    return map.sort((a, b) => a.timestamp - b.timestamp);
  })();

  const colors = [
    "#3b82f6",
    "#10b981",
    "#ef4444",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#14b8a6",
  ];

  // ----

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{productName}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Загрузка...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* === PRODUCT CARD === */}
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* image */}
                <div className="w-52 h-52 rounded-lg border-2 border-dashed bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden relative group">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageOff className="h-12 w-12" />
                      <span className="text-xs">Нет фото</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploadingImage ? (
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-white">
                        <Camera className="h-8 w-8" />
                        <span className="text-xs font-medium">
                          {productInfo?.imageUrl ? "Сменить" : "Загрузить"}
                        </span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>

                {/* details */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">{productName}</h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {productCode}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Категория</p>
                      <p className="font-semibold">
                        {productInfo?.category || "—"}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">
                        Мин. запас
                      </p>
                      <p className="font-semibold text-yellow-700">
                        {whParams ? `${whParams.minStock} шт.` : "—"}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">
                        Оптим. запас
                      </p>
                      <p className="font-semibold text-green-700">
                        {whParams ? `${whParams.optimalStock} шт.` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* description */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Описание
                      </p>
                      {!editingDescription && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditingDescription(true)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {editingDescription ? (
                      <div className="space-y-2">
                        <Textarea
                          value={descriptionDraft}
                          onChange={(e) => setDescriptionDraft(e.target.value)}
                          placeholder="Добавьте описание товара..."
                          rows={3}
                          className="resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveDescription}
                            disabled={savingDescription}
                          >
                            {savingDescription ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            Сохранить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingDescription(false);
                              setDescriptionDraft(
                                productInfo?.description || "",
                              );
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {productInfo?.description || "Описание отсутствует"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* === STATS === */}
          {historyData.length > 0 &&
            historyData[0].dataPoints &&
            historyData[0].dataPoints.length > 0 &&
            (() => {
              const dps = historyData[0].dataPoints;
              const last = dps[dps.length - 1];
              return (
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        Последняя проверка
                      </p>
                      <p className="text-lg font-bold">
                        {new Date(last.timestamp).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        Текущее кол-во
                      </p>
                      <p className="text-lg font-bold">{last.quantity}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        Всего точек
                      </p>
                      <p className="text-lg font-bold">{dps.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">Статус</p>
                      <p
                        className={`text-lg font-bold ${whParams && last.quantity <= whParams.minStock ? "text-red-600" : whParams && last.quantity <= whParams.optimalStock ? "text-yellow-600" : "text-green-600"}`}
                      >
                        {whParams && last.quantity <= whParams.minStock
                          ? "Критический"
                          : whParams && last.quantity <= whParams.optimalStock
                            ? "Низкий"
                            : "OK"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

          {/* === AGGREGATION SWITCHER === */}
          {historyData.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Агрегация:</span>
              {(["hour", "day", "week"] as const).map((agg) => (
                <Button
                  key={agg}
                  size="sm"
                  variant={aggregation === agg ? "default" : "outline"}
                  onClick={() => setAggregation(agg)}
                >
                  {agg === "hour"
                    ? "По часам"
                    : agg === "day"
                      ? "По дням"
                      : "По неделям"}
                </Button>
              ))}
            </div>
          )}

          {/* === CHART === */}
          {historyData.length > 0 && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Динамика остатков</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {historyData.map((p, i) => (
                    <Line
                      key={`${p.skuCode}_qty`}
                      type="monotone"
                      dataKey={`${p.skuCode}_qty`}
                      stroke={colors[i % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={p.skuCode}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductHistoryModal;
