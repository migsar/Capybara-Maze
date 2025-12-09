import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, GameSettings, Position, TriviaQuestion, EntityType } from '../types';
import { TRANSLATIONS } from '../constants';
import { generateTriviaQuestion } from '../services/geminiService';
import { GameEngine } from '../classes/GameEngine';

interface Props {
  settings: GameSettings;
  onGameOver: (score: number) => void;
}

const Game: React.FC<Props> = ({ settings, onGameOver }) => {
  const t = TRANSLATIONS[settings.language];
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game UI State
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  
  // Trivia State
  const [currentTrivia, setCurrentTrivia] = useState<TriviaQuestion | null>(null);
  const [gatePosForTrivia, setGatePosForTrivia] = useState<Position | null>(null);
  const [loadingTrivia, setLoadingTrivia] = useState(false);
  const [triviaFeedback, setTriviaFeedback] = useState<'correct' | 'wrong' | null>(null);

  // --- Engine Initialization ---
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Callback to bridge Engine Events -> React State
    const handleEngineEvent = (event: string, data: any) => {
      switch(event) {
        case 'GATE_HIT':
          handleGateEncounter(data);
          break;
        case 'GET_TREAT':
          setScore(s => s + 100);
          break;
        case 'HIT_PREDATOR':
          setLives(prev => {
             const newLives = prev - 1;
             if (newLives <= 0) {
               setGameState(GameState.GAME_OVER);
               onGameOver(score); // Pass current score (state capture issue avoided by refs inside engine usually, but here we use simple logic)
             }
             return newLives;
          });
          break;
        case 'WIN_LEVEL':
          setScore(s => s + 1000);
          setLevel(l => l + 1);
          break;
      }
    };

    const engine = new GameEngine(canvasContainerRef.current, handleEngineEvent);
    engine.init().then(() => {
      engine.loadLevel(level);
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // --- Level Change Effect ---
  useEffect(() => {
    if (engineRef.current && level > 1) {
      engineRef.current.loadLevel(level);
      engineRef.current.resume();
    }
  }, [level]);

  // --- Game Over Effect ---
  useEffect(() => {
    if (lives <= 0) {
      onGameOver(score);
    }
  }, [lives, onGameOver, score]);


  // --- Trivia Logic ---
  const handleGateEncounter = async (pos: Position) => {
    setGameState(GameState.TRIVIA);
    setGatePosForTrivia(pos);
    setLoadingTrivia(true);
    
    // Pause Engine is handled inside engine when emitting event
    const question = await generateTriviaQuestion(settings.topic, settings.language);
    setCurrentTrivia(question);
    setLoadingTrivia(false);
  };

  const handleTriviaAnswer = (index: number) => {
    if (!currentTrivia || !gatePosForTrivia || !engineRef.current) return;

    if (index === currentTrivia.correctIndex) {
      setTriviaFeedback('correct');
      setTimeout(() => {
        engineRef.current?.unlockGate(gatePosForTrivia); // Unlocks and Resumes
        setScore(prev => prev + 500);
        setTriviaFeedback(null);
        setCurrentTrivia(null);
        setGatePosForTrivia(null);
        setGameState(GameState.PLAYING);
      }, 1000);
    } else {
      setTriviaFeedback('wrong');
      setTimeout(() => {
        setLives(prev => prev - 1);
        setTriviaFeedback(null);
        setCurrentTrivia(null);
        setGatePosForTrivia(null);
        setGameState(GameState.PLAYING);
        engineRef.current?.resume(); // Resume without unlocking
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-950 text-white p-2">
      {/* UI Overlay */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-4 bg-stone-900 p-4 border-2 border-green-700 rounded-lg shadow-lg">
         <div className="flex flex-col">
           <span className="text-green-500 text-xs">{t.score}</span>
           <span className="text-2xl font-bold">{score.toString().padStart(6, '0')}</span>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-green-500 text-xs">{t.level}</span>
           <span className="text-2xl font-bold">{level}</span>
         </div>
         <div className="flex flex-col items-end">
           <span className="text-green-500 text-xs">{t.lives}</span>
           <div className="flex text-red-500 text-xl">
             {Array.from({ length: Math.max(0, lives) }).map((_, i) => <span key={i}>❤️</span>)}
           </div>
         </div>
      </div>

      {/* PixiJS Canvas Container */}
      <div 
        id="game-canvas-container" 
        ref={canvasContainerRef}
        className="flex justify-center items-center"
      >
        {/* Canvas is injected here by GameEngine */}
      </div>

      {/* Trivia Modal */}
      {gameState === GameState.TRIVIA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border-4 border-yellow-600 rounded-lg max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             {loadingTrivia ? (
               <div className="text-center py-10">
                 <div className="text-4xl mb-4">🧠</div>
                 <p className="text-yellow-400 text-xl animate-pulse">{t.loadingQuestion}</p>
               </div>
             ) : currentTrivia ? (
               <>
                {triviaFeedback ? (
                  <div className={`text-center py-12 text-4xl font-bold ${triviaFeedback === 'correct' ? 'text-green-400' : 'text-red-500'}`}>
                    {triviaFeedback === 'correct' ? t.correct : t.wrong}
                  </div>
                ) : (
                  <>
                    <h3 className="text-yellow-500 text-lg mb-2 uppercase tracking-wider">{t.gateLocked}</h3>
                    <p className="text-white text-xl md:text-2xl mb-6 font-bold leading-relaxed">{currentTrivia.question}</p>
                    <div className="grid grid-cols-1 gap-3">
                      {currentTrivia.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTriviaAnswer(idx)}
                          className="text-left bg-stone-800 hover:bg-yellow-700 text-yellow-100 p-4 rounded border-2 border-stone-600 hover:border-yellow-400 transition-all"
                        >
                          <span className="inline-block w-6 font-bold text-yellow-500">{String.fromCharCode(65 + idx)}.</span> {option}
                        </button>
                      ))}
                    </div>
                  </>
                )}
               </>
             ) : (
               <div className="text-red-500 text-center">
                 Error loading question. 
                 <button onClick={() => {
                   setGameState(GameState.PLAYING);
                   engineRef.current?.resume();
                 }} className="underline ml-2">Skip</button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;