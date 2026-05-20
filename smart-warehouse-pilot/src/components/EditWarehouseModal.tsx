import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Warehouse } from "lucide-react";
import { toast } from "sonner";

interface EditWarehouseModalProps {
  open: boolean;
  onClose: () => void;
  onWarehouseUpdated: () => void;
  warehouse: any;
}

interface WarehouseFormData {
  code: string;
  name: string;
  zoneMaxSize: number;
  rowMaxSize: number;
  shelfMaxSize: number;
  location: string;
}

const EditWarehouseModal = ({ open, onClose, onWarehouseUpdated, warehouse }: EditWarehouseModalProps) => {
  const [formData, setFormData] = useState<WarehouseFormData>({
    code: "",
    name: "",
    zoneMaxSize: 10,
    rowMaxSize: 10,
    shelfMaxSize: 5,
    location: ""
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
        location: warehouse.location || ""
      });
    }
  }, [open, warehouse]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes("MaxSize") ? parseInt(value) || 0 : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
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
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/warehouse/${warehouse.code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

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
      console.error('Failed to update warehouse:', error);
      toast.error(error.message || "Не удалось обновить склад");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Редактировать склад - {warehouse?.code}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                <p className="text-sm text-destructive">{errors.shelfMaxSize}</p>
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
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
