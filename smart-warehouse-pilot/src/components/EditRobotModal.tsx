import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bot } from "lucide-react";
import { toast } from "sonner";
import { apiBaseUrl } from "@/lib/api";

interface EditRobotModalProps {
  open: boolean;
  onClose: () => void;
  onRobotUpdated: () => void;
  robot: any;
}

interface Warehouse {
  id: number;
  code: string;
  name: string;
}

interface RobotFormData {
  code: string;
  status: string;
  batteryLevel: number;
  currentZone: number;
  currentRow: number;
  currentShelf: number;
  warehouseCode: string;
}

const EditRobotModal = ({ open, onClose, onRobotUpdated, robot }: EditRobotModalProps) => {
  const [formData, setFormData] = useState<RobotFormData>({
    code: "",
    status: "IDLE",
    batteryLevel: 100,
    currentZone: 0,
    currentRow: 0,
    currentShelf: 0,
    warehouseCode: ""
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && robot) {
      fetchWarehouses();
      setFormData({
        code: robot.code,
        status: robot.status,
        batteryLevel: robot.batteryLevel,
        currentZone: robot.currentZone || 0,
        currentRow: robot.currentRow || 0,
        currentShelf: robot.currentShelf || 0,
        warehouseCode: robot.warehouseCode
      });
    }
  }, [open, robot]);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${apiBaseUrl}/warehouse', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      } else {
        throw new Error('Failed to fetch warehouses');
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      toast.error("Не удалось загрузить склады");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "batteryLevel" || name === "currentZone" || name === "currentRow" || name === "currentShelf"
        ? parseInt(value) || 0
        : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code) {
      newErrors.code = "Код обязателен";
    } else if (!/^RB-\d{4}$/.test(formData.code)) {
      newErrors.code = "Код должен следовать шаблону RB-XXXX (4 цифры)";
    }

    if (!formData.status) {
      newErrors.status = "Статус обязателен";
    }

    if (formData.batteryLevel < 0 || formData.batteryLevel > 100) {
      newErrors.batteryLevel = "Уровень заряда должен быть от 0 до 100";
    }

    if (formData.currentZone < 0) {
      newErrors.currentZone = "Зона не может быть отрицательной";
    }

    if (formData.currentRow < 0) {
      newErrors.currentRow = "Ряд не может быть отрицательным";
    }

    if (formData.currentShelf < 0) {
      newErrors.currentShelf = "Полка не может быть отрицательной";
    }

    if (!formData.warehouseCode) {
      newErrors.warehouseCode = "Склад обязателен";
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
      const response = await fetch(apiBaseUrl + `/robots/${robot.code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Робот успешно обновлен");
        onClose();
        onRobotUpdated();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || "Не удалось обновить робота";

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
      console.error('Failed to update robot:', error);
      toast.error(error.message || "Не удалось обновить робота");
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
            <Bot className="h-5 w-5" />
            Редактировать робота - {robot?.code}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код робота *</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="например, RB-0001"
                className={errors.code ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
              <p className="text-xs text-muted-foreground">Должен следовать шаблону RB-XXXX (4 цифры)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
                disabled={loading}
              >
                <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDLE">Ожидание</SelectItem>
                  <SelectItem value="WORKING">Работает</SelectItem>
                  <SelectItem value="CHARGING">Зарядка</SelectItem>
                  <SelectItem value="MAINTENANCE">Обслуживание</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batteryLevel">Уровень заряда *</Label>
            <Input
              id="batteryLevel"
              name="batteryLevel"
              type="number"
              min="0"
              max="100"
              value={formData.batteryLevel}
              onChange={handleChange}
              className={errors.batteryLevel ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.batteryLevel && (
              <p className="text-sm text-destructive">{errors.batteryLevel}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentZone">Текущая зона</Label>
              <Input
                id="currentZone"
                name="currentZone"
                type="number"
                min="0"
                value={formData.currentZone}
                onChange={handleChange}
                className={errors.currentZone ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.currentZone && (
                <p className="text-sm text-destructive">{errors.currentZone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentRow">Текущий ряд</Label>
              <Input
                id="currentRow"
                name="currentRow"
                type="number"
                min="0"
                value={formData.currentRow}
                onChange={handleChange}
                className={errors.currentRow ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.currentRow && (
                <p className="text-sm text-destructive">{errors.currentRow}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentShelf">Текущая полка</Label>
              <Input
                id="currentShelf"
                name="currentShelf"
                type="number"
                min="0"
                value={formData.currentShelf}
                onChange={handleChange}
                className={errors.currentShelf ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.currentShelf && (
                <p className="text-sm text-destructive">{errors.currentShelf}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouseCode">Склад *</Label>
            <Select
              value={formData.warehouseCode}
              onValueChange={(value) => handleSelectChange("warehouseCode", value)}
              disabled={loading || warehouses.length === 0}
            >
              <SelectTrigger className={errors.warehouseCode ? "border-destructive" : ""}>
                <SelectValue placeholder={warehouses.length === 0 ? "Нет доступных складов" : "Выберите склад"} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.code}>
                    {warehouse.name} ({warehouse.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouseCode && (
              <p className="text-sm text-destructive">{errors.warehouseCode}</p>
            )}
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
                "Обновить робота"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRobotModal;
