import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { Separator } from "@/components/ui/separator";

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricing_type: string | null;
  default_price: number | null;
  price_min: number | null;
  price_max: number | null;
  estimated_duration_minutes: number | null;
  duration_min_minutes: number | null;
  duration_max_minutes: number | null;
  labor_price: number | null;
  materials_price: number | null;
  is_active: boolean;
  is_recurring: boolean;
  billing_frequency: string | null;
  includes_features: string[];
}

// Helper functions for duration conversion
const formatDurationToMinutes = (days: number, hours: number, minutes: number): number => {
  return (days * 24 * 60) + (hours * 60) + minutes;
};

const formatMinutesToUnits = (totalMinutes: number): { days: number; hours: number; minutes: number } => {
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingAfterDays = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingAfterDays / 60);
  const minutes = remainingAfterDays % 60;
  return { days, hours, minutes };
};

const formatDurationDisplay = (minMinutes: number | null, maxMinutes: number | null): string => {
  if (!minMinutes && !maxMinutes) return "";
  
  if (minMinutes && maxMinutes && minMinutes !== maxMinutes) {
    const min = formatMinutesToUnits(minMinutes);
    const max = formatMinutesToUnits(maxMinutes);
    
    if (min.days > 0 || max.days > 0) {
      return `${min.days}-${max.days} days`;
    } else if (min.hours > 0 || max.hours > 0) {
      return `${min.hours}-${max.hours} hours`;
    } else {
      return `${min.minutes}-${max.minutes} min`;
    }
  }
  
  const duration = formatMinutesToUnits(minMinutes || maxMinutes || 0);
  if (duration.days > 0) return `${duration.days} day${duration.days > 1 ? 's' : ''}`;
  if (duration.hours > 0) return `${duration.hours} hour${duration.hours > 1 ? 's' : ''}`;
  return `${duration.minutes} min`;
};

const formatPriceDisplay = (min: number | null, max: number | null, single: number | null): string => {
  if (min && max && min !== max) {
    return `$${(min / 100).toFixed(2)} - $${(max / 100).toFixed(2)}`;
  }
  const price = min || max || single || 0;
  return `$${(price / 100).toFixed(2)}`;
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();
  const { isMobile } = useMobileLayout();

  const [usePriceRange, setUsePriceRange] = useState(false);
  const [useDurationRange, setUseDurationRange] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    pricing_type: "flat",
    default_price: "",
    price_min: "",
    price_max: "",
    estimated_duration_minutes: "",
    duration_min_days: "",
    duration_min_hours: "",
    duration_min_minutes: "",
    duration_max_days: "",
    duration_max_hours: "",
    duration_max_minutes: "",
    labor_price: "",
    materials_price: "",
    is_active: true,
    is_recurring: false,
    billing_frequency: "monthly",
    includes_features: [] as string[],
  });

  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices((data || []) as Service[]);
    } catch (error) {
      console.error("Error loading services:", error);
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      
      // Detect if using ranges
      const hasPriceRange = service.price_min !== null && service.price_max !== null;
      const hasDurationRange = service.duration_min_minutes !== null && service.duration_max_minutes !== null;
      const hasPriceBreakdown = service.labor_price !== null || service.materials_price !== null;
      
      setUsePriceRange(hasPriceRange);
      setUseDurationRange(hasDurationRange);
      setShowPriceBreakdown(hasPriceBreakdown);
      
      // Convert duration minutes to units
      const minDuration = service.duration_min_minutes ? formatMinutesToUnits(service.duration_min_minutes) : { days: 0, hours: 0, minutes: 0 };
      const maxDuration = service.duration_max_minutes ? formatMinutesToUnits(service.duration_max_minutes) : { days: 0, hours: 0, minutes: 0 };
      const singleDuration = service.estimated_duration_minutes ? formatMinutesToUnits(service.estimated_duration_minutes) : { days: 0, hours: 0, minutes: 0 };
      
      setFormData({
        name: service.name,
        description: service.description || "",
        category: service.category || "",
        pricing_type: service.pricing_type || "flat",
        default_price: service.default_price ? (service.default_price / 100).toString() : "",
        price_min: service.price_min ? (service.price_min / 100).toString() : "",
        price_max: service.price_max ? (service.price_max / 100).toString() : "",
        estimated_duration_minutes: service.estimated_duration_minutes?.toString() || "",
        duration_min_days: hasDurationRange ? minDuration.days.toString() : singleDuration.days.toString(),
        duration_min_hours: hasDurationRange ? minDuration.hours.toString() : singleDuration.hours.toString(),
        duration_min_minutes: hasDurationRange ? minDuration.minutes.toString() : singleDuration.minutes.toString(),
        duration_max_days: maxDuration.days.toString(),
        duration_max_hours: maxDuration.hours.toString(),
        duration_max_minutes: maxDuration.minutes.toString(),
        labor_price: service.labor_price ? (service.labor_price / 100).toString() : "",
        materials_price: service.materials_price ? (service.materials_price / 100).toString() : "",
        is_active: service.is_active,
        is_recurring: service.is_recurring,
        billing_frequency: service.billing_frequency || "monthly",
        includes_features: service.includes_features || [],
      });
    } else {
      setEditingService(null);
      setUsePriceRange(false);
      setUseDurationRange(false);
      setShowPriceBreakdown(false);
      setShowAdvancedOptions(false);
      setFormData({
        name: "",
        description: "",
        category: "",
        pricing_type: "flat",
        default_price: "",
        price_min: "",
        price_max: "",
        estimated_duration_minutes: "",
        duration_min_days: "",
        duration_min_hours: "",
        duration_min_minutes: "",
        duration_max_days: "",
        duration_max_hours: "",
        duration_max_minutes: "",
        labor_price: "",
        materials_price: "",
        is_active: true,
        is_recurring: false,
        billing_frequency: "monthly",
        includes_features: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Missing Information",
        description: "Please enter a service name",
        variant: "destructive",
      });
      return;
    }

    // Validation for price ranges
    if (usePriceRange) {
      const minPrice = parseFloat(formData.price_min);
      const maxPrice = parseFloat(formData.price_max);
      if (minPrice && maxPrice && minPrice >= maxPrice) {
        toast({
          title: "Invalid Range",
          description: "Minimum price must be less than maximum price",
          variant: "destructive",
        });
        return;
      }
    }

    // Calculate duration in minutes
    let durationMinMinutes: number | null = null;
    let durationMaxMinutes: number | null = null;
    let singleDurationMinutes: number | null = null;

    if (useDurationRange) {
      const minDays = parseInt(formData.duration_min_days) || 0;
      const minHours = parseInt(formData.duration_min_hours) || 0;
      const minMinutes = parseInt(formData.duration_min_minutes) || 0;
      durationMinMinutes = formatDurationToMinutes(minDays, minHours, minMinutes);

      const maxDays = parseInt(formData.duration_max_days) || 0;
      const maxHours = parseInt(formData.duration_max_hours) || 0;
      const maxMinutes = parseInt(formData.duration_max_minutes) || 0;
      durationMaxMinutes = formatDurationToMinutes(maxDays, maxHours, maxMinutes);

      if (durationMinMinutes >= durationMaxMinutes) {
        toast({
          title: "Invalid Range",
          description: "Minimum duration must be less than maximum duration",
          variant: "destructive",
        });
        return;
      }
    } else {
      const days = parseInt(formData.duration_min_days) || 0;
      const hours = parseInt(formData.duration_min_hours) || 0;
      const minutes = parseInt(formData.duration_min_minutes) || 0;
      singleDurationMinutes = formatDurationToMinutes(days, hours, minutes);
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create services",
          variant: "destructive",
        });
        return;
      }

      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .maybeSingle();

      if (orgError || !organization) {
        console.error("Organization lookup error:", orgError);
        toast({
          title: "Setup Required",
          description: "Please complete your business profile setup first",
          variant: "destructive",
        });
        return;
      }

      const serviceData = {
        organization_id: organization.id,
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        pricing_type: formData.pricing_type,
        default_price: !usePriceRange && formData.default_price ? Math.round(parseFloat(formData.default_price) * 100) : null,
        price_min: usePriceRange && formData.price_min ? Math.round(parseFloat(formData.price_min) * 100) : null,
        price_max: usePriceRange && formData.price_max ? Math.round(parseFloat(formData.price_max) * 100) : null,
        estimated_duration_minutes: !useDurationRange ? singleDurationMinutes : null,
        duration_min_minutes: useDurationRange ? durationMinMinutes : null,
        duration_max_minutes: useDurationRange ? durationMaxMinutes : null,
        labor_price: showPriceBreakdown && formData.labor_price ? Math.round(parseFloat(formData.labor_price) * 100) : null,
        materials_price: showPriceBreakdown && formData.materials_price ? Math.round(parseFloat(formData.materials_price) * 100) : null,
        is_active: formData.is_active,
        is_recurring: formData.is_recurring,
        billing_frequency: formData.is_recurring ? formData.billing_frequency : null,
        includes_features: formData.is_recurring ? formData.includes_features : [],
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast({ title: "Success", description: "Service updated successfully" });
      } else {
        const { error } = await supabase
          .from("services")
          .insert([serviceData]);

        if (error) throw error;
        toast({ title: "Success", description: "Service created successfully" });
      }

      setDialogOpen(false);
      loadServices();
    } catch (error: any) {
      console.error("Error saving service:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Service deleted successfully" });
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        includes_features: [...prev.includes_features, newFeature.trim()]
      }));
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      includes_features: prev.includes_features.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div className="p-8 text-center">Loading services...</div>;
  }

  const renderFormFields = () => (
    <>
      <div>
        <Label htmlFor="name">Service Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., AC Tune-up, Lawn Care"
          className="touch-manipulation"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the service..."
          className="touch-manipulation"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., HVAC, Plumbing"
            className="touch-manipulation"
          />
        </div>

        <div>
          <Label htmlFor="pricing_type">Pricing Type</Label>
          <Select
            value={formData.pricing_type}
            onValueChange={(value) => setFormData({ ...formData, pricing_type: value })}
          >
            <SelectTrigger className="touch-manipulation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat Rate</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="per_unit">Per Unit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Price Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Pricing</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="price-range" className="text-sm font-normal">Use price range</Label>
            <Switch
              id="price-range"
              checked={usePriceRange}
              onCheckedChange={setUsePriceRange}
            />
          </div>
        </div>

        {usePriceRange ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price_min">Min Price ($)</Label>
              <Input
                id="price_min"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.price_min}
                onChange={(e) => setFormData({ ...formData, price_min: e.target.value })}
                placeholder="100.00"
                className="touch-manipulation"
              />
            </div>
            <div>
              <Label htmlFor="price_max">Max Price ($)</Label>
              <Input
                id="price_max"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.price_max}
                onChange={(e) => setFormData({ ...formData, price_max: e.target.value })}
                placeholder="200.00"
                className="touch-manipulation"
              />
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={formData.default_price}
              onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
              placeholder="150.00"
              className="touch-manipulation"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Switch
            id="price-breakdown"
            checked={showPriceBreakdown}
            onCheckedChange={setShowPriceBreakdown}
          />
          <Label htmlFor="price-breakdown" className="text-sm">Show labor/materials breakdown</Label>
        </div>

        {showPriceBreakdown && (
          <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-border">
            <div>
              <Label htmlFor="labor_price">Labor ($)</Label>
              <Input
                id="labor_price"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.labor_price}
                onChange={(e) => setFormData({ ...formData, labor_price: e.target.value })}
                placeholder="100.00"
                className="touch-manipulation"
              />
            </div>
            <div>
              <Label htmlFor="materials_price">Materials ($)</Label>
              <Input
                id="materials_price"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.materials_price}
                onChange={(e) => setFormData({ ...formData, materials_price: e.target.value })}
                placeholder="50.00"
                className="touch-manipulation"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Duration Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Estimated Duration</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="duration-range" className="text-sm font-normal">Use duration range</Label>
            <Switch
              id="duration-range"
              checked={useDurationRange}
              onCheckedChange={setUseDurationRange}
            />
          </div>
        </div>

        {useDurationRange ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Minimum Duration</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div>
                  <Label htmlFor="min_days" className="text-xs">Days</Label>
                  <Input
                    id="min_days"
                    type="number"
                    inputMode="numeric"
                    value={formData.duration_min_days}
                    onChange={(e) => setFormData({ ...formData, duration_min_days: e.target.value })}
                    placeholder="0"
                    className="touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="min_hours" className="text-xs">Hours</Label>
                  <Input
                    id="min_hours"
                    type="number"
                    inputMode="numeric"
                    value={formData.duration_min_hours}
                    onChange={(e) => setFormData({ ...formData, duration_min_hours: e.target.value })}
                    placeholder="0"
                    className="touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="min_minutes" className="text-xs">Minutes</Label>
                  <Input
                    id="min_minutes"
                    type="number"
                    inputMode="numeric"
                    value={formData.duration_min_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_min_minutes: e.target.value })}
                    placeholder="0"
                    className="touch-manipulation"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Maximum Duration</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div>
                  <Label htmlFor="max_days" className="text-xs">Days</Label>
                  <Input
                    id="max_days"
                    type="number"
                    inputMode="numeric"
                    value={formData.duration_max_days}
                    onChange={(e) => setFormData({ ...formData, duration_max_days: e.target.value })}
                    placeholder="0"
                    className="touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="max_hours" className="text-xs">Hours</Label>
                  <Input
                    id="max_hours"
                    type="number"
                    inputMode="numeric"
                    value={formData.duration_max_hours}
                    onChange={(e) => setFormData({ ...formData, duration_max_hours: e.target.value })}
                    placeholder="0"
                    className="touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="max_minutes" className="text-xs">Minutes</Label>
                  <Input
                    id="max_minutes"
                    type="number"
                    inputMode="numeric"
                    value={formData.duration_max_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_max_minutes: e.target.value })}
                    placeholder="0"
                    className="touch-manipulation"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="single_days" className="text-xs">Days</Label>
              <Input
                id="single_days"
                type="number"
                inputMode="numeric"
                value={formData.duration_min_days}
                onChange={(e) => setFormData({ ...formData, duration_min_days: e.target.value })}
                placeholder="0"
                className="touch-manipulation"
              />
            </div>
            <div>
              <Label htmlFor="single_hours" className="text-xs">Hours</Label>
              <Input
                id="single_hours"
                type="number"
                inputMode="numeric"
                value={formData.duration_min_hours}
                onChange={(e) => setFormData({ ...formData, duration_min_hours: e.target.value })}
                placeholder="0"
                className="touch-manipulation"
              />
            </div>
            <div>
              <Label htmlFor="single_minutes" className="text-xs">Minutes</Label>
              <Input
                id="single_minutes"
                type="number"
                inputMode="numeric"
                value={formData.duration_min_minutes}
                onChange={(e) => setFormData({ ...formData, duration_min_minutes: e.target.value })}
                placeholder="0"
                className="touch-manipulation"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Advanced Options */}
      <div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="w-full flex items-center justify-between"
        >
          <span className="font-semibold">Advanced Options</span>
          {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showAdvancedOptions && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
              <Label htmlFor="recurring">Recurring Subscription Service</Label>
            </div>

            {formData.is_recurring && (
              <>
                <div>
                  <Label htmlFor="billing_frequency">Billing Frequency</Label>
                  <Select
                    value={formData.billing_frequency}
                    onValueChange={(value) => setFormData({ ...formData, billing_frequency: value })}
                  >
                    <SelectTrigger className="touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Included Features</Label>
                  <div className="space-y-2">
                    {formData.includes_features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={feature} disabled className="flex-1" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFeature(index)}
                          className="touch-manipulation"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Add a feature..."
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                        className="flex-1 touch-manipulation"
                      />
                      <Button type="button" onClick={addFeature} className="touch-manipulation">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 pb-safe">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Services</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage one-time services and recurring subscriptions
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="touch-manipulation">
          <Plus className="mr-2 h-4 w-4" />
          Create Service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No services yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first service to start offering to clients
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Service
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="cursor-pointer hover:shadow-lg transition-shadow touch-manipulation"
              onClick={() => handleOpenDialog(service)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{service.name}</CardTitle>
                  <div className="flex gap-2">
                    {service.is_recurring && (
                      <Badge variant="secondary">Recurring</Badge>
                    )}
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {formatPriceDisplay(service.price_min, service.price_max, service.default_price)}
                  </div>
                  {service.is_recurring && service.billing_frequency && (
                    <div className="text-sm text-muted-foreground">
                      per {service.billing_frequency}
                    </div>
                  )}
                  {(service.labor_price || service.materials_price) && (
                    <div className="text-xs text-muted-foreground">
                      Labor: ${((service.labor_price || 0) / 100).toFixed(2)} | Materials: ${((service.materials_price || 0) / 100).toFixed(2)}
                    </div>
                  )}
                  {service.category && (
                    <Badge variant="outline">{service.category}</Badge>
                  )}
                  {(service.duration_min_minutes || service.duration_max_minutes || service.estimated_duration_minutes) && (
                    <div className="text-sm text-muted-foreground">
                      Est. {formatDurationDisplay(service.duration_min_minutes, service.duration_max_minutes) || 
                           formatDurationDisplay(service.estimated_duration_minutes, null)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isMobile ? (
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>
                {editingService ? "Edit Service" : "Create New Service"}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 mt-4 overflow-y-auto pb-20" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              {renderFormFields()}

              <div className="flex flex-col gap-2 pt-4">
                {editingService && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setDialogOpen(false);
                      handleDelete(editingService.id);
                    }}
                    className="w-full touch-manipulation"
                  >
                    Delete
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 touch-manipulation">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="flex-1 touch-manipulation">
                    {editingService ? "Save Changes" : "Create Service"}
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Create New Service"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {renderFormFields()}

              <div className="flex justify-between gap-2 pt-4">
                <div>
                  {editingService && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setDialogOpen(false);
                        handleDelete(editingService.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingService ? "Save Changes" : "Create Service"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
