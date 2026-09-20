import { useEffect, useState } from 'react';
import logo from '../assets/RJS_Main_Logo.jpeg';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 800);
    const t2 = setTimeout(() => setPhase('out'), 2200);
    const t3 = setTimeout(() => onDone(), 2800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className={`splash ${phase}`}>
      <div className="splash-content">
        <div className="splash-icon" style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: 120, height: 120 }}>
          <img
            src={logo}
            alt="RJS Flex Gym"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 16 }}
          />
        </div>
        <h1 className="splash-title">RJS Flex Gym</h1>
        <p className="splash-sub">Enterprise Resource Planning</p>
        <div className="splash-bar"><div className="splash-bar-fill" /></div>
      </div>
    </div>
  );
}
