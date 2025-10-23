import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, MapPin, ArrowRight, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProviderStats, useTodayJobs, useUnpaidInvoices, useUnrepliedMessages } from "./hooks/useDashboardData";
import { useDashboardInsights } from "./hooks/useDashboardInsights";
import { AIInsightCard } from "@/components/provider/AIInsightCard";
import { BalanceWidget } from "@/components/provider/BalanceWidget";
import { OnboardingChecklist } from "@/components/provider/OnboardingChecklist";
import { NewProviderWelcome } from "@/components/provider/NewProviderWelcome";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { stats, loading: kpiLoading } = useProviderStats();
  const { jobs } = useTodayJobs();
  const { invoices } = useUnpaidInvoices();
  const { threads: unreadThreads } = useUnrepliedMessages();
  const { insights, loading: insightsLoading } = useDashboardInsights();

  const hasAnyData = stats.totalClients > 0 || jobs.length > 0 || invoices.length > 0;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 pb-safe">
      <header className="py-4 md:py-6 pt-safe">
        <h1 className="font-bold tracking-tight" style={{ fontSize: "clamp(20px, 2.6vw, 32px)" }}>
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome back! Here's an overview of your business.
        </p>
      </header>

      {/* Welcome state for new providers */}
      <NewProviderWelcome hasAnyData={hasAnyData} />

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="Active Subscribers" value={stats.activeSubscribers} loading={kpiLoading} helpText="Homeowners with active subscriptions to your services" />
        <KpiCard title="Total Clients" value={stats.totalClients} loading={kpiLoading} helpText="All clients in your database (subscribers + non-subscribers)" />
        <KpiCard title="Monthly Revenue" value={`$${stats.mrr.toLocaleString()}`} loading={kpiLoading} helpText="Total revenue expected this month from subscriptions and jobs" />
        <KpiCard title="Upcoming (7d)" value={stats.upcoming7d} loading={kpiLoading} helpText="Number of jobs scheduled in the next 7 days" />
      </section>

      <div className="h-4 md:h-6" />

      {/* Primary panels */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Balance Widget */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <BalanceWidget />
          </CardContent>
        </Card>

        {/* Today's route & jobs (2 cols) */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h3 className="font-semibold text-sm md:text-base">Today's Jobs & Route</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/provider/jobs")}
                >
                  <MapPin className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">View Map</span>
                </Button>
                <Button size="sm" onClick={() => navigate("/provider/jobs")}>
                  <Bot className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Optimize route</span>
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {jobs.slice(0, 6).map((j) => (
                <TodayJobRow key={j.id} job={j} onOpen={() => navigate(`/provider/jobs`)} />
              ))}
              {jobs.length === 0 && <EmptyRow text="No jobs scheduled today." />}
            </div>
          </CardContent>
        </Card>

      {/* AI insights */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold text-sm md:text-base">HomeBase AI · Insights</h3>
            <div className="mt-3 space-y-2">
              {insightsLoading ? (
                <div className="space-y-2">
                  <div className="animate-pulse rounded-md bg-muted h-16 w-full" />
                  <div className="animate-pulse rounded-md bg-muted h-16 w-full" />
                </div>
              ) : insights.length > 0 ? (
                insights.map((insight, idx) => (
                  <AIInsightCard key={idx} title={insight.text} description={insight.text} type={insight.type} />
                ))
              ) : (
                <div className="text-center py-4">
                  <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No AI insights yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Insights will appear as you build your business
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Button className="w-full" size="sm">Ask HomeBase AI</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="h-4 md:h-6" />

      {/* Secondary panels */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm md:text-base">Unreplied Messages</h3>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => navigate("/provider/messages")}
              >
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {unreadThreads.slice(0, 5).map((t) => (
                <MessageThreadRow
                  key={t.id}
                  thread={t}
                  onOpen={() => navigate(`/provider/messages?conversation=${t.id}`)}
                />
              ))}
              {unreadThreads.length === 0 && <EmptyRow text="You're all caught up." />}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold text-sm md:text-base">Quick Links</h3>
            <div className="mt-3 grid gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/provider/settings")}>
                Set service rates
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/provider/settings")}>
                Connect calendar
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/provider/team")}>
                Invite teammate
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ title, value, loading, helpText }: { 
  title: string; 
  value: React.ReactNode; 
  loading?: boolean;
  helpText?: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{title}</p>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mt-1" />
        ) : (
          <p className="text-xl md:text-2xl font-semibold mt-1">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TodayJobRow({ job, onOpen }: { job: any; onOpen: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate text-sm">{job.service_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {job.address || "Address not available"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right hidden md:block">
          <p className="text-sm">{formatWindow(job)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpen}>
          Open
        </Button>
      </div>
    </div>
  );
}

function InsightRow({ text }: { text: string }) {
  return (
    <div className="rounded-lg border p-3 text-sm flex items-start gap-2">
      <Bot className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <span className="flex-1 text-xs md:text-sm">{text}</span>
    </div>
  );
}

function MessageThreadRow({ thread, onOpen }: { thread: any; onOpen: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate text-sm">{thread.title || "Conversation"}</p>
        <p className="text-xs text-muted-foreground truncate">
          {thread.last_message_preview || "No preview available"}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onOpen} className="shrink-0">
        Open
      </Button>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-lg border p-3 text-sm text-muted-foreground text-center">
      {text}
    </div>
  );
}

function formatWindow(j: any) {
  try {
    const a = new Date(j.date_time_start);
    const b = new Date(j.date_time_end);
    return `${a.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${b.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } catch {
    return "—";
  }
}
