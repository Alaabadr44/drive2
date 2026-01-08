import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/contexts/AdminContext";
import { Store, Monitor, Zap, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { stats, restaurants, screens, entityStatuses, triggerRefresh, liveCalls } = useAdmin();

  // Unique colors for different active calls to visually pair them
  const CALL_COLORS = [
      { border: 'border-red-500', text: 'text-red-500', bg: 'bg-red-500/10', shadow: 'shadow-red-500/20' },
      { border: 'border-orange-500', text: 'text-orange-500', bg: 'bg-orange-500/10', shadow: 'shadow-orange-500/20' },
      { border: 'border-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10', shadow: 'shadow-amber-500/20' },
      { border: 'border-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500/10', shadow: 'shadow-yellow-500/20' },
      { border: 'border-lime-500', text: 'text-lime-500', bg: 'bg-lime-500/10', shadow: 'shadow-lime-500/20' },
      { border: 'border-green-500', text: 'text-green-500', bg: 'bg-green-500/10', shadow: 'shadow-green-500/20' },
      { border: 'border-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10', shadow: 'shadow-emerald-500/20' },
      { border: 'border-teal-500', text: 'text-teal-500', bg: 'bg-teal-500/10', shadow: 'shadow-teal-500/20' },
      { border: 'border-cyan-500', text: 'text-cyan-500', bg: 'bg-cyan-500/10', shadow: 'shadow-cyan-500/20' },
      { border: 'border-sky-500', text: 'text-sky-500', bg: 'bg-sky-500/10', shadow: 'shadow-sky-500/20' },
      { border: 'border-blue-500', text: 'text-blue-500', bg: 'bg-blue-500/10', shadow: 'shadow-blue-500/20' },
      { border: 'border-indigo-500', text: 'text-indigo-500', bg: 'bg-indigo-500/10', shadow: 'shadow-indigo-500/20' },
      { border: 'border-violet-500', text: 'text-violet-500', bg: 'bg-violet-500/10', shadow: 'shadow-violet-500/20' },
      { border: 'border-purple-500', text: 'text-purple-500', bg: 'bg-purple-500/10', shadow: 'shadow-purple-500/20' },
      { border: 'border-fuchsia-500', text: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', shadow: 'shadow-fuchsia-500/20' },
      { border: 'border-pink-500', text: 'text-pink-500', bg: 'bg-pink-500/10', shadow: 'shadow-pink-500/20' },
      { border: 'border-rose-500', text: 'text-rose-500', bg: 'bg-rose-500/10', shadow: 'shadow-rose-500/20' },
  ];

  // Helper to check if entity is in a live call
  const getCallStatus = (id: string) => {
      return liveCalls.find(c => c.restaurantId === id || c.kioskId === id);
  };

  const getCallColorStyle = (callId: string) => {
      if (!callId) return CALL_COLORS[0];
      const strId = String(callId);
      let hash = 0;
      for (let i = 0; i < strId.length; i++) {
          hash = strId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % CALL_COLORS.length;
      return CALL_COLORS[index] || CALL_COLORS[0];
  };

  const displayStats = stats || {
    totalRestaurants: 0,
    totalScreens: 0,
    activeCalls: 0,
    systemStatus: 'Loading...'
  };

  // Sort entities: Active calls first, then Online status
  const sortedRestaurants = [...restaurants].sort((a, b) => {
      // 1. Priority: Active Call
      const aActive = !!getCallStatus(a.id);
      const bActive = !!getCallStatus(b.id);
      if (aActive !== bActive) return aActive ? -1 : 1;

      // 2. Priority: Online Status
      const aOnline = !!entityStatuses.restaurants[a.id];
      const bOnline = !!entityStatuses.restaurants[b.id];
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      
      return 0;
  });

  const sortedScreens = [...screens].sort((a, b) => {
      // 1. Priority: Active Call
      const aActive = !!getCallStatus(a.id);
      const bActive = !!getCallStatus(b.id);
      if (aActive !== bActive) return aActive ? -1 : 1;

      // 2. Priority: Online Status
      const aOnline = !!entityStatuses.screens[a.id];
      const bOnline = !!entityStatuses.screens[b.id];
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      
      return 0;
  });

    return (
        <AdminLayout>
            <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-gray-900 dark:text-foreground bg-gradient-to-r from-gray-900 to-gray-500 dark:from-foreground dark:to-muted-foreground bg-clip-text text-transparent">
                        Welcome back, {user?.name}
                    </h1>
                    <p className="text-muted-foreground mt-4 text-lg font-medium">Here's what's happening with your kiosk network today.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* ... stats cards ... */}
                </div>

                {/* ADDDED: Live Network Monitor & Remote Controls */}
                {/* ADDDED: Live Network Monitor & Remote Controls */}
                <div className="flex flex-col gap-8">
                    <Card className="w-full p-8 rounded-[2.5rem] bg-card border-border shadow-xl shadow-black/5">
                        <CardHeader className="px-0 pt-0 pb-6 flex flex-row items-center justify-between">
                            <CardTitle className="text-2xl font-black text-foreground flex items-center gap-3">
                                <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                                Live Network Monitor
                            </CardTitle>
                            <span className="flex items-center gap-2 text-xs font-bold text-blue-500 bg-blue-500/10 px-4 py-2 rounded-full uppercase tracking-wider">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                {liveCalls.length > 0 ? `${liveCalls.length} Active Call${liveCalls.length > 1 ? 's' : ''}` : 'Live Sync Active'}
                            </span>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                            <div className="flex flex-col gap-8">
                                {/* Restaurants Row */}
                                <div>
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Monitor className="h-4 w-4" />
                                        Ordered Restaurants
                                    </h4>
                                    <div className="flex flex-wrap gap-4">
                                        {sortedRestaurants.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic col-span-full">No restaurants found</p>
                                        ) : sortedRestaurants.map(r => {
                                            const activeCall = getCallStatus(r.id);
                                            const callColor = activeCall ? getCallColorStyle(activeCall.callId) : null;
                                            
                                            return (
                                            <div key={r.id} className={`snap-start flex-none w-[200px] p-3 rounded-xl bg-secondary border transition-all duration-500 ${activeCall && callColor ? `${callColor.border} shadow-[0_0_20px_rgba(0,0,0,0.2)] ${callColor.bg} translate-y-[-2px]` : 'border-transparent hover:border-border/50 hover:bg-secondary/80'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`h-2.5 w-2.5 rounded-full ring-2 ring-background ${entityStatuses.restaurants[r.id] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                    <Monitor className={`h-5 w-5 ${activeCall && callColor ? callColor.text : 'text-foreground/20'}`} />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sm text-foreground block truncate" title={r.nameEn}>{r.nameEn}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Restaurant PC</span>
                                                        {activeCall && callColor && <span className={`text-[9px] font-bold ${callColor.text} uppercase tracking-wider animate-pulse ${callColor.bg} px-1.5 py-0.5 rounded-full`}>In Call</span>}
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    disabled={!!activeCall}
                                                    onClick={() => triggerRefresh('restaurant', r.id)}
                                                    className="mt-3 w-full h-7 rounded-lg bg-background/50 hover:bg-background text-[10px] font-semibold hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <RefreshCw className="h-2.5 w-2.5 mr-1.5" />
                                                    Restart
                                                </Button>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Kiosk Screens Row */}
                                <div>
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Smartphone className="h-4 w-4" />
                                        Kiosk Screens
                                    </h4>
                                    <div className="flex flex-wrap gap-4">
                                        {sortedScreens.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic">No screens found</p>
                                        ) : sortedScreens.map(s => {
                                            const activeCall = getCallStatus(s.id);
                                            const callColor = activeCall ? getCallColorStyle(activeCall.callId) : null;

                                            return (
                                            <div key={s.id} className={`snap-start flex-none w-[160px] p-3 rounded-xl bg-secondary border transition-all duration-500 ${activeCall && callColor ? `${callColor.border} shadow-[0_0_20px_rgba(0,0,0,0.2)] ${callColor.bg} translate-y-[-2px]` : 'border-transparent hover:border-border/50 hover:bg-secondary/80'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`h-2.5 w-2.5 rounded-full ring-2 ring-background ${entityStatuses.screens[s.id] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                    {/* Kiosk/Smartphone Icon */}
                                                    <div className={`p-1.5 rounded-md ${activeCall && callColor ? `${callColor.bg} ${callColor.text}` : 'bg-background/50 text-foreground/40'}`}>
                                                        <Smartphone className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sm text-foreground block truncate" title={s.name}>{s.name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Kiosk</span>
                                                        {activeCall && callColor && <span className={`text-[9px] font-bold ${callColor.text} uppercase tracking-wider animate-pulse`}>In Call</span>}
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    disabled={!!activeCall}
                                                    onClick={() => triggerRefresh('screen', s.id)}
                                                    className="mt-3 w-full h-7 rounded-lg bg-background/50 hover:bg-background text-[10px] font-semibold hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <RefreshCw className="h-2.5 w-2.5 mr-1.5" />
                                                    Reboot
                                                </Button>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="p-8 rounded-[2.5rem] bg-gray-900 border-none shadow-2xl shadow-blue-900/20 text-white">
                        <CardHeader className="px-0 pt-0 pb-8">
                            <CardTitle className="text-2xl font-black flex items-center gap-3 text-white">
                                <ShieldCheck className="h-6 w-6 text-blue-400" />
                                Remote Controls
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 space-y-6">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">Global Sync</h4>
                                <p className="text-sm text-gray-400 mb-6">Force all connected clients to reload their applications immediately.</p>
                                <Button 
                                    onClick={() => triggerRefresh('all')}
                                    className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 font-bold text-lg gap-3"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                    Refresh All Clients
                                </Button>
                            </div>
                            
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 opacity-50">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Maintenance Mode</h4>
                                <Button disabled variant="outline" className="w-full h-14 rounded-2xl border-white/20 text-white hover:bg-white/10 font-bold">
                                    Broadcast Message
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
};

export default SuperAdminDashboard;
