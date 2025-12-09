import React from 'react';
import { GameSettings, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  onStart: () => void;
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
}

const MainMenu: React.FC<Props> = ({ onStart, settings, setSettings }) => {
  const t = TRANSLATIONS[settings.language];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-green-400 p-4">
      <div className="border-4 border-green-600 p-8 rounded-lg bg-black max-w-md w-full shadow-[0_0_20px_rgba(0,255,0,0.2)]">
        <h1 className="text-6xl text-center mb-8 font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-700 drop-shadow-md">
          CAPY MAZE
        </h1>
        
        <div className="space-y-6">
          {/* Language Selector */}
          <div>
            <label className="block text-xl mb-2">{t.language}</label>
            <div className="flex gap-2">
              {Object.values(Language).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSettings({ ...settings, language: lang })}
                  className={`flex-1 py-2 border-2 ${
                    settings.language === lang
                      ? 'bg-green-700 border-green-400 text-white'
                      : 'border-stone-600 text-stone-500 hover:border-green-800'
                  } transition-colors uppercase font-bold`}
                >
                  {lang.split('-')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Input */}
          <div>
            <label className="block text-xl mb-2">{t.topic}</label>
            <input
              type="text"
              value={settings.topic}
              onChange={(e) => setSettings({ ...settings, topic: e.target.value })}
              placeholder={t.topicPlaceholder}
              className="w-full bg-stone-800 border-2 border-stone-600 p-3 text-white focus:border-green-500 focus:outline-none placeholder-stone-600"
            />
          </div>

          <div className="h-px bg-stone-700 my-4" />

          {/* Start Button */}
          <button
            onClick={onStart}
            className="w-full bg-green-600 text-black text-2xl font-bold py-4 hover:bg-green-500 active:translate-y-1 transition-all border-b-4 border-green-800"
          >
            {t.start}
          </button>
          
          <p className="text-center text-stone-500 mt-4 text-sm">
            {t.controls}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;