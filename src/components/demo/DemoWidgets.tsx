import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, DollarSign, TrendingUp, Users, CheckCircle2, Clock, Home, MessageSquare, Sparkles, ClipboardList, XCircle, ArrowRight } from "lucide-react";

// Reminders Card Widget
export function RemindersCard() {
  const tasks = [
    { task: "HVAC Tune-up", due: "Next week", icon: "🌡️", urgent: true },
    { task: "Gutter Cleaning", due: "In 2 weeks", icon: "🏠", urgent: false },
    { task: "Pest Control", due: "Monthly", icon: "🐜", urgent: false },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Upcoming Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{task.icon}</span>
              <div>
                <p className="font-medium">{task.task}</p>
                <p className="text-sm text-muted-foreground">{task.due}</p>
              </div>
            </div>
            {task.urgent && <Badge variant="destructive">Urgent</Badge>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Provider List Table Widget
export function ProviderTable() {
  const providers = [
    { name: "Belhaven Lawn Co.", rating: 4.9, availability: "Tue 10am", price: "$55", verified: true },
    { name: "Capitol HVAC", rating: 4.8, availability: "Wed 2pm", price: "$89", verified: true },
    { name: "Prime Pest", rating: 4.7, availability: "Thu 9am", price: "$69", verified: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Providers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {providers.map((provider, i) => (
            <div key={i} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{provider.name}</h4>
                    {provider.verified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">⭐ {provider.rating} rating</p>
                </div>
                <p className="text-lg font-bold text-primary">{provider.price}</p>
              </div>
              <p className="text-sm text-muted-foreground">Next available: {provider.availability}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// AI Quote Calculator Widget
export function QuoteCalculator() {
  const breakdown = [
    { label: "Base", amount: "$60" },
    { label: "Property Size", amount: "+$10" },
    { label: "Seasonal Demand", amount: "+$5" },
    { label: "Loyalty Discount", amount: "-$6" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          AI Price Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Sample Address</p>
          <p className="font-medium">123 Pine St, Jackson, MS 39201</p>
        </div>
        
        <div className="space-y-2">
          {breakdown.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.amount}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Estimate</span>
            <span className="text-3xl font-bold text-primary">$69</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">✓ Fair market price • ✓ No hidden fees</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Dashboard Stats Widget
export function DashboardStats() {
  const kpis = [
    { label: "Upcoming Jobs", value: "3", icon: Calendar, color: "text-blue-600" },
    { label: "This Month Spend", value: "$248", icon: DollarSign, color: "text-green-600" },
    { label: "Open Messages", value: "1", icon: Users, color: "text-purple-600" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {kpis.map((kpi, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
                <span className="text-muted-foreground">{kpi.label}</span>
              </div>
              <span className="text-2xl font-bold">{kpi.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Calendar/Route Mock Widget
export function CalendarRouteMock() {
  const appointments = [
    { time: "Tue 10:00", client: "Emily Johnson", service: "Lawn", location: "Belhaven" },
    { time: "Tue 1:00", client: "Robert Wilson", service: "Gutters", location: "Fondren" },
    { time: "Wed 9:30", client: "James Robinson", service: "HVAC", location: "Ridgeland" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          This Week's Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.map((apt, i) => (
          <div key={i} className="p-3 border rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-start justify-between mb-1">
              <span className="font-semibold">{apt.time}</span>
              <Badge variant="secondary">{apt.service}</Badge>
            </div>
            <p className="font-medium">{apt.client}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {apt.location}
            </p>
          </div>
        ))}
        <div className="pt-3 border-t">
          <p className="text-sm text-primary font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Optimized route saves ~28 mins
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Client Table Widget
export function ClientTable() {
  const clients = [
    { name: "Emily Johnson", service: "Lawn", lastJob: "9/20", ltv: "$540", status: "Active" },
    { name: "Robert Wilson", service: "Gutters", lastJob: "9/12", ltv: "$320", status: "Active" },
    { name: "Sarah Taylor", service: "Pest", lastJob: "9/04", ltv: "$260", status: "Paused" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Your Clients
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clients.map((client, i) => (
            <div key={i} className="p-3 border rounded-lg hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold">{client.name}</h4>
                  <p className="text-sm text-muted-foreground">{client.service}</p>
                </div>
                <Badge variant={client.status === "Active" ? "default" : "secondary"}>
                  {client.status}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last job: {client.lastJob}</span>
                <span className="font-medium text-primary">LTV: {client.ltv}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Invoice List Widget
export function InvoiceList() {
  const invoices = [
    { id: "#1012", client: "Emily Johnson", amount: "$320", status: "Paid" },
    { id: "#1011", client: "Robert Wilson", amount: "$150", status: "Unpaid" },
    { id: "#1010", client: "James Robinson", amount: "$600", status: "Paid" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Recent Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{invoice.id}</p>
                <p className="text-sm text-muted-foreground">{invoice.client}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{invoice.amount}</p>
                <Badge variant={invoice.status === "Paid" ? "default" : "secondary"}>
                  {invoice.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 4-Step Process Flow
export function ProcessFlowDiagram() {
  const steps = [
    { icon: Home, title: "Create Account", desc: "Sign up in 30 seconds" },
    { icon: MapPin, title: "Add Your Home", desc: "We pull property details" },
    { icon: Calendar, title: "Book & Track", desc: "Schedule verified pros" },
    { icon: Sparkles, title: "Smart AI Tips", desc: "Get personalized advice" },
  ];

  return (
    <div className="space-y-6">
      {steps.map((step, i) => (
        <div key={i} className="relative">
          <div className="flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <step.icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 pt-1">
              <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}

// AI Chat Mockup
export function AIChatMockup() {
  const messages = [
    { type: "user", text: "When should I service my HVAC?" },
    { type: "ai", text: "Based on your 2019 system and Jackson's climate, I recommend servicing twice yearly - April and October. I've added this to your schedule!" },
    { type: "user", text: "Can you find me a provider?" },
    { type: "ai", text: "Found 3 top-rated HVAC pros near you. Capitol HVAC has a 4.8★ rating and availability this Thursday at 2pm for $89. Book now?" },
  ];

  return (
    <Card className="bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          HomeBase AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.type === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Before/After Comparison Cards
export function ComparisonCards() {
  const before = [
    { icon: ClipboardList, text: "Manual scheduling in spreadsheets" },
    { icon: MessageSquare, text: "Endless phone tag with clients" },
    { icon: XCircle, text: "Missed appointments & no-shows" },
  ];

  const after = [
    { icon: Calendar, text: "Auto-schedule with AI route optimization" },
    { icon: MessageSquare, text: "In-app messaging with clients" },
    { icon: CheckCircle2, text: "Automated reminders & confirmations" },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Before HomeBase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {before.map((item, i) => (
            <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base text-primary">With HomeBase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {after.map((item, i) => (
            <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 0.1 + 0.15}s` }}>
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground font-medium">{item.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Workflow Diagram
export function WorkflowDiagram() {
  const workflow = [
    { step: "1", title: "Client Books", desc: "Via HomeBase app", color: "bg-blue-500" },
    { step: "2", title: "AI Quotes", desc: "Dynamic pricing", color: "bg-purple-500" },
    { step: "3", title: "You Confirm", desc: "One-tap approval", color: "bg-green-500" },
    { step: "4", title: "Get Paid", desc: "Instant payout", color: "bg-yellow-500" },
  ];

  return (
    <div className="space-y-4">
      {workflow.map((item, i) => (
        <div key={i} className="relative">
          <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
            <div className={`w-10 h-10 rounded-full ${item.color} text-white flex items-center justify-center font-bold flex-shrink-0`}>
              {item.step}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
          {i < workflow.length - 1 && (
            <div className="flex items-center justify-center my-2 ml-5">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
