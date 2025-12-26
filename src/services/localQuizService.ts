import { prompts } from '../prompts';
import { TriviaQuestion } from "../types";

interface AIQuestionData {
  options: Array<string>;
  correct_index: number;
}

interface AIQuestion {
  question_text: string;
  question_data: AIQuestionData;
}

interface PromptDefinition {
  id: string;
  prompt: string;
  questions: Array<AIQuestion>;
}

class LocalQuizService {
  private quizzes: Record<string, Array<TriviaQuestion>> = {};
  
  constructor() {
    this.loadQuizzes();
  }

  private loadQuizzes() {
    prompts.forEach(async ({ id, questions: promptQuestions }: PromptDefinition) => {
      const questions = promptQuestions.map((q) => {
        const { question_text: question, question_data: { options, correct_index: correctIndex } } = q;

        return {
          question,
          options,
          correctIndex,
        };
      });
      
      this.quizzes[id] = questions;
    });
  }

  public has(quizzId: string): boolean {
    return Object.keys(this.quizzes).includes(quizzId);
  }

  public get(quizzId: string): Array<TriviaQuestion> {
    return this.quizzes[quizzId];
  }
}

export const localQuizService = new LocalQuizService();
