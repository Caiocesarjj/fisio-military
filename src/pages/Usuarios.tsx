import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Trash2, Link, Shield, User, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  militar_nip: string | null;
  militar_nome_guerra: string | null;
}

interface Militar {
  id: string;
  nip: string;
  nome_guerra: string;
}

export default function Usuarios() {
  const { session } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [linkNip, setLinkNip] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'military' as string, nip: '' });

  const callEdge = async (body: any) => {
    const { data, error } = await supabase.functions.invoke('manage-users', { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const data = await callEdge({ action: 'list' });
      setUsers(data.users || []);
    } catch (e: any) {
      toast.error('Erro ao carregar usuários: ' + e.message);
    }
    setFetching(false);
  };

  const fetchMilitares = async () => {
    const { data } = await supabase.from('militares').select('id, nip, nome_guerra').order('nome_guerra');
    setMilitares(data || []);
  };

  useEffect(() => {
    fetchUsers();
    fetchMilitares();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await callEdge({
        action: 'create',
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        nip: form.role === 'military' ? form.nip : null,
      });
      toast.success('Usuário criado com sucesso!');
      setDialogOpen(false);
      setForm({ email: '', password: '', full_name: '', role: 'military', nip: '' });
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await callEdge({ action: 'delete', user_id: selectedUser.id });
      toast.success('Usuário removido.');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleLink = async () => {
    if (!selectedUser || !linkNip) return;
    setLoading(true);
    try {
      await callEdge({ action: 'link_nip', user_id: selectedUser.id, nip: linkNip });
      toast.success('Militar vinculado com sucesso!');
      setLinkDialogOpen(false);
      setSelectedUser(null);
      setLinkNip('');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await callEdge({ action: 'update_role', user_id: userId, role: newRole });
      toast.success('Role atualizado!');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q) || (u.militar_nip || '').includes(q);
  });

  const roleBadge = (role: string) => {
    if (role === 'admin') return <Badge className="bg-primary text-primary-foreground"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
    if (role === 'military') return <Badge variant="secondary"><User className="w-3 h-3 mr-1" />Militar</Badge>;
    return <Badge variant="outline">Sem role</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm">{users.length} usuários cadastrados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por email, nome ou NIP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {fetching ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{u.full_name || u.email}</span>
                    {roleBadge(u.role)}
                  </div>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  {u.militar_nip && (
                    <p className="text-xs text-muted-foreground">
                      Vinculado: <span className="font-medium">{u.militar_nome_guerra}</span> (NIP: {u.militar_nip})
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={u.role} onValueChange={(val) => handleRoleChange(u.id, val)}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="military">Militar</SelectItem>
                    </SelectContent>
                  </Select>
                  {u.role === 'military' && (
                    <Button size="sm" variant="outline" onClick={() => { setSelectedUser(u); setLinkNip(u.militar_nip || ''); setLinkDialogOpen(true); }}>
                      <Link className="w-3 h-3 mr-1" /> Vincular NIP
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => { setSelectedUser(u); setDeleteDialogOpen(true); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>
          )}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de usuário</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (Fisioterapeuta)</SelectItem>
                  <SelectItem value="military">Militar (Paciente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'military' && (
              <div>
                <Label>Vincular ao NIP</Label>
                <Select value={form.nip} onValueChange={(val) => setForm({ ...form, nip: val })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o militar..." /></SelectTrigger>
                  <SelectContent>
                    {militares.map((m) => (
                      <SelectItem key={m.id} value={m.nip}>{m.nome_guerra} — NIP: {m.nip}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">O militar terá acesso ao seu plano de tratamento.</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link NIP Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Militar ao Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vincular <strong>{selectedUser?.full_name || selectedUser?.email}</strong> a um militar pelo NIP:
            </p>
            <Select value={linkNip} onValueChange={setLinkNip}>
              <SelectTrigger><SelectValue placeholder="Selecione o militar..." /></SelectTrigger>
              <SelectContent>
                {militares.map((m) => (
                  <SelectItem key={m.id} value={m.nip}>{m.nome_guerra} — NIP: {m.nip}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleLink} disabled={loading || !linkNip} className="w-full">
              {loading ? 'Vinculando...' : 'Vincular'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá permanentemente o acesso de <strong>{selectedUser?.full_name || selectedUser?.email}</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
