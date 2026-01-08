
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Screen } from "@/data/mockData";
import { getAccessibleImageUrl } from "@/utils/imageUtils";

const ScreenView = () => {
  const { logout } = useAuth();
  const { screens, restaurants } = useAdmin();
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(localStorage.getItem('kiosk_screen_id'));

  const handleScreenSelect = (id: string) => {
    setSelectedScreenId(id);
    localStorage.setItem('kiosk_screen_id', id);
  };

  const handleReset = () => {
    setSelectedScreenId(null);
    localStorage.removeItem('kiosk_screen_id');
  };

  if (!selectedScreenId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Select Kiosk Screen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">Choose which screen configuration to display on this device.</p>
            <Select onValueChange={handleScreenSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a screen..." />
              </SelectTrigger>
              <SelectContent>
                {screens.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.assignedRestaurants.length} restaurants)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full" onClick={logout}>Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const screen = screens.find(s => s.id === selectedScreenId);

  if (!screen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">Screen configuration not found.</p>
        <Button onClick={handleReset}>Reset Selection</Button>
      </div>
    );
  }

  // Calculate grid styles with fallbacks
  const gridConfig = screen.gridConfig || { rows: 2, columns: 2 };
  const showLanguage = screen.showLanguage || 'both';

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridConfig.columns}, 1fr)`,
    gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
    height: '100vh',
    width: '100vw',
    gap: '0', 
  };

  return (
    <div className="relative bg-black text-white h-screen w-screen overflow-hidden">
      {/* Hidden Controls */}
      <div className="absolute top-0 right-0 p-4 z-50">
        <div className="flex gap-2">
          <Button onClick={handleReset} variant="secondary" size="sm">Change Screen</Button>
          <Button onClick={logout} variant="destructive" size="sm">Logout</Button>
        </div>
      </div>

      <div style={gridStyle}>
        {screen.assignedRestaurants.map((restId) => {
          const restaurant = restaurants.find(r => r.id === restId);
          if (!restaurant) return null;

          const logoSrc = getAccessibleImageUrl(restaurant.logoUrl || (typeof restaurant.logo === 'string' ? restaurant.logo : null));

          return (
            <div key={restId} className="border border-gray-800 p-6 flex flex-col relative">
              {/* Restaurant Header */}
              <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
                <div className="flex items-center gap-3">
                  <img src={logoSrc} alt="" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    {(showLanguage === 'en' || showLanguage === 'both') && (
                      <h2 className="text-xl font-bold">{restaurant.nameEn}</h2>
                    )}
                    {(showLanguage === 'ar' || showLanguage === 'both') && (
                      <h2 className="text-xl font-bold font-arabic text-right">{restaurant.nameAr}</h2>
                    )}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${restaurant.status === 'available' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {restaurant.status}
                </div>
              </div>

              {/* Placeholder for Orders */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded p-4">
                  <h3 className="text-green-400 font-bold mb-2 uppercase text-sm">Ready</h3>
                  <div className="text-2xl font-mono animate-pulse">
                    101
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded p-4">
                  <h3 className="text-yellow-400 font-bold mb-2 uppercase text-sm">Preparing</h3>
                  <div className="text-2xl font-mono">
                    105
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScreenView;
