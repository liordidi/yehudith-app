export function MemoriesSection({ memories }) {
  // Tiny comment: gracefully handle broken/invalid image URLs
  const handleImgError = (e) => {
    e.target.style.display = 'none';
  };
  return (
    <section className="memories-section" dir="rtl">
      <h2>{memories.title}</h2>
      <div className="memories-grid">
        {memories.items.map((mem, idx) => (
          <div className="memory-card" key={idx}>
            {(mem.image_url || mem.image) && (
              <img
                src={mem.image_url || mem.image}
                alt={mem.title || 'זיכרון'}
                className="memory-img"
                onError={handleImgError}
              />
            )}
            <div className="memory-content">
              <div className="memory-title">{mem.title}</div>
              <div className="memory-body">{mem.text || mem.body}</div>
              <div className="memory-author">{mem.name || mem.author}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
