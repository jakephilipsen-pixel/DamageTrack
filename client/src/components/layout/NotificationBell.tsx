import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

const STORAGE_KEY_PREFIX = 'dt_notif_seen_';

function formatStatus(s: string | null) {
  if (!s) return 'N/A';
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const [open, setOpen] = useState(false);

  const storageKey = user ? `${STORAGE_KEY_PREFIX}${user.id}` : null;
  const lastSeenRaw = storageKey ? localStorage.getItem(storageKey) : null;
  const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : null;

  const unseenCount = notifications.filter((n) =>
    !lastSeen || new Date(n.createdAt) > lastSeen
  ).length;

  const handleMarkAllSeen = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, new Date().toISOString());
    }
    setOpen(false);
  };

  const handleNotificationClick = (damageId: string) => {
    setOpen(false);
    navigate(`/damages/${damageId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unseenCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unseenCount > 9 ? '9+' : unseenCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={handleMarkAllSeen}>
              Mark all seen
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No new notifications</p>
          ) : (
            notifications.map((n) => {
              const isUnseen = !lastSeen || new Date(n.createdAt) > lastSeen;
              return (
                <button
                  key={n.id}
                  className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-0 ${isUnseen ? 'bg-muted/50' : ''}`}
                  onClick={() => handleNotificationClick(n.damageId)}
                >
                  <div className="flex items-start gap-2">
                    {isUnseen && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <div className={isUnseen ? '' : 'ml-4'}>
                      <p className="text-xs font-semibold text-primary">{n.referenceNumber}</p>
                      <p className="text-xs text-foreground mt-0.5">
                        {formatStatus(n.fromStatus)} → {formatStatus(n.toStatus)}
                      </p>
                      {n.changedByUser && (
                        <p className="text-xs text-muted-foreground">by {n.changedByUser}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
