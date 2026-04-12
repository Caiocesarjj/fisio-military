import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, User, UserCog, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { signIn } = useAuth();
  const [nip, setNip] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleNipLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Resolve NIP to email via edge function
      const { data, error: fnError } = await supabase.functions.invoke('login-nip', {
        body: { nip, password },
      });
      if (fnError) throw new Error('Erro ao buscar NIP');
      if (data?.error) throw new Error(data.error);

      const { error } = await signIn(data.email, password);
      if (error) throw new Error('Senha incorreta.');
    } catch (err: any) {
      toast.error(err.message || 'Credenciais inválidas.');
    }
    setLoading(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error('Credenciais inválidas. Verifique e-mail e senha.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-navy flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <img src="/logo-tonelero.jpg" alt="Fisioteria Tonelero" className="mx-auto w-20 h-20 rounded-full object-cover shadow-lg" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fisioteria Tonelero</h1>
            <p className="text-sm text-muted-foreground">Gestão de Fisioterapia</p>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nip" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nip" className="flex items-center gap-1">
                <User className="w-3 h-3" /> Militar (NIP)
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-1">
                <UserCog className="w-3 h-3" /> Admin (Email)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nip">
              <form onSubmit={handleNipLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nip">NIP</Label>
                  <Input
                    id="nip"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Digite seu NIP com ou sem pontos"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nip-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="nip-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="email-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
