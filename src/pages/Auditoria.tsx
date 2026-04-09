import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string;
  tabela_afetada: string;
  operacao: string;
  registro_id: string | null;
  dados_anteriores: any;
  dados_novos: any;
  usuario_id: string | null;
  usuario_nome: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const opColors: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  UPDATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function describeChange(log: AuditLog): string {
  if (log.operacao === 'INSERT') {
    const nome = log.dados_novos?.nome_guerra || log.dados_novos?.nome || '';
    return nome ? `Criou registro: ${nome}` : 'Novo registro criado';
  }
  if (log.operacao === 'DELETE') {
    const nome = log.dados_anteriores?.nome_guerra || log.dados_anteriores?.nome || '';
    return nome ? `Removeu registro: ${nome}` : 'Registro removido';
  }
  if (log.operacao === 'UPDATE' && log.dados_anteriores && log.dados_novos) {
    const changes: string[] = [];
    for (const key of Object.keys(log.dados_novos)) {
      if (['updated_at', 'created_at'].includes(key)) continue;
      if (JSON.stringify(log.dados_anteriores[key]) !== JSON.stringify(log.dados_novos[key])) {
        changes.push(key);
      }
    }
    return changes.length > 0 ? `Alterou: ${changes.slice(0, 4).join(', ')}${changes.length > 4 ? '...' : ''}` : 'Atualização sem mudanças visíveis';
  }
  return '-';
}

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterOp, setFilterOp] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterOp) query = query.eq('operacao', filterOp);
    if (filterDate) {
      const start = `${filterDate}T00:00:00`;
      const end = `${filterDate}T23:59:59`;
      query = query.gte('created_at', start).lte('created_at', end);
    }

    const { data, count } = await query;
    setLogs((data as AuditLog[]) || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, filterOp, filterDate]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Operação</label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={filterOp}
            onChange={(e) => { setFilterOp(e.target.value); setPage(0); }}
          >
            <option value="">Todas</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data</label>
          <Input
            type="date"
            className="h-9 w-44"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Data/Hora</TableHead>
                <TableHead className="w-[90px]">Operação</TableHead>
                <TableHead className="w-[130px]">Tabela</TableHead>
                <TableHead className="w-[150px]">Usuário</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum log encontrado.</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${opColors[log.operacao] || ''}`} variant="secondary">
                        {log.operacao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.tabela_afetada}</TableCell>
                    <TableCell className="text-sm truncate max-w-[150px]">{log.usuario_nome || 'Sistema'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{describeChange(log)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages} · {total} registros
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
