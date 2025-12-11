import React, { useEffect, useRef, useState } from 'react';
import { GameState, GameSettings, Position, TriviaQuestion } from '../types';
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
  const [lives, setLives] = useState(4);
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  
  // Trivia State
  const [currentTrivia, setCurrentTrivia] = useState<TriviaQuestion | null>(null);
  const [gatePosForTrivia, setGatePosForTrivia] = useState<Position | null>(null);
  const [loadingTrivia, setLoadingTrivia] = useState(false);
  const [triviaFeedback, setTriviaFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

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
               onGameOver(score);
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
  }, []);

  useEffect(() => {
    if (engineRef.current && level > 1) {
      engineRef.current.loadLevel(level);
      engineRef.current.resume();
    }
  }, [level]);

  useEffect(() => {
    if (lives <= 0) {
      onGameOver(score);
    }
  }, [lives, onGameOver, score]);

  const handleGateEncounter = async (pos: Position) => {
    setGameState(GameState.TRIVIA);
    setGatePosForTrivia(pos);
    setLoadingTrivia(true);
    
    const question = await generateTriviaQuestion(settings.topic, settings.language);
    setCurrentTrivia(question);
    setLoadingTrivia(false);
  };

  const handleTriviaAnswer = (index: number) => {
    if (!currentTrivia || !gatePosForTrivia || !engineRef.current) return;

    if (index === currentTrivia.correctIndex) {
      setTriviaFeedback('correct');
      setTimeout(() => {
        engineRef.current?.unlockGate(gatePosForTrivia);
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
        engineRef.current?.resume();
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-950 text-white font-[VT323]">
      {/* Retro HUD Bar */}
      <div className="w-full max-w-4xl bg-black border-b-4 border-stone-700 p-2 px-4 mb-4 flex justify-between items-center text-xl md:text-2xl shadow-lg sticky top-0 z-10">
         <div className="flex items-center space-x-4">
           <span className="text-white">{t.score}</span>
           <span className="text-white tracking-widest">{score.toString().padStart(6, '0')}</span>
         </div>
         
         <div className="hidden md:block text-stone-500">
           {t.level} {level}
         </div>

         <div className="flex items-center space-x-4">
           <span className="text-white">{t.lives}</span>
           <div className="flex space-x-1">
             {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
               <span key={i} className="text-red-600 drop-shadow-sm">❤</span>
             ))}
           </div>
         </div>
      </div>

      {/* PixiJS Canvas Container */}
      <div 
        id="game-canvas-container" 
        ref={canvasContainerRef}
        className="flex justify-center items-center shadow-[0_0_40px_rgba(0,0,0,0.6)] border-4 border-stone-800 rounded-lg overflow-hidden bg-black"
      >
        {/* Canvas is injected here */}
      </div>

      <div className="mt-4 text-stone-600 text-sm">
        {t.controls}
      </div>

      {/* Trivia Modal */}
      {gameState === GameState.TRIVIA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border-4 border-yellow-600 rounded-sm max-w-lg w-full p-6 shadow-[0_0_50px_rgba(234,179,8,0.2)] animate-in fade-in zoom-in duration-200 font-[VT323]">
             {loadingTrivia ? (
               <div className="text-center py-10">
                 <div className="text-4xl mb-4 animate-bounce">🦦</div>
                 <p className="text-yellow-400 text-2xl animate-pulse">{t.loadingQuestion}</p>
               </div>
             ) : currentTrivia ? (
               <>
                {triviaFeedback ? (
                  <div className={`text-center py-12 text-5xl font-bold ${triviaFeedback === 'correct' ? 'text-green-400' : 'text-red-500'}`}>
                    {triviaFeedback === 'correct' ? t.correct : t.wrong}
                  </div>
                ) : (
                  <>
                    <h3 className="text-yellow-600 text-xl mb-2 uppercase tracking-widest border-b border-stone-700 pb-2">{t.gateLocked}</h3>
                    <p className="text-white text-2xl mb-8 leading-relaxed">{currentTrivia.question}</p>
                    <div className="grid grid-cols-1 gap-4">
                      {currentTrivia.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTriviaAnswer(idx)}
                          className="text-left bg-stone-800 hover:bg-yellow-800 text-yellow-50 p-3 px-4 border-2 border-stone-600 hover:border-yellow-400 transition-all text-xl group"
                        >
                          <span className="inline-block w-8 text-yellow-500 group-hover:text-white">{String.fromCharCode(65 + idx)}.</span> {option}
                        </button>
                      ))}
                    </div>
                  </>
                )}
               </>
             ) : (
               <div className="text-red-500 text-center">
                 Error. 
                 <button onClick={() => {
                   setGameState(GameState.PLAYING);
                   engineRef.current?.resume();
                 }} className="underline ml-2">SKIP</button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;