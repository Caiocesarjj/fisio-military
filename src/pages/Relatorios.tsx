import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANHIAS } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Relatorios() {
  const [presenceData, setPresenceData] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [membroData, setMembroData] = useState<any[]>([]);
  const [topMonth, setTopMonth] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('status, militar_id, data_hora, militares(nome_guerra, posto_graduacao, companhia, lesoes)');

      if (!sessions) return;

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
      const monthArr = Object.entries(monthMap).map(([name, total]) => ({ name, total }));
      setMonthlyData(monthArr);

      // Top month
      if (monthArr.length > 0) {
        const top = monthArr.reduce((a, b) => (a.total > b.total ? a : b));
        setTopMonth(`${top.name} (${top.total} atendimentos)`);
      }

      // Atendimentos por membro (lesão segmento)
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
