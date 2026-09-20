import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '../assets/RJS_Main_Logo.jpeg';

import img1 from '../assets/athletic-muscular-man-training-gymnastics-gym.jpg';
import img2 from '../assets/pexels-214377531-18078019.jpg';
import img3 from '../assets/pexels-alpyildizlar-15127546.jpg';
import img4 from '../assets/pexels-apasaric-325185.jpg';
import img5 from '../assets/pexels-assomyron-32695898.jpg';
import img6 from '../assets/pexels-cottonbro-6293227.jpg';
import img7 from '../assets/pexels-emanuel-pedro-1266938328-32610333.jpg';
import img8 from '../assets/pexels-jakubzerdzicki-31015145.jpg';
import img9 from '../assets/pexels-jdgromov-4716814.jpg';
import img10 from '../assets/pexels-totalshape-6046979.jpg';
import img11 from '../assets/strong-man-training-gym.jpg';

const SLIDES = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10, img11];

export default function Slideshow() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = (idx) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent((idx + SLIDES.length) % SLIDES.length);
      setAnimating(false);
    }, 400);
  };

  useEffect(() => {
    const t = setInterval(() => goTo(current + 1), 4500);
    return () => clearInterval(t);
  }, [current]);

  return (
    <div className="slideshow">
      {SLIDES.map((src, i) => (
        <div
          key={i}
          className={`slide ${i === current ? 'slide-active' : ''} ${animating && i === current ? 'slide-exit' : ''}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="slideshow-overlay" />
      <div className="slideshow-brand">
        <img src={logo} alt="RJS Flex Gym" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 10, background: '#fff', padding: 3 }} />
        <div>
          <h2>RJS Flex Gym</h2>
          <p style={{ color: '#fbbf24' }}>Enterprise Resource Planning</p>
        </div>
      </div>
      <div className="slideshow-controls">
        <button onClick={() => goTo(current - 1)}><ChevronLeft size={18} /></button>
        <div className="slide-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`dot ${i === current ? 'dot-active' : ''}`} onClick={() => goTo(i)} />
          ))}
        </div>
        <button onClick={() => goTo(current + 1)}><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
