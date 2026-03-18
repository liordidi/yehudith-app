import React from 'react';

export function HeroSection({ person, hero, onShareMemory }) {
  const handleButton = (btn) => {
    if (btn.action === 'scrollTo') {
      document.getElementById(btn.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
    } else if (btn.action === 'shareMemory') {
      onShareMemory();
    }
  };

  return (
    <section className="hero-section" dir="rtl">
      <div className="hero-img">
        <img src={person.portrait} alt={person.name} className="portrait" />
      </div>
      <h1 className="hero-name">{person.name}</h1>
      <div className="hero-years" dir="ltr">{person.yearsGregorian}</div>
      <div className="hero-years hero-years-hebrew">{person.yearsHebrew}</div>
      <div className="hero-text">{hero.subtitle}</div>
      <div className="hero-short">{hero.description}</div>
      <div className="hero-cta">
        {hero.buttons.map((btn, i) => (
          <button
            key={i}
            className={btn.action === 'shareMemory' ? 'hero-cta-btn hero-cta-share' : 'hero-cta-btn'}
            onClick={() => handleButton(btn)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </section>
  );
}
