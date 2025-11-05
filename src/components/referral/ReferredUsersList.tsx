import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, Clock, UserPlus, Info } from 'lucide-react';
import { format } from 'date-fns';

interface ReferredUser {
  id: string;
  referralCode: string;
  createdAt: string;
  role: string;
  status: 'pending' | 'qualified';
  rewardValue?: number;
}

interface ReferredUsersListProps {
  users: ReferredUser[];
}

export function ReferredUsersList({ users }: ReferredUsersListProps) {
  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No referrals yet. Share your link to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Referrals</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  <strong>Qualified:</strong> User completed trial or made a purchase
                  <br />
                  <strong>Pending:</strong> User signed up but hasn't qualified yet
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => {
            const isQualified = user.status === 'qualified';
            const StatusIcon = isQualified ? CheckCircle : Clock;
            
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    isQualified ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <StatusIcon className={`h-4 w-4 ${
                      isQualified ? 'text-green-600' : 'text-amber-600'
                    }`} />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {user.referralCode}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant={isQualified ? 'default' : 'secondary'}>
                    {isQualified ? 'Qualified' : 'Pending'}
                  </Badge>
                  {user.rewardValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      +${user.rewardValue}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
