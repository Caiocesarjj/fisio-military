import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SignaturePad from '@/components/SignaturePad';
import jsPDF from 'jspdf';

interface Militar {
  id: string;
  nip: string;
  nome_completo: string;
  nome_guerra: string;
  posto_graduacao: string;
  companhia: string;
}

interface TCLEModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  militar: Militar;
}

const TCLE_TEXT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)

Eu, abaixo identificado(a), declaro que fui devidamente informado(a) e esclarecido(a) sobre os procedimentos de avaliação e tratamento fisioterapêutico aos quais serei submetido(a), incluindo:

1. OBJETIVO DO TRATAMENTO: O tratamento fisioterapêutico tem como objetivo a reabilitação funcional, alívio da dor, melhora da mobilidade, fortalecimento muscular e/ou prevenção de lesões, conforme avaliação clínica individualizada.

2. PROCEDIMENTOS: Poderão ser utilizados recursos como exercícios terapêuticos, técnicas manuais, eletroterapia, termoterapia, crioterapia, hidroterapia e demais recursos fisioterapêuticos, de acordo com a necessidade clínica.

3. RISCOS E DESCONFORTOS: Embora os procedimentos fisioterapêuticos sejam considerados seguros, podem ocorrer desconfortos temporários como dor muscular, fadiga ou irritação cutânea em casos de uso de equipamentos. Qualquer desconforto deverá ser comunicado imediatamente ao fisioterapeuta.

4. BENEFÍCIOS ESPERADOS: Espera-se melhora do quadro clínico, aumento da funcionalidade e qualidade de vida, embora os resultados possam variar de acordo com a condição individual e adesão ao tratamento.

5. DIREITO DE RECUSA: Estou ciente de que posso recusar ou interromper o tratamento a qualquer momento, sem prejuízo ao meu atendimento.

6. SIGILO: As informações obtidas durante o tratamento são confidenciais e serão utilizadas exclusivamente para fins clínicos e/ou acadêmicos, resguardando minha identidade.

7. AUTORIZAÇÃO PARA USO DE IMAGEM: Caso aplicável, autorizo ou não autorizo o registro fotográfico e/ou em vídeo para fins de acompanhamento clínico e/ou acadêmico, conforme assinalado abaixo.`;

export default function TCLEModal({ open, onOpenChange, militar }: TCLEModalProps) {
  const [fisioNome, setFisioNome] = useState(localStorage.getItem('fisioNome') || '');
  const [fisioCrefito, setFisioCrefito] = useState(localStorage.getItem('fisioCrefito') || '');
  const [autorizaImagem, setAutorizaImagem] = useState<boolean | null>(null);
  const [pacienteAssinatura, setPacienteAssinatura] = useState<string | null>(null);
  const [fisioAssinatura, setFisioAssinatura] = useState<string | null>(
    localStorage.getItem('fisioAssinatura')
  );
  const [generating, setGenerating] = useState(false);

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const canGenerate = pacienteAssinatura && fisioAssinatura && autorizaImagem !== null && fisioNome.trim() && fisioCrefito.trim();

  const saveFisioSignature = (dataUrl: string | null) => {
    setFisioAssinatura(dataUrl);
    if (dataUrl) localStorage.setItem('fisioAssinatura', dataUrl);
    else localStorage.removeItem('fisioAssinatura');
  };

  const generatePDF = async () => {
    if (!canGenerate) return;
    setGenerating(true);

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw = 210;
      const margin = 20;
      const contentW = pw - margin * 2;
      let y = 20;

      // Helper
      const addText = (text: string, size: number, style: 'normal' | 'bold' = 'normal', align: 'left' | 'center' = 'left') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        const lines = doc.splitTextToSize(text, contentW);
        if (y + lines.length * (size * 0.4) > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines, align === 'center' ? pw / 2 : margin, y, { align });
        y += lines.length * (size * 0.45) + 2;
      };

      // Header
      addText('TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO', 14, 'bold', 'center');
      addText('(TCLE)', 12, 'bold', 'center');
      y += 5;

      // Patient info
      addText(`Paciente: ${militar.nome_completo}`, 10, 'bold');
      addText(`NIP: ${militar.nip}    |    Posto/Graduação: ${militar.posto_graduacao}`, 10);
      addText(`Companhia: ${militar.companhia}`, 10);
      y += 3;

      doc.setDrawColor(200);
      doc.line(margin, y, pw - margin, y);
      y += 5;

      // Body paragraphs
      const paragraphs = TCLE_TEXT.split('\n\n').slice(1); // skip title
      for (const p of paragraphs) {
        addText(p.trim(), 9);
        y += 1;
      }

      y += 3;

      // Image authorization
      addText('AUTORIZAÇÃO PARA USO DE IMAGEM:', 10, 'bold');
      addText(autorizaImagem ? '[X] Autorizo o uso de imagem' : '[ ] Autorizo o uso de imagem', 9);
      addText(!autorizaImagem ? '[X] Não autorizo o uso de imagem' : '[ ] Não autorizo o uso de imagem', 9);

      y += 5;

      // Location and date
      addText(`Campo Grande, Rio de Janeiro – RJ, ${dataAtual}`, 10, 'normal', 'center');
      y += 10;

      // Signatures - check if we need a new page
      if (y > 230) { doc.addPage(); y = 30; }

      const sigW = 70;
      const sigH = 25;

      // Patient signature
      const leftX = margin + 5;
      const rightX = pw / 2 + 10;

      if (pacienteAssinatura) {
        doc.addImage(pacienteAssinatura, 'PNG', leftX, y, sigW, sigH);
      }
      if (fisioAssinatura) {
        doc.addImage(fisioAssinatura, 'PNG', rightX, y, sigW, sigH);
      }

      y += sigH + 2;

      doc.setDrawColor(0);
      doc.line(leftX, y, leftX + sigW, y);
      doc.line(rightX, y, rightX + sigW, y);
      y += 4;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(militar.nome_completo, leftX + sigW / 2, y, { align: 'center' });
      doc.text(fisioNome, rightX + sigW / 2, y, { align: 'center' });
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.text('Assinatura do Paciente ou Responsável Legal', leftX + sigW / 2, y, { align: 'center' });
      doc.text(`Fisioterapeuta – CREFITO ${fisioCrefito}`, rightX + sigW / 2, y, { align: 'center' });
      y += 3;
      doc.text(`NIP: ${militar.nip}`, leftX + sigW / 2, y, { align: 'center' });
      doc.text('Assinatura do Fisioterapeuta Responsável', rightX + sigW / 2, y, { align: 'center' });

      // Save locally
      const pdfBlob = doc.output('blob');
      const fileName = `tcle_${militar.nip.replace(/\./g, '')}_${Date.now()}.pdf`;

      // Upload to storage
      const { error } = await supabase.storage
        .from('tcle-documents')
        .upload(`${militar.id}/${fileName}`, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) throw error;

      // Also download
      doc.save(`TCLE_${militar.nome_guerra}.pdf`);

      // Save fisio data
      localStorage.setItem('fisioNome', fisioNome);
      localStorage.setItem('fisioCrefito', fisioCrefito);

      toast.success('TCLE gerado e salvo com sucesso!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar TCLE');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            TCLE – {militar.posto_graduacao} {militar.nome_guerra}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(95vh-140px)]">
          <div className="p-4 pt-0 space-y-4">
            {/* Patient info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">{militar.nome_completo}</p>
              <p className="text-xs text-muted-foreground">NIP: {militar.nip} • {militar.posto_graduacao} • {militar.companhia}</p>
            </div>

            {/* TCLE text */}
            <div className="border rounded-lg p-3 bg-card">
              <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/90">{TCLE_TEXT}</p>
            </div>

            {/* Image authorization */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Autorização de uso de imagem *</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={autorizaImagem === true} onCheckedChange={() => setAutorizaImagem(true)} />
                  <span className="text-sm">Autorizo o uso de imagem</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={autorizaImagem === false} onCheckedChange={() => setAutorizaImagem(false)} />
                  <span className="text-sm">Não autorizo o uso de imagem</span>
                </label>
              </div>
            </div>

            <Separator />

            {/* Fisio data */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Dados do Fisioterapeuta</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input value={fisioNome} onChange={(e) => setFisioNome(e.target.value)} placeholder="Nome completo" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CREFITO *</Label>
                  <Input value={fisioCrefito} onChange={(e) => setFisioCrefito(e.target.value)} placeholder="Ex: 12345-F" className="h-8 text-sm" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Signatures */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Assinaturas *</Label>
              <p className="text-xs text-muted-foreground">Campo Grande, Rio de Janeiro – RJ, {dataAtual}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <SignaturePad label="Assinatura do Paciente" onSignatureChange={setPacienteAssinatura} height={100} />
                  <p className="text-[10px] text-center font-medium">{militar.nome_completo}</p>
                  <p className="text-[10px] text-center text-muted-foreground">Assinatura do Paciente ou Responsável Legal</p>
                </div>
                <div className="space-y-1">
                  <SignaturePad
                    label="Assinatura do Fisioterapeuta"
                    onSignatureChange={saveFisioSignature}
                    initialSignature={fisioAssinatura}
                    height={100}
                  />
                  <p className="text-[10px] text-center font-medium">{fisioNome || '—'}</p>
                  <p className="text-[10px] text-center text-muted-foreground">CREFITO {fisioCrefito || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="border-t p-3 flex justify-between items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" disabled={!canGenerate || generating} onClick={generatePDF}>
            {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
