import { fetchTriviaBatch } from "./geminiService";
import { localQuizService } from "./localQuizService";
import { QuizQuestion, Language } from "../types";

interface CachedQuestion extends QuizQuestion {
  localId: string;
  usageCount: number;
}

class QuizService {
  private cache: CachedQuestion[] = [];
  private fetchingPromise: Promise<CachedQuestion[]> | null = null;
  private currentTopic: string = "";
  private currentLanguage: Language = Language.EN_US;

  private async loadNewBatch(
    topic: string,
    lang: Language
  ): Promise<CachedQuestion[]> {
    const questions = localQuizService.has(topic)
      ? localQuizService.get(topic)
      :await fetchTriviaBatch(topic, lang);

    return questions.map((q, i) => ({
      ...q,
      usageCount: 0,
      localId: `${Date.now()}-${i}-${Math.random()}`,
    }));
  }

  private triggerFetch(
    topic: string,
    lang: Language
  ): Promise<CachedQuestion[]> {
    if (this.fetchingPromise) return this.fetchingPromise;

    const p = this.loadNewBatch(topic, lang)
      .then((res) => {
        this.fetchingPromise = null;
        return res;
      })
      .catch((err) => {
        console.error(err);
        this.fetchingPromise = null;
        return [];
      });
    this.fetchingPromise = p;
    return p;
  }

  async initialize(topic: string, language: Language): Promise<void> {
    if (this.currentTopic === topic && this.currentLanguage === language) {
      return;
    }

    this.currentTopic = topic;
    this.currentLanguage = language;
    this.cache = [];

    const newBatch = await this.triggerFetch(topic, language);

    if (newBatch.length > 0) {
      this.cache = newBatch;
    }
  }

  async getNextQuestion(): Promise<QuizQuestion> {
    const candidates = this.cache.filter((q) => q.usageCount < 1);

    if (candidates.length < 5 && !this.fetchingPromise) {
      this.triggerFetch(this.currentTopic, this.currentLanguage).then(
        (newBatch) => {
          if (newBatch.length > 0) {
            this.cache = [...this.cache, ...newBatch];
          }
        }
      );
    }

    if (candidates.length > 0) {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      this.cache = this.cache.map((q) =>
        q.localId === selected.localId ? { ...q, usageCount: q.usageCount + 1 } : q
      );
      return selected;
    }

    let newBatch: CachedQuestion[] = [];
    if (this.fetchingPromise) {
      newBatch = await this.fetchingPromise;
    } else {
      newBatch = await this.triggerFetch(
        this.currentTopic,
        this.currentLanguage
      );
    }

    if (newBatch.length > 0) {
      this.cache = [...this.cache, ...newBatch];
      const selected = newBatch[0];
      this.cache = this.cache.map((q) =>
        q.localId === selected.localId ? { ...q, usageCount: 1 } : q
      );
      return selected;
    }

    return {
      question: "Which animal says 'Moo'? (Offline)",
      options: ["Cat", "Cow", "Dog", "Fish"],
      correctIndex: 1,
    };
  }

  reset(): void {
    this.cache = [];
    this.fetchingPromise = null;
    this.currentTopic = "";
    this.currentLanguage = Language.EN_US;
  }
}

export const quizService = new QuizService();
