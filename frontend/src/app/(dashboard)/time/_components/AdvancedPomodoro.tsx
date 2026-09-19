'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onSessionComplete?: (minutes: number) => void;
}

function beep(freq = 880, dur = 0.25) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function AdvancedPomodoro({ onSessionComplete }: Props) {
  const [work, setWork] = useState(25);
  const [shortB, setShortB] = useState(5);
  const [longB, setLongB] = useState(15);
  const [cycles, setCycles] = useState(4);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [sound, setSound] = useState(true);

  const [phase, setPhase] = useState<'work' | 'short' | 'long'>('work');
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const phaseLen = phase === 'work' ? work * 60 : phase === 'short' ? shortB * 60 : longB * 60;

  useEffect(() => { setLeft(phaseLen); }, [work, shortB, longB, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          if (sound) beep(phase === 'work' ? 880 : 520, 0.4);
          if (phase === 'work') {
            const nd = done + 1;
            setDone(nd);
            onSessionComplete?.(work);
            toast.success(`اكتملت جلسة تركيز #${nd} (${work} دقيقة)`);
            const next = nd % cycles === 0 ? 'long' : 'short';
            setPhase(next);
            if (!autoSwitch) setRunning(false);
            return next === 'long' ? longB * 60 : shortB * 60;
          } else {
            toast.success('انتهت الاستراحة — جاهز للتركيز؟');
            setPhase('work');
            if (!autoSwitch) setRunning(false);
            return work * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, phase, work, shortB, longB, cycles, autoSwitch, sound, done, onSessionComplete]);

  useEffect(() => {
    document.title = running ? `${fmt(left)} • ${phase === 'work' ? 'تركيز' : 'استراحة'} | ثانوي` : 'إدارة الوقت | ثانوي';
  }, [left, running, phase]);

  const reset = () => { setRunning(false); setLeft(phaseLen); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir="rtl">
      <Card className="lg:col-span-2 bg-[#0a1628]/70 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base">
            {phase === 'work' ? 'جلسة تركيز عميق' : phase === 'short' ? 'استراحة قصيرة' : 'استراحة طويلة'}
            <span className="text-xs text-white/40 font-normal ms-2">جلسات مكتملة: {done}/{cycles}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
          <div className="text-7xl font-mono font-black text-white tabular-nums" dir="ltr">{fmt(left)}</div>
          <div className="w-full max-w-md h-2 rounded-full bg-white/10 mt-4 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.round((1 - left / phaseLen) * 100)}%` }} />
          </div>
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: cycles }).map((_, i) => (
              <div key={i} className={`h-2.5 w-2.5 rounded-full ${i < done % cycles || (done > 0 && done % cycles === 0) ? 'bg-emerald-500' : 'bg-white/10'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-6">
            <Button variant="ghost" size="icon" onClick={reset} className="rounded-full border border-white/10"><RotateCcw className="h-5 w-5" /></Button>
            <Button onClick={() => setRunning(r => !r)} className={`h-14 px-10 rounded-2xl font-bold ${running ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {running ? <><Pause className="h-5 w-5 ms-2" /> إيقاف مؤقت</> : <><Play className="h-5 w-5 ms-2" /> بدء التركيز</>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setPhase(phase === 'work' ? 'short' : 'work'); setRunning(false); }} className="rounded-full border border-white/10"><SkipForward className="h-5 w-5" /></Button>
          </div>
          <p className="text-xs text-white/40 mt-4">نصيحة: ضع هاتفك على الصامت، وركز على مهمة واحدة فقط.</p>
        </CardContent>
      </Card>

      <Card className="bg-[#0a1628]/70 border-white/10">
        <CardHeader><CardTitle className="text-white text-sm">إعدادات البومودورو</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-white/60">مدة التركيز (دقيقة)</Label>
            <Input type="number" min={5} max={120} value={work} onChange={e => setWork(Math.max(1, parseInt(e.target.value) || 25))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-white/60">استراحة قصيرة</Label>
              <Input type="number" min={1} max={30} value={shortB} onChange={e => setShortB(Math.max(1, parseInt(e.target.value) || 5))} />
            </div>
            <div>
              <Label className="text-xs text-white/60">استراحة طويلة</Label>
              <Input type="number" min={5} max={60} value={longB} onChange={e => setLongB(Math.max(1, parseInt(e.target.value) || 15))} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-white/60">جلسات قبل الاستراحة الطويلة</Label>
            <Input type="number" min={2} max={8} value={cycles} onChange={e => setCycles(Math.max(2, parseInt(e.target.value) || 4))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">انتقال تلقائي بين المراحل</Label>
            <Switch checked={autoSwitch} onCheckedChange={setAutoSwitch} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60 flex items-center gap-1">{sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} صوت التنبيه</Label>
            <Switch checked={sound} onCheckedChange={setSound} />
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white/50 leading-6">
            القاعدة الذهبية: 25 د تركيز + 5 د راحة × 4 = ثم راحة طويلة 15-30 دقيقة.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
