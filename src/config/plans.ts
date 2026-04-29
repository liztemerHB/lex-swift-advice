export type PlanId = "free" | "pro" | "unlimited";

export interface PlanConfig {
  id: PlanId;
  name: string;
  priceRub: number;
  tagline: string;
  // Daily AI message limit. null = unlimited
  dailyAiMessages: number | null;
  // Documents per month (Pro) or per day (Unlimited). Whichever is set is used.
  monthlyDocuments: number | null;
  dailyDocuments: number | null;
  // Max file uploads per message
  maxFileUploadMB: number;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceRub: 0,
    tagline: "Начните разбирать ситуацию",
    dailyAiMessages: 3,
    monthlyDocuments: 0,
    dailyDocuments: 0,
    maxFileUploadMB: 0,
    features: [
      "3 сообщения ИИ-юристу в день",
      "Базовый план действий",
      "Передача дела профильному юристу",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceRub: 399,
    tagline: "Детальный разбор и документы",
    dailyAiMessages: 50,
    monthlyDocuments: 3,
    dailyDocuments: null,
    maxFileUploadMB: 10,
    highlight: true,
    features: [
      "До 50 сообщений ИИ-юристу в день",
      "Детальный разбор юридической проблемы",
      "Загрузка файлов до 10 МБ",
      "Генерация документов: 3 в месяц",
      "Приоритетная очередь к юристу",
    ],
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    priceRub: 3999,
    tagline: "Без ограничений",
    dailyAiMessages: null,
    monthlyDocuments: null,
    dailyDocuments: 15,
    maxFileUploadMB: 50,
    features: [
      "Безлимит сообщений ИИ-юристу",
      "Загрузка файлов до 50 МБ",
      "До 15 документов в день",
      "Редактирование сгенерированных документов",
      "Персональный менеджер",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "unlimited"];

// Referral bonus
export const REFERRAL_BONUS_MESSAGES = 5;
