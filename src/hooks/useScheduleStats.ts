import { useMemo } from 'react';
import moment from 'moment';

export function useScheduleStats(jobs: any[]) {
  return useMemo(() => {
    const today = moment().startOf('day');
    const todayEnd = moment().endOf('day');
    
    const todayJobs = jobs.filter(job => {
      const jobDate = moment(job.window_start);
      return jobDate.isBetween(today, todayEnd);
    });
    
    const todayRevenue = todayJobs.reduce((sum, job) => {
      return sum + (job.invoice?.amount || 0);
    }, 0);
    
    const completedCount = todayJobs.filter(j => j.status === 'completed').length;
    const totalCount = todayJobs.length;
    
    // Find next upcoming job
    const now = moment();
    const nextJob = jobs
      .filter(job => moment(job.window_start).isAfter(now))
      .sort((a, b) => moment(a.window_start).valueOf() - moment(b.window_start).valueOf())[0];
    
    return {
      todayJobCount: totalCount,
      todayRevenue,
      completedCount,
      totalCount,
      progressPercentage: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
      nextJob: nextJob ? {
        id: nextJob.id,
        time: moment(nextJob.window_start).format('h:mm A'),
        client_name: nextJob.clients?.name || 'Unknown',
        service_type: nextJob.service_type || 'Service',
        price: nextJob.invoice?.amount || 0,
        address: nextJob.address
      } : null
    };
  }, [jobs]);
}
