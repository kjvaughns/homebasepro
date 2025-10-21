import { Calendar, momentLocalizer, View, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

      // Force refresh by calling parent's load function
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

  return (
    <div className="jobs-calendar-wrapper">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event) => onSelectJob(event.resource)}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        views={['month', 'week', 'day']}
        defaultView="week"
        resizable
        draggableAccessor={() => true}
      />
    </div>
  );
}
