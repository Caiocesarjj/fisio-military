import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, MessageCircle, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Period = 'week' | 'month' | '3months' | 'custom';

interface SessionDetail {
  id: string;
  data_hora: string;
  status: string;
  tipo: string;
  queixa: string | null;
  lesoes: any;
  anotacao_clinica: string | null;
  militar_nome: string;
  militar_posto: string;
  militar_companhia: string;
  evolucao: string | null;
  nivel_dor: number | null;
  conduta: string | null;
}

interface MilitarGroup {
  nome: string;
  posto: string;
  companhia: string;
  sessions: SessionDetail[];
}

const statusLabel: Record<string, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
};

const formatLesoes = (lesoes: any): string => {
  if (!Array.isArray(lesoes) || lesoes.length === 0) return '—';
  return lesoes.map((l: any) => {
    const parts = [l.segmento, l.lado].filter(Boolean);
    return parts.join(' ') || '—';
  }).join(', ');
};

export default function RelatorioDetalhado() {
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    switch (period) {
      case 'week': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case '3months': return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'custom':
        return {
          start: customStart ? new Date(customStart) : startOfMonth(now),
          end: customEnd ? new Date(customEnd + 'T23:59:59') : endOfMonth(now),
        };
    }
  };

  const grouped = useMemo<MilitarGroup[]>(() => {
    const map = new Map<string, MilitarGroup>();
    sessions.forEach((s) => {
      if (!map.has(s.militar_nome)) {
        map.set(s.militar_nome, {
          nome: s.militar_nome,
          posto: s.militar_posto,
          companhia: s.militar_companhia,
          sessions: [],
        });
      }
      map.get(s.militar_nome)!.sessions.push(s);
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [sessions]);

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    const [sessRes, notesRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, data_hora, status, tipo, queixa, lesoes, anotacao_clinica, militares(nome_guerra, posto_graduacao, companhia)')
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString())
        .order('data_hora', { ascending: false }),
      supabase
        .from('session_notes')
        .select('session_id, evolucao_geral, nivel_dor, conduta')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
    ]);

    const rawSessions = sessRes.data || [];
    const notes = notesRes.data || [];
    const notesMap = new Map(notes.map((n: any) => [n.session_id, n]));

    const detailed: SessionDetail[] = rawSessions.map((s: any) => {
      const note = notesMap.get(s.id);
      return {
        id: s.id,
        data_hora: s.data_hora,
        status: s.status,
        tipo: s.tipo,
        queixa: s.queixa,
        lesoes: s.lesoes,
        anotacao_clinica: s.anotacao_clinica,
        militar_nome: s.militares?.nome_guerra || '—',
        militar_posto: s.militares?.posto_graduacao || '',
        militar_companhia: s.militares?.companhia || '',
        evolucao: note?.evolucao_geral || null,
        nivel_dor: note?.nivel_dor ?? null,
        conduta: note?.conduta || null,
      };
    });

    setSessions(detailed);
    setFetched(true);
    setLoading(false);
  };

  const exportDetailedPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const w = doc.internal.pageSize.getWidth();
    const { start, end } = getDateRange();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Detalhado de Atendimentos', w / 2, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Período: ${format(start, "dd/MM/yyyy", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", { locale: ptBR })}`,
      w / 2, 22, { align: 'center' }
    );
    doc.text(`Total: ${sessions.length} atendimento(s) — ${grouped.length} militar(es)`, w / 2, 27, { align: 'center' });

    let startY = 34;

    grouped.forEach((g) => {
      // Military header
      if (startY > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        startY = 15;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${g.nome} — ${g.posto} — ${g.companhia} (${g.sessions.length} atend.)`, 10, startY);
      startY += 2;

      autoTable(doc, {
        startY,
        head: [['Data', 'Status', 'Queixa', 'Lesões', 'Evolução', 'Conduta']],
        body: g.sessions.map((s) => [
          format(new Date(s.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          statusLabel[s.status] || s.status,
          s.queixa || '—',
          formatLesoes(s.lesoes),
          s.evolucao || '—',
          s.conduta || '—',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 10, right: 10 },
      });

      startY = (doc as any).lastAutoTable.finalY + 8;
    });

    doc.save('relatorio_detalhado_atendimentos.pdf');
  };

  const shareWhatsApp = () => {
    const { start, end } = getDateRange();
    const realizados = sessions.filter((s) => s.status === 'realizado').length;

    let text = `📋 *Relatório de Atendimentos*\n`;
    text += `📅 Período: ${format(start, "dd/MM/yyyy")} a ${format(end, "dd/MM/yyyy")}\n`;
    text += `📊 Total: ${sessions.length} | Realizados: ${realizados} | Militares: ${grouped.length}\n\n`;

    grouped.forEach((g) => {
      text += `👤 *${g.nome}* (${g.posto} — ${g.companhia}) — ${g.sessions.length} atend.\n`;
      g.sessions.slice(0, 5).forEach((s) => {
        text += `   📅 ${format(new Date(s.data_hora), "dd/MM HH:mm")} — ${statusLabel[s.status] || s.status}`;
        const les = formatLesoes(s.lesoes);
        if (les !== '—') text += ` | Lesões: ${les}`;
        if (s.evolucao) text += `\n   Evolução: ${s.evolucao}`;
        text += `\n`;
      });
      if (g.sessions.length > 5) text += `   ... +${g.sessions.length - 5} sessões\n`;
      text += `\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Relatório Detalhado de Atendimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={period}
                onChange={(e) => { setPeriod(e.target.value as Period); setFetched(false); }}
              >
                <option value="week">Semana atual</option>
                <option value="month">Mês atual</option>
                <option value="3months">Últimos 3 meses</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            {period === 'custom' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">De</label>
                  <Input type="date" className="h-9 w-40" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setFetched(false); }} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Até</label>
                  <Input type="date" className="h-9 w-40" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setFetched(false); }} />
                </div>
              </>
            )}
            <Button onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Gerar Relatório
            </Button>
          </div>

          {fetched && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportDetailedPDF} disabled={sessions.length === 0}>
                  <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
                </Button>
                <Button variant="outline" onClick={shareWhatsApp} disabled={sessions.length === 0} className="border-emerald-300 hover:bg-emerald-50 text-emerald-600">
                  <MessageCircle className="h-4 w-4 mr-1" /> Enviar WhatsApp
                </Button>
                <Badge variant="secondary" className="self-center">{sessions.length} atendimento(s) — {grouped.length} militar(es)</Badge>
              </div>

              {grouped.length > 0 ? (
                <div className="space-y-4">
                  {grouped.map((g) => (
                    <Card key={g.nome} className="border">
                      <CardHeader className="py-3 px-4 bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">{g.nome}</span>
                            <span className="text-sm text-muted-foreground ml-2">{g.posto} — {g.companhia}</span>
                          </div>
                          <Badge variant="secondary">{g.sessions.length} sessão(ões)</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Queixa</TableHead>
                                <TableHead>Lesões</TableHead>
                                <TableHead>Evolução</TableHead>
                                <TableHead>Conduta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {g.sessions.map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell className="whitespace-nowrap text-sm">
                                    {format(new Date(s.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className={`text-xs ${
                                      s.status === 'realizado' ? 'bg-emerald-100 text-emerald-700' :
                                      s.status === 'confirmado' ? 'bg-amber-100 text-amber-700' :
                                      s.status === 'agendado' ? 'bg-blue-100 text-blue-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {statusLabel[s.status] || s.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm max-w-[200px] truncate">{s.queixa || '—'}</TableCell>
                                  <TableCell className="text-sm max-w-[200px] truncate">{formatLesoes(s.lesoes)}</TableCell>
                                  <TableCell className="text-sm max-w-[200px] truncate">{s.evolucao || '—'}</TableCell>
                                  <TableCell className="text-sm max-w-[200px] truncate">{s.conduta || '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum atendimento encontrado no período.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
