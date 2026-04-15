export const POSTOS_GRADUACOES = {
  oficiais: [
    'Almirante de Esquadra',
    'Vice-Almirante',
    'Contra-Almirante',
    'Capitão de Mar e Guerra',
    'Capitão de Fragata',
    'Capitão de Corveta',
    'Capitão-Tenente',
    'Primeiro-Tenente',
    'Segundo-Tenente',
    'Guarda-Marinha',
  ],
  pracas: [
    'Suboficial',
    'Primeiro-Sargento',
    'Segundo-Sargento',
    'Terceiro-Sargento',
    'Cabo',
    'Soldado',
  ],
};

export const COMPANHIAS = ['1ª Cia', '2ª Cia', '3ª Cia', 'Cia Apoio', 'CCS', 'Externo'];

export const CATEGORIAS_EXERCICIO = [
  'Bíceps Braquial',
  'Coluna',
  'Fascite Plantar',
  'Joelho',
  'Lesão Gastrocnêmio e Sóleo',
  'Lesão Posterior',
  'Mão',
  'Neurológico',
  'Ombro',
  'Outras Lesões Articulares',
  'Outras Lesões Musculares',
  'Pós-operatório',
  'Pubalgia',
  'Punho',
  'Quadríceps Anterior',
  'Quadril',
  'Respiratório',
  'Síndrome da Banda Iliotibial',
  'Síndrome do Piriforme',
  'Tendinopatia de Aquiles',
  'Tibial Anterior (Canelite)',
  'Tornozelo',
  'Tríceps',
];

export const DIFICULDADES = ['Fácil', 'Moderado', 'Difícil', 'Avançado'];

export const FASES_EXERCICIO = ['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4'];

export const STATUS_SESSAO = ['agendado', 'realizado', 'faltou', 'cancelado'];
export const TIPOS_ATENDIMENTO = ['presencial', 'online'];

export function formatNip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 6)}.${digits.slice(6)}`;
}
