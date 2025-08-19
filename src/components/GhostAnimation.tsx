import { motion } from "framer-motion";

export default function GhostAnimation() {
  // Upside-down raindrop silhouette (narrow head, widens, pointed tail)
  const bodyPath = `M 0 -78
    C 26 -78, 48 -60, 54 -34
    C 58 -10, 42 18, 28 40
    C 18 56, 8 70, 0 84
    C -8 70, -18 56, -28 40
    C -42 18, -58 -10, -54 -34
    C -48 -60, -26 -78, 0 -78 Z`;

  // Three ghosts with different speeds / lanes - positioned to cover hero
  const ghosts = [
    {
      id: 1,
      initial: { x: -260, y: 300, rotate: -4, opacity: 1 },
      animate: { x: 1280, y: [300, 260, 300, 340, 300], rotate: [-4, 2, -4] },
      transition: {
        x: { duration: 12, repeat: Infinity, ease: "linear" },
        y: { duration: 5.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
        rotate: { duration: 4.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
      },
      scale: 0.95,
    },
    {
      id: 2, // RIGHT-TO-LEFT ghost
      initial: { x: 1280, y: 360, rotate: 2, opacity: 1 },
      animate: { x: -280, y: [360, 400, 360, 320, 360], rotate: [2, -2, 2] },
      transition: {
        x: { duration: 16, repeat: Infinity, ease: "linear" },
        y: { duration: 6.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
        rotate: { duration: 5.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
      },
      scale: 1,
    },
    {
      id: 3,
      initial: { x: -300, y: 420, rotate: -3, opacity: 1 },
      animate: { x: 1280, y: [420, 380, 420, 460, 420], rotate: [-3, 3, -3] },
      transition: {
        x: { duration: 20, repeat: Infinity, ease: "linear" },
        y: { duration: 7.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
        rotate: { duration: 6.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
      },
      scale: 1.05,
    },
  ] as const;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* One clipPath per ghost so the text reveals wherever ANY ghost passes */}
          {ghosts.map((g) => (
            <clipPath key={g.id} id={`ghost-clip-${g.id}`} clipPathUnits="userSpaceOnUse">
              <motion.g initial={g.initial} animate={g.animate} transition={g.transition}>
                <g transform={`scale(${g.scale})`}>
                  <path d={bodyPath} />
                </g>
              </motion.g>
            </clipPath>
          ))}
        </defs>

        {/* Centered headline, duplicated and clipped by each ghost path to simulate union of clips */}
        {ghosts.map((g) => (
          <g key={`text-${g.id}`} clipPath={`url(#ghost-clip-${g.id})`}>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="32"
              fontWeight="800"
              style={{ fontFamily: 'Syne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto' }}
              fill="#121E62"
            >
              testing prompt 1 of 10
            </text>
          </g>
        ))}

        {/* Visible ghosts matching the same motion paths */}
        {ghosts.map((g) => (
          <motion.g key={`ghost-${g.id}`} initial={g.initial} animate={g.animate} transition={g.transition}>
            <g transform={`scale(${g.scale})`}>
              <path d={bodyPath} fill="#E7E2F9" />
              <ellipse cx="-14" cy="-26" rx="6" ry="9" fill="#000" />
              <ellipse cx="14" cy="-26" rx="6" ry="9" fill="#000" />
            </g>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}