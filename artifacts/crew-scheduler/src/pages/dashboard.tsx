import React from "react";
import { useGetDashboardSummary, useGetUpcomingJobs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: upcomingJobs, isLoading: isLoadingJobs } = useGetUpcomingJobs();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">Overview of your active operations and crew deployment.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Jobs"
          value={summary?.activeJobs}
          icon={Briefcase}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Total Crew"
          value={summary?.totalCrew}
          icon={Users}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Pending Tasks"
          value={summary?.pendingTasks}
          icon={ClipboardList}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Completed Jobs"
          value={summary?.completedJobs}
          icon={CheckCircle2}
          isLoading={isLoadingSummary}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Upcoming Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingJobs ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !upcomingJobs || upcomingJobs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="bg-secondary/50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                </div>
                <p>No upcoming jobs scheduled.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcomingJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block hover:bg-secondary/50 transition-colors p-4 group">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{job.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          {job.location}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mb-2">
                          {formatDate(job.startDate)}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center h-[300px]">
            {isLoadingSummary ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : (
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-secondary fill-none"
                    strokeWidth="12"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-primary fill-none transition-all duration-1000 ease-out"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * ((summary?.completedTasks || 0) / (Math.max(1, (summary?.completedTasks || 0) + (summary?.pendingTasks || 0)))))}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold">
                    {summary ? Math.round(((summary.completedTasks || 0) / Math.max(1, (summary.completedTasks || 0) + (summary.pendingTasks || 0))) * 100) : 0}%
                  </span>
                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Done</span>
                </div>
              </div>
            )}
            <div className="mt-8 flex justify-center gap-6 w-full text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground"><strong className="text-foreground">{summary?.completedTasks || 0}</strong> Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-muted-foreground"><strong className="text-foreground">{summary?.pendingTasks || 0}</strong> Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, isLoading }: { title: string; value?: number; icon: React.ElementType; isLoading: boolean }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">{value !== undefined ? value : "-"}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}