import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessibleImageUrl } from "@/utils/imageUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Calendar, Clock, Timer, Search, Filter, PhoneIncoming, PhoneOutgoing, PhoneMissed, CheckCircle2, XCircle, Play, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RestaurantOption {
  id: string;
  nameEn: string;
  nameAr: string;
}

interface ScreenOption {
  id: string;
  name: string;
  restaurant?: {
    nameEn: string;
  };
}

interface CallLog {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'completed' | 'missed' | 'rejected' | 'busy' | 'failed';
  recordingUrl?: string; // Add optional recording URL
  recordingSize?: string; // TypeORM bigint string
  restaurant: {
    id: string;
    nameEn: string;
    nameAr: string;
  };
  screen: {
    id: string;
    name: string;
  };
}

interface PaginationMeta {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

// Internal component to handle audio player state
const CallAudioPlayer = ({ call }: { call: CallLog }) => {
    const [rate, setRate] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleRateChange = (newRate: number) => {
        setRate(newRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = newRate;
        }
    };

    if (!call.recordingUrl) return null;

    const url = getAccessibleImageUrl(call.recordingUrl);

    return (
        <div className="w-full space-y-4">
            <audio 
                ref={audioRef}
                controls 
                autoPlay 
                playsInline
                className="w-full" 
                src={url} 
                style={{ minHeight: '54px' }}
                onPlay={() => {
                    // Ensure rate is maintained if it resets
                    if (audioRef.current && audioRef.current.playbackRate !== rate) {
                         audioRef.current.playbackRate = rate;
                    }
                }}
            >
                Your browser does not support the audio element.
            </audio>

            <div className="flex items-center justify-between gap-4">
                 {/* Speed Controls */}
                <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
                    {[1, 1.5, 2].map((r) => (
                        <Button
                            key={r}
                            variant={rate === r ? "default" : "ghost"}
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleRateChange(r)}
                        >
                            {r}x
                        </Button>
                    ))}
                </div>

                {/* Download Button */}
                <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 h-8"
                    onClick={() => {
                        const link = document.createElement('a');
                        link.href = url;
                        link.target = '_blank';
                        link.download = `recording-${call.id}.${call.recordingUrl!.split('.').pop()}`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                >
                    <Download className="w-3 h-3" />
                    Download
                </Button>
            </div>
        </div>
    );
};

export default function AdminCalls() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [playingCall, setPlayingCall] = useState<CallLog | null>(null);

  // Filter State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [screenId, setScreenId] = useState("");
  const [restaurantId, setRestaurantId] = useState("");

  // Dropdown Options State
  const [restaurantOptions, setRestaurantOptions] = useState<RestaurantOption[]>([]);
  const [screenOptions, setScreenOptions] = useState<ScreenOption[]>([]);

  // Fetch Options on Mount
  useEffect(() => {
      const fetchOptions = async () => {
          if (!user?.token) return;
          try {
              // Fetch Restaurants (limit 1000 for dropdown)
              const restRes = await api.get('/restaurants?limit=1000', user.token);
              const restData = restRes.data?.items ? restRes.data.items : (restRes.data || []);
              setRestaurantOptions(restData);

              // Fetch Screens (limit 1000 for dropdown)
              const screenRes = await api.get('/screens?limit=1000', user.token);
              const screenData = screenRes.data?.items ? screenRes.data.items : (screenRes.data || []);
              setScreenOptions(screenData);
          } catch (error) {
              console.error("Failed to fetch filter options", error);
          }
      };
      fetchOptions();
  }, [user?.token]);

  const fetchCalls = useCallback(async (currentPage: number) => {
    if (!user?.token) return;
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (screenId && screenId !== 'ALL') params.append('screenId', screenId);
      if (restaurantId && restaurantId !== 'ALL') params.append('restaurantId', restaurantId);

      const response = await api.get(`/calls?${params.toString()}`, user.token);
      // Handle both nested data structure and flat response
      const data = response.data?.items ? response.data.items : (response.data || []);
      const metaData = response.data?.meta ? response.data.meta : null;
      
      setCalls(data);
      setMeta(metaData);
    } catch (error) {
      console.error("Failed to fetch calls:", error);
      toast.error("Failed to load call history");
    } finally {
      setLoading(false);
    }
  }, [user?.token, limit, startDate, endDate, screenId, restaurantId]);

  useEffect(() => {
    fetchCalls(page);
  }, [fetchCalls, page]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'missed':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"><PhoneMissed className="w-3 h-3 mr-1" /> Missed</Badge>;
      case 'rejected':
        return <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"><PhoneOutgoing className="w-3 h-3 mr-1" /> Busy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }

  };

  const formatBytes = (bytes?: string | number) => {
      if (!bytes) return '-';
      const num = Number(bytes);
      if (isNaN(num)) return '-';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(num) / Math.log(k));
      return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Call History
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              Monitor and analyze call logs across all restaurants
            </p>
          </div>
          <div className="flex items-center gap-3">
             {(startDate || endDate || (screenId && screenId !== 'ALL') || (restaurantId && restaurantId !== 'ALL')) && (
                 <Button variant="outline" className="gap-2 shadow-sm" onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setScreenId("");
                    setRestaurantId("");
                    setPage(1);
                    // Trigger fetch after state update in effect
                 }}>
                    <Filter className="w-4 h-4" />
                    Reset Filters
                 </Button>
             )}
             
             {/* HIDDEN: Search Button (Auto-refresh is active)
             <Button className="gap-2 shadow-sm" onClick={() => {
                 setPage(1);
                 fetchCalls(1);
             }}>
                <Search className="w-4 h-4" />
                Search
             </Button>
             */}
          </div>
        </div>

        {/* Filters Section */}
        <Card className="border shadow-sm bg-card/50">
           <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="bg-background"
                  />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="bg-background" 
                  />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-medium">Screen</label>
                  <Select value={screenId} onValueChange={setScreenId}>
                      <SelectTrigger className="bg-background">
                          <SelectValue placeholder="All Screens" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="ALL">All Screens</SelectItem>
                          {screenOptions.map((screen) => (
                              <SelectItem key={screen.id} value={screen.id}>
                                  {screen.name} {screen.restaurant ? `(${screen.restaurant.nameEn})` : ''}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-medium">Restaurant</label>
                  <Select value={restaurantId} onValueChange={setRestaurantId}>
                      <SelectTrigger className="bg-background">
                          <SelectValue placeholder="All Restaurants" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="ALL">All Restaurants</SelectItem>
                          {restaurantOptions.map((rest) => (
                              <SelectItem key={rest.id} value={rest.id}>
                                  {rest.nameEn} - {rest.nameAr}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
           </CardContent>
        </Card>

        {/* Filters & Stats (Placeholder for now) - HIDDEN
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-100 shadow-sm">
                 <CardContent className="p-6 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                         <Phone className="w-6 h-6" />
                     </div>
                     <div>
                         <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                         <h3 className="text-2xl font-bold text-foreground">{meta?.totalItems || 0}</h3>
                     </div>
                 </CardContent>
             </Card>
             <Card className="bg-gradient-to-br from-green-500/5 to-transparent border-green-100 shadow-sm">
                 <CardContent className="p-6 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                         <Clock className="w-6 h-6" />
                     </div>
                     <div>
                         <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                         <h3 className="text-2xl font-bold text-foreground">-</h3>
                     </div>
                 </CardContent>
             </Card>
             <Card className="bg-gradient-to-br from-purple-500/5 to-transparent border-purple-100 shadow-sm">
                 <CardContent className="p-6 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                         <Calendar className="w-6 h-6" />
                     </div>
                     <div>
                         <p className="text-sm font-medium text-muted-foreground">Today's Activity</p>
                         <h3 className="text-2xl font-bold text-foreground">-</h3>
                     </div>
                 </CardContent>
             </Card>
        </div>
        */}

        <Card className="border-none shadow-xl bg-card/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>A list of recent calls initiated from kiosks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow>
                    <TableHead className="w-[200px]">Time</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Screen</TableHead>

                    <TableHead>Duration</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                         <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-32 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                         <TableCell><div className="h-4 w-8 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : calls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No calls found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    calls.map((call) => (
                      <TableRow key={call.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                            <div className="flex flex-col">
                                <span className="text-sm">{new Date(call.startTime).toLocaleDateString()}</span>
                                <span className="text-xs text-muted-foreground">{new Date(call.startTime).toLocaleTimeString()}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-blue-600">{call.restaurant?.nameEn || 'Unknown'}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="font-medium">{call.screen?.name || 'Unknown Screen'}</span>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Timer className="w-3 h-3" />
                                {formatDuration(call.duration)}
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="text-xs font-mono text-muted-foreground">{formatBytes(call.recordingSize)}</span>
                        </TableCell>
                        <TableCell>
                            {getStatusBadge(call.status)}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {call.recordingUrl && (
                                  <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-2"
                                      onClick={() => setPlayingCall(call)}
                                  >
                                      <Play className="w-3 h-3" />
                                      <span className="hidden sm:inline">Play</span>
                                  </Button>
                              )}
                              {/* HIDDEN: Details Icon
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Search className="w-4 h-4" />
                                <span className="sr-only">Details</span>
                              </Button>
                              */}
                            </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {meta && (
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-4">
                    <p className="text-sm text-muted-foreground">
                        Showing page {meta.currentPage} of {meta.totalPages} ({meta.totalItems} total)
                    </p>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Items per page:</span>
                            <Select value={String(limit)} onValueChange={(val) => {
                                setLimit(Number(val));
                                setPage(1); // Reset to page 1 on limit change
                            }}>
                                <SelectTrigger className="w-[70px] h-8">
                                    <SelectValue placeholder="20" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                                disabled={page === meta.totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}

          </CardContent>
        </Card>
        {/* Audio Player Dialog */}
        <Dialog open={!!playingCall} onOpenChange={(open) => !open && setPlayingCall(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Call Recording</DialogTitle>
                    <DialogDescription>
                        {playingCall && `Recording from ${new Date(playingCall.startTime).toLocaleString()}`}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    {playingCall && <CallAudioPlayer call={playingCall} />}
                    <div className="text-xs text-muted-foreground text-center">
                        <p>Restaurant: {playingCall?.restaurant?.nameEn}</p>
                        <p>Kiosk: {playingCall?.screen?.name}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
