import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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

  const handleFillCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
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
            <div className="text-sm text-center text-muted-foreground mt-4">
              <p>Demo Credentials (Click to fill):</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li 
                  className="cursor-pointer hover:text-primary transition-colors py-1" 
                  onClick={() => handleFillCredentials('admin@example.com', 'admin123')}
                >
                  Admin: <strong>admin@example.com / admin123</strong>
                </li>
                <li 
                  className="cursor-pointer hover:text-primary transition-colors py-1" 
                  onClick={() => handleFillCredentials('burger@king.com', 'burger123')}
                >
                  Restaurant: <strong>burger@king.com / burger123</strong>
                </li>
                <li 
                  className="cursor-pointer hover:text-primary transition-colors py-1" 
                  onClick={() => handleFillCredentials('kiosk1@mall.com', 'kiosk123')}
                >
                  Kiosk: <strong>kiosk1@mall.com / kiosk123</strong>
                </li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
