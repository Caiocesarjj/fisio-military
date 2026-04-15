import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Database, FileSpreadsheet, FileJson, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: any[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = r[c];
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

export default function Configuracoes() {
  const [exporting, setExporting] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem('lastBackup'));
  const [fisioNome, setFisioNome] = useState(localStorage.getItem('fisioNome') || '');
  const [fisioCrefito, setFisioCrefito] = useState(localStorage.getItem('fisioCrefito') || '');

  const saveFisioData = () => {
    localStorage.setItem('fisioNome', fisioNome);
    localStorage.setItem('fisioCrefito', fisioCrefito);
    toast.success('Dados do fisioterapeuta salvos!');
  };

  const saveTimestamp = () => {
    const ts = new Date().toLocaleString('pt-BR');
    localStorage.setItem('lastBackup', ts);
    setLastBackup(ts);
  };

  const exportMilitaresCsv = async () => {
    setExporting('militares');
    const { data } = await supabase.from('militares').select('*').order('nome_guerra');
    if (data && data.length > 0) {
      const cols = Object.keys(data[0]);
      downloadFile(toCsv(data, cols), `militares_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
      saveTimestamp();
      toast.success('Militares exportados!');
    } else {
      toast.error('Nenhum dado para exportar.');
    }
    setExporting('');
  };

  const exportSessionsCsv = async () => {
    setExporting('sessions');
    const { data } = await supabase.from('sessions').select('*').order('data_hora', { ascending: false });
    if (data && data.length > 0) {
      const cols = Object.keys(data[0]);
      downloadFile(toCsv(data, cols), `sessoes_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
      saveTimestamp();
      toast.success('Sessões exportadas!');
    } else {
      toast.error('Nenhum dado para exportar.');
    }
    setExporting('');
  };

  const exportFullJson = async () => {
    setExporting('json');
    const [mil, sess, plans, exercises, planEx, notes] = await Promise.all([
      supabase.from('militares').select('*'),
      supabase.from('sessions').select('*'),
      supabase.from('treatment_plans').select('*'),
      supabase.from('exercises').select('*'),
      supabase.from('plan_exercises').select('*'),
      supabase.from('session_notes').select('*'),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      militares: mil.data || [],
      sessions: sess.data || [],
      treatment_plans: plans.data || [],
      exercises: exercises.data || [],
      plan_exercises: planEx.data || [],
      session_notes: notes.data || [],
    };

    downloadFile(JSON.stringify(backup, null, 2), `backup_fisioapp_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    saveTimestamp();
    toast.success('Backup completo exportado!');
    setExporting('');
  };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error('Erro ao alterar senha: ' + error.message);
    } else {
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Alterar Minha Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword || newPassword.length < 6}>
            {changingPassword ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Fisioterapeuta Responsável
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nome do Fisioterapeuta</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={fisioNome}
                onChange={e => setFisioNome(e.target.value)}
                placeholder="Nome completo do fisioterapeuta"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">CREFITO</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={fisioCrefito}
                onChange={e => setFisioCrefito(e.target.value)}
                placeholder="Ex: CREFITO-2: 000000-X"
              />
            </div>
          </div>
          <Button onClick={saveFisioData} size="sm">Salvar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> Backup de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Exporte os dados do sistema em diferentes formatos para backup ou análise externa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={exportMilitaresCsv} disabled={!!exporting}>
              <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
              <span className="text-sm font-medium">Militares (CSV)</span>
              <span className="text-xs text-muted-foreground">Todos os campos</span>
            </Button>

            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={exportSessionsCsv} disabled={!!exporting}>
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">Sessões (CSV)</span>
              <span className="text-xs text-muted-foreground">Histórico completo</span>
            </Button>

            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={exportFullJson} disabled={!!exporting}>
              <FileJson className="h-6 w-6 text-amber-600" />
              <span className="text-sm font-medium">Backup Completo (JSON)</span>
              <span className="text-xs text-muted-foreground">Todos os dados</span>
            </Button>
          </div>

          {lastBackup && (
            <p className="text-xs text-muted-foreground mt-2">
              Último backup: {lastBackup}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
