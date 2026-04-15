import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppCredentialsButtonProps {
  nome: string;
  telefone: string | null;
  nip: string;
  size?: 'sm' | 'default';
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return '55' + digits;
}

export function WhatsAppCredentialsButton({ nome, telefone, nip, size = 'sm' }: WhatsAppCredentialsButtonProps) {
  const [sent, setSent] = useState(false);

  const handleClick = () => {
    if (!telefone) {
      toast.error('Militar não possui telefone cadastrado.');
      return;
    }

    const appUrl = 'https://fisioton.lovable.app';

    const mensagem = `Olá ${nome}! 👋

Seu acesso ao sistema *Fisioteria Tonelero* está pronto! 🏥

📱 *Link do aplicativo:*
${appUrl}

🔐 *Seus dados de acesso:*
• *Usuário (NIP):* ${nip}
• *Senha:* ${nip}

⚠️ Recomendamos alterar sua senha no primeiro acesso.

Qualquer dúvida, entre em contato conosco!`;

    const phone = formatPhone(telefone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
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
              Reenviar
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4 mr-1" />
              Enviar acesso
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Enviar link e credenciais via WhatsApp</p>
      </TooltipContent>
    </Tooltip>
  );
}
