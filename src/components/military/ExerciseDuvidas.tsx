import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Props = {
  exerciseId: string;
  exerciseName: string;
};

export function ExerciseDuvidas({ exerciseId, exerciseName }: Props) {
  const { user } = useAuth();
  const [duvidas, setDuvidas] = useState<any[]>([]);
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchDuvidas = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('duvidas_exercicios')
      .select('*')
      .eq('exercise_id', exerciseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDuvidas(data || []);
  };

  useEffect(() => { fetchDuvidas(); }, [exerciseId, user]);

  const handleSend = async () => {
    if (!mensagem.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from('duvidas_exercicios').insert({
      user_id: user.id,
      exercise_id: exerciseId,
      mensagem: mensagem.trim(),
    });
    if (error) { toast.error('Erro ao enviar dúvida.'); }
    else {
      toast.success('Dúvida enviada!');
      setMensagem('');
      fetchDuvidas();
    }
    setSending(false);
  };

  const pendentes = duvidas.filter(d => d.status === 'pendente').length;
  const respondidas = duvidas.filter(d => d.status === 'respondido').length;

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <MessageCircle className="h-4 w-4" />
        <span>Dúvidas</span>
        {pendentes > 0 && <Badge variant="secondary" className="text-xs">{pendentes} pendente(s)</Badge>}
        {respondidas > 0 && <Badge variant="outline" className="text-xs">{respondidas} respondida(s)</Badge>}
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Tem alguma dúvida sobre este exercício?"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Button size="sm" onClick={handleSend} disabled={sending || !mensagem.trim()} className="self-end">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* History */}
          {duvidas.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {duvidas.map((d) => (
                <div key={d.id} className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(d.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                    <Badge variant={d.status === 'respondido' ? 'default' : 'secondary'} className="text-xs">
                      {d.status === 'respondido' ? 'Respondido' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-foreground">{d.mensagem}</p>
                  {d.resposta && (
                    <div className="mt-2 rounded bg-primary/10 p-2 text-sm">
                      <p className="text-xs font-medium text-primary mb-1">Resposta do fisioterapeuta:</p>
                      <p className="text-foreground">{d.resposta}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
