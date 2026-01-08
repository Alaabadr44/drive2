import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { ChevronDown, ChevronUp, Trash2, Filter } from 'lucide-react';

interface SocketEvent {
  id: string;
  eventName: string;
  timestamp: Date;
  data: any[];
}

export function SocketEventTracker() {
  const { socket } = useSocket();
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterText, setFilterText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleAnyEvent = (eventName: string, ...args: any[]) => {
      const newEvent: SocketEvent = {
        id: `${Date.now()}-${Math.random()}`,
        eventName,
        timestamp: new Date(),
        data: args,
      };

      setEvents(prev => {
        const updated = [...prev, newEvent];
        // Keep only last 50 events
        return updated.slice(-50);
      });
    };

    socket.onAny(handleAnyEvent);

    return () => {
      socket.offAny(handleAnyEvent);
    };
  }, [socket]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isExpanded]);

  const clearEvents = () => {
    setEvents([]);
  };

  const filteredEvents = filterText
    ? events.filter(e => e.eventName.toLowerCase().includes(filterText.toLowerCase()))
    : events;

  const formatTime = (date: Date) => {
    return `${date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    })}.${date.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
            Socket Events ({filteredEvents.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearEvents}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Clear all events"
          >
            <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Filter */}
      {isExpanded && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter events..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Events List */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="max-h-96 overflow-y-auto p-2 space-y-2 bg-gray-50 dark:bg-gray-900"
        >
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No events yet...
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-blue-600 dark:text-blue-400 break-all">
                    {event.eventName}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] whitespace-nowrap">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                {event.data.length > 0 && (
                  <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto text-[10px] text-gray-700 dark:text-gray-300">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
