import { useEffect, useState } from 'react';
import { Trees } from 'lucide-react';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'hold' | 'out'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 800);
    const t2 = setTimeout(() => setPhase('out'), 2200);
    const t3 = setTimeout(() => onDone(), 2800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className={`splash ${phase}`}>
      <div className="splash-content">
        <div className="splash-icon">
          <Trees size={56} color="#fff" />
        </div>
        <h1 className="splash-title">Foster Garments</h1>
        <p className="splash-sub">Enterprise Resource Planning</p>
        <div className="splash-bar"><div className="splash-bar-fill" /></div>
      </div>
    </div>
  );
}
