import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { apiBaseUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EditWarehouseModalProps {
  open: boolean;
  onClose: () => void;
  onWarehouseUpdated: () => void;
  warehouse: any;
}

interface ExcludedCell {
  zone: number;
  row: number;
}

interface WarehouseFormData {
  code: string;
  name: string;
  zoneMaxSize: number;
  rowMaxSize: number;
  shelfMaxSize: number;
  location: string;
  excludedCells: ExcludedCell[];
}

const EditWarehouseModal = ({
  open,
  onClose,
  onWarehouseUpdated,
  warehouse,
}: EditWarehouseModalProps) => {
  const [formData, setFormData] = useState<WarehouseFormData>({
    code: "",
    name: "",
    zoneMaxSize: 10,
    rowMaxSize: 10,
    shelfMaxSize: 5,
    location: "",
    excludedCells: [],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && warehouse) {
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        zoneMaxSize: warehouse.zoneMaxSize,
        rowMaxSize: warehouse.rowMaxSize,
        shelfMaxSize: warehouse.shelfMaxSize,
        location: warehouse.location || "",
        excludedCells: warehouse.excludedCells || [],
      });
    }
  }, [open, warehouse]);

  const excludedSet = new Set(
    formData.excludedCells.map((c) => `${c.zone}-${c.row}`),
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = name.includes("MaxSize") ? parseInt(value) || 0 : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };

      // When dimensions change, remove excludedCells that are out of bounds
      if (name === "zoneMaxSize" || name === "rowMaxSize") {
        const zMax =
          name === "zoneMaxSize" ? (newValue as number) : prev.zoneMaxSize;
        const rMax =
          name === "rowMaxSize" ? (newValue as number) : prev.rowMaxSize;
        updated.excludedCells = prev.excludedCells.filter(
          (c) => c.zone <= zMax && c.row <= rMax,
        );
      }

      return updated;
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleToggleCell = (zone: number, row: number) => {
    setFormData((prev) => {
      const isExcluded = prev.excludedCells.some(
        (c) => c.zone === zone && c.row === row,
      );

      if (isExcluded) {
        return {
          ...prev,
          excludedCells: prev.excludedCells.filter(
            (c) => !(c.zone === zone && c.row === row),
          ),
        };
      } else {
        return {
          ...prev,
          excludedCells: [...prev.excludedCells, { zone, row }],
        };
      }
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.code && formData.code.length > 50) {
      newErrors.code = "Код не должен превышать 50 символов";
    }

    if (formData.name && formData.name.length > 255) {
      newErrors.name = "Название не должно превышать 255 символов";
    }

    if (formData.zoneMaxSize && formData.zoneMaxSize <= 0) {
      newErrors.zoneMaxSize = "Размер зоны должен быть положительным";
    }

    if (formData.rowMaxSize && formData.rowMaxSize <= 0) {
      newErrors.rowMaxSize = "Размер ряда должен быть положительным";
    }

    if (formData.shelfMaxSize && formData.shelfMaxSize <= 0) {
      newErrors.shelfMaxSize = "Размер полки должен быть положительным";
    }

    if (formData.location && formData.location.length > 255) {
      newErrors.location = "Местоположение не должно превышать 255 символов";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Исправьте ошибки в форме");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const payload: any = {};

      // Only include fields that changed
      if (formData.code !== warehouse.code) payload.code = formData.code;
      if (formData.name !== warehouse.name) payload.name = formData.name;
      if (formData.zoneMaxSize !== warehouse.zoneMaxSize)
        payload.zoneMaxSize = formData.zoneMaxSize;
      if (formData.rowMaxSize !== warehouse.rowMaxSize)
        payload.rowMaxSize = formData.rowMaxSize;
      if (formData.shelfMaxSize !== warehouse.shelfMaxSize)
        payload.shelfMaxSize = formData.shelfMaxSize;
      if (formData.location !== (warehouse.location || ""))
        payload.location = formData.location || "";

      // Always include excludedCells to allow clearing them
      const origExcluded = warehouse.excludedCells || [];
      const currExcluded = formData.excludedCells;
      const excludedChanged =
        origExcluded.length !== currExcluded.length ||
        origExcluded.some(
          (c: ExcludedCell) =>
            !currExcluded.some((nc) => nc.zone === c.zone && nc.row === c.row),
        ) ||
        currExcluded.some(
          (nc: ExcludedCell) =>
            !origExcluded.some(
              (c: ExcludedCell) => c.zone === nc.zone && c.row === nc.row,
            ),
        );

      if (excludedChanged) {
        payload.excludedCells = currExcluded;
      }

      const response = await fetch(
        apiBaseUrl + `/warehouse/${warehouse.code}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        toast.success("Склад успешно обновлен");
        onClose();
        onWarehouseUpdated();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || "Не удалось обновить склад";

        if (errorData.errors) {
          const fieldErrors: Record<string, string> = {};
          errorData.errors.forEach((error: any) => {
            fieldErrors[error.field] = error.message;
          });
          setErrors(fieldErrors);
        }

        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Failed to update warehouse:", error);
      toast.error(error.message || "Не удалось обновить склад");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const totalCells = formData.zoneMaxSize * formData.rowMaxSize;
  const excludedCount = formData.excludedCells.length;
  const activeCells = totalCells - excludedCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Редактировать склад - {warehouse?.code}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код склада</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="например, WH-001"
                className={errors.code ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Название склада</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="например, Главный склад"
                className={errors.name ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zoneMaxSize">Зоны</Label>
              <Input
                id="zoneMaxSize"
                name="zoneMaxSize"
                type="number"
                min="1"
                max="50"
                value={formData.zoneMaxSize}
                onChange={handleChange}
                className={errors.zoneMaxSize ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.zoneMaxSize && (
                <p className="text-sm text-destructive">{errors.zoneMaxSize}</p>
              )}
              <p className="text-xs text-muted-foreground">Количество зон</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rowMaxSize">Ряды</Label>
              <Input
                id="rowMaxSize"
                name="rowMaxSize"
                type="number"
                min="1"
                max="50"
                value={formData.rowMaxSize}
                onChange={handleChange}
                className={errors.rowMaxSize ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.rowMaxSize && (
                <p className="text-sm text-destructive">{errors.rowMaxSize}</p>
              )}
              <p className="text-xs text-muted-foreground">Рядов в зоне</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shelfMaxSize">Полки</Label>
              <Input
                id="shelfMaxSize"
                name="shelfMaxSize"
                type="number"
                min="1"
                max="20"
                value={formData.shelfMaxSize}
                onChange={handleChange}
                className={errors.shelfMaxSize ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.shelfMaxSize && (
                <p className="text-sm text-destructive">
                  {errors.shelfMaxSize}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Полок в ряду</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Местоположение</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="например, Корпус А, Этаж 2"
              className={errors.location ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Необязательное описание местоположения склада
            </p>
          </div>

          {/* Matrix for excluded cells */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Схема склада (зоны × ряды)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Нажмите на ячейку, чтобы исключить её из склада. Исключённые
                  ячейки не будут созданы. При изменении размеров или исключений
                  локации будут перегенерированы.
                </p>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                <div>
                  Всего ячеек:{" "}
                  <span className="font-semibold">{totalCells}</span>
                </div>
                <div>
                  Активных:{" "}
                  <span className="font-semibold text-green-600">
                    {activeCells}
                  </span>
                </div>
                <div>
                  Исключено:{" "}
                  <span className="font-semibold text-red-500">
                    {excludedCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Column headers (Zones) */}
            <div className="overflow-auto max-h-[400px] border rounded">
              <table className="border-collapse w-full">
                <thead>
                  <tr>
                    <th className="sticky top-0 bg-muted p-2 text-xs text-muted-foreground border-b border-r w-12 z-10">
                      Ряд↓ / Зона→
                    </th>
                    {Array.from({ length: formData.zoneMaxSize }).map(
                      (_, zi) => (
                        <th
                          key={`hdr-z${zi + 1}`}
                          className="sticky top-0 bg-muted p-1 text-xs font-semibold border-b z-10"
                        >
                          Зона {zi + 1}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: formData.rowMaxSize }).map((_, ri) => (
                    <tr key={`row-${ri + 1}`}>
                      <td className="bg-muted p-1 text-xs font-semibold text-center border-r">
                        Ряд {ri + 1}
                      </td>
                      {Array.from({ length: formData.zoneMaxSize }).map(
                        (_, zi) => {
                          const zone = zi + 1;
                          const row = ri + 1;
                          const isExcluded = excludedSet.has(`${zone}-${row}`);

                          return (
                            <td key={`cell-${zone}-${row}`} className="p-0">
                              <button
                                type="button"
                                onClick={() => handleToggleCell(zone, row)}
                                disabled={loading}
                                className={cn(
                                  "w-full h-8 text-[10px] transition-colors border border-gray-100",
                                  "hover:ring-2 hover:ring-primary/50",
                                  isExcluded
                                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                                    : "bg-green-50 text-green-700 hover:bg-green-100",
                                )}
                                title={
                                  isExcluded
                                    ? `Исключено: Зона ${zone}, Ряд ${row}`
                                    : `Активно: Зона ${zone}, Ряд ${row}`
                                }
                              >
                                {isExcluded ? "✕" : `${zone}-${row}`}
                              </button>
                            </td>
                          );
                        },
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-green-50 border border-gray-100 rounded" />
                <span>Активная ячейка</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-red-100 border border-gray-100 rounded" />
                <span>Исключённая ячейка</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Обновление...
                </>
              ) : (
                "Обновить склад"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditWarehouseModal;
