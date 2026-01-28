
import React, { useState, useEffect, useCallback } from 'react';
import { Wheel } from './components/Wheel';
import { PlayerInput } from './components/PlayerInput';
import { Player, GameState, TeamMatch } from './types';
import { audioService } from './services/audioService';
import { Music, Music2, RefreshCcw, Trophy, Users, LayoutGrid, Share2, History, CheckCircle2, ArrowRight, UserPlus, Mic, MicOff, Volume2, Crown } from 'lucide-react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { GoogleGenAI, Modality } from "@google/genai";
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const { isActive: isAiActive, isSpeaking: isAiSpeaking, start: startAi, stop: stopAi, sendEvent } = useGeminiLive();
  const [gameState, setGameState] = useState<GameState>({
    allPlayers: [],
    pool: [],
    teamA: [],
    teamB: [],
    currentSpinCount: 0,
    isSpinning: false,
    roundComplete: false,
    history: JSON.parse(localStorage.getItem('team_fortune_history') || '[]'),
    pendingWinner: null,
    captains: null,
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);

  // Function to announce the winner's name using high-quality TTS
  const announceName = async (name: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Wylosowano osobę: ${name}. Powiedz to krótko i entuzjastycznie po polsku.` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0)).buffer;
        
        // Manual decoding for raw PCM from TTS
        const dataInt16 = new Int16Array(arrayBuffer);
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
      }
    } catch (err) {
      console.error("TTS failed", err);
    }
  };

  const handleAddPlayer = (name: string) => {
    const newPlayer = { id: Math.random().toString(36).substr(2, 9), name };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const startRound = () => {
    setGameState(prev => ({
      ...prev,
      allPlayers: [...players],
      pool: [...players],
      teamA: [],
      teamB: [],
      currentSpinCount: 0,
      isSpinning: false,
      roundComplete: false,
      pendingWinner: null,
      captains: null,
    }));
    if (isAiActive) sendEvent("Użytkownik rozpoczął nową rundę. Skomentuj to!");
  };

  const onSpinStart = () => {
    setGameState(prev => ({ ...prev, isSpinning: true, pendingWinner: null }));
  };

  const onSpinEnd = (winner: Player) => {
    setGameState(prev => ({
      ...prev,
      isSpinning: false,
      pendingWinner: winner
    }));
    announceName(winner.name);
  };

  const confirmSelection = () => {
    const winner = gameState.pendingWinner;
    if (!winner) return;

    setGameState(prev => {
      const nextSpinCount = prev.currentSpinCount + 1;
      const newTeamA = [...prev.teamA, winner];
      const newPool = prev.pool.filter(p => p.id !== winner.id);
      
      let newRoundComplete = false;
      let newTeamB = [...prev.teamB];
      let newHistory = [...prev.history];

      if (nextSpinCount === 4) {
        newRoundComplete = true;
        newTeamB = [...newPool];
        
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#ec4899']
        });

        const match: TeamMatch = {
          timestamp: Date.now(),
          teamA: newTeamA.map(p => p.name),
          teamB: newTeamB.map(p => p.name)
        };
        newHistory = [match, ...newHistory].slice(0, 10);
        localStorage.setItem('team_fortune_history', JSON.stringify(newHistory));
      }

      return {
        ...prev,
        pool: newPool,
        teamA: newTeamA,
        teamB: newTeamB,
        currentSpinCount: nextSpinCount,
        roundComplete: newRoundComplete,
        history: newHistory,
        pendingWinner: null
      };
    });
  };

  const selectCaptains = () => {
    if (!gameState.roundComplete) return;
    
    const capA = gameState.teamA[Math.floor(Math.random() * gameState.teamA.length)];
    const capB = gameState.teamB[Math.floor(Math.random() * gameState.teamB.length)];
    
    setGameState(prev => ({
      ...prev,
      captains: { teamA: capA, teamB: capB }
    }));

    confetti({
      particleCount: 100,
      spread: 50,
      origin: { y: 0.8 },
      colors: ['#fbbf24', '#f59e0b']
    });

    if (isAiActive) sendEvent(`Wybrano kapitanów! Kapitan Team A to ${capA.name}, a Team B to ${capB.name}. Skomentuj ich szanse!`);
  };

  const toggleMusic = () => {
    const nextState = !isMusicPlaying;
    setIsMusicPlaying(nextState);
    audioService.toggleMusic(nextState);
  };

  const copyResults = () => {
    const caps = gameState.captains 
      ? `\nKAPITANOWIE: ${gameState.captains.teamA?.name} (A) vs ${gameState.captains.teamB?.name} (B)` 
      : '';
    const text = `🏆 WYNIKI TEAM FORTUNE 🏆\n\nDRUŻYNA A: ${gameState.teamA.map(p => p.name).join(', ')}\nDRUŻYNA B: ${gameState.teamB.map(p => p.name).join(', ')}${caps}\n\nPowodzenia!`;
    navigator.clipboard.writeText(text);
    setShowCopyTooltip(true);
    setTimeout(() => setShowCopyTooltip(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="text-white" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bungee tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            TEAM FORTUNE
          </h1>
        </div>
        
        <div className="flex gap-2">
           <button 
            onClick={isAiActive ? stopAi : startAi}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${
              isAiActive 
                ? 'bg-rose-600/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400'
            }`}
          >
            {isAiActive ? <Mic size={20} className={isAiSpeaking ? 'animate-pulse' : ''} /> : <MicOff size={20} />}
            <span className="hidden sm:inline font-bold">{isAiActive ? 'Komentator On' : 'Komentator Off'}</span>
          </button>

          <button 
            onClick={toggleMusic}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${
              isMusicPlaying 
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' 
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
          >
            {isMusicPlaying ? <Music size={20} /> : <Music2 size={20} />}
            <span className="hidden sm:inline font-bold">{isMusicPlaying ? 'Muzyka Wł.' : 'Muzyka Wył.'}</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Lewa kolumna: Zarządzanie i Wyniki */}
        <div className="lg:col-span-4 space-y-6">
          {!gameState.allPlayers.length || gameState.roundComplete ? (
            <PlayerInput 
              players={players} 
              onAdd={handleAddPlayer} 
              onRemove={handleRemovePlayer}
              disabled={gameState.pool.length > 0 && !gameState.roundComplete}
            />
          ) : (
             <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-indigo-500/30 shadow-lg">
                <div className="flex items-center gap-2 mb-4 text-indigo-400">
                  <Trophy size={20} />
                  <h3 className="font-bold text-lg">Postęp Wybierania</h3>
                </div>
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                        i <= gameState.currentSpinCount ? 'bg-indigo-500' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-slate-400 text-sm">
                  Wybieramy gracza #{gameState.currentSpinCount + 1} do Drużyny A
                </p>
             </div>
          )}

          {players.length === 8 && !gameState.pool.length && (
            <button
              onClick={startRound}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bungee py-4 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            >
              <RefreshCcw size={24} />
              START NOWEJ RUNDY
            </button>
          )}

          {(gameState.roundComplete || gameState.teamA.length > 0) && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Drużyna A */}
              <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/50 p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <h3 className="text-indigo-400 font-bungee text-xl mb-4 flex items-center justify-between">
                   <span>DRUŻYNA A</span>
                   {gameState.captains?.teamA && <Crown className="text-yellow-500" size={20} />}
                </h3>
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  {gameState.teamA.map((p) => (
                    <div 
                      key={p.id} 
                      className={`bg-slate-800/80 p-2 rounded-lg text-center font-bold border transition-all ${
                        gameState.captains?.teamA?.id === p.id 
                          ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)] text-yellow-200' 
                          : 'border-indigo-500/20 text-indigo-200'
                      }`}
                    >
                      {p.name}
                      {gameState.captains?.teamA?.id === p.id && <span className="block text-[10px] uppercase">Kapitan</span>}
                    </div>
                  ))}
                  {[...Array(Math.max(0, 4 - gameState.teamA.length))].map((_, i) => (
                    <div key={i} className="bg-slate-900/50 p-2 rounded-lg text-center text-slate-700 border border-slate-800 border-dashed">
                      Pending...
                    </div>
                  ))}
                </div>
              </div>

              {gameState.roundComplete && (
                <>
                  {/* Drużyna B */}
                  <div className="bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/50 p-6 rounded-2xl shadow-xl">
                    <h3 className="text-rose-400 font-bungee text-xl mb-4 flex items-center justify-between">
                       <span>DRUŻYNA B</span>
                       {gameState.captains?.teamB && <Crown className="text-yellow-500" size={20} />}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {gameState.teamB.map((p) => (
                        <div 
                          key={p.id} 
                          className={`bg-slate-800/80 p-2 rounded-lg text-center font-bold border transition-all ${
                            gameState.captains?.teamB?.id === p.id 
                              ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)] text-yellow-200' 
                              : 'border-rose-500/20 text-rose-200'
                          }`}
                        >
                          {p.name}
                          {gameState.captains?.teamB?.id === p.id && <span className="block text-[10px] uppercase">Kapitan</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Akcje po rundzie */}
                  <div className="grid grid-cols-1 gap-3">
                    {!gameState.captains && (
                      <button
                        onClick={selectCaptains}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white p-4 rounded-2xl border border-yellow-500/50 shadow-lg transition-all transform hover:scale-[1.02]"
                      >
                        <Crown size={20} />
                        LOSUJ KAPITANÓW
                      </button>
                    )}
                    
                    <button
                      onClick={copyResults}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 p-4 rounded-2xl border border-slate-700 transition-colors"
                    >
                      <Share2 size={20} />
                      {showCopyTooltip ? 'Skopiowano!' : 'Kopiuj Składy'}
                    </button>
                    {showCopyTooltip && (
                      <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-3 py-1 rounded text-xs animate-bounce flex items-center gap-1">
                        <CheckCircle2 size={12} /> Gotowe!
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Historia */}
          {gameState.history.length > 0 && (
            <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-slate-400">
                <History size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Ostatnie Gry</h4>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                {gameState.history.map((match, i) => (
                  <div key={i} className="text-[10px] bg-slate-900/50 p-2 rounded border border-slate-800">
                    <div className="text-slate-500 mb-1">{new Date(match.timestamp).toLocaleTimeString()}</div>
                    <div className="flex justify-between">
                      <span className="text-indigo-400">A: {match.teamA.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-400">B: {match.teamB.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Centrum: Koło Fortuny i Nakładka Wyniku */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center min-h-[600px] relative">
          
          {/* AI Info */}
          {isAiActive && (
            <div className="absolute top-0 flex items-center gap-3 bg-indigo-600/20 border border-indigo-500/50 px-6 py-2 rounded-full text-indigo-300 animate-in fade-in slide-in-from-top-4">
              <div className={`w-3 h-3 rounded-full ${isAiSpeaking ? 'bg-indigo-400 animate-ping' : 'bg-indigo-600 animate-pulse'}`}></div>
              <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                {isAiSpeaking ? <Volume2 size={16} /> : null}
                {isAiSpeaking ? 'Komentator nadaje...' : 'Komentator słucha...'}
              </span>
            </div>
          )}

          {/* Overlay Wyniku */}
          {gameState.pendingWinner && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl rounded-[40px] animate-in zoom-in duration-300">
              <div className="bg-slate-800 border-4 border-indigo-500 p-12 rounded-[32px] shadow-[0_0_80px_rgba(99,102,241,0.4)] text-center max-w-sm w-full mx-4 transform transition-all">
                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/50">
                   <UserPlus className="text-white" size={48} />
                </div>
                <h2 className="text-indigo-400 font-bungee text-2xl mb-2 tracking-widest">WYLOSOWANO!</h2>
                <div className="text-5xl font-bungee text-white mb-6 break-words leading-tight bg-clip-text">
                  {gameState.pendingWinner.name}
                </div>
                <p className="text-slate-400 mb-10 font-bold italic text-lg">
                   Zapraszamy do Drużyny A!
                </p>
                <button
                  onClick={confirmSelection}
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:scale-[1.05] text-white font-bungee py-5 rounded-2xl shadow-2xl flex items-center justify-center gap-4 group transition-all"
                >
                  <span className="text-xl">
                    {gameState.currentSpinCount < 3 ? 'KOLEJNY GRACZ' : 'POKAŻ SKŁADY'}
                  </span>
                  <ArrowRight className="group-hover:translate-x-2 transition-transform" size={24} />
                </button>
              </div>
            </div>
          )}

          {/* Koło lub Rezultat Końcowy */}
          {gameState.pool.length > 0 && !gameState.roundComplete ? (
            <div className={gameState.pendingWinner ? 'opacity-20 blur-xl pointer-events-none' : 'opacity-100 transition-all duration-700'}>
              <Wheel 
                players={gameState.pool} 
                isSpinning={gameState.isSpinning} 
                onSpinStart={onSpinStart}
                onSpinEnd={onSpinEnd}
              />
            </div>
          ) : !gameState.roundComplete ? (
            <div className="text-center p-20 bg-slate-800/20 rounded-full border-8 border-dashed border-slate-800/50 w-full max-w-lg aspect-square flex flex-col items-center justify-center animate-in fade-in duration-1000">
              <div className="bg-slate-800 p-8 rounded-full mb-8 shadow-inner">
                <Users className="text-slate-600" size={80} />
              </div>
              <h2 className="text-3xl font-bungee text-slate-500 tracking-wider">
                {players.length === 8 ? 'WSZYSTKO GOTOWE!' : 'ZBIERZ EKIPĘ'}
              </h2>
              <p className="text-slate-600 mt-4 text-lg font-medium">
                {players.length === 8 
                  ? 'Kliknij przycisk poniżej, by rozpocząć losowanie.' 
                  : `Potrzebujesz jeszcze ${8 - players.length} graczy.`}
              </p>
              {players.length === 8 && (
                 <button
                 onClick={startRound}
                 className="mt-8 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bungee shadow-xl transition-all"
               >
                 ROZPOCZNIJ LOSOWANIE
               </button>
              )}
            </div>
          ) : (
            <div className="text-center p-10 animate-in zoom-in duration-500 max-w-2xl">
               <div className="w-32 h-32 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                  <Trophy className="text-indigo-400" size={64} />
               </div>
               <h2 className="text-5xl font-bungee text-white mb-6 leading-tight">ZAWODY CZAS ZACZĄĆ!</h2>
               <p className="text-slate-400 text-xl mb-12 italic">Drużyny są gotowe do starcia. Niech wygrają lepsi (lub ci z większym szczęściem)!</p>
               
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <button 
                   onClick={startRound}
                   className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bungee transition-all border border-indigo-500 shadow-xl flex items-center gap-3 justify-center"
                 >
                   <RefreshCcw size={20} />
                   KOLEJNA ROZGRYWKA
                 </button>
                 <button 
                    onClick={() => {
                        setPlayers([]);
                        setGameState(prev => ({ ...prev, allPlayers: [], pool: [], teamA: [], teamB: [], roundComplete: false, currentSpinCount: 0 }));
                    }}
                    className="px-12 py-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bungee transition-all border border-slate-700"
                 >
                    RESETUJ WSZYSTKO
                 </button>
               </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-20 w-full max-w-6xl border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center text-slate-500 text-sm gap-4 pb-12">
        <p>© 2024 Team Fortune • Czytanie zwycięzców • Komentarze Live AI • Gemini 2.5</p>
        <div className="flex gap-8">
          <span className="hover:text-indigo-400 cursor-pointer transition-colors">Zasady Gry</span>
          <span className="hover:text-indigo-400 cursor-pointer transition-colors">O Komentatorze</span>
          <span className="hover:text-indigo-400 cursor-pointer transition-colors">Wsparcie</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
