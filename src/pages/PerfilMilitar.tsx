import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, FileDown, LogOut as AltaIcon, Phone, Mail, Plus } from 'lucide-react';
import { LesaoBadges } from '@/components/LesaoSelector';
import { EvaScale, EvaBadge } from '@/components/EvaScale';
import { ProfileSkeleton } from '@/components/Skeletons';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PerfilMilitar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [militar, setMilitar] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [painData, setPainData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [altaOpen, setAltaOpen] = useState(false);
  const [altaForm, setAltaForm] = useState({ motivo: '', observacoes: '' });
  const [altaLoading, setAltaLoading] = useState(false);

  // Evolution modal state
  const [evoOpen, setEvoOpen] = useState(false);
  const [evoLoading, setEvoLoading] = useState(false);
  const [evoForm, setEvoForm] = useState({
    session_id: '',
    nivel_dor: 0,
    queixa_principal: '',
    conduta: '',
    evolucao_geral: '',
    proximos_objetivos: '',
    observacoes_paciente: '',
  });
  const [evoExercises, setEvoExercises] = useState<{ exercise_id: string; nome: string; executou: boolean; obs: string }[]>([]);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    const [milRes, plansRes, sessRes, notesRes, auditRes] = await Promise.all([
      supabase.from('militares').select('*').eq('id', id).single(),
      supabase.from('treatment_plans').select('*, plan_exercises(*, exercises(nome, categoria))').eq('militar_id', id),
      supabase.from('sessions').select('*').eq('militar_id', id).order('data_hora', { ascending: false }),
      supabase.from('session_notes').select('*').eq('militar_id', id).order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('*').eq('registro_id', id).order('created_at', { ascending: false }).limit(50),
    ]);
    setMilitar(milRes.data);
    setPlans(plansRes.data || []);
    setSessions(sessRes.data || []);
    setNotes(notesRes.data || []);
    setAuditLogs(auditRes.data || []);

    const allNotes = notesRes.data || [];
    setPainData(
      allNotes
        .filter((n: any) => n.nivel_dor != null)
        .reverse()
        .map((n: any) => ({
          data: format(new Date(n.created_at), 'dd/MM'),
          dor: n.nivel_dor,
        }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  // Build a map of session_id → note for EVA badges in sessions tab
  const notesBySession: Record<string, any> = {};
  notes.forEach((n) => { if (n.session_id) notesBySession[n.session_id] = n; });

  const handleAlta = async () => {
    if (!militar) return;
    setAltaLoading(true);
    try {
      const { error } = await supabase.from('militares').update({
        status_militar: 'alta', ativo: false,
        motivo_alta: altaForm.motivo, observacoes_alta: altaForm.observacoes,
        data_alta: new Date().toISOString(),
      }).eq('id', militar.id);
      if (error) throw error;
      toast.success('Alta registrada com sucesso!');
      setAltaOpen(false);
      exportPDF();
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    setAltaLoading(false);
  };

  const openEvoModal = () => {
    const activePlan = plans.find((p) => p.ativo);
    const planExs = activePlan?.plan_exercises || [];
    setEvoExercises(planExs.map((pe: any) => ({
      exercise_id: pe.exercise_id,
      nome: pe.exercises?.nome || 'Exercício',
      executou: false,
      obs: '',
    })));
    setEvoForm({ session_id: '', nivel_dor: 0, queixa_principal: '', conduta: '', evolucao_geral: '', proximos_objetivos: '', observacoes_paciente: '' });
    setEvoOpen(true);
  };

  const handleSaveEvo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evoForm.session_id || !id) { toast.error('Selecione uma sessão.'); return; }
    setEvoLoading(true);
    try {
      const { error } = await supabase.from('session_notes').insert({
        session_id: evoForm.session_id,
        militar_id: id,
        nivel_dor: evoForm.nivel_dor,
        queixa_principal: evoForm.queixa_principal || null,
        conduta: evoForm.conduta || null,
        evolucao_geral: evoForm.evolucao_geral || null,
        proximos_objetivos: evoForm.proximos_objetivos || null,
        observacoes_paciente: evoForm.observacoes_paciente || null,
        progresso_exercicios: evoExercises as any,
      });
      if (error) throw error;
      toast.success('Evolução registrada!');
      setEvoOpen(false);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    setEvoLoading(false);
  };

  const exportPDF = async () => {
    if (!militar) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Prontuário Final', pageW / 2, y, { align: 'center' }); y += 10;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageW / 2, y, { align: 'center' }); y += 12;

    if (militar.foto_url) {
      try { const img = await loadImage(militar.foto_url); doc.addImage(img, 'JPEG', 15, y, 30, 30); } catch {}
    }
    const infoX = militar.foto_url ? 50 : 15;
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(`${militar.posto_graduacao} ${militar.nome_guerra}`, infoX, y + 5);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${militar.nome_completo}`, infoX, y + 13);
    doc.text(`NIP: ${militar.nip}  |  Cia: ${militar.companhia}${militar.setor ? ' / ' + militar.setor : ''}`, infoX, y + 20);
    if (militar.email || militar.telefone) doc.text(`E-mail: ${militar.email || '-'}${militar.telefone ? '  |  Tel: ' + militar.telefone : ''}`, infoX, y + 27);
    y += 38;

    const lesoes = Array.isArray(militar.lesoes) ? militar.lesoes : [];
    if (lesoes.length > 0) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Lesões', 15, y); y += 6;
      autoTable(doc, { startY: y, head: [['Região', 'Segmento']], body: lesoes.map((l: any) => [l.regiao || '', l.segmento || '']), theme: 'striped', headStyles: { fillColor: [30, 58, 95] }, margin: { left: 15, right: 15 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
    if (plans.length > 0) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Planos de Tratamento', 15, y); y += 6;
      autoTable(doc, { startY: y, head: [['Plano', 'Objetivo', 'Início', 'Fim', 'Exercícios']], body: plans.map((p: any) => [p.nome, p.objetivo || '-', p.data_inicio, p.data_fim || '-', (p.plan_exercises || []).map((pe: any) => pe.exercises?.nome).filter(Boolean).join(', ')]), theme: 'striped', headStyles: { fillColor: [30, 58, 95] }, margin: { left: 15, right: 15 }, styles: { fontSize: 8 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
    if (sessions.length > 0) {
      if (y > 230) { doc.addPage(); y = 15; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Histórico de Presença', 15, y); y += 6;
      autoTable(doc, { startY: y, head: [['Data', 'Hora', 'Duração', 'Tipo', 'Status']], body: sessions.map((s: any) => [new Date(s.data_hora).toLocaleDateString('pt-BR'), new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), `${s.duracao}min`, s.tipo, s.status]), theme: 'striped', headStyles: { fillColor: [30, 58, 95] }, margin: { left: 15, right: 15 }, styles: { fontSize: 9 } });
      y = (doc as any).lastAutoTable.finalY + 8;
      const total = sessions.length;
      const realizados = sessions.filter((s: any) => s.status === 'realizado').length;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(`Total: ${total}  |  Realizadas: ${realizados}  |  Taxa: ${total > 0 ? Math.round((realizados / total) * 100) : 0}%`, 15, y);
    }
    doc.save(`prontuario_${militar.nome_guerra.replace(/\s/g, '_')}.pdf`);
  };

  if (loading) return <ProfileSkeleton />;
  if (!militar) return <p className="text-center text-muted-foreground py-12">Militar não encontrado.</p>;

  const activePlan = plans.find((p) => p.ativo);
  const statusColor = militar.status_militar === 'ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
    militar.status_militar === 'alta' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground';
  const statusMap: Record<string, string> = {
    agendado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    realizado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    faltou: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelado: 'bg-muted text-muted-foreground',
  };

  const realizedSessions = sessions.filter((s) => s.status === 'realizado');

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate('/militares')}>← Voltar</Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <Avatar className="h-28 w-28">
                <AvatarImage src={militar.foto_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                  {militar.nome_guerra.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-mono text-sm text-muted-foreground">{militar.nip}</p>
                <h2 className="text-xl font-bold text-foreground">{militar.nome_guerra}</h2>
                <p className="text-sm text-muted-foreground">{militar.nome_completo}</p>
              </div>
              <Badge className={statusColor}>{militar.status_militar}</Badge>
              <Badge variant="secondary">{militar.posto_graduacao}</Badge>
              <p className="text-sm text-muted-foreground">{militar.companhia}{militar.setor ? ` · ${militar.setor}` : ''}</p>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              {militar.telefone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {militar.telefone}</div>}
              {militar.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {militar.email}</div>}
            </div>
            {(militar.lesoes || []).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Lesões</p>
                <LesaoBadges lesoes={militar.lesoes} />
              </div>
            )}
            {militar.diagnostico && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Diagnóstico</p>
                <p className="text-sm text-foreground">{militar.diagnostico}</p>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/militares`)}><Edit className="h-4 w-4 mr-1" /> Editar</Button>
              <Button variant="outline" size="sm" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" /> Exportar PDF</Button>
              {role === 'admin' && militar.status_militar === 'ativo' && (
                <Button variant="destructive" size="sm" onClick={() => setAltaOpen(true)}><AltaIcon className="h-4 w-4 mr-1" /> Dar Alta</Button>
              )}
            </div>
            {militar.status_militar === 'alta' && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm space-y-1">
                <p className="font-medium text-blue-800 dark:text-blue-300">Alta em {militar.data_alta ? format(new Date(militar.data_alta), 'dd/MM/yyyy') : '-'}</p>
                {militar.motivo_alta && <p className="text-blue-700 dark:text-blue-400">Motivo: {militar.motivo_alta}</p>}
                {militar.observacoes_alta && <p className="text-blue-600 dark:text-blue-500">{militar.observacoes_alta}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="plano">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="plano">Plano Ativo</TabsTrigger>
              <TabsTrigger value="sessoes">Sessões</TabsTrigger>
              <TabsTrigger value="evolucao">Evolução</TabsTrigger>
              <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
            </TabsList>

            {/* Plano Ativo Tab */}
            <TabsContent value="plano">
              <Card>
                <CardContent className="p-6">
                  {activePlan ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground">{activePlan.nome}</h3>
                        <Badge>Ativo</Badge>
                      </div>
                      {activePlan.objetivo && <p className="text-sm text-muted-foreground">{activePlan.objetivo}</p>}
                      <div className="space-y-3">
                        {activePlan.plan_exercises?.map((pe: any) => (
                          <Card key={pe.id} className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-foreground">{pe.exercises?.nome}</p>
                                  <p className="text-xs text-muted-foreground">{pe.exercises?.categoria}</p>
                                </div>
                                <Badge variant="secondary" className="text-xs">{pe.frequencia_semanal}x/semana</Badge>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span><strong>{pe.series}</strong> séries</span>
                                <span><strong>{pe.repeticoes}</strong> repetições</span>
                                <span>Descanso: <strong>{pe.descanso}</strong></span>
                              </div>
                              {pe.observacoes && <p className="mt-2 text-xs text-muted-foreground italic">{pe.observacoes}</p>}
                            </CardContent>
                          </Card>
                        ))}
                        {(!activePlan.plan_exercises || activePlan.plan_exercises.length === 0) && (
                          <p className="text-muted-foreground text-sm text-center py-4">Nenhum exercício no plano.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">Nenhum plano ativo.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sessões Tab with EVA Badge */}
            <TabsContent value="sessoes">
              <Card>
                <CardContent className="p-0">
                  {sessions.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">Nenhuma sessão registrada.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Duração</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Dor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{new Date(s.data_hora).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>{new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                            <TableCell>{s.duracao}min</TableCell>
                            <TableCell>{s.tipo}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${statusMap[s.status] || ''}`} variant="secondary">{s.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {notesBySession[s.id] && notesBySession[s.id].nivel_dor != null ? (
                                <EvaBadge value={notesBySession[s.id].nivel_dor} />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Evolução Tab */}
            <TabsContent value="evolucao">
              <div className="space-y-4">
                {role === 'admin' && (
                  <div className="flex justify-end">
                    <Button onClick={openEvoModal}><Plus className="h-4 w-4 mr-1" /> Registrar Evolução</Button>
                  </div>
                )}

                {/* Pain chart */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">Evolução da Dor (EVA)</CardTitle></CardHeader>
                  <CardContent>
                    {painData.length > 1 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={painData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="dor" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">Dados insuficientes para o gráfico.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Evolution cards */}
                {notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        {note.nivel_dor != null && <EvaBadge value={note.nivel_dor} />}
                      </div>
                      {note.queixa_principal && (
                        <div><p className="text-xs font-semibold text-muted-foreground">Queixa principal</p><p className="text-sm text-foreground">{note.queixa_principal}</p></div>
                      )}
                      {note.conduta && (
                        <div><p className="text-xs font-semibold text-muted-foreground">Conduta fisioterapêutica</p><p className="text-sm text-foreground">{note.conduta}</p></div>
                      )}
                      {note.evolucao_geral && (
                        <div><p className="text-xs font-semibold text-muted-foreground">Evolução geral</p><p className="text-sm text-foreground">{note.evolucao_geral}</p></div>
                      )}
                      {note.proximos_objetivos && (
                        <div><p className="text-xs font-semibold text-muted-foreground">Próximos objetivos</p><p className="text-sm text-foreground">{note.proximos_objetivos}</p></div>
                      )}
                      {Array.isArray(note.progresso_exercicios) && (note.progresso_exercicios as any[]).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Progresso dos exercícios</p>
                          <div className="space-y-1">
                            {(note.progresso_exercicios as any[]).map((ex: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <Badge variant={ex.executou ? 'default' : 'secondary'} className="text-xs">{ex.executou ? '✓' : '✗'}</Badge>
                                <span className="text-foreground">{ex.nome}</span>
                                {ex.obs && <span className="text-muted-foreground text-xs">— {ex.obs}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {note.observacoes_paciente && (
                        <div><p className="text-xs font-semibold text-muted-foreground">Observações do paciente</p><p className="text-sm text-foreground">{note.observacoes_paciente}</p></div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {notes.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Nenhum registro de evolução.</p>}
              </div>
            </TabsContent>

            {/* Auditoria Tab */}
            <TabsContent value="auditoria">
              <Card>
                <CardContent className="p-0">
                  {auditLogs.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">Nenhum log de auditoria.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Operação</TableHead>
                          <TableHead>Usuário</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{log.operacao}</Badge></TableCell>
                            <TableCell className="text-sm">{log.usuario_nome || 'Sistema'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Alta Modal */}
      <Dialog open={altaOpen} onOpenChange={setAltaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Dar Alta ao Militar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirma a alta de <strong>{militar.posto_graduacao} {militar.nome_guerra}</strong>?
              O prontuário final será gerado automaticamente em PDF.
            </p>
            <div className="space-y-2">
              <Label>Motivo da Alta *</Label>
              <Textarea value={altaForm.motivo} onChange={(e) => setAltaForm({ ...altaForm, motivo: e.target.value })} required placeholder="Ex: Recuperação completa" />
            </div>
            <div className="space-y-2">
              <Label>Observações Finais</Label>
              <Textarea value={altaForm.observacoes} onChange={(e) => setAltaForm({ ...altaForm, observacoes: e.target.value })} placeholder="Observações adicionais..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAltaOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleAlta} disabled={!altaForm.motivo || altaLoading}>
                {altaLoading ? 'Processando...' : 'Confirmar Alta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evolution Registration Modal */}
      <Dialog open={evoOpen} onOpenChange={setEvoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Evolução</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEvo} className="space-y-4">
            <div className="space-y-2">
              <Label>Sessão *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={evoForm.session_id} onChange={(e) => setEvoForm({ ...evoForm, session_id: e.target.value })} required>
                <option value="">Selecione uma sessão realizada...</option>
                {realizedSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {format(new Date(s.data_hora), "dd/MM/yyyy 'às' HH:mm")} — {s.tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nível de Dor (EVA)</Label>
              <EvaScale value={evoForm.nivel_dor} onChange={(v) => setEvoForm({ ...evoForm, nivel_dor: v })} />
            </div>

            <div className="space-y-2">
              <Label>Queixa principal</Label>
              <Textarea value={evoForm.queixa_principal} onChange={(e) => setEvoForm({ ...evoForm, queixa_principal: e.target.value })} placeholder="O que o paciente relata..." />
            </div>

            <div className="space-y-2">
              <Label>Conduta fisioterapêutica</Label>
              <Textarea value={evoForm.conduta} onChange={(e) => setEvoForm({ ...evoForm, conduta: e.target.value })} placeholder="O que foi realizado na sessão..." />
            </div>

            {evoExercises.length > 0 && (
              <div className="space-y-2">
                <Label>Progresso dos exercícios</Label>
                <div className="space-y-2">
                  {evoExercises.map((ex, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={ex.executou}
                          onCheckedChange={(checked) => {
                            const u = [...evoExercises]; u[i].executou = !!checked; setEvoExercises(u);
                          }}
                        />
                        <span className="text-sm font-medium text-foreground">{ex.nome}</span>
                      </div>
                      <Input className="h-8 text-sm" placeholder="Observação sobre o exercício..."
                        value={ex.obs} onChange={(e) => { const u = [...evoExercises]; u[i].obs = e.target.value; setEvoExercises(u); }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Evolução geral</Label>
              <Textarea value={evoForm.evolucao_geral} onChange={(e) => setEvoForm({ ...evoForm, evolucao_geral: e.target.value })} placeholder="Observações do fisioterapeuta sobre o progresso..." />
            </div>

            <div className="space-y-2">
              <Label>Próximos objetivos</Label>
              <Textarea value={evoForm.proximos_objetivos} onChange={(e) => setEvoForm({ ...evoForm, proximos_objetivos: e.target.value })} placeholder="Metas para as próximas sessões..." />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEvoOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={evoLoading}>{evoLoading ? 'Salvando...' : 'Salvar Evolução'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = reject;
    img.src = url;
  });
}
