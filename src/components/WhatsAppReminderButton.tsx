import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppReminderButtonProps {
  nome: string;
  telefone: string | null;
  dataHora: string;
  size?: 'sm' | 'default';
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length === 11 || digits.length === 10) return '55' + digits;
  return '55' + digits;
}

export function WhatsAppReminderButton({ nome, telefone, dataHora, size = 'sm' }: WhatsAppReminderButtonProps) {
  const [sent, setSent] = useState(false);

  const handleClick = () => {
    if (!telefone) {
      toast.error('Paciente não possui telefone cadastrado.');
      return;
    }

    const dt = new Date(dataHora);
    const data = format(dt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const hora = format(dt, 'HH:mm');

    const mensagem = `Olá ${nome}! 👋
Passando para lembrar do seu atendimento de fisioterapia.

📅 Data: ${data}
⏰ Horário: ${hora}

Por favor, confirme sua presença.`;

    const phone = formatPhone(telefone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, '_blank');
    toast.success('Mensagem pronta para envio!');
    setSent(true);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={sent ? 'outline' : 'default'}
          size={size}
          onClick={handleClick}
          className={sent ? 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950' : 'bg-green-600 hover:bg-green-700 text-white'}
        >
          {sent ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              <MessageCircle className="h-4 w-4 mr-1" />
              Reenviar lembrete
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4 mr-1" />
              Enviar lembrete
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Enviar lembrete para o paciente via WhatsApp</p>
      </TooltipContent>
    </Tooltip>
  );
}
