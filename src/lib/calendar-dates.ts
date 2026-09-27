import type { NoteData, RecordItem } from "./crm-types";

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function noteDay(note: RecordItem<NoteData>) {
  return note.data.date || dateKey(new Date(note.createdAt));
}

export type CalendarDate = {
  date: string;
  title: string;
  icon: string;
  type:
    | "Feriado nacional"
    | "Data comemorativa"
    | "Ponto facultativo federal"
    | "Feriado religioso local";
};

// Base nacional e comercial. Fontes e limites em docs/calendario-brasil.md.
const fixed: [string, string, string, CalendarDate["type"]?][] = [
  ["01-01", "Confraternização Universal", "🎆", "Feriado nacional"],
  ["01-06", "Dia de Reis", "👑"],
  ["01-30", "Dia da Saudade", "💌"],
  ["02-14", "Dia da Amizade", "🤝"],
  ["03-08", "Dia Internacional da Mulher", "🌷"],
  ["03-15", "Dia do Consumidor", "🛍️"],
  ["03-20", "Dia Internacional da Felicidade", "😊"],
  ["03-22", "Dia Mundial da Água", "💧"],
  ["04-01", "Dia da Mentira", "🎭"],
  ["04-02", "Dia Mundial de Conscientização do Autismo", "🧩"],
  ["04-07", "Dia Mundial da Saúde", "💚"],
  ["04-18", "Dia Nacional do Livro Infantil", "📚"],
  ["04-19", "Dia dos Povos Indígenas", "🌿"],
  ["04-21", "Tiradentes", "🇧🇷", "Feriado nacional"],
  ["04-22", "Dia da Terra", "🌎"],
  ["04-23", "Dia Mundial do Livro", "📖"],
  ["05-01", "Dia do Trabalho", "🧰", "Feriado nacional"],
  ["05-12", "Dia Internacional da Enfermagem", "🩺"],
  ["05-15", "Dia Internacional da Família", "🏡"],
  ["05-25", "Dia da Indústria", "🏭"],
  ["06-05", "Dia Mundial do Meio Ambiente", "🌱"],
  ["06-12", "Dia dos Namorados", "💝"],
  ["06-13", "Santo Antônio", "🎉"],
  ["06-24", "São João", "🔥"],
  ["06-29", "São Pedro", "🎣"],
  ["07-10", "Dia da Pizza", "🍕"],
  ["07-13", "Dia do Rock", "🎸"],
  ["07-20", "Dia do Amigo", "🤝"],
  ["07-26", "Dia dos Avós", "💛"],
  ["07-28", "Dia do Agricultor", "🌾"],
  ["08-11", "Dia do Estudante", "🎓"],
  ["08-22", "Dia do Folclore", "🎨"],
  ["09-07", "Independência do Brasil", "🇧🇷", "Feriado nacional"],
  ["09-15", "Dia do Cliente", "💜"],
  ["09-21", "Dia da Árvore", "🌳"],
  ["09-27", "Dia Mundial do Turismo", "🧳"],
  ["10-01", "Dia Internacional da Pessoa Idosa", "💛"],
  ["10-04", "Dia Mundial dos Animais", "🐾"],
  ["10-05", "Dia do Empreendedor", "🚀"],
  ["10-12", "Nossa Senhora Aparecida", "🕊️", "Feriado nacional"],
  ["10-12", "Dia das Crianças", "🧸"],
  ["10-15", "Dia dos Professores", "📚"],
  ["10-31", "Halloween / Dia do Saci", "🎃"],
  ["11-02", "Finados", "🕯️", "Feriado nacional"],
  ["11-15", "Proclamação da República", "🇧🇷", "Feriado nacional"],
  ["11-19", "Dia da Bandeira", "🇧🇷"],
  [
    "11-20",
    "Dia Nacional de Zumbi e da Consciência Negra",
    "✊🏿",
    "Feriado nacional",
  ],
  ["12-03", "Dia Internacional da Pessoa com Deficiência", "♿"],
  ["12-08", "Dia da Família", "🏡"],
  ["12-24", "Véspera de Natal", "🎁"],
  ["12-25", "Natal", "🎄", "Feriado nacional"],
  ["12-31", "Réveillon", "✨"],
];

export function brazilianDates(year: number): CalendarDate[] {
  const dates = fixed.map(([day, title, icon, type]) => ({
    date: `${year}-${day}`,
    title,
    icon,
    type: type || ("Data comemorativa" as CalendarDate["type"]),
  }));
  // Meeus/Jones/Butcher, calendário gregoriano. Meio-dia evita mudanças de data por horário de verão.
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100;
  const d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easter = new Date(
    year,
    Math.floor((h + l - 7 * m + 114) / 31) - 1,
    ((h + l - 7 * m + 114) % 31) + 1,
    12,
  );
  const add = (
    date: Date,
    title: string,
    icon: string,
    type: CalendarDate["type"] = "Data comemorativa",
  ) => dates.push({ date: dateKey(date), title, icon, type });
  const offset = (days: number) =>
    new Date(year, easter.getMonth(), easter.getDate() + days, 12);
  add(
    offset(-48),
    "Segunda-feira de Carnaval",
    "🎭",
    "Ponto facultativo federal",
  );
  add(offset(-47), "Carnaval", "🎭", "Ponto facultativo federal");
  add(offset(-46), "Quarta-feira de Cinzas", "🎭", "Ponto facultativo federal");
  add(offset(-2), "Sexta-feira da Paixão", "🕊️", "Feriado religioso local");
  add(easter, "Páscoa", "🐰");
  add(offset(60), "Corpus Christi", "🕊️", "Ponto facultativo federal");
  const nthWeekday = (month: number, weekday: number, nth: number) =>
    new Date(
      year,
      month,
      1 +
        ((weekday - new Date(year, month, 1).getDay() + 7) % 7) +
        (nth - 1) * 7,
      12,
    );
  add(nthWeekday(4, 0, 2), "Dia das Mães", "🌸");
  add(nthWeekday(7, 0, 2), "Dia dos Pais", "💙");
  const thanksgiving = nthWeekday(10, 4, 4);
  add(new Date(year, 10, thanksgiving.getDate() + 1, 12), "Black Friday", "🛍️");
  add(new Date(year, 10, thanksgiving.getDate() + 4, 12), "Cyber Monday", "💻");
  return dates.sort((a, b) => a.date.localeCompare(b.date));
}
