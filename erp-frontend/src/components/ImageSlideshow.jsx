import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import img1 from '../assets/athletic-muscular-man-training-gymnastics-gym.jpg';
import img2 from '../assets/pexels-214377531-18078019.jpg';
import img3 from '../assets/pexels-alpyildizlar-15127546.jpg';
import img4 from '../assets/pexels-apasaric-325185.jpg';
import img5 from '../assets/pexels-assomyron-32695898.jpg';
import img6 from '../assets/pexels-cottonbro-6293227.jpg';
import img7 from '../assets/pexels-emanuel-pedro-1266938328-32610333.jpg';
import img8 from '../assets/pexels-jakubzerdzicki-31015145.jpg';
import img9 from '../assets/pexels-jdgromov-4716814.jpg';
import img10 from '../assets/strong-man-training-gym.jpg';

const SLIDES = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10];

const CAPTIONS = [
  'Transform Your Body',
  'Build Strength & Power',
  'Achieve Your Fitness Goals',
  'Train Like a Champion',
  'Premium Equipment',
  'Expert Trainers',
  'Modern Facilities',
  'Personalized Programs',
  'Community of Athletes',
  'Your Journey Starts Here',
];

export default function ImageSlideshow({ height = 340 }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);

  const goTo = (idx) => {
    const next = (idx + SLIDES.length) % SLIDES.length;
    setPrev(current);
    setCurrent(next);
    setTimeout(() => setPrev(null), 700);
  };

  useEffect(() => {
    const t = setInterval(() => goTo(current + 1), 5000);
    return () => clearInterval(t);
  }, [current]);

  return (
    <div className="banner-slideshow" style={{ height }}>
      {/* Prev slide fading out */}
      {prev !== null && (
        <div
          className="banner-slide banner-slide-exit"
          style={{ backgroundImage: `url(${SLIDES[prev]})` }}
        />
      )}
      {/* Current slide */}
      <div
        className="banner-slide banner-slide-enter"
        key={current}
        style={{ backgroundImage: `url(${SLIDES[current]})` }}
      />

      <div className="banner-overlay" />

      <div className="banner-caption">
        <p className="banner-tag">RJS Flex Gym</p>
        <h2 className="banner-title">{CAPTIONS[current]}</h2>
        <div className="banner-dots">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`bdot ${i === current ? 'bdot-active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>

      <button className="banner-btn banner-btn-left" onClick={() => goTo(current - 1)}>
        <ChevronLeft size={20} />
      </button>
      <button className="banner-btn banner-btn-right" onClick={() => goTo(current + 1)}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
