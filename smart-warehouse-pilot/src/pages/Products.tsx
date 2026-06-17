import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogOut, Package, Search, ImageOff, MapPin } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { toast } from "sonner";

interface ProductOnWarehouse {
  skuCode: string;
  productName: string;
  category: string | null;
  imageUrl: string | null;
  warehouseCode: string;
  warehouseName: string;
  quantity: number | null;
  minStock: number | null;
  optimalStock: number | null;
  zone: number | null;
  row: number | null;
  shelf: number | null;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductOnWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/products/on-warehouses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProducts(await res.json());
    } catch { toast.error("Не удалось загрузить продукты"); }
    finally { setLoading(false); }
  };

  const loadImage = (skuCode: string, imageUrl: string) => {
    if (imageCache[skuCode] || !imageUrl) return;
    const url = imageUrl.startsWith("http") ? imageUrl : `http://localhost:8080/api/images/${imageUrl.split("/").pop()}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((b) => setImageCache((prev) => ({ ...prev, [skuCode]: URL.createObjectURL(b) })))
      .catch(() => {});
  };

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.productName.toLowerCase().includes(q) ||
      p.skuCode.toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      p.warehouseName.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (p: ProductOnWarehouse) => {
    if (p.quantity === null) return <Badge variant="outline">Нет данных</Badge>;
    if (p.minStock !== null && p.quantity <= p.minStock)
      return <Badge className="bg-red-500">Критический</Badge>;
    if (p.optimalStock !== null && p.quantity <= p.optimalStock)
      return <Badge className="bg-yellow-500">Низкий</Badge>;
    return <Badge className="bg-green-500">OK</Badge>;
  };

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
        <h1 className="text-xl font-semibold">Продукты</h1>
        <Button variant="outline" onClick={() => { localStorage.clear(); navigate("/login"); }}>
          <LogOut className="mr-2 h-4 w-4" />Выйти
        </Button>
      </header>

      <div className="flex">
        <AppSidebar />

        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Все продукты</h2>
              <p className="text-gray-600">{products.length} товаров на складах</p>
            </div>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, SKU, категории..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Продукты не найдены</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => {
                if (p.imageUrl) loadImage(p.skuCode, p.imageUrl);
                return (
                  <Card key={`${p.skuCode}-${p.warehouseCode}`} className="hover:shadow-md transition-shadow">
                    <div className="h-40 bg-muted flex items-center justify-center rounded-t-lg overflow-hidden">
                      {imageCache[p.skuCode] ? (
                        <img src={imageCache[p.skuCode]} alt={p.productName} className="w-full h-full object-cover" />
                      ) : (
                        <ImageOff className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div>
                        <p className="font-semibold truncate">{p.productName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.skuCode}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{p.warehouseName} ({p.warehouseCode})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Кол-во</p>
                          <p className="font-bold">{p.quantity ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Мин</p>
                          <p className="font-bold">{p.minStock ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Опт</p>
                          <p className="font-bold">{p.optimalStock ?? "—"}</p>
                        </div>
                      </div>
                      <div>{getStatusBadge(p)}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Products;
