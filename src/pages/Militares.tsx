import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, UserX, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { IMaskInput } from 'react-imask';
import { POSTOS_GRADUACOES, COMPANHIAS } from '@/lib/constants';
import { LesaoSelector, LesaoBadges, type Lesao } from '@/components/LesaoSelector';
import { MilitarListSkeleton } from '@/components/Skeletons';

interface Militar {
  id: string;
  nip: string;
  nome_completo: string;
  nome_guerra: string;
  posto_graduacao: string;
  companhia: string;
  setor: string | null;
  om: string | null;
  telefone: string;
  email: string;
  foto_url: string | null;
  diagnostico: string | null;
  observacoes: string | null;
  lesoes: Lesao[] | null;
  ativo: boolean;
  status_militar: string;
}

const emptyForm = {
  nip: '', nome_completo: '', nome_guerra: '', posto_graduacao: '',
  companhia: '', setor: '', om: '', telefone: '', email: '', diagnostico: '', observacoes: '',
};

export default function Militares() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [search, setSearch] = useState('');
  const [filterCia, setFilterCia] = useState('');
  const [filterPosto, setFilterPosto] = useState('');
  const [filterStatus, setFilterStatus] = useState('ativo');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Militar | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [senha, setSenha] = useState('');
  const [lesoes, setLesoes] = useState<Lesao[]>([]);

  const fetchMilitares = async () => {
    setFetching(true);
    const { data } = await supabase.from('militares').select('*').order('nome_guerra');
    setMilitares((data || []).map((d: any) => ({ ...d, lesoes: Array.isArray(d.lesoes) ? d.lesoes : [] })));
    setFetching(false);
  };

  useEffect(() => { fetchMilitares(); }, []);

  const allPostos = [...POSTOS_GRADUACOES.oficiais, ...POSTOS_GRADUACOES.pracas];

  const filtered = militares.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.nip.includes(q) || m.nome_completo.toLowerCase().includes(q) || m.nome_guerra.toLowerCase().includes(q);
    const matchCia = !filterCia || m.companhia === filterCia;
    const matchPosto = !filterPosto || (filterPosto === 'oficiais'
      ? POSTOS_GRADUACOES.oficiais.includes(m.posto_graduacao)
      : POSTOS_GRADUACOES.pracas.includes(m.posto_graduacao));
    const matchStatus = !filterStatus || m.status_militar === filterStatus;
    return matchSearch && matchCia && matchPosto && matchStatus;
  });

  const hasFilters = search || filterCia || filterPosto || filterStatus !== 'ativo';
  const clearFilters = () => { setSearch(''); setFilterCia(''); setFilterPosto(''); setFilterStatus('ativo'); };

  const uploadPhoto = async (militarId: string, file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${militarId}.${ext}`;
    const { error } = await supabase.storage.from('military-photos').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('military-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (form.companhia === 'CCS' && !form.setor.trim()) {
        toast.error('O campo Setor é obrigatório para CCS.');
        setLoading(false);
        return;
      }
      if (editing) {
        let foto_url = editing.foto_url;
        if (photoFile) foto_url = await uploadPhoto(editing.id, photoFile);
        const { error } = await supabase.from('militares').update({
          ...form, setor: form.companhia === 'CCS' ? form.setor : null, foto_url, lesoes: lesoes as any,
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Militar atualizado com sucesso!');
      } else {
        if (!senha) { toast.error('Defina uma senha para o militar.'); setLoading(false); return; }
        if (form.email) {
          await supabase.auth.signUp({
            email: form.email, password: senha,
            options: { data: { full_name: form.nome_completo } },
          });
        }
        const { data: insertData, error: insertError } = await supabase.from('militares').insert({
          ...form, email: form.email || null, setor: form.companhia === 'CCS' ? form.setor : null, profile_id: null, lesoes: lesoes as any,
        }).select().single();
        if (insertError) throw insertError;
        if (photoFile && insertData) {
          const foto_url = await uploadPhoto(insertData.id, photoFile);
          await supabase.from('militares').update({ foto_url }).eq('id', insertData.id);
        }
        toast.success('Militar cadastrado com sucesso!');
      }
      setDialogOpen(false); setEditing(null); setForm(emptyForm);
      setPhotoFile(null); setSenha(''); setLesoes([]);
      fetchMilitares();
    } catch (error: any) { toast.error(error.message || 'Erro ao salvar militar.'); }
    setLoading(false);
  };

  const toggleAtivo = async (m: Militar) => {
    const newStatus = m.status_militar === 'ativo' ? 'inativo' : 'ativo';
    await supabase.from('militares').update({ status_militar: newStatus, ativo: newStatus === 'ativo' }).eq('id', m.id);
    toast.success(newStatus === 'ativo' ? 'Militar reativado.' : 'Militar desativado.');
    fetchMilitares();
  };

  const openEdit = (m: Militar) => {
    setEditing(m);
    setForm({
      nip: m.nip, nome_completo: m.nome_completo, nome_guerra: m.nome_guerra,
      posto_graduacao: m.posto_graduacao, companhia: m.companhia, setor: m.setor || '',
      telefone: m.telefone || '', email: m.email, diagnostico: m.diagnostico || '',
      observacoes: m.observacoes || '',
    });
    setLesoes(m.lesoes || []);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null); setForm(emptyForm); setPhotoFile(null); setSenha(''); setLesoes([]);
    setDialogOpen(true);
  };

  const statusColor = (s: string) =>
    s === 'ativo' ? 'bg-emerald-100 text-emerald-700' :
    s === 'alta' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Militares</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Cadastrar Militar</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar NIP ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filterCia} onChange={(e) => setFilterCia(e.target.value)}>
          <option value="">Todas Cias</option>
          {COMPANHIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filterPosto} onChange={(e) => setFilterPosto(e.target.value)}>
          <option value="">Todos Postos</option>
          <option value="oficiais">Oficiais</option>
          <option value="pracas">Praças</option>
        </select>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="alta">Com Alta</option>
          <option value="inativo">Inativos</option>
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Limpar</Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} militar{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>

      {fetching ? (
        <MilitarListSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Card key={m.id} className={`transition-all cursor-pointer hover:shadow-md ${m.status_militar !== 'ativo' ? 'opacity-70' : ''}`}
              onClick={() => navigate(`/militares/${m.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={m.foto_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {m.nome_guerra.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{m.nome_guerra}</p>
                    <p className="text-sm text-muted-foreground">{m.posto_graduacao}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{m.companhia}</Badge>
                      <Badge className={`text-xs ${statusColor(m.status_militar)}`} variant="secondary">{m.status_militar}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{m.nip}</span>
                    </div>
                    <LesaoBadges lesoes={m.lesoes || []} />
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/militares/${m.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleAtivo(m)}>
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!fetching && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum militar encontrado.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Militar' : 'Cadastrar Militar'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NIP *</Label>
                <IMaskInput mask="00.0000.00" value={form.nip} unmask={false}
                  onAccept={(value: string) => setForm({ ...form, nip: value })}
                  placeholder="00.0000.00"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                  required />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Nome de Guerra *</Label>
                <Input value={form.nome_guerra} onChange={(e) => setForm({ ...form, nome_guerra: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Posto/Graduação *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.posto_graduacao} onChange={(e) => setForm({ ...form, posto_graduacao: e.target.value })} required>
                  <option value="">Selecione...</option>
                  <optgroup label="Oficiais">
                    {POSTOS_GRADUACOES.oficiais.map((p) => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="Praças">
                    {POSTOS_GRADUACOES.pracas.map((p) => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Companhia *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.companhia} onChange={(e) => setForm({ ...form, companhia: e.target.value })} required>
                  <option value="">Selecione...</option>
                  {COMPANHIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {form.companhia === 'CCS' && (
                <div className="space-y-2">
                  <Label>Setor *</Label>
                  <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} required />
                </div>
              )}
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder="Senha para acesso" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Foto</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lesões</Label>
              <LesaoSelector lesoes={lesoes} onChange={setLesoes} />
            </div>
            <div className="space-y-2">
              <Label>Diagnóstico Principal</Label>
              <Textarea value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações Clínicas</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
