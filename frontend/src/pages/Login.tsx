import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { config } from '@/config';

const DEBUG_CREDENTIALS = [
  // Screens
  { label: 'Screen 1', email: 'line1@waterway.com', password: '12345678', type: 'Screen' },
  { label: 'Screen 2', email: 'line2@waterway.com', password: '12345678', type: 'Screen' },
  { label: 'Screen 3', email: 'line3@waterway.com', password: '12345678', type: 'Screen' },
  { label: 'Screen 4', email: 'line4@waterway.com', password: '12345678', type: 'Screen' },
  { label: 'Screen 5', email: 'line5@waterway.com', password: '12345678', type: 'Screen' },
  { label: 'Screen 6', email: 'line6@waterway.com', password: '12345678', type: 'Screen' },
  // Restaurants
  { label: 'DAILY DOSE', email: 'DAILYDOSE@RSWaterway.com', password: 'u94x3n07', type: 'Restaurant' },
  { label: 'DARS', email: 'DARS@RSWaterway.com', password: 'wg3or7ne', type: 'Restaurant' },
  { label: 'HOWLIN BIRDS', email: 'HOWLINBIRDS@RSWaterway.com', password: '4iua4ubh', type: 'Restaurant' },
  { label: 'JAIL BIRD', email: 'JAILBIRD@RSWaterway.com', password: 'owzmdrp2', type: 'Restaurant' },
  { label: 'LYCHTEE', email: 'LYCHTEE@RSWaterway.com', password: 'h1avbdw8', type: 'Restaurant' },
  { label: 'MAINE', email: 'MAINE@RSWaterway.com', password: 'gsuiypk9', type: 'Restaurant' },
  { label: 'MEAT BARTY', email: 'MEATBARTY@RSWaterway.com', password: 'h5qwpngl', type: 'Restaurant' },
  { label: 'NUDE BAKERY', email: 'NUDEBAKERY@RSWaterway.com', password: 'qh55mpqm', type: 'Restaurant' },
  { label: 'PAO', email: 'PAO@RSWaterway.com', password: 'qnb7z9ks', type: 'Restaurant' },
  { label: 'SAINTS', email: 'SAINTS@RSWaterway.com', password: 'uppdvje3', type: 'Restaurant' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      
      // Toast suppressed for Kiosk (Screen) users per request
      if (user.role !== 'SCREEN') {
        toast({
          title: "Login Successful",
          description: `Welcome back!`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-login logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const passwordParam = params.get('password');
    const autoLoginParam = params.get('autologin');

    if (emailParam) setEmail(emailParam);
    if (passwordParam) setPassword(passwordParam);

    if (autoLoginParam === 'true' && emailParam && passwordParam && !loading) {
       // Only attempt login if not already loading and params exist
       const autoLogin = async () => {
         setLoading(true);
          try {
            await login(emailParam, passwordParam);
            // Success toast handled by login function or suppressed
          } catch (error) {
             console.error("Auto-login failed:", error);
             toast({
              variant: "destructive",
              title: "Auto-Login Failed",
              description: "Check your credentials link.",
            });
          } finally {
            setLoading(false);
          }
       };
       autoLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  const handleDebugFill = (value: string) => {
    const credential = DEBUG_CREDENTIALS.find(c => c.label === value);
    if (credential) {
      setEmail(credential.email);
      setPassword(credential.password);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Enter your email and password to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            
            {/* Debug Checkin - Controlled by config */}
            {config.enableLoginDebug && (
             <div className="pt-4 border-t">
               <Label className="text-xs text-muted-foreground mb-2 block">Debug Checkin</Label>
               <Select onValueChange={handleDebugFill}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select Debug Credential" />
                 </SelectTrigger>
                 <SelectContent>
                   <div className="max-h-[200px] overflow-y-auto">
                     <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Screens</div>
                     {DEBUG_CREDENTIALS.filter(c => c.type === 'Screen').map((cred) => (
                       <SelectItem key={cred.label} value={cred.label}>
                         {cred.label}
                       </SelectItem>
                     ))}
                     <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-t mt-1 pt-2">Restaurants</div>
                      {DEBUG_CREDENTIALS.filter(c => c.type === 'Restaurant').map((cred) => (
                       <SelectItem key={cred.label} value={cred.label}>
                         {cred.label}
                       </SelectItem>
                     ))}
                   </div>
                 </SelectContent>
               </Select>
             </div>
            )}

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
