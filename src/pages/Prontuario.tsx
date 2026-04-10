import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, FileText, CalendarDays, User, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Militar {
  id: string;
  nome_completo: string;
  nome_guerra: string;
  nip: string;
  posto_graduacao: string;
  companhia: string;
  setor: string | null;
  telefone: string | null;
  email: string | null;
}

interface Prontuario {
  id: string;
  militar_id: string;
  fisio_id: string;
  queixa_principal: string | null;
  historia_doenca_atual: string | null;
  doencas_associadas: string | null;
  historico_cirurgias: string | null;
  uso_medicamentos: string | null;
  habitos_vida: string | null;
  inspecao: string | null;
  palpacao: string | null;
  amplitude_movimento: string | null;
  forca_muscular: string | null;
  testes_funcionais: string | null;
  escalas: string | null;
  diagnostico_fisio: string | null;
  prognostico: string | null;
  objetivos: string | null;
  tecnicas_recursos: string | null;
  frequencia_tratamento: string | null;
  created_at: string;
  updated_at: string;
}

interface Evolucao {
  id: string;
  prontuario_id: string;
  militar_id: string;
  data: string;
  procedimentos_realizados: string | null;
  resposta_paciente: string | null;
  observacoes: string | null;
  created_at: string;
}

const emptyProntuario = {
  queixa_principal: '',
  historia_doenca_atual: '',
  doencas_associadas: '',
  historico_cirurgias: '',
  uso_medicamentos: '',
  habitos_vida: '',
  inspecao: '',
  palpacao: '',
  amplitude_movimento: '',
  forca_muscular: '',
  testes_funcionais: '',
  escalas: '',
  diagnostico_fisio: '',
  prognostico: '',
  objetivos: '',
  tecnicas_recursos: '',
  frequencia_tratamento: '',
};

const emptyEvolucao = {
  data: new Date().toISOString().split('T')[0],
  procedimentos_realizados: '',
  resposta_paciente: '',
  observacoes: '',
};

export default function Prontuario() {
  const { user } = useAuth();
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [selectedMilitar, setSelectedMilitar] = useState<Militar | null>(null);
  const [selectedProntuario, setSelectedProntuario] = useState<Prontuario | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [evolucaoDialogOpen, setEvolucaoDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyProntuario);
  const [evolucaoForm, setEvolucaoForm] = useState(emptyEvolucao);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchMilitares();
    fetchProntuarios();
  }, []);

  const fetchMilitares = async () => {
    const { data } = await supabase
      .from('militares')
      .select('id, nome_completo, nome_guerra, nip, posto_graduacao, companhia, setor, telefone, email')
      .eq('status_militar', 'ativo')
      .order('nome_guerra');
    setMilitares(data || []);
  };

  const fetchProntuarios = async () => {
    const { data } = await supabase
      .from('prontuarios')
      .select('*')
      .order('created_at', { ascending: false });
    setProntuarios((data as any[]) || []);
  };

  const fetchEvolucoes = async (prontuarioId: string) => {
    const { data } = await supabase
      .from('prontuario_evolucoes')
      .select('*')
      .eq('prontuario_id', prontuarioId)
      .order('data', { ascending: false });
    setEvolucoes((data as any[]) || []);
  };

  const openNewProntuario = (militar: Militar) => {
    setSelectedMilitar(militar);
    setForm(emptyProntuario);
    setEditing(false);
    setDialogOpen(true);
  };

  const openExistingProntuario = async (prontuario: Prontuario) => {
    const mil = militares.find(m => m.id === prontuario.militar_id);
    setSelectedMilitar(mil || null);
    setSelectedProntuario(prontuario);
    setForm({
      queixa_principal: prontuario.queixa_principal || '',
      historia_doenca_atual: prontuario.historia_doenca_atual || '',
      doencas_associadas: prontuario.doencas_associadas || '',
      historico_cirurgias: prontuario.historico_cirurgias || '',
      uso_medicamentos: prontuario.uso_medicamentos || '',
      habitos_vida: prontuario.habitos_vida || '',
      inspecao: prontuario.inspecao || '',
      palpacao: prontuario.palpacao || '',
      amplitude_movimento: prontuario.amplitude_movimento || '',
      forca_muscular: prontuario.forca_muscular || '',
      testes_funcionais: prontuario.testes_funcionais || '',
      escalas: prontuario.escalas || '',
      diagnostico_fisio: prontuario.diagnostico_fisio || '',
      prognostico: prontuario.prognostico || '',
      objetivos: prontuario.objetivos || '',
      tecnicas_recursos: prontuario.tecnicas_recursos || '',
      frequencia_tratamento: prontuario.frequencia_tratamento || '',
    });
    setEditing(true);
    setDialogOpen(true);
    await fetchEvolucoes(prontuario.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilitar || !user) return;
    setLoading(true);
    try {
      if (editing && selectedProntuario) {
        const { error } = await supabase
          .from('prontuarios')
          .update(form as any)
          .eq('id', selectedProntuario.id);
        if (error) throw error;
        toast.success('Prontuário atualizado!');
      } else {
        const { error } = await supabase
          .from('prontuarios')
          .insert({ ...form, militar_id: selectedMilitar.id, fisio_id: user.id } as any);
        if (error) throw error;
        toast.success('Prontuário criado!');
      }
      setDialogOpen(false);
      fetchProntuarios();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const handleEvolucaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProntuario || !selectedMilitar) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('prontuario_evolucoes')
        .insert({
          ...evolucaoForm,
          prontuario_id: selectedProntuario.id,
          militar_id: selectedMilitar.id,
        } as any);
      if (error) throw error;
      toast.success('Evolução registrada!');
      setEvolucaoDialogOpen(false);
      setEvolucaoForm(emptyEvolucao);
      fetchEvolucoes(selectedProntuario.id);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const handleExportPDF = () => {
    if (!selectedMilitar) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 15;
    const marginL = 15;
    const contentW = pw - 30;

    const checkPage = (needed: number) => {
      if (y + needed > 280) { doc.addPage(); y = 15; }
    };

    const addTitle = (text: string) => {
      checkPage(12);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(marginL, y - 5, contentW, 8, 'F');
      doc.text(text, marginL + 2, y);
      y += 10;
    };

    const addField = (label: string, value: string | null) => {
      if (!value) return;
      checkPage(14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(label, marginL, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, contentW - 2);
      doc.text(lines, marginL + 2, y + 5);
      y += 5 + lines.length * 4 + 3;
    };

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PRONTUARIO FISIOTERAPEUTICO TONELERO', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pw - marginL, y);
    y += 8;

    // 1. Identificação
    addTitle('1. Identificacao do Paciente');
    const mil = selectedMilitar;
    const idFields = [
      ['Nome Completo', mil.nome_completo],
      ['Nome de Guerra', mil.nome_guerra],
      ['NIP', mil.nip],
      ['Posto/Graduacao', mil.posto_graduacao],
      ['CIA', mil.companhia],
      ['Secao', mil.setor || ''],
      ['Telefone', mil.telefone || ''],
      ['E-mail', mil.email || ''],
    ];
    doc.setFontSize(9);
    idFields.forEach(([label, val]) => {
      if (!val) return;
      checkPage(6);
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}: `, marginL, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, marginL + doc.getTextWidth(`${label}: `), y);
      y += 5;
    });
    y += 3;

    // 2. Anamnese
    addTitle('2. Anamnese / Historico');
    addField('Queixa Principal:', form.queixa_principal);
    addField('Historia da Doenca Atual:', form.historia_doenca_atual);
    addField('Doencas Associadas:', form.doencas_associadas);
    addField('Historico de Cirurgias:', form.historico_cirurgias);
    addField('Uso de Medicamentos:', form.uso_medicamentos);
    addField('Habitos de Vida:', form.habitos_vida);

    // 3. Avaliação
    addTitle('3. Avaliacao Fisioterapeutica');
    addField('Inspecao:', form.inspecao);
    addField('Palpacao:', form.palpacao);
    addField('Amplitude de Movimento (ADM):', form.amplitude_movimento);
    addField('Forca Muscular:', form.forca_muscular);
    addField('Testes Funcionais:', form.testes_funcionais);
    addField('Escalas:', form.escalas);

    // 4. Diagnóstico
    addTitle('4. Diagnostico e Prognostico');
    addField('Diagnostico:', form.diagnostico_fisio);
    addField('Prognostico:', form.prognostico);

    // 5. Plano
    addTitle('5. Plano Terapeutico / Conduta');
    addField('Objetivos:', form.objetivos);
    addField('Tecnicas/Recursos:', form.tecnicas_recursos);
    addField('Frequencia do Tratamento:', form.frequencia_tratamento);

    // 6. Evoluções
    if (evolucoes.length > 0) {
      addTitle('6. Evolucao Diaria');
      evolucoes.forEach((ev) => {
        checkPage(20);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const dataFormatted = format(new Date(ev.data + 'T00:00:00'), 'dd/MM/yyyy');
        doc.text(`Data: ${dataFormatted}`, marginL, y);
        y += 5;
        addField('Procedimentos:', ev.procedimentos_realizados);
        addField('Resposta do Paciente:', ev.resposta_paciente);
        addField('Observacoes:', ev.observacoes);
        doc.setDrawColor(200);
        doc.line(marginL, y, pw - marginL, y);
        y += 4;
      });
    }

    // 7. Assinatura
    checkPage(25);
    y += 5;
    addTitle('7. Assinatura do Profissional');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Nome: LIEZIO MANOEL CAULA', marginL, y); y += 5;
    doc.text('CREFITO-2: 192716-F', marginL, y); y += 10;
    doc.line(marginL, y, marginL + 60, y); y += 4;
    doc.text('Assinatura', marginL, y);

    doc.save(`prontuario_${mil.nome_guerra.replace(/\s/g, '_')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const filteredMilitares = militares.filter(m =>
    m.nome_guerra.toLowerCase().includes(search.toLowerCase()) ||
    m.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
    m.nip.includes(search)
  );

  const getProntuarioForMilitar = (militarId: string) =>
    prontuarios.find(p => p.militar_id === militarId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Prontuário Fisioterapêutico</h1>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar militar por nome ou NIP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Military list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMilitares.map((mil) => {
          const prontuario = getProntuarioForMilitar(mil.id);
          return (
            <Card key={mil.id} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => prontuario ? openExistingProntuario(prontuario) : openNewProntuario(mil)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{mil.nome_guerra}</h3>
                    <p className="text-sm text-muted-foreground">{mil.posto_graduacao}</p>
                    <p className="text-xs text-muted-foreground">NIP: {mil.nip}</p>
                    <p className="text-xs text-muted-foreground">{mil.companhia}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {prontuario ? (
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Prontuário
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Novo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredMilitares.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum militar encontrado.</p>
      )}

      {/* Prontuário Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prontuário Fisioterapêutico Tonelero
            </DialogTitle>
          </DialogHeader>

          {selectedMilitar && (
            <div className="space-y-6">
              {/* 1. Identificação */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    1. Identificação do Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-medium text-muted-foreground">Nome Completo:</span> <span className="text-foreground">{selectedMilitar.nome_completo}</span></div>
                    <div><span className="font-medium text-muted-foreground">Nome de Guerra:</span> <span className="text-foreground">{selectedMilitar.nome_guerra}</span></div>
                    <div><span className="font-medium text-muted-foreground">NIP:</span> <span className="text-foreground">{selectedMilitar.nip}</span></div>
                    <div><span className="font-medium text-muted-foreground">Posto/Graduação:</span> <span className="text-foreground">{selectedMilitar.posto_graduacao}</span></div>
                    <div><span className="font-medium text-muted-foreground">CIA:</span> <span className="text-foreground">{selectedMilitar.companhia}</span></div>
                    <div><span className="font-medium text-muted-foreground">Seção:</span> <span className="text-foreground">{selectedMilitar.setor || '—'}</span></div>
                    <div><span className="font-medium text-muted-foreground">Telefone:</span> <span className="text-foreground">{selectedMilitar.telefone || '—'}</span></div>
                    <div><span className="font-medium text-muted-foreground">E-mail:</span> <span className="text-foreground">{selectedMilitar.email || '—'}</span></div>
                  </div>
                </CardContent>
              </Card>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 2. Anamnese */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">2. Anamnese / Histórico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label>Queixa Principal</Label>
                      <Textarea value={form.queixa_principal} onChange={e => setForm({ ...form, queixa_principal: e.target.value })} placeholder="Descreva a queixa principal do paciente..." />
                    </div>
                    <div className="space-y-1">
                      <Label>História da Doença Atual</Label>
                      <Textarea value={form.historia_doenca_atual} onChange={e => setForm({ ...form, historia_doenca_atual: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Doenças Associadas</Label>
                      <Textarea value={form.doencas_associadas} onChange={e => setForm({ ...form, doencas_associadas: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Histórico de Cirurgias</Label>
                      <Textarea value={form.historico_cirurgias} onChange={e => setForm({ ...form, historico_cirurgias: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Uso de Medicamentos</Label>
                      <Textarea value={form.uso_medicamentos} onChange={e => setForm({ ...form, uso_medicamentos: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Hábitos de Vida (atividade física, tabagismo, etc.)</Label>
                      <Textarea value={form.habitos_vida} onChange={e => setForm({ ...form, habitos_vida: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Avaliação */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">3. Avaliação Fisioterapêutica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label>Inspeção</Label>
                      <Textarea value={form.inspecao} onChange={e => setForm({ ...form, inspecao: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Palpação</Label>
                      <Textarea value={form.palpacao} onChange={e => setForm({ ...form, palpacao: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Amplitude de Movimento (ADM)</Label>
                      <Textarea value={form.amplitude_movimento} onChange={e => setForm({ ...form, amplitude_movimento: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Força Muscular</Label>
                      <Textarea value={form.forca_muscular} onChange={e => setForm({ ...form, forca_muscular: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Testes Funcionais</Label>
                      <Textarea value={form.testes_funcionais} onChange={e => setForm({ ...form, testes_funcionais: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Escalas (dor, funcionalidade, etc.)</Label>
                      <Textarea value={form.escalas} onChange={e => setForm({ ...form, escalas: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Diagnóstico */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">4. Diagnóstico e Prognóstico Fisioterapêutico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label>Diagnóstico</Label>
                      <Textarea value={form.diagnostico_fisio} onChange={e => setForm({ ...form, diagnostico_fisio: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Prognóstico</Label>
                      <Textarea value={form.prognostico} onChange={e => setForm({ ...form, prognostico: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                {/* 5. Plano Terapêutico */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">5. Plano Terapêutico / Conduta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label>Objetivos</Label>
                      <Textarea value={form.objetivos} onChange={e => setForm({ ...form, objetivos: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Técnicas/Recursos Utilizados</Label>
                      <Textarea value={form.tecnicas_recursos} onChange={e => setForm({ ...form, tecnicas_recursos: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Frequência do Tratamento</Label>
                      <Input value={form.frequencia_tratamento} onChange={e => setForm({ ...form, frequencia_tratamento: e.target.value })} placeholder="Ex: 3x por semana" />
                    </div>
                  </CardContent>
                </Card>

                {/* 7. Assinatura */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">7. Assinatura do Profissional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium text-muted-foreground">Nome do Fisioterapeuta:</span> <span className="text-foreground">LIEZIO MANOEL CAULA</span></p>
                      <p><span className="font-medium text-muted-foreground">CREFITO:</span> <span className="text-foreground">CREFITO-2: 192716-F</span></p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-1" /> Exportar PDF
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}</Button>
                </div>
              </form>

              {/* 6. Evoluções - only when editing */}
              {editing && selectedProntuario && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        6. Evolução Diária
                      </span>
                      <Button size="sm" onClick={() => { setEvolucaoForm(emptyEvolucao); setEvolucaoDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Nova Evolução
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {evolucoes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma evolução registrada.</p>
                    ) : (
                      <div className="space-y-3">
                        {evolucoes.map((ev) => (
                          <div key={ev.id} className="border rounded-lg p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs">
                                {format(new Date(ev.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                              </Badge>
                            </div>
                            {ev.procedimentos_realizados && (
                              <div className="text-sm">
                                <span className="font-medium text-muted-foreground">Procedimentos:</span>{' '}
                                <span className="text-foreground">{ev.procedimentos_realizados}</span>
                              </div>
                            )}
                            {ev.resposta_paciente && (
                              <div className="text-sm">
                                <span className="font-medium text-muted-foreground">Resposta do Paciente:</span>{' '}
                                <span className="text-foreground">{ev.resposta_paciente}</span>
                              </div>
                            )}
                            {ev.observacoes && (
                              <div className="text-sm">
                                <span className="font-medium text-muted-foreground">Observações:</span>{' '}
                                <span className="text-foreground">{ev.observacoes}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Evolução Dialog */}
      <Dialog open={evolucaoDialogOpen} onOpenChange={setEvolucaoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Evolução Diária</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEvolucaoSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={evolucaoForm.data} onChange={e => setEvolucaoForm({ ...evolucaoForm, data: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Procedimentos Realizados</Label>
              <Textarea value={evolucaoForm.procedimentos_realizados} onChange={e => setEvolucaoForm({ ...evolucaoForm, procedimentos_realizados: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Resposta do Paciente</Label>
              <Textarea value={evolucaoForm.resposta_paciente} onChange={e => setEvolucaoForm({ ...evolucaoForm, resposta_paciente: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={evolucaoForm.observacoes} onChange={e => setEvolucaoForm({ ...evolucaoForm, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEvolucaoDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Registrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
