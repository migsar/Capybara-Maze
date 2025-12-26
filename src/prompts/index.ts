import mathQuestions from './deepseek_json_20251224_352860.json';

export const prompts = [
  {
    id: 'Basic Math for 6 year olds',
    prompt: '20 interesting question for my 6yo daughter, all of them just numbers, without any text, about addition and substraction for numbers from 0 to 20, considering that addition result should be at most 20',
    questions: mathQuestions.questions,
  },
];
