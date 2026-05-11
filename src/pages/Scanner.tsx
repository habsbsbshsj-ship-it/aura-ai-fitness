import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Zap, ChevronRight, Save, RotateCcw, Image as ImageIcon, Sparkles, Activity } from 'lucide-react';
import { scanFood } from '../lib/gemini';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FoodVisualizer } from '../components/Dashboard/FoodVisualizer';
import confetti from 'canvas-confetti';

interface ScannerProps {
  onClose: () => void;
}

export default function Scanner({ onClose }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please enable camera permissions in your browser settings to use the scanner.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Unable to access camera. Please make sure no other app is using it.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const fullImageUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(fullImageUrl);
      analyze(b64);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      const b64 = dataUrl.split(',')[1];
      analyze(b64);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const analyze = async (base64: string) => {
    setLoading(true);
    try {
      const data = await scanFood(base64);
      setResult(data);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveMeal = async () => {
    if (!result) return;
    
    setLoading(true);
    const mealData = {
      name: result?.name || 'Unknown Food',
      calories: Number(result?.calories) || 0,
      protein: Number(result?.protein) || 0,
      carbs: Number(result?.carbs) || 0,
      fat: Number(result?.fat) || 0,
      healthScore: result?.healthScore || 50,
      category: result?.category || 'snack',
      suitability: result?.suitability || {},
      imageUrl: capturedImage,
      date: format(new Date(), 'yyyy-MM-dd'),
      mealType: 'snack', // Default for scans
    };

    try {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;
        const today = format(new Date(), 'yyyy-MM-dd');
        const mealPath = `users/${userId}/meals`;
        const statsPath = `users/${userId}/daily_stats/${today}`;
        
        const { writeBatch, doc, increment } = await import('firebase/firestore');
        const batch = writeBatch(db);
        
        // Add Meal
        const newMealRef = doc(collection(db, mealPath));
        batch.set(newMealRef, {
          ...mealData,
          timestamp: serverTimestamp()
        });
        
        // Update Daily Stats
        const statsRef = doc(db, statsPath);
        batch.set(statsRef, {
          consumedCalories: increment(mealData.calories),
          protein: increment(mealData.protein),
          carbs: increment(mealData.carbs),
          fat: increment(mealData.fat),
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        await batch.commit();
      } else {
        // Guest Mode
        const guestMeals = JSON.parse(localStorage.getItem('aura_guest_meals') || '[]');
        guestMeals.push({
          ...mealData,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });
        localStorage.setItem('aura_guest_meals', JSON.stringify(guestMeals));
        window.dispatchEvent(new Event('storage'));
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#39FF14', '#00E5FF', '#FFFFFF']
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser?.uid}/meals`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setResult(null);
    setLoading(false);
    startCamera();
  };

  return (
    <div className="h-full w-full bg-black relative overflow-hidden flex flex-col no-zoom">
      <AnimatePresence>
        {!capturedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover touch-none pointer-events-none"
            />
            
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/80 backdrop-blur-md z-20">
                <Card className="glass border-red-500/30 p-8 rounded-[2.5rem] max-w-sm text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Camera className="text-red-500" size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white font-display tracking-tight uppercase mb-3">Camera Access Needed</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-8">{cameraError}</p>
                  
                  <div className="space-y-4">
                    <Button 
                      onClick={startCamera}
                      className="w-full h-14 bg-white text-black hover:bg-neon-green hover:text-black font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                      Try Again
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-14 border-white/20 text-white hover:bg-white/10 font-black uppercase tracking-widest rounded-2xl"
                    >
                      Upload Photo
                    </Button>
                  </div>
                  
                  <button 
                    onClick={onClose}
                    className="mt-6 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancel Scan
                  </button>
                </Card>
              </div>
            )}
            
            {/* HUD */}
            <div className="relative h-full w-full flex flex-col justify-between p-6 z-10 pointer-events-none pb-12">
              <div className="flex justify-between items-center bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 pointer-events-auto">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Neural Scan Engine v1.0</span>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="text-white" size={20} />
                </button>
              </div>
              
              <div className="relative flex-1 flex items-center justify-center">
                <div className="w-60 h-60 border-2 border-neon-green/20 rounded-3xl relative">
                   <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-neon-green rounded-tl-xl" />
                   <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-neon-green rounded-tr-xl" />
                   <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-neon-green rounded-bl-xl" />
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-neon-green rounded-br-xl" />
                   
                   {/* Scan line */}
                   <motion.div
                     animate={{ top: ['0%', '100%'] }}
                     transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                     className="absolute left-0 right-0 h-0.5 bg-neon-green shadow-[0_0_20px_#39FF14] z-10"
                   />
                </div>
              </div>
              
              <div className="flex justify-center pointer-events-auto items-center space-x-8 mb-8">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center group active:scale-95 transition-all"
                >
                  <ImageIcon className="text-white group-hover:text-neon-green transition-colors" size={22} />
                </button>

                <button
                  onClick={capture}
                  className="w-20 h-20 bg-white rounded-full border-[6px] border-white/20 flex items-center justify-center group shadow-[0_0_40px_rgba(57,255,20,0.2)] active:scale-90 transition-all"
                >
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border-2 border-black/5">
                    <Camera className="text-black" size={28} />
                  </div>
                </button>

                <div className="w-14 h-14 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
                  <Zap className="text-neon-green/50" size={20} />
                </div>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(capturedImage || loading) && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-x-0 bottom-0 top-0 bg-black z-[100] flex flex-col"
          >
            <div className="relative h-[35%] flex-shrink-0 no-zoom">
               <img src={capturedImage || ''} className="w-full h-full object-cover touch-none" referrerPolicy="no-referrer" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
               <button 
                onClick={reset} 
                className="absolute top-6 left-6 p-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 text-white hover:bg-white/10 transition-colors"
               >
                 <RotateCcw size={20} />
               </button>
            </div>

            <div className="flex-1 bg-black rounded-t-[3rem] -mt-10 relative z-10 p-6 overflow-y-auto pb-44 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[2rem] bg-neon-green/10 flex items-center justify-center border border-neon-green/30 relative z-10">
                      <Zap className="text-neon-green animate-bounce" size={40} />
                    </div>
                    {/* Orbiting particles */}
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-2 h-2 bg-neon-green/50 rounded-full"
                        animate={{
                          rotate: 360,
                          x: [50, 70, 50],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          delay: i * 0.5,
                          ease: "linear"
                        }}
                        style={{
                          transformOrigin: "center center",
                          marginLeft: -4,
                          marginTop: -4,
                        }}
                      />
                    ))}
                    <div className="absolute inset-0 bg-neon-green/10 blur-3xl animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-black text-white font-display tracking-tight uppercase mb-2">Aura Intelligence</h3>
                    <p className="text-neon-green font-bold text-xs tracking-[0.3em] uppercase animate-pulse">Scanning Bio-Data...</p>
                  </div>
                </div>
              ) : result ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Sparkles size={14} className="text-neon-green" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Identified Subject</span>
                      </div>
                      <h2 className="text-4xl font-black font-display leading-tight tracking-tight uppercase truncate">{result.name}</h2>
                      <div className="flex gap-2 mt-4">
                         <Badge className="bg-neon-green/90 text-black font-black px-3 py-1 rounded-full uppercase text-[10px] tracking-widest">
                           {result.healthScore}/100 Score
                         </Badge>
                         <Badge variant="outline" className="border-white/20 text-gray-400 font-bold uppercase text-[8px] tracking-widest">
                           Bio-Scanned
                         </Badge>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end">
                       <FoodVisualizer 
                         category={result.category} 
                         size="md"
                         className="mb-2"
                       />
                       <div className="text-right">
                         <p className="text-5xl font-black text-neon-green tracking-tighter leading-none">{result?.calories || 0}</p>
                         <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Total Kcal</p>
                       </div>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-3 gap-4 mb-10">
                    {[
                      { l: 'Protein', v: result.protein, c: 'text-neon-green', bg: 'bg-neon-green/5' },
                      { l: 'Carbs', v: result.carbs, c: 'text-electric-blue', bg: 'bg-electric-blue/5' },
                      { l: 'Fat', v: result.fat, c: 'text-orange-400', bg: 'bg-orange-400/5' }
                    ].map((m, i) => (
                      <motion.div 
                        key={m.l} 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className={`${m.bg} border border-white/10 p-5 rounded-[2rem] text-center neo-glow`}
                      >
                        <p className={`text-2xl font-black ${m.c}`}>{m.v}<span className="text-[10px] ml-0.5">g</span></p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black mt-1">{m.l}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Insights */}
                  <div className="space-y-6 mb-40">
                    <div className="flex items-center space-x-3">
                       <div className="h-[1px] flex-1 bg-white/10" />
                       <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">Aura AI Insights</h3>
                       <div className="h-[1px] flex-1 bg-white/10" />
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Card className="glass p-6 rounded-3xl border-neon-green/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Zap size={40} className="text-neon-green" />
                        </div>
                        <p className="text-sm leading-relaxed text-gray-300">
                          <span className="font-black text-white uppercase text-[10px] tracking-widest block mb-2 text-neon-green">Metabolic Optimization:</span> {result.suitability?.weightLoss}
                        </p>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Card className="glass p-6 rounded-3xl border-electric-blue/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Activity size={40} className="text-electric-blue" />
                        </div>
                        <p className="text-sm leading-relaxed text-gray-300">
                          <span className="font-black text-white uppercase text-[10px] tracking-widest block mb-2 text-electric-blue">Fiber & Synthesis:</span> {result.suitability?.muscleGain}
                        </p>
                      </Card>
                    </motion.div>
                  </div>
                  
                  <div className="fixed bottom-10 left-6 right-6 z-50">
                    <Button 
                      onClick={saveMeal}
                      disabled={loading}
                      className="w-full h-18 rounded-[2rem] bg-neon-green text-black hover:bg-neon-green/90 font-black text-xl shadow-2xl shadow-neon-green/40 uppercase tracking-widest border-t-4 border-white/20 active:scale-95 transition-all disabled:opacity-70"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 border-4 border-black border-t-transparent animate-spin rounded-full" />
                          <span>Syncing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Save className="mr-3" size={24} /> Log Bio-Fuel
                        </div>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
