import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { COMPANHIAS } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Relatorios() {
  const [presenceData, setPresenceData] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [membroData, setMembroData] = useState<any[]>([]);
  const [topMonth, setTopMonth] = useState('');
  const [militares, setMilitares] = useState<any[]>([]);
  const [selectedMilitar, setSelectedMilitar] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    supabase.from('militares').select('id, nome_guerra, posto_graduacao').eq('ativo', true).order('nome_guerra').then(({ data }) => {
      setMilitares(data || []);
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('status, militar_id, data_hora, militares(nome_guerra, posto_graduacao, companhia, lesoes)');

      if (!sessions) return;

      const filtered = companyFilter
        ? sessions.filter((s: any) => s.militares?.companhia === companyFilter)
        : sessions;

      const militarMap: Record<string, { total: number; present: number; name: string }> = {};
      filtered.forEach((s: any) => {
        const key = s.militar_id;
        if (!militarMap[key]) {
          militarMap[key] = { total: 0, present: 0, name: `${s.militares?.posto_graduacao} ${s.militares?.nome_guerra}` };
        }
        militarMap[key].total++;
        if (s.status === 'realizado') militarMap[key].present++;
      });

      const presenceArr = Object.values(militarMap).map((m) => ({
        name: m.name,
        taxa: m.total > 0 ? Math.round((m.present / m.total) * 100) : 0,
      })).sort((a, b) => b.taxa - a.taxa).slice(0, 10);
      setPresenceData(presenceArr);

      const monthMap: Record<string, number> = {};
      filtered.forEach((s: any) => {
        const month = new Date(s.data_hora).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        monthMap[month] = (monthMap[month] || 0) + 1;
      });
      const monthArr = Object.entries(monthMap).map(([name, total]) => ({ name, total }));
      setMonthlyData(monthArr);

      if (monthArr.length > 0) {
        const top = monthArr.reduce((a, b) => (a.total > b.total ? a : b));
        setTopMonth(`${top.name} (${top.total} atendimentos)`);
      }

      const membroMap: Record<string, number> = {};
      filtered.forEach((s: any) => {
        const lesoes = s.militares?.lesoes;
        if (Array.isArray(lesoes)) {
          lesoes.forEach((l: any) => {
            if (l?.segmento) {
              membroMap[l.segmento] = (membroMap[l.segmento] || 0) + 1;
            }
          });
        }
      });
      setMembroData(
        Object.entries(membroMap)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
      );
    };

    fetchData();
  }, [companyFilter]);

  const exportPDF = async () => {
    if (!selectedMilitar) return;
    setExporting(true);

    try {
      const [{ data: mil }, { data: sessions }, { data: plans }] = await Promise.all([
        supabase.from('militares').select('*').eq('id', selectedMilitar).single(),
        supabase.from('sessions').select('*').eq('militar_id', selectedMilitar).order('data_hora', { ascending: false }),
        supabase.from('treatment_plans').select('*, plan_exercises(*, exercises(nome, categoria))').eq('militar_id', selectedMilitar),
      ]);

      if (!mil) { setExporting(false); return; }

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório do Militar', pageW / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageW / 2, y, { align: 'center' });
      y += 12;

      // Photo
      if (mil.foto_url) {
        try {
          const img = await loadImage(mil.foto_url);
          doc.addImage(img, 'JPEG', 15, y, 30, 30);
        } catch { /* skip photo */ }
      }

      // Personal data
      const infoX = mil.foto_url ? 50 : 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${mil.posto_graduacao} ${mil.nome_guerra}`, infoX, y + 5);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nome: ${mil.nome_completo}`, infoX, y + 13);
      doc.text(`NIP: ${mil.nip}  |  Cia: ${mil.companhia}${mil.setor ? ' / ' + mil.setor : ''}`, infoX, y + 20);
      doc.text(`E-mail: ${mil.email}${mil.telefone ? '  |  Tel: ' + mil.telefone : ''}`, infoX, y + 27);
      y += 38;

      // Injuries
      const lesoes = Array.isArray(mil.lesoes) ? mil.lesoes : [];
      if (lesoes.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Lesões', 15, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Região', 'Segmento']],
          body: lesoes.map((l: any) => [l.regiao || '', l.segmento || '']),
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 95] },
          margin: { left: 15, right: 15 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Diagnostic
      if (mil.diagnostico) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Diagnóstico', 15, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(mil.diagnostico, pageW - 30);
        doc.text(lines, 15, y);
        y += lines.length * 5 + 8;
      }

      // Treatment plans
      if (plans && plans.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Planos de Tratamento', 15, y);
        y += 6;
        const planRows = plans.map((p: any) => [
          p.nome,
          p.objetivo || '-',
          p.data_inicio,
          p.data_fim || 'Em andamento',
          p.ativo ? 'Ativo' : 'Inativo',
          (p.plan_exercises || []).map((pe: any) => pe.exercises?.nome).filter(Boolean).join(', ') || '-',
        ]);
        autoTable(doc, {
          startY: y,
          head: [['Plano', 'Objetivo', 'Início', 'Fim', 'Status', 'Exercícios']],
          body: planRows,
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 95] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8 },
          columnStyles: { 5: { cellWidth: 50 } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Attendance history
      if (sessions && sessions.length > 0) {
        if (y > 240) { doc.addPage(); y = 15; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Histórico de Presença', 15, y);
        y += 6;
        const sessionRows = sessions.map((s: any) => [
          new Date(s.data_hora).toLocaleDateString('pt-BR'),
          new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          `${s.duracao}min`,
          s.tipo,
          s.status,
        ]);
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Hora', 'Duração', 'Tipo', 'Status']],
          body: sessionRows,
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 95] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 9 },
        });

        // Summary
        y = (doc as any).lastAutoTable.finalY + 8;
        const total = sessions.length;
        const realizados = sessions.filter((s: any) => s.status === 'realizado').length;
        const faltas = sessions.filter((s: any) => s.status === 'faltou').length;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total: ${total} sessões  |  Realizadas: ${realizados}  |  Faltas: ${faltas}  |  Taxa de presença: ${total > 0 ? Math.round((realizados / total) * 100) : 0}%`, 15, y);
      }

      doc.save(`relatorio_${mil.nome_guerra.replace(/\s/g, '_')}.pdf`);
    } catch (err: any) {
      console.error(err);
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <div className="flex gap-2 flex-wrap">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <option value="">Todas as companhias</option>
            {COMPANHIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* PDF Export card */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Exportar Relatório Individual (PDF)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-foreground">Selecione o militar</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedMilitar}
                onChange={(e) => setSelectedMilitar(e.target.value)}
              >
                <option value="">Selecione...</option>
                {militares.map((m) => <option key={m.id} value={m.id}>{m.posto_graduacao} {m.nome_guerra}</option>)}
              </select>
            </div>
            <Button onClick={exportPDF} disabled={!selectedMilitar || exporting}>
              <FileDown className="h-4 w-4 mr-1" />
              {exporting ? 'Gerando...' : 'Exportar PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {topMonth && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Mês com mais atendimentos</p>
            <p className="text-xl font-bold text-foreground">{topMonth}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Taxa de Presença por Militar</CardTitle></CardHeader>
          <CardContent>
            {presenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={presenceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => `${val}%`} />
                  <Bar dataKey="taxa" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados de presença.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Atendimentos Mensais</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados mensais.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Atendimentos por Membro (Lesão)</CardTitle></CardHeader>
          <CardContent>
            {membroData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={membroData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados de lesões.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = reject;
    img.src = url;
  });
}
