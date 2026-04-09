import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANHIAS } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Relatorios() {
  const [presenceData, setPresenceData] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [faltasData, setFaltasData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch sessions with military data
      const { data: sessions } = await supabase
        .from('sessions')
        .select('status, militar_id, data_hora, militares(nome_guerra, posto_graduacao, companhia)');

      if (!sessions) return;

      // Filter by company if set
      const filtered = companyFilter
        ? sessions.filter((s: any) => s.militares?.companhia === companyFilter)
        : sessions;

      // Presence rate per military
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

      // Monthly summary
      const monthMap: Record<string, number> = {};
      filtered.forEach((s: any) => {
        const month = new Date(s.data_hora).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        monthMap[month] = (monthMap[month] || 0) + 1;
      });
      setMonthlyData(Object.entries(monthMap).map(([name, total]) => ({ name, total })));

      // Most absences
      const faltasMap: Record<string, { count: number; name: string }> = {};
      filtered.filter((s: any) => s.status === 'faltou').forEach((s: any) => {
        const key = s.militar_id;
        if (!faltasMap[key]) faltasMap[key] = { count: 0, name: `${s.militares?.posto_graduacao} ${s.militares?.nome_guerra}` };
        faltasMap[key].count++;
      });
      setFaltasData(Object.values(faltasMap).sort((a, b) => b.count - a.count).slice(0, 5));
    };

    fetchData();
  }, [companyFilter]);

  const COLORS = ['hsl(220, 70%, 25%)', 'hsl(45, 93%, 47%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        >
          <option value="">Todas as companhias</option>
          {COMPANHIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

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
                  <Bar dataKey="taxa" fill="hsl(220, 70%, 25%)" radius={[0, 4, 4, 0]} />
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
                  <Bar dataKey="total" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados mensais.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Militares com Mais Faltas</CardTitle></CardHeader>
          <CardContent>
            {faltasData.length > 0 ? (
              <div className="space-y-3">
                {faltasData.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium text-foreground">{f.name}</span>
                    <span className="text-sm font-bold text-destructive">{f.count} falta{f.count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma falta registrada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
