import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { COMPANHIAS } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

type Period = 'week' | 'month' | '3months' | 'custom';

interface CompanyRow {
  companhia: string;
  totalMilitares: number;
  realizadas: number;
  taxa: number;
  lesoesComuns: string;
}

export default function Relatorios() {
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [companyData, setCompanyData] = useState<CompanyRow[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { start, end } = getDateRange();

      const [sessRes, milRes] = await Promise.all([
        supabase.from('sessions').select('*, militares(companhia)').gte('data_hora', start.toISOString()).lte('data_hora', end.toISOString()),
        supabase.from('militares').select('companhia, lesoes, ativo'),
      ]);

      const sessions = sessRes.data || [];
      const militares = milRes.data || [];

      const rows: CompanyRow[] = COMPANHIAS.map((cia) => {
        const ciaMil = militares.filter((m: any) => m.companhia === cia);
        const ciaSess = sessions.filter((s: any) => s.militares?.companhia === cia);
        const realizadas = ciaSess.filter((s: any) => s.status === 'realizado').length;
        const total = ciaSess.length;

        // Top lesões
        const lesaoCount: Record<string, number> = {};
        ciaMil.forEach((m: any) => {
          if (Array.isArray(m.lesoes)) {
            m.lesoes.forEach((l: any) => {
              if (l?.segmento) lesaoCount[l.segmento] = (lesaoCount[l.segmento] || 0) + 1;
            });
          }
        });
        const topLesoes = Object.entries(lesaoCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name).join(', ');

        return {
          companhia: cia,
          totalMilitares: ciaMil.filter((m: any) => m.ativo).length,
          realizadas,
          taxa: total > 0 ? Math.round((realizadas / total) * 100) : 0,
          lesoesComuns: topLesoes || '-',
        };
      });

      setCompanyData(rows);
      setChartData(rows.map((r) => ({ name: r.companhia, Realizadas: r.realizadas })));
      setLoading(false);
    };
    fetchData();
  }, [period, customStart, customEnd]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Comparativo entre Companhias', w / 2, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const { start, end } = getDateRange();
    doc.text(`Período: ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`, w / 2, 22, { align: 'center' });

    autoTable(doc, {
      startY: 30,
      head: [['Companhia', 'Militares', 'Realizadas', 'Taxa %', 'Lesões Comuns']],
      body: companyData.map((r) => [r.companhia, r.totalMilitares, r.realizadas, `${r.taxa}%`, r.lesoesComuns]),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95] },
      margin: { left: 15, right: 15 },
    });

    doc.save('comparativo_companhias.pdf');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Relatórios — Comparativo</h1>
        <Button onClick={exportPDF} disabled={loading}>
          <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Período</label>
          <select className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
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
              <Input type="date" className="h-9 w-40" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <Input type="date" className="h-9 w-40" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {/* Comparison table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Comparativo entre Companhias</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Companhia</TableHead>
                <TableHead className="text-center">Militares</TableHead>
                <TableHead className="text-center">Realizadas</TableHead>
                <TableHead className="text-center">Taxa %</TableHead>
                <TableHead>Lesões Comuns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyData.map((row) => (
                <TableRow key={row.companhia}>
                  <TableCell className="font-medium">{row.companhia}</TableCell>
                  <TableCell className="text-center">{row.totalMilitares}</TableCell>
                  <TableCell className="text-center">{row.realizadas}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={`text-xs ${row.taxa >= 70 ? 'bg-emerald-100 text-emerald-700' : row.taxa >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {row.taxa}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.lesoesComuns}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grouped bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Presença por Companhia</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Realizadas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
