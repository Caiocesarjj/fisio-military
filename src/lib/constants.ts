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

export const COMPANHIAS = ['1ª Cia', '2ª Cia', '3ª Cia', 'Cia Apoio', 'CCS'];

export const CATEGORIAS_EXERCICIO = [
  'Coluna',
  'Joelho',
  'Ombro',
  'Quadril',
  'Tornozelo',
  'Neurológico',
  'Respiratório',
  'Pós-operatório',
];

export const DIFICULDADES = ['Fácil', 'Moderado', 'Difícil', 'Avançado'];

export const STATUS_SESSAO = ['agendado', 'realizado', 'faltou', 'cancelado'];
export const TIPOS_ATENDIMENTO = ['presencial', 'online'];

export function formatNip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 6)}.${digits.slice(6)}`;
}
