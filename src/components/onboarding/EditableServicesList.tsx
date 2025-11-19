import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

interface Service {
  name: string;
  description: string;
  base_price_cents: number;
  duration_minutes: number;
}

interface EditableServicesListProps {
  services: Service[];
  onChange: (services: Service[]) => void;
}

export function EditableServicesList({ services, onChange }: EditableServicesListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Service | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...services[index] });
  };

  const handleSave = (index: number) => {
    if (editForm) {
      const updated = [...services];
      updated[index] = editForm;
      onChange(updated);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleDelete = (index: number) => {
    const updated = services.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAdd = () => {
    if (editForm && editForm.name && editForm.base_price_cents > 0) {
      onChange([...services, editForm]);
      setIsAdding(false);
      setEditForm(null);
    }
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditForm({
      name: "",
      description: "",
      base_price_cents: 10000,
      duration_minutes: 60
    });
  };

  return (
    <div className="space-y-2 mt-4">
      {services.map((service, i) => (
        <div 
          key={i}
          className="rounded-xl px-4 py-3 flex items-center gap-3 border-2 border-border/50 bg-card"
        >
          {editingIndex === i ? (
            <div className="flex-1 space-y-2">
              <Input
                value={editForm?.name || ''}
                onChange={(e) => setEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
                placeholder="Service name"
                className="text-sm"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={editForm?.base_price_cents ? editForm.base_price_cents / 100 : 0}
                  onChange={(e) => setEditForm(prev => prev ? {...prev, base_price_cents: parseFloat(e.target.value) * 100} : null)}
                  placeholder="Price"
                  className="text-sm w-24"
                />
                <Input
                  type="number"
                  value={editForm?.duration_minutes || 0}
                  onChange={(e) => setEditForm(prev => prev ? {...prev, duration_minutes: parseInt(e.target.value)} : null)}
                  placeholder="Minutes"
                  className="text-sm w-24"
                />
                <Button size="sm" variant="ghost" onClick={() => handleSave(i)}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingIndex(null)}>
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <span className="font-semibold text-sm" style={{ color: 'hsl(var(--onboarding-text))' }}>
                  {service.name}
                </span>
                <div className="flex gap-2 text-xs mt-1" style={{ color: 'hsl(var(--onboarding-muted))' }}>
                  <span>${(service.base_price_cents / 100).toFixed(0)}</span>
                  <span>•</span>
                  <span>{service.duration_minutes}m</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleEdit(i)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ))}

      {isAdding && (
        <div className="rounded-xl px-4 py-3 border-2 border-primary/50 bg-primary/5">
          <div className="space-y-2">
            <Input
              value={editForm?.name || ''}
              onChange={(e) => setEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
              placeholder="Service name"
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Input
                type="number"
                value={editForm?.base_price_cents ? editForm.base_price_cents / 100 : 0}
                onChange={(e) => setEditForm(prev => prev ? {...prev, base_price_cents: parseFloat(e.target.value) * 100} : null)}
                placeholder="Price ($)"
                className="text-sm flex-1"
              />
              <Input
                type="number"
                value={editForm?.duration_minutes || 0}
                onChange={(e) => setEditForm(prev => prev ? {...prev, duration_minutes: parseInt(e.target.value)} : null)}
                placeholder="Duration (min)"
                className="text-sm flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} className="flex-1">
                <Check className="h-4 w-4 mr-1" />
                Add Service
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isAdding && (
        <Button 
          variant="outline" 
          className="w-full border-dashed"
          onClick={startAdding}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      )}
    </div>
  );
}
