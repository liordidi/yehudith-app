import React from 'react';

export function HeroSection({ person, hero, onViewMemories, onShareMemory }) {
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
        <button onClick={onViewMemories}>{hero.buttons[0].label}</button>
        <button onClick={onShareMemory}>{hero.buttons[1].label}</button>
      </div>
    </section>
  );
}
