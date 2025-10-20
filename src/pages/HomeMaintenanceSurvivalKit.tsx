import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import homebaseLogo from "@/assets/homebase-logo.png";
import { SectionHeader } from "@/components/resources/SectionHeader";
import { ResultPanel } from "@/components/resources/ResultPanel";
import { Metric } from "@/components/resources/Metric";
import { DownloadButtons } from "@/components/resources/DownloadButtons";
import { StickyFooterCTA } from "@/components/resources/StickyFooterCTA";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";

interface MaintenancePlan {
  tasksPerYear: number;
  annualCostLow: number;
  annualCostTypical: number;
  annualCostHigh: number;
  nextDueTask: string;
  tasks: Array<{
    name: string;
    frequency: string;
    costLow: number;
    costTypical: number;
    costHigh: number;
    isDIY: boolean;
    riskNote: string;
    nextDue: string;
  }>;
}

export default function HomeMaintenanceSurvivalKit() {
  const navigate = useNavigate();
  const [generatedPlan, setGeneratedPlan] = useState<MaintenancePlan | null>(null);
  
  // Form state
  const [zipCode, setZipCode] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [homeAge, setHomeAge] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasGasHeat, setHasGasHeat] = useState(false);
  const [hasElectricHeat, setHasElectricHeat] = useState(false);
  const [waterHeaterType, setWaterHeaterType] = useState("");
  const [roofAge, setRoofAge] = useState("");
  const [hasLawn, setHasLawn] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [diyComfort, setDiyComfort] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");

  const generatePlan = () => {
    // State multipliers (simplified)
    const stateMultipliers: { [key: string]: number } = {
      "CA": 1.25, "NY": 1.20, "TX": 0.95, "FL": 1.05, "default": 1.0
    };
    
    const stateCode = zipCode.slice(0, 2);
    const multiplier = stateMultipliers[stateCode] || stateMultipliers["default"];
    
    // Generate tasks based on home features
    const tasks = [];
    
    if (hasHVAC) {
      tasks.push({
        name: "HVAC Filter Replacement",
        frequency: "Quarterly",
        costLow: 20 * multiplier,
        costTypical: 40 * multiplier,
        costHigh: 60 * multiplier,
        isDIY: diyComfort === "high",
        riskNote: "Dirty filters reduce efficiency by up to 15% and strain system",
        nextDue: "In 2 weeks"
      });
      tasks.push({
        name: "HVAC Professional Tune-up",
        frequency: "Bi-annual (Spring & Fall)",
        costLow: 80 * multiplier,
        costTypical: 150 * multiplier,
        costHigh: 250 * multiplier,
        isDIY: false,
        riskNote: "Lack of maintenance can lead to $3,000+ repair bills",
        nextDue: "In 1 month"
      });
    }
    
    if (waterHeaterType === "tank") {
      tasks.push({
        name: "Water Heater Flush",
        frequency: "Annual",
        costLow: 75 * multiplier,
        costTypical: 120 * multiplier,
        costHigh: 200 * multiplier,
        isDIY: diyComfort === "high",
        riskNote: "Sediment buildup reduces lifespan by 40%",
        nextDue: "In 3 months"
      });
    } else if (waterHeaterType === "tankless") {
      tasks.push({
        name: "Tankless Water Heater Descaling",
        frequency: "Annual",
        costLow: 100 * multiplier,
        costTypical: 175 * multiplier,
        costHigh: 275 * multiplier,
        isDIY: false,
        riskNote: "Scale buildup can cause complete system failure",
        nextDue: "In 4 months"
      });
    }
    
    const roofAgeNum = parseInt(roofAge);
    const roofFreq = roofAgeNum > 20 ? "Bi-annual" : "Annual";
    tasks.push({
      name: "Roof Inspection",
      frequency: roofFreq,
      costLow: 100 * multiplier,
      costTypical: 200 * multiplier,
      costHigh: 350 * multiplier,
      isDIY: false,
      riskNote: "Undetected damage can lead to $10,000+ interior damage",
      nextDue: "In 2 months"
    });
    
    tasks.push({
      name: "Gutter Cleaning",
      frequency: "Bi-annual",
      costLow: 75 * multiplier,
      costTypical: 150 * multiplier,
      costHigh: 250 * multiplier,
      isDIY: diyComfort !== "low",
      riskNote: "Clogs cause foundation and basement water damage",
      nextDue: "In 6 weeks"
    });
    
    tasks.push({
      name: "Dryer Vent Cleaning",
      frequency: "Annual",
      costLow: 90 * multiplier,
      costTypical: 140 * multiplier,
      costHigh: 200 * multiplier,
      isDIY: false,
      riskNote: "Leading cause of house fires (15,000+ annually)",
      nextDue: "In 5 months"
    });
    
    if (hasLawn) {
      tasks.push({
        name: "Lawn Care (Mowing, Edging)",
        frequency: "Weekly (seasonal)",
        costLow: 30 * multiplier,
        costTypical: 50 * multiplier,
        costHigh: 80 * multiplier,
        isDIY: diyComfort === "high",
        riskNote: "Overgrown lawn attracts pests and reduces curb appeal",
        nextDue: "This week"
      });
      tasks.push({
        name: "Pest Prevention Treatment",
        frequency: "Quarterly",
        costLow: 70 * multiplier,
        costTypical: 100 * multiplier,
        costHigh: 150 * multiplier,
        isDIY: false,
        riskNote: "Infestations cost $1,000+ to eliminate",
        nextDue: "In 3 weeks"
      });
    }
    
    if (hasPool) {
      tasks.push({
        name: "Pool Maintenance & Chemicals",
        frequency: "Weekly",
        costLow: 80 * multiplier,
        costTypical: 120 * multiplier,
        costHigh: 180 * multiplier,
        isDIY: diyComfort !== "low",
        riskNote: "Poor water chemistry damages equipment and poses health risks",
        nextDue: "This week"
      });
    }
    
    tasks.push({
      name: "Smoke & CO Detector Test",
      frequency: "Monthly",
      costLow: 0,
      costTypical: 0,
      costHigh: 0,
      isDIY: true,
      riskNote: "Life-saving devices—45% of home fire deaths occur with no working alarm",
      nextDue: "This week"
    });
    
    tasks.push({
      name: "Smoke & CO Detector Battery Replacement",
      frequency: "Annual",
      costLow: 15 * multiplier,
      costTypical: 25 * multiplier,
      costHigh: 40 * multiplier,
      isDIY: true,
      riskNote: "Essential for family safety",
      nextDue: "In 8 months"
    });
    
    // Calculate totals
    const totalLow = tasks.reduce((sum, task) => {
      const timesPerYear = task.frequency === "Weekly" ? 24 : 
                          task.frequency === "Quarterly" ? 4 :
                          task.frequency === "Bi-annual" ? 2 : 
                          task.frequency === "Monthly" ? 12 : 1;
      return sum + (task.costLow * timesPerYear);
    }, 0);
    
    const totalTypical = tasks.reduce((sum, task) => {
      const timesPerYear = task.frequency === "Weekly" ? 24 :
                          task.frequency === "Quarterly" ? 4 :
                          task.frequency === "Bi-annual" ? 2 :
                          task.frequency === "Monthly" ? 12 : 1;
      return sum + (task.costTypical * timesPerYear);
    }, 0);
    
    const totalHigh = tasks.reduce((sum, task) => {
      const timesPerYear = task.frequency === "Weekly" ? 24 :
                          task.frequency === "Quarterly" ? 4 :
                          task.frequency === "Bi-annual" ? 2 :
                          task.frequency === "Monthly" ? 12 : 1;
      return sum + (task.costHigh * timesPerYear);
    }, 0);
    
    const plan: MaintenancePlan = {
      tasksPerYear: tasks.length,
      annualCostLow: Math.round(totalLow),
      annualCostTypical: Math.round(totalTypical),
      annualCostHigh: Math.round(totalHigh),
      nextDueTask: tasks[0].name,
      tasks
    };
    
    setGeneratedPlan(plan);
    
    // Save to localStorage
    localStorage.setItem('homeMaintenancePlan', JSON.stringify(plan));
    
    toast({
      title: "Plan Generated!",
      description: "Your personalized maintenance plan is ready",
    });
  };

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Download",
      description: "PDF generation coming soon! Use CSV for now.",
    });
  };

  const handleDownloadCSV = () => {
    if (!generatedPlan) return;
    
    const csvContent = [
      ["Task", "Frequency", "Cost (Low)", "Cost (Typical)", "Cost (High)", "DIY Friendly", "Next Due"],
      ...generatedPlan.tasks.map(task => [
        task.name,
        task.frequency,
        `$${task.costLow.toFixed(0)}`,
        `$${task.costTypical.toFixed(0)}`,
        `$${task.costHigh.toFixed(0)}`,
        task.isDIY ? "Yes" : "No",
        task.nextDue
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'home-maintenance-plan.csv';
    a.click();
    
    toast({
      title: "CSV Downloaded",
      description: "Your maintenance plan has been exported",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
              <span className="text-2xl font-bold">HomeBase</span>
            </div>
            <Button 
              onClick={() => navigate("/resources")} 
              variant="ghost" 
              size="sm"
            >
              ← Back to Resources
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero */}
        <div className="mb-12">
          <SectionHeader
            title="Your personalized home maintenance plan"
            subtitle="Enter your home details to generate a smart yearly checklist, upcoming tasks, and an estimated budget."
          />
        </div>

        {!generatedPlan ? (
          // Form
          <Card className="p-6 md:p-8 rounded-2xl shadow-md">
            <form onSubmit={(e) => { e.preventDefault(); generatePlan(); }} className="space-y-8">
              {/* Home Basics */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Home Basics</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="12345"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="propertyType">Property Type</Label>
                    <Select value={propertyType} onValueChange={setPropertyType} required>
                      <SelectTrigger id="propertyType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="townhome">Townhome</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="homeAge">Home Age (years)</Label>
                    <Input
                      id="homeAge"
                      type="number"
                      value={homeAge}
                      onChange={(e) => setHomeAge(e.target.value)}
                      placeholder="15"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="squareFeet">Square Footage</Label>
                    <Input
                      id="squareFeet"
                      type="number"
                      value={squareFeet}
                      onChange={(e) => setSquareFeet(e.target.value)}
                      placeholder="2000"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Systems */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Home Systems</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="hvac" checked={hasHVAC} onCheckedChange={(checked) => setHasHVAC(checked as boolean)} />
                    <Label htmlFor="hvac" className="font-normal cursor-pointer">HVAC System</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="gasHeat" checked={hasGasHeat} onCheckedChange={(checked) => setHasGasHeat(checked as boolean)} />
                    <Label htmlFor="gasHeat" className="font-normal cursor-pointer">Gas Heating</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="electricHeat" checked={hasElectricHeat} onCheckedChange={(checked) => setHasElectricHeat(checked as boolean)} />
                    <Label htmlFor="electricHeat" className="font-normal cursor-pointer">Electric Heating</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="lawn" checked={hasLawn} onCheckedChange={(checked) => setHasLawn(checked as boolean)} />
                    <Label htmlFor="lawn" className="font-normal cursor-pointer">Lawn/Garden</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pool" checked={hasPool} onCheckedChange={(checked) => setHasPool(checked as boolean)} />
                    <Label htmlFor="pool" className="font-normal cursor-pointer">Pool/Spa</Label>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="waterHeater">Water Heater Type</Label>
                    <Select value={waterHeaterType} onValueChange={setWaterHeaterType}>
                      <SelectTrigger id="waterHeater">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tank">Tank</SelectItem>
                        <SelectItem value="tankless">Tankless</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="roofAge">Roof Age (years)</Label>
                    <Input
                      id="roofAge"
                      type="number"
                      value={roofAge}
                      onChange={(e) => setRoofAge(e.target.value)}
                      placeholder="10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Your Preferences</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="diyComfort">DIY Comfort Level</Label>
                    <Select value={diyComfort} onValueChange={setDiyComfort} required>
                      <SelectTrigger id="diyComfort">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Prefer professionals</SelectItem>
                        <SelectItem value="medium">Medium - Some tasks</SelectItem>
                        <SelectItem value="high">High - Most tasks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="serviceLevel">Service Level</Label>
                    <Select value={serviceLevel} onValueChange={setServiceLevel} required>
                      <SelectTrigger id="serviceLevel">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic - Essential only</SelectItem>
                        <SelectItem value="standard">Standard - Recommended</SelectItem>
                        <SelectItem value="premium">Premium - Comprehensive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full"
                id="btn-generate-plan"
                data-track="hmsk_generate"
              >
                Generate My Plan
              </Button>
            </form>
          </Card>
        ) : (
          // Results
          <div className="space-y-8">
            <ResultPanel
              summaryContent={
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Metric
                      label="Tasks per Year"
                      value={generatedPlan.tasksPerYear}
                      helper="Total maintenance tasks recommended annually"
                    />
                    <Metric
                      label="Annual Cost (Typical)"
                      value={`$${generatedPlan.annualCostTypical.toLocaleString()}`}
                      helper="Expected annual maintenance cost"
                    />
                    <Metric
                      label="Next Due"
                      value={generatedPlan.nextDueTask}
                      helper="Highest priority upcoming task"
                    />
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Cost Range</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg">${generatedPlan.annualCostLow.toLocaleString()}</span>
                      <span className="text-muted-foreground">to</span>
                      <span className="text-lg">${generatedPlan.annualCostHigh.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <Button size="lg" onClick={() => navigate("/waitlist")}>
                      Add to HomeBase
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/")}>
                      Book trusted pros in your area
                    </Button>
                  </div>
                </div>
              }
              detailsContent={
                <Accordion type="single" collapsible className="w-full">
                  {generatedPlan.tasks.map((task, index) => (
                    <AccordionItem key={index} value={`task-${index}`}>
                      <AccordionTrigger>
                        <div className="flex justify-between items-center w-full pr-4">
                          <span className="font-medium">{task.name}</span>
                          <span className="text-sm text-muted-foreground">{task.frequency}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Low</p>
                              <p className="font-semibold">${task.costLow.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Typical</p>
                              <p className="font-semibold">${task.costTypical.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">High</p>
                              <p className="font-semibold">${task.costHigh.toFixed(0)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className={task.isDIY ? "text-primary" : "text-muted-foreground"}>
                              {task.isDIY ? "✓ DIY Friendly" : "⚠ Professional Recommended"}
                            </span>
                            <span className="text-muted-foreground">Next due: {task.nextDue}</span>
                          </div>
                          <div className="p-3 bg-destructive/10 rounded-lg">
                            <p className="text-sm"><strong>Risk of skipping:</strong> {task.riskNote}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              }
              downloadContent={
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Export your maintenance plan to share with family or service providers
                  </p>
                  <DownloadButtons
                    onDownloadPDF={handleDownloadPDF}
                    onDownloadCSV={handleDownloadCSV}
                    shareLink={window.location.href}
                    trackingPrefix="hmsk"
                  />
                  
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 Tip: Save this plan to your HomeBase account for automated reminders and easy booking
                    </p>
                    <Button 
                      className="mt-3 w-full" 
                      variant="outline"
                      onClick={() => navigate("/waitlist")}
                      data-track="hmsk_signup_click"
                    >
                      Create free account
                    </Button>
                  </div>
                </div>
              }
            />
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setGeneratedPlan(null)}
              >
                Create Another Plan
              </Button>
            </div>
          </div>
        )}
      </div>

      {!generatedPlan && (
        <StickyFooterCTA
          text="Generate My Plan"
          onClick={generatePlan}
          trackingId="hmsk_generate_mobile"
        />
      )}
    </div>
  );
}
