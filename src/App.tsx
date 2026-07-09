import { useState, useEffect, useCallback, useRef } from 'react';
import { playSound } from './utils';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

type Question = {
  question: string;
  answer: number;
  options: number[];
};

type ScoreEntry = {
  id?: string;
  name: string;
  score: number;
};

const generateQuestion = (): Question => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const answer = a * b;
  
  const options = new Set<number>();
  options.add(answer);
  while (options.size < 3) {
    options.add(Math.floor(Math.random() * 81) + 1);
  }
  
  return {
    question: `${a} x ${b} = ?`,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5),
  };
};

export default function App() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<'none' | 'green' | 'red'>('none');
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const moleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newScores: ScoreEntry[] = [];
      snapshot.forEach((doc) => {
        newScores.push({ id: doc.id, ...doc.data() as ScoreEntry });
      });
      setScores(newScores);
    });
    return () => unsubscribe();
  }, []);

  const saveScore = async () => {
    await addDoc(collection(db, 'scores'), { name: playerName, score });
    setShowNameInput(false);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setIsGameRunning(true);
    setGameOver(false);
    setActiveHole(null);
  };

  useEffect(() => {
    if (isGameRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timerRef.current as NodeJS.Timeout);
    } else if (timeLeft === 0 && isGameRunning) {
      setIsGameRunning(false);
      setGameOver(true);
      setShowNameInput(true);
      playSound('gameover');
    }
  }, [isGameRunning, timeLeft]);

  const spawnMole = useCallback(() => {
    const hole = Math.floor(Math.random() * 6);
    setActiveHole(hole);
    setCurrentQuestion(generateQuestion());
    
    // Mole disappears after 2 seconds
    moleTimerRef.current = setTimeout(() => {
      setActiveHole(null);
      setCurrentQuestion(null);
    }, 2000);
  }, []);

  useEffect(() => {
    if (isGameRunning) {
      const interval = setInterval(spawnMole, Math.random() * 1000 + 1000);
      return () => {
        clearInterval(interval);
        if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
      };
    }
  }, [isGameRunning, spawnMole]);

  const handleAnswer = (option: number) => {
    if (!currentQuestion) return;

    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 10);
      setFlash('green');
      playSound('correct');
    } else {
      setScore((prev) => Math.max(0, prev - 5));
      setFlash('red');
      playSound('wrong');
    }
    
    setTimeout(() => setFlash('none'), 300);
    setActiveHole(null);
    setCurrentQuestion(null);
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
  };

  return (
    <div className={`min-h-screen bg-green-600 flex flex-col items-center p-4 transition-colors ${flash === 'green' ? 'ring-8 ring-green-400' : flash === 'red' ? 'ring-8 ring-red-500' : ''}`}>
      <div className="w-full max-w-2xl flex justify-between items-center text-white text-2xl font-bold mb-6 bg-green-800 p-4 rounded-xl shadow-lg">
        <div>分數: {score}</div>
        <div>倒數: {timeLeft}s</div>
      </div>

      {!isGameRunning && !gameOver && (
        <button 
          onClick={startGame}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 px-10 rounded-full text-2xl hover:scale-105 transition-transform shadow-lg"
        >
          開始遊戲
        </button>
      )}

      {isGameRunning && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-24 h-24 bg-amber-900 rounded-full flex items-center justify-center shadow-inner relative">
              {activeHole === i && currentQuestion && (
                <div className="absolute inset-0 bg-white rounded-full flex flex-col items-center justify-center p-2 text-center text-sm font-bold animate-bounce border-4 border-amber-900">
                  {currentQuestion.question}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isGameRunning && currentQuestion && (
        <div className="flex gap-4">
          {currentQuestion.options.map((option) => (
            <button 
              key={option}
              onClick={() => handleAnswer(option)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-10 rounded-full text-2xl hover:scale-105 transition-transform shadow-xl"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {gameOver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-10 rounded-3xl text-center shadow-2xl w-full max-w-sm">
            <h2 className="text-4xl font-bold mb-4">遊戲結束！</h2>
            <p className="text-2xl mb-6">最終分數: {score}</p>
            {showNameInput ? (
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="請輸入姓名"
                  className="p-3 border-2 border-green-600 rounded-full text-center"
                />
                <button 
                  onClick={saveScore}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full text-xl"
                >
                  儲存分數
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-bold">排行榜</h3>
                {scores.map((entry, i) => (
                  <div key={i} className="flex justify-between text-xl p-2 border-b">
                    <span>{entry.name}</span>
                    <span>{entry.score}</span>
                  </div>
                ))}
                <button 
                  onClick={startGame}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full text-xl mt-4"
                >
                  再玩一次
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
