import { useState } from 'react';
import { Calendar, momentLocalizer, View, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Route } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './JobsCalendar.css';

interface JobEvent extends Event {
  id: string;
  status: string;
  client_name: string;
  service_type: string;
  resource: any;
}

interface JobsCalendarProps {
  jobs: any[];
  onSelectJob: (job: any) => void;
}

const DnDCalendar = withDragAndDrop(Calendar);

export function JobsCalendar({ jobs, onSelectJob }: JobsCalendarProps) {
  const localizer = momentLocalizer(moment);
  const [optimizing, setOptimizing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const events: JobEvent[] = jobs
    .filter(job => job.window_start && job.window_end)
    .map(job => ({
      id: job.id,
      title: `${job.clients?.name || 'Unknown'} - ${job.service_type || 'Service'}`,
      start: new Date(job.window_start),
      end: new Date(job.window_end),
      status: job.status,
      client_name: job.clients?.name,
      service_type: job.service_type,
      resource: job
    }));

  const eventStyleGetter = (event: JobEvent) => {
    const statusColors: Record<string, string> = {
      lead: '#94a3b8',
      service_call: '#f59e0b',
      quoted: '#8b5cf6',
      scheduled: '#3b82f6',
      confirmed: '#22c55e',
      in_progress: '#06b6d4',
      completed: '#10b981',
      invoiced: '#eab308',
      paid: '#059669',
      cancelled: '#ef4444'
    };

    return {
      style: {
        backgroundColor: statusColors[event.status] || '#94a3b8',
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 6px'
      }
    };
  };

  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({
          window_start: start.toISOString(),
          window_end: end.toISOString()
        })
        .eq('id', event.id);

      if (error) throw error;

      toast.success(
        `Job rescheduled to ${moment(start).format('MMM DD, YYYY [at] h:mm A')}`
      );

      window.location.reload();
    } catch (error) {
      console.error('Error rescheduling job:', error);
      toast.error('Failed to reschedule job');
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({
          window_start: start.toISOString(),
          window_end: end.toISOString()
        })
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Job time window updated');
      window.location.reload();
    } catch (error) {
      console.error('Error resizing job:', error);
      toast.error('Failed to update job time');
    }
  };

  const handleOptimizeRoute = async () => {
    if (!selectedDate) {
      toast.error('Please select a date by clicking on it');
      return;
    }

    const dayStart = moment(selectedDate).startOf('day');
    const dayEnd = moment(selectedDate).endOf('day');
    
    const dayJobs = jobs.filter(job => {
      const jobDate = moment(job.window_start);
      return jobDate.isBetween(dayStart, dayEnd) && job.lat && job.lng;
    });

    if (dayJobs.length < 2) {
      toast.error('Need at least 2 jobs with addresses on this day to optimize');
      return;
    }

    setOptimizing(true);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: { jobIds: dayJobs.map(j => j.id) }
      });

      if (error) throw error;

      toast.success(
        `Route optimized! Saved ${data.distanceSaved} miles (${data.timeSaved})`
      );

      window.location.reload();
    } catch (error: any) {
      console.error('Route optimization error:', error);
      toast.error(error.message || 'Failed to optimize route');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedDate(slotInfo.start);
  };

  return (
    <div className="space-y-4">
      {selectedDate && (
        <div className="flex items-center gap-2">
          <Button onClick={handleOptimizeRoute} disabled={optimizing}>
            {optimizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Route className="h-4 w-4 mr-2" />}
            Optimize Route for {moment(selectedDate).format('MMM DD, YYYY')}
          </Button>
        </div>
      )}
      
      <div className="jobs-calendar-wrapper">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event) => onSelectJob(event.resource)}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          views={['month', 'week', 'day']}
          defaultView="week"
          resizable
          selectable
          draggableAccessor={() => true}
        />
      </div>
    </div>
  );
}