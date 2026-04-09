import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, Play } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|.*&v=))([^?&]+)/);
  return match ? match[1] : null;
}
import { toast } from 'sonner';
import { CATEGORIAS_EXERCICIO, DIFICULDADES } from '@/lib/constants';

interface Exercise {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  dificuldade: string;
  instrucoes: string;
  video_url: string;
  imagem_url: string;
}

const emptyForm = { nome: '', descricao: '', categoria: '', dificuldade: 'Moderado', instrucoes: '', video_url: '', imagem_url: '' };

export default function Exercicios() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const fetchExercises = async () => {
    const { data } = await supabase.from('exercises').select('*').order('nome');
    setExercises(data || []);
  };

  useEffect(() => { fetchExercises(); }, []);

  const filtered = exercises.filter((e) => {
    const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || e.categoria === catFilter;
    return matchSearch && matchCat;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        const { error } = await supabase.from('exercises').update(form).eq('id', editing.id);
        if (error) throw error;
        toast.success('Exercício atualizado!');
      } else {
        const { error } = await supabase.from('exercises').insert(form);
        if (error) throw error;
        toast.success('Exercício cadastrado!');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchExercises();
    } catch (error: any) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este exercício?')) return;
    await supabase.from('exercises').delete().eq('id', id);
    toast.success('Exercício excluído.');
    fetchExercises();
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setForm({ nome: ex.nome, descricao: ex.descricao || '', categoria: ex.categoria, dificuldade: ex.dificuldade, instrucoes: ex.instrucoes || '', video_url: ex.video_url || '', imagem_url: ex.imagem_url || '' });
    setDialogOpen(true);
  };

  const diffColor: Record<string, string> = {
    'Fácil': 'bg-success/10 text-success',
    'Moderado': 'bg-warning/10 text-warning',
    'Difícil': 'bg-destructive/10 text-destructive',
    'Avançado': 'bg-primary/10 text-primary',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Biblioteca de Exercícios</h1>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Exercício
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar exercício..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="">Todas categorias</option>
          {CATEGORIAS_EXERCICIO.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ex) => (
          <Card key={ex.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{ex.nome}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{ex.categoria}</Badge>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${diffColor[ex.dificuldade] || ''}`}>{ex.dificuldade}</span>
                  </div>
                  {ex.descricao && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ex.descricao}</p>}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(ex)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ex.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum exercício encontrado.</p>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Exercício' : 'Novo Exercício'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required>
                  <option value="">Selecione...</option>
                  {CATEGORIAS_EXERCICIO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.dificuldade} onChange={(e) => setForm({ ...form, dificuldade: e.target.value })}>
                  {DIFICULDADES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="space-y-2"><Label>Instruções</Label><Textarea value={form.instrucoes} onChange={(e) => setForm({ ...form, instrucoes: e.target.value })} /></div>
            <div className="space-y-2"><Label>URL do Vídeo</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
            <div className="space-y-2"><Label>URL da Imagem</Label><Input value={form.imagem_url} onChange={(e) => setForm({ ...form, imagem_url: e.target.value })} /></div>
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
