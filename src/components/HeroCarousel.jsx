import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion as Motion,
  useMotionValue,
  useSpring,
  useTransform
} from "framer-motion";

const watermarkTransition = {
  duration: 1.05,
  ease: [0.16, 1, 0.3, 1]
};

function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });
  const rotateX = useTransform(springY, [-300, 300], [10, -10]);
  const rotateY = useTransform(springX, [-300, 300], [-10, 10]);

  useEffect(() => {
    if (!slides.length) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setDirection(1);
      setIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [slides]);

  if (!slides.length) {
    return null;
  }

  const paginate = (newIndex) => {
    setDirection(newIndex > index ? 1 : -1);
    setIndex(newIndex);
  };

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left - rect.width / 2);
    mouseY.set(event.clientY - rect.top - rect.height / 2);
  };

  const resetMouseTracking = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const current = slides[index];
  const previous = slides[(index - 1 + slides.length) % slides.length];
  const next = slides[(index + 1) % slides.length];

  return (
    <section
      className="hero-carousel"
      onMouseMove={handleMouseMove}
      onMouseLeave={resetMouseTracking}
    >
      <div className="hero-grid-overlay" />
      <div
        className="hero-carousel-accent"
        style={{ "--hero-accent": current.accent || "#ff9d2f" }}
      />

      <AnimatePresence mode="wait" custom={direction}>
        <Motion.div
          key={`watermark-${current.id}`}
          custom={direction}
          initial={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
          transition={watermarkTransition}
          className="hero-carousel-watermark-shell"
        >
          <h1 className="hero-carousel-watermark">{current.title}</h1>
        </Motion.div>
      </AnimatePresence>

      <div className="container hero-carousel-shell">
        <div className="hero-carousel-stage">
          <Motion.img
            key={`previous-${previous.id}`}
            src={previous.image}
            alt={previous.subtitle}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 0.24, filter: "grayscale(100%)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="hero-carousel-preview hero-carousel-preview-left"
            onClick={() => paginate((index - 1 + slides.length) % slides.length)}
          />

          <div className="hero-carousel-main">
            <AnimatePresence mode="wait">
              <Motion.div
                key={current.id}
                style={{ rotateX, rotateY, perspective: 1000 }}
                initial={{ scale: 0.5, opacity: 0, y: 100 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.2, opacity: 0, y: -100 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="hero-carousel-visual"
              >
                <img
                  src={current.image}
                  className="hero-carousel-image"
                  alt={current.subtitle}
                />
              </Motion.div>
            </AnimatePresence>
          </div>

          <Motion.img
            key={`next-${next.id}`}
            src={next.image}
            alt={next.subtitle}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 0.24, filter: "grayscale(100%)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="hero-carousel-preview hero-carousel-preview-right"
            onClick={() => paginate((index + 1) % slides.length)}
          />
        </div>

        <div className="hero-carousel-info">
          <AnimatePresence mode="wait">
            <Motion.h2
              key={`model-${current.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="hero-carousel-model-name"
            >
              {current.subtitle}
            </Motion.h2>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default HeroCarousel;
