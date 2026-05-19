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
import { Plus, Search, Edit, UserX, X, Eye, FileText, ImageIcon, Download, Trash2, Maximize2 } from 'lucide-react';
import TCLEModal from '@/components/TCLEModal';
import { toast } from 'sonner';
import { IMaskInput } from 'react-imask';
import { POSTOS_GRADUACOES, COMPANHIAS } from '@/lib/constants';
import { LesaoSelector, LesaoBadges, type Lesao } from '@/components/LesaoSelector';
import { LesoesHistorico } from '@/components/LesoesHistorico';
import { FraturaSelector, FraturaBadges } from '@/components/FraturaSelector';
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
  fraturas: string[] | null;
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
  
  const [lesoes, setLesoes] = useState<Lesao[]>([]);
  const [fraturas, setFraturas] = useState<string[]>([]);
  const [tcleMilitar, setTcleMilitar] = useState<Militar | null>(null);
  const [anexosMilitar, setAnexosMilitar] = useState<Militar | null>(null);
  const [anexosList, setAnexosList] = useState<any[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);
  const [previewAnexo, setPreviewAnexo] = useState<{ url: string; nome: string; mime: string } | null>(null);

  const openPreview = async (anexo: any) => {
    const { data, error } = await supabase.storage
      .from('prontuario-anexos')
      .createSignedUrl(anexo.file_path, 300);
    if (error || !data) {
      toast.error('Erro ao gerar visualização.');
      return;
    }
    setPreviewAnexo({ url: data.signedUrl, nome: anexo.nome_arquivo, mime: anexo.mime_type || '' });
  };

  const openAnexos = async (m: Militar) => {
    setAnexosMilitar(m);
    setLoadingAnexos(true);
    setAnexosList([]);
    const { data } = await supabase
      .from('prontuario_anexos')
      .select('*')
      .eq('militar_id', m.id)
      .order('created_at', { ascending: false });
    setAnexosList(data || []);
    setLoadingAnexos(false);
  };

  const downloadAnexo = async (anexo: any) => {
    const { data, error } = await supabase.storage
      .from('prontuario-anexos')
      .createSignedUrl(anexo.file_path, 60);
    if (error || !data) {
      toast.error('Erro ao gerar link do arquivo.');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const deleteAnexo = async (anexo: any) => {
    if (!confirm('Excluir este anexo?')) return;
    await supabase.storage.from('prontuario-anexos').remove([anexo.file_path]);
    const { error } = await supabase.from('prontuario_anexos').delete().eq('id', anexo.id);
    if (error) {
      toast.error('Erro ao excluir.');
      return;
    }
    toast.success('Anexo excluído.');
    setAnexosList((prev) => prev.filter((a) => a.id !== anexo.id));
  };

  const fetchMilitares = async () => {
    setFetching(true);
    const { data } = await supabase.from('militares').select('*').order('nome_guerra');
    setMilitares((data || []).map((d: any) => ({ ...d, lesoes: Array.isArray(d.lesoes) ? d.lesoes : [], fraturas: Array.isArray(d.fraturas) ? d.fraturas : [] })));
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

  const callManageUsers = async (body: any) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || data?.error) throw new Error(data?.error || `Erro ${response.status}`);
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if ((form.companhia === 'CCS' || form.companhia === 'Cia Apoio') && !form.setor.trim()) {
        toast.error('O campo Setor é obrigatório para ' + form.companhia + '.');
        setLoading(false);
        return;
      }
      if (form.companhia === 'Externo' && !form.om.trim()) {
        toast.error('O campo OM é obrigatório para Externo.');
        setLoading(false);
        return;
      }
      if (editing) {
        let foto_url = editing.foto_url;
        if (photoFile) foto_url = await uploadPhoto(editing.id, photoFile);
        const { error } = await supabase.from('militares').update({
          ...form, setor: (form.companhia === 'CCS' || form.companhia === 'Cia Apoio') ? form.setor : null,
          om: form.companhia === 'Externo' ? form.om : null,
          foto_url, lesoes: lesoes as any, fraturas: fraturas as any,
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Militar atualizado com sucesso!');
      } else {
        // Insert militar record (no auth user created — access is managed in Usuários)
        const { data: insertData, error: insertError } = await supabase.from('militares').insert({
          ...form, email: form.email || null, setor: (form.companhia === 'CCS' || form.companhia === 'Cia Apoio') ? form.setor : null,
          om: form.companhia === 'Externo' ? form.om : null,
          profile_id: null, lesoes: lesoes as any, fraturas: fraturas as any,
        }).select().single();

        if (insertError) throw insertError;

        if (photoFile && insertData) {
          const foto_url = await uploadPhoto(insertData.id, photoFile);
          await supabase.from('militares').update({ foto_url }).eq('id', insertData.id);
        }
        toast.success('Militar cadastrado com sucesso!');
      }
      setDialogOpen(false); setEditing(null); setForm(emptyForm);
      setPhotoFile(null); setLesoes([]); setFraturas([]);
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
      om: m.om || '', telefone: m.telefone || '', email: m.email, diagnostico: m.diagnostico || '',
      observacoes: m.observacoes || '',
    });
    setLesoes(m.lesoes || []);
    setFraturas(m.fraturas || []);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null); setForm(emptyForm); setPhotoFile(null); setLesoes([]); setFraturas([]);
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
                    <FraturaBadges fraturas={m.fraturas || []} />
                  </div>
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/militares/${m.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setTcleMilitar(m)} title="Gerar TCLE">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openAnexos(m)} title="Ver laudos e imagens">
                      <ImageIcon className="h-4 w-4" />
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
              {(form.companhia === 'CCS' || form.companhia === 'Cia Apoio') && (
                <div className="space-y-2">
                  <Label>Setor *</Label>
                  <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} required />
                </div>
              )}
              {form.companhia === 'Externo' && (
                <div className="space-y-2">
                  <Label>OM (Organização Militar) *</Label>
                  <Input value={form.om} onChange={(e) => setForm({ ...form, om: e.target.value })} placeholder="Ex: CIAA, CIAW, HNMd..." required />
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
              <div className="space-y-2">
                <Label>Foto</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lesões (atuais)</Label>
              <LesaoSelector lesoes={lesoes} onChange={setLesoes} />
            </div>
            <FraturaSelector selected={fraturas} onChange={setFraturas} />
            {editing && (
              <div className="border-t pt-4">
                <LesoesHistorico militarId={editing.id} />
              </div>
            )}
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

      {tcleMilitar && (
        <TCLEModal open={!!tcleMilitar} onOpenChange={(o) => !o && setTcleMilitar(null)} militar={tcleMilitar} />
      )}

      <Dialog open={!!anexosMilitar} onOpenChange={(o) => { if (!o) { setAnexosMilitar(null); setAnexosList([]); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Laudos e Imagens — {anexosMilitar?.nome_guerra}</DialogTitle>
          </DialogHeader>
          {loadingAnexos ? (
            <p className="text-sm text-muted-foreground py-4">Carregando...</p>
          ) : anexosList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum anexo cadastrado para este militar.</p>
          ) : (
            <div className="space-y-2">
              {anexosList.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-md border bg-card">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.nome_arquivo}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <Badge variant="secondary" className="text-xs uppercase">{a.tipo}</Badge>
                      {a.descricao && <span className="text-xs text-muted-foreground truncate">{a.descricao}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openPreview(a)} title="Visualizar">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => downloadAnexo(a)} title="Baixar">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteAnexo(a)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewAnexo} onOpenChange={(o) => { if (!o) setPreviewAnexo(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewAnexo?.nome}</DialogTitle>
          </DialogHeader>
          {previewAnexo && (
            previewAnexo.mime.startsWith('image/') ? (
              <img src={previewAnexo.url} alt={previewAnexo.nome} className="w-full h-auto rounded-md" />
            ) : previewAnexo.mime === 'application/pdf' ? (
              <iframe src={previewAnexo.url} title={previewAnexo.nome} className="w-full h-[75vh] rounded-md border" />
            ) : (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">Pré-visualização indisponível para este tipo de arquivo.</p>
                <Button onClick={() => window.open(previewAnexo.url, '_blank')}>Abrir em nova aba</Button>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
