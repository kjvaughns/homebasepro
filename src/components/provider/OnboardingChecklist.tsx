import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  route: string;
  completed: boolean;
}

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_checklist')
      .eq('user_id', user.id)
      .single();

    if (profile?.onboarding_checklist) {
      setChecklist(profile.onboarding_checklist as Record<string, boolean>);
    }
    setLoading(false);
  };

  const items: ChecklistItem[] = [
    {
      key: 'profile_complete',
      title: 'Complete Your Profile',
      description: 'Add your business logo, description, and service area',
      route: '/provider/account/profile',
      completed: checklist.profile_complete || false,
    },
    {
      key: 'service_added',
      title: 'Add Your First Service',
      description: 'List the services you offer to customers',
      route: '/provider/services',
      completed: checklist.service_added || false,
    },
    {
      key: 'test_payment_link',
      title: 'Create a Test Payment Link',
      description: 'Try creating a payment link for $1 to test the system',
      route: '/provider/payments',
      completed: checklist.test_payment_link || false,
    },
    {
      key: 'test_invoice',
      title: 'Send a Test Invoice',
      description: 'Create and send an invoice to yourself',
      route: '/provider/payments',
      completed: checklist.test_invoice || false,
    },
    {
      key: 'shared_link',
      title: 'Share Your Profile',
      description: 'Get your branded short link and share it',
      route: '/provider/share-links',
      completed: checklist.shared_link || false,
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const progress = (completedCount / items.length) * 100;
  const isComplete = completedCount === items.length;

  if (loading) return null;
  if (isComplete) return null; // Hide when complete

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">Get Started with HomeBase</CardTitle>
            <CardDescription>Complete these steps to go live</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completedCount}/{items.length}</div>
            <div className="text-xs text-muted-foreground">completed</div>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-4" />
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => navigate(item.route)}
            className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${item.completed ? 'text-muted-foreground line-through' : ''}`}>
                {item.title}
              </p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </button>
        ))}

        {isComplete && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <Trophy className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">You're live!</p>
              <p className="text-sm text-green-700 dark:text-green-300">Your account is ready to accept clients</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
