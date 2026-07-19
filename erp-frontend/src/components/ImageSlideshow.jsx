import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import img1 from '../assets/ben-iwara-wgiRhtBcNIg-unsplash.jpg';
import img2 from '../assets/burgess-milner-OYYE4g-I5ZQ-unsplash.jpg';
import img3 from '../assets/clark-street-mercantile-qnKhZJPKFD8-unsplash.jpg';
import img4 from '../assets/freestocks-_3Q3tsJ01nc-unsplash.jpg';
import img5 from '../assets/fujiphilm-ojZ4wJNUM5w-unsplash.jpg';
import img6 from '../assets/kam-myers-1SRJ7s0bdr0-unsplash.jpg';
import img7 from '../assets/kam-myers-TRdOPdjKnO8-unsplash.jpg';
import img8 from '../assets/levi-meir-clancy-yjajswQaq3w-unsplash.jpg';
import img9 from '../assets/marcus-loke-xXJ6utyoSw0-unsplash.jpg';
import img10 from '../assets/parker-burchfield-tvG4WvjgsEY-unsplash.jpg';

const SLIDES = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10];

const CAPTIONS = [
  'Premium Quality Garments',
  'Modern Fashion Collections',
  'Crafted with Excellence',
  'Style Meets Comfort',
  'Exclusive Designs',
  'Tailored Perfection',
  'Latest Trends',
  'Signature Collection',
  'Luxury Fabrics',
  'Fashion Forward',
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
        <p className="banner-tag">Foster Garments</p>
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
