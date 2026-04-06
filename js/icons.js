/**
 * Connect Cafe - SVG Icon Library
 * 48x48 viewBox, fill-focused design for readability at small sizes
 * Brand palette: #1D9E75 (primary), #085041 (dark), #9FE1CB (light)
 * Redesigned 2026-04-06: Distinctive silhouettes, warm appetizing colors
 */

export const ICONS = {

  // ─── Drinks ──────────────────────────────────────────

  water: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Glass body -->
    <path d="M14 8h20l-3 32H17L14 8z" fill="#E3F4FD" stroke="#5BAFE6" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Water level -->
    <path d="M16 18l14.5 0L29 38H17.5L16 18z" fill="#8DD4F8" opacity="0.6"/>
    <!-- Ice cubes -->
    <rect x="19" y="14" width="5" height="5" rx="1" fill="#fff" stroke="#B0DAF1" stroke-width="1" transform="rotate(-8 21 16)"/>
    <rect x="26" y="17" width="4.5" height="4.5" rx="1" fill="#fff" stroke="#B0DAF1" stroke-width="1" transform="rotate(6 28 19)"/>
    <!-- Water surface shine -->
    <path d="M16.5 18c3-1.5 8 1 14.5 0" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
    <!-- Glass rim highlight -->
    <path d="M14 8h20" stroke="#5BAFE6" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  coffee: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Mug body -->
    <path d="M8 16h24v18a6 6 0 01-6 6H14a6 6 0 01-6-6V16z" fill="#FEFCF9" stroke="#7C5835" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Coffee liquid -->
    <path d="M8 20h24v14a6 6 0 01-6 6H14a6 6 0 01-6-6V20z" fill="#5C3310"/>
    <!-- Cream swirl -->
    <ellipse cx="20" cy="22" rx="6" ry="2" fill="#D4A76A" opacity="0.7"/>
    <path d="M16 22c2-1 4 1 6 0s3-1 5 0" stroke="#E8CEAB" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
    <!-- Handle -->
    <path d="M32 20h3a4.5 4.5 0 010 9h-3" stroke="#7C5835" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <!-- Mug rim -->
    <path d="M8 16h24" stroke="#7C5835" stroke-width="2" stroke-linecap="round"/>
    <!-- Steam -->
    <path d="M15 10c0-3 2-3 2-6" stroke="#C4A882" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M20 9c0-3 2-3 2-6" stroke="#C4A882" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M25 10c0-3 2-3 2-6" stroke="#C4A882" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  tea: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Yunomi (Japanese tea cup) - wider top, narrower bottom -->
    <path d="M12 14c0-1 4-2 12-2s12 1 12 2v18c0 3-5 6-12 6s-12-3-12-6V14z" fill="#E8F5E9" stroke="#1D9E75" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Tea liquid surface -->
    <ellipse cx="24" cy="16" rx="11" ry="3" fill="#7BC67E" opacity="0.5"/>
    <!-- Tea liquid -->
    <path d="M13 16c0 0 4 2 11 2s11-2 11-2v16c0 3-5 5.5-11 5.5S13 35 13 32V16z" fill="#4CAF50" opacity="0.35"/>
    <!-- Cup rim -->
    <ellipse cx="24" cy="14" rx="12" ry="3" fill="none" stroke="#1D9E75" stroke-width="2"/>
    <!-- Decorative stripe on cup -->
    <path d="M13.5 26c5 1 10 1.5 21 0" stroke="#1D9E75" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
    <!-- Steam - gentle wisps -->
    <path d="M21 8c0-2.5 1.5-2.5 1.5-5" stroke="#1D9E75" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>
    <path d="M27 7c0-2.5 1.5-2.5 1.5-5" stroke="#1D9E75" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>
  </svg>`,

  hot_water: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Yunomi shape - similar to tea but lighter color -->
    <path d="M12 16c0-1 4-2 12-2s12 1 12 2v16c0 3-5 6-12 6s-12-3-12-6V16z" fill="#FFF8F0" stroke="#D4956A" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Warm water surface -->
    <ellipse cx="24" cy="17" rx="11" ry="3" fill="#FFECD2" opacity="0.6"/>
    <!-- Clear liquid shimmer -->
    <path d="M16 24c3-1 6 1 8 0s4-1 7 0" stroke="#F5DEB3" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    <!-- Cup rim -->
    <ellipse cx="24" cy="16" rx="12" ry="3" fill="none" stroke="#D4956A" stroke-width="2"/>
    <!-- Heavy steam (more than tea - key differentiator) -->
    <path d="M17 8c0-3 2-3 2-6" stroke="#D4956A" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>
    <path d="M22 6c0-3 2-3 2-6" stroke="#D4956A" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
    <path d="M27 7c0-3 2-3 2-6" stroke="#D4956A" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
    <path d="M32 8c0-3 2-3 2-6" stroke="#D4956A" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  cola: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Can body -->
    <rect x="14" y="6" width="20" height="36" rx="3" fill="#D42B2B" stroke="#8B1515" stroke-width="1.5"/>
    <!-- Can top -->
    <ellipse cx="24" cy="7" rx="10" ry="2.5" fill="#E04040" stroke="#8B1515" stroke-width="1"/>
    <!-- Pull tab -->
    <ellipse cx="24" cy="7" rx="3" ry="1" fill="#CCC" stroke="#999" stroke-width="0.8"/>
    <!-- White wave/stripe design -->
    <path d="M14 22c4-3 8-1 12-3s6-1 8-2" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
    <path d="M14 26c3-2 7 0 11-2s6 0 9-1" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <!-- Bottom ring -->
    <path d="M14 38c0 2 4 4 10 4s10-2 10-4" stroke="#8B1515" stroke-width="1" opacity="0.4"/>
  </svg>`,

  cola_zero: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Can body - dark/black -->
    <rect x="14" y="6" width="20" height="36" rx="3" fill="#1A1A1A" stroke="#000" stroke-width="1.5"/>
    <!-- Can top -->
    <ellipse cx="24" cy="7" rx="10" ry="2.5" fill="#2A2A2A" stroke="#000" stroke-width="1"/>
    <!-- Pull tab -->
    <ellipse cx="24" cy="7" rx="3" ry="1" fill="#CCC" stroke="#999" stroke-width="0.8"/>
    <!-- Red accent stripe -->
    <path d="M14 20h20" stroke="#D42B2B" stroke-width="2.5" opacity="0.8"/>
    <!-- Zero mark - distinctive circle -->
    <circle cx="24" cy="28" r="6" fill="none" stroke="#fff" stroke-width="2" opacity="0.9"/>
    <text x="24" y="31" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" font-weight="bold" fill="#fff" opacity="0.9">0</text>
    <!-- Bottom ring -->
    <path d="M14 38c0 2 4 4 10 4s10-2 10-4" stroke="#333" stroke-width="1" opacity="0.4"/>
  </svg>`,

  energy_drink: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Tall thin can -->
    <rect x="16" y="4" width="16" height="40" rx="2.5" fill="#1A4D8F" stroke="#0D2E5C" stroke-width="1.5"/>
    <!-- Can top -->
    <ellipse cx="24" cy="5" rx="8" ry="2" fill="#2266B8" stroke="#0D2E5C" stroke-width="1"/>
    <!-- Pull tab -->
    <ellipse cx="24" cy="5" rx="2.5" ry="0.8" fill="#C0C0C0" stroke="#888" stroke-width="0.7"/>
    <!-- Silver section -->
    <rect x="16" y="8" width="16" height="8" fill="#C0D0E0" opacity="0.5"/>
    <!-- Lightning bolt - key identifier -->
    <polygon points="26,14 21,24 25,24 22,36 30,22 25,22 28,14" fill="#FFD700"/>
    <polygon points="26,14 21,24 25,24 22,36 30,22 25,22 28,14" fill="none" stroke="#E6B800" stroke-width="0.5"/>
    <!-- Bottom -->
    <path d="M16 40c0 2 3 4 8 4s8-2 8-4" stroke="#0D2E5C" stroke-width="1" opacity="0.3"/>
  </svg>`,

  milk: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Carton body -->
    <rect x="13" y="14" width="22" height="28" rx="2" fill="#FEFEFE" stroke="#4BA3D4" stroke-width="1.5"/>
    <!-- Gable top -->
    <path d="M13 14l11-8 11 8" fill="#FEFEFE" stroke="#4BA3D4" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Roof crease -->
    <line x1="24" y1="6" x2="24" y2="14" stroke="#4BA3D4" stroke-width="1" opacity="0.3"/>
    <!-- Blue stripe -->
    <rect x="13" y="22" width="22" height="10" fill="#4BA3D4" opacity="0.2"/>
    <!-- MILK text area -->
    <rect x="17" y="24" width="14" height="6" rx="1" fill="#D6F0FF"/>
    <text x="24" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" font-weight="bold" fill="#4BA3D4">MILK</text>
    <!-- Cow spot decoration -->
    <ellipse cx="20" cy="36" rx="2.5" ry="2" fill="#4BA3D4" opacity="0.15"/>
    <ellipse cx="28" cy="35" rx="2" ry="1.5" fill="#4BA3D4" opacity="0.15"/>
  </svg>`,

  orange_juice: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Glass body -->
    <path d="M14 10h20l-2.5 30H16.5L14 10z" fill="#FFF5E6" stroke="#F59E0B" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Orange juice fill -->
    <path d="M15.5 16l13.5 0L27.5 38H17L15.5 16z" fill="#FF9F1C" opacity="0.7"/>
    <!-- Bubbles -->
    <circle cx="21" cy="28" r="1" fill="#FFD166" opacity="0.6"/>
    <circle cx="25" cy="32" r="0.8" fill="#FFD166" opacity="0.5"/>
    <!-- Orange slice garnish on rim -->
    <circle cx="30" cy="12" r="5" fill="#FF8C00" stroke="#E67600" stroke-width="1"/>
    <path d="M30 8v8M27 12h6M27.8 9l4.4 6M32.2 9l-4.4 6" stroke="#FFB347" stroke-width="0.8" stroke-linecap="round"/>
    <circle cx="30" cy="12" r="2" fill="#FFCC66" opacity="0.4"/>
    <!-- Glass rim -->
    <path d="M14 10h20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  juice: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Glass body -->
    <path d="M15 12h18l-2 28H17L15 12z" fill="#F8ECFF" stroke="#9B59B6" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Juice fill - gradient effect with layered colors -->
    <path d="M16.2 18l13 0L28 38H17.4L16.2 18z" fill="#C77DDB" opacity="0.45"/>
    <path d="M17 28l11.5 0L27.5 38H17.6L17 28z" fill="#9B59B6" opacity="0.25"/>
    <!-- Straw -->
    <rect x="27" y="4" width="2" height="24" rx="0.5" fill="#E74C7D" transform="rotate(8 28 16)"/>
    <!-- Glass rim -->
    <path d="M15 12h18" stroke="#9B59B6" stroke-width="2" stroke-linecap="round"/>
    <!-- Small bubbles -->
    <circle cx="22" cy="24" r="1" fill="#DDB8EE" opacity="0.5"/>
    <circle cx="25" cy="30" r="0.7" fill="#DDB8EE" opacity="0.4"/>
  </svg>`,

  // ─── Snacks ──────────────────────────────────────────

  snack: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Pillow bag shape -->
    <path d="M14 10c-2 0-3 2-3 4v20c0 2 1 4 3 4h20c2 0 3-2 3-4V14c0-2-1-4-3-4H14z" fill="#FFE082" stroke="#F9A825" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Crimped top -->
    <path d="M17 10l-1-4h16l-1 4" fill="#FF8F00" stroke="#F9A825" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Zigzag pattern -->
    <path d="M14 18l4 3 4-3 4 3 4-3 4 3 3-3" stroke="#F9A825" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
    <path d="M14 26l4 3 4-3 4 3 4-3 4 3 3-3" stroke="#F9A825" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
    <!-- Chip shapes inside -->
    <ellipse cx="21" cy="22" rx="3" ry="1.5" fill="#F9A825" opacity="0.4" transform="rotate(-10 21 22)"/>
    <ellipse cx="27" cy="30" rx="2.5" ry="1.2" fill="#F9A825" opacity="0.35" transform="rotate(15 27 30)"/>
  </svg>`,

  cookie: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Cookie body with rough edge -->
    <circle cx="24" cy="24" r="15" fill="#DEB367" stroke="#B8862A" stroke-width="1.5"/>
    <!-- Slightly irregular edge bumps -->
    <circle cx="24" cy="24" r="14" fill="#D4A550"/>
    <!-- Chocolate chips - larger and more visible -->
    <circle cx="18" cy="18" r="2.5" fill="#4A2510"/>
    <circle cx="29" cy="17" r="2.2" fill="#4A2510"/>
    <circle cx="22" cy="28" r="2.8" fill="#4A2510"/>
    <circle cx="31" cy="27" r="2" fill="#4A2510"/>
    <circle cx="16" cy="26" r="1.8" fill="#4A2510"/>
    <circle cx="26" cy="21" r="1.5" fill="#4A2510"/>
    <!-- Surface cracks/texture -->
    <path d="M14 22c2-1 3 1 5 0" stroke="#C49A3C" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/>
    <path d="M26 32c2 0 3-1 4 0" stroke="#C49A3C" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
  </svg>`,

  chocolate: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Wrapper peeled back -->
    <path d="M6 14l4-4h28l4 4" fill="#C4A24A" stroke="#A68B3C" stroke-width="1" stroke-linejoin="round" opacity="0.7"/>
    <!-- Chocolate bar -->
    <rect x="8" y="14" width="32" height="22" rx="2" fill="#5C2E0E" stroke="#3D1D06" stroke-width="1.5"/>
    <!-- Squares pattern - grid lines -->
    <line x1="18" y1="14" x2="18" y2="36" stroke="#3D1D06" stroke-width="1.5" opacity="0.5"/>
    <line x1="28" y1="14" x2="28" y2="36" stroke="#3D1D06" stroke-width="1.5" opacity="0.5"/>
    <line x1="8" y1="22" x2="40" y2="22" stroke="#3D1D06" stroke-width="1.5" opacity="0.5"/>
    <line x1="8" y1="30" x2="40" y2="30" stroke="#3D1D06" stroke-width="1.5" opacity="0.5"/>
    <!-- Chocolate shine -->
    <rect x="10" y="16" width="6" height="4" rx="1" fill="#7A4420" opacity="0.5"/>
    <rect x="20" y="24" width="6" height="4" rx="1" fill="#7A4420" opacity="0.4"/>
  </svg>`,

  chips: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Tube/canister shape (Pringles-style, different from pillow bag snack) -->
    <rect x="14" y="8" width="20" height="34" rx="10" fill="#E53935" stroke="#B71C1C" stroke-width="1.5"/>
    <!-- Lid -->
    <ellipse cx="24" cy="9" rx="10" ry="4" fill="#EF5350" stroke="#B71C1C" stroke-width="1"/>
    <!-- Label area -->
    <rect x="14" y="18" width="20" height="14" fill="#FFC107" opacity="0.8" rx="0"/>
    <!-- Chip icon on label -->
    <ellipse cx="24" cy="25" rx="5" ry="3" fill="#FFE082" stroke="#F9A825" stroke-width="1" transform="rotate(-15 24 25)"/>
    <!-- Bottom -->
    <ellipse cx="24" cy="40" rx="10" ry="3" fill="#C62828" opacity="0.3"/>
  </svg>`,

  // ─── Meals ───────────────────────────────────────────

  rice: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Microwave rice plastic tray - rectangular with rounded corners -->
    <rect x="8" y="18" width="32" height="20" rx="3" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="1.5"/>
    <!-- Tray inner rim -->
    <rect x="10" y="20" width="28" height="16" rx="2" fill="#FEFEFE" stroke="#E0E0E0" stroke-width="1"/>
    <!-- Rice mound - fluffy white rice filling the tray -->
    <path d="M12 26c0-5 5-8 12-8s12 3 12 8" fill="#FFF" stroke="#E8E0D0" stroke-width="1"/>
    <!-- Rice grain texture -->
    <ellipse cx="18" cy="23" rx="2" ry="0.8" fill="#F5F0E5" stroke="#E0D8C8" stroke-width="0.7" transform="rotate(-20 18 23)"/>
    <ellipse cx="24" cy="21" rx="2.2" ry="0.9" fill="#F5F0E5" stroke="#E0D8C8" stroke-width="0.7" transform="rotate(10 24 21)"/>
    <ellipse cx="30" cy="23" rx="2" ry="0.8" fill="#F5F0E5" stroke="#E0D8C8" stroke-width="0.7" transform="rotate(-5 30 23)"/>
    <ellipse cx="21" cy="25" rx="1.8" ry="0.7" fill="#F5F0E5" stroke="#E0D8C8" stroke-width="0.7" transform="rotate(15 21 25)"/>
    <ellipse cx="27" cy="25" rx="1.8" ry="0.7" fill="#F5F0E5" stroke="#E0D8C8" stroke-width="0.7" transform="rotate(-10 27 25)"/>
    <!-- Tray film/peel tab -->
    <path d="M36 18l4-4" stroke="#BDBDBD" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M36 18l3-1" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1"/>
    <!-- Steam -->
    <path d="M19 12c0-3 1.5-2.5 1.5-5" stroke="#BDBDBD" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    <path d="M24 11c0-3 1.5-2.5 1.5-5" stroke="#BDBDBD" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M29 12c0-3 1.5-2.5 1.5-5" stroke="#BDBDBD" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  noodle: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Cup noodle container - tapered cylinder -->
    <path d="M13 14l-2 26h26l-2-26H13z" fill="#FFF5E6" stroke="#D4764E" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Cup rim/lid edge -->
    <ellipse cx="24" cy="14" rx="11.5" ry="3" fill="#F0E0C8" stroke="#D4764E" stroke-width="1.5"/>
    <!-- Chicken-colored broth visible at top -->
    <ellipse cx="24" cy="16" rx="10" ry="2.5" fill="#F5C882" opacity="0.7"/>
    <!-- Chopsticks sticking out (crossed) -->
    <line x1="19" y1="2" x2="22" y2="18" stroke="#C49A6C" stroke-width="2" stroke-linecap="round"/>
    <line x1="29" y1="2" x2="26" y2="18" stroke="#C49A6C" stroke-width="2" stroke-linecap="round"/>
    <!-- Noodle wiggles peeking out -->
    <path d="M18 15c1 1 2-1 3 0s2 1 3 0" stroke="#E8C87A" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Brand stripe on cup -->
    <rect x="12" y="24" width="24" height="6" rx="0" fill="#D4764E" opacity="0.2"/>
    <!-- Cup label decoration -->
    <path d="M16 27h16" stroke="#D4764E" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
    <!-- Steam -->
    <path d="M22 6c0-2 1-2 1-4" stroke="#D4764E" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
  </svg>`,

  curry_noodle: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Cup noodle container - same shape as noodle -->
    <path d="M13 14l-2 26h26l-2-26H13z" fill="#FFF8E0" stroke="#C67B30" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Cup rim -->
    <ellipse cx="24" cy="14" rx="11.5" ry="3" fill="#F5E0A0" stroke="#C67B30" stroke-width="1.5"/>
    <!-- YELLOW curry broth visible - key differentiator from regular noodle -->
    <ellipse cx="24" cy="16" rx="10" ry="2.5" fill="#E8A840" opacity="0.8"/>
    <!-- Chopsticks sticking out (crossed) -->
    <line x1="19" y1="2" x2="22" y2="18" stroke="#C49A6C" stroke-width="2" stroke-linecap="round"/>
    <line x1="29" y1="2" x2="26" y2="18" stroke="#C49A6C" stroke-width="2" stroke-linecap="round"/>
    <!-- Curry colored noodle peeking -->
    <path d="M17 15c1 1 3-1 4 0s2 1 4 0" stroke="#D4A030" stroke-width="1.5" stroke-linecap="round"/>
    <!-- CURRY yellow/golden stripe on cup - different from chicken noodle -->
    <rect x="12" y="22" width="24" height="8" rx="0" fill="#F5C430" opacity="0.35"/>
    <!-- Spice dots in broth -->
    <circle cx="20" cy="16" r="0.8" fill="#C67B30" opacity="0.5"/>
    <circle cx="27" cy="15.5" r="0.6" fill="#C67B30" opacity="0.4"/>
    <!-- Steam -->
    <path d="M22 6c0-2 1-2 1-4" stroke="#C67B30" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
  </svg>`,

  udon: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Bowl -->
    <path d="M4 20c0 0 3 20 20 20s20-20 20-20H4z" fill="#FFF8F0" stroke="#085041" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Bowl rim -->
    <ellipse cx="24" cy="20" rx="20" ry="4" fill="#E8F0E8" stroke="#085041" stroke-width="2"/>
    <!-- Light dashi broth -->
    <ellipse cx="24" cy="22" rx="16" ry="3" fill="#F5E8C8" opacity="0.5"/>
    <!-- Thick white udon noodles -->
    <path d="M12 26c3 2 5-1 8 1s4-1 7 1s5-1 7 0" stroke="#F5F0E0" stroke-width="4" stroke-linecap="round"/>
    <path d="M14 31c4 1 6-2 9 0s5-1 8 0" stroke="#F5F0E0" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>
    <!-- Golden fried tofu triangle (aburaage) - KEY identifier -->
    <polygon points="24,16 18,26 30,26" fill="#E8A840" stroke="#C48820" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Tofu texture -->
    <path d="M22 20l4 0" stroke="#D09830" stroke-width="0.8" opacity="0.4"/>
    <path d="M21 23l6 0" stroke="#D09830" stroke-width="0.8" opacity="0.3"/>
    <!-- Green onion garnish -->
    <circle cx="14" cy="22" r="1.5" fill="#4CAF50" opacity="0.7"/>
    <circle cx="17" cy="21" r="1" fill="#4CAF50" opacity="0.6"/>
  </svg>`,

  soba: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Bowl -->
    <path d="M4 20c0 0 3 20 20 20s20-20 20-20H4z" fill="#F5F0E8" stroke="#6B5B3E" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Bowl rim -->
    <ellipse cx="24" cy="20" rx="20" ry="4" fill="#E8E0D0" stroke="#6B5B3E" stroke-width="2"/>
    <!-- Dark dashi broth -->
    <ellipse cx="24" cy="22" rx="16" ry="3" fill="#8B7355" opacity="0.3"/>
    <!-- Dark buckwheat soba noodles (thinner than udon) -->
    <path d="M12 26c3 1 5-1 8 0s4-1 7 0s5-1 7 0" stroke="#7A6B4A" stroke-width="2" stroke-linecap="round"/>
    <path d="M13 29c4 1 6-1 9 0s5-1 8 0" stroke="#7A6B4A" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
    <path d="M15 32c3 1 5-1 7 0s4-1 6 0" stroke="#7A6B4A" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
    <!-- Tenkasu (tempura bits) scattered on top - KEY identifier -->
    <circle cx="16" cy="21" r="2" fill="#F5C882" stroke="#E0A850" stroke-width="0.7"/>
    <circle cx="21" cy="19" r="1.5" fill="#F0C070" stroke="#D8A848" stroke-width="0.7"/>
    <circle cx="28" cy="20" r="1.8" fill="#F5C882" stroke="#E0A850" stroke-width="0.7"/>
    <circle cx="33" cy="21" r="1.3" fill="#F0C070" stroke="#D8A848" stroke-width="0.7"/>
    <circle cx="25" cy="22" r="1" fill="#EDBE68" opacity="0.6"/>
    <!-- Green onion -->
    <circle cx="31" cy="23" r="1.2" fill="#4CAF50" opacity="0.6"/>
  </svg>`,

  yakisoba: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Styrofoam tray / plate - rectangular, different from bowls -->
    <rect x="4" y="20" width="40" height="22" rx="4" fill="#F5F0E6" stroke="#8B6544" stroke-width="1.5"/>
    <!-- Tray rim -->
    <rect x="6" y="22" width="36" height="18" rx="3" fill="#FFF5E6" stroke="#D4B896" stroke-width="1"/>
    <!-- Dark brown stir-fried noodles - wavy thick lines -->
    <path d="M10 28c4-2 7 2 10 0s6-2 9 0s6 2 9 0" stroke="#5C3310" stroke-width="3" stroke-linecap="round"/>
    <path d="M11 33c3-2 6 2 9 0s5-2 8 0s5 2 8 0" stroke="#6B3E1A" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M12 37c4-1 6 1 8 0s5-1 7 0s4 1 7-1" stroke="#5C3310" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <!-- Red pickled ginger (beni-shoga) -->
    <path d="M14 25c1 0 2 1 3 0" stroke="#E53935" stroke-width="2" stroke-linecap="round"/>
    <path d="M16 23c1 0 1.5 1 2.5 0" stroke="#E53935" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Green nori/aonori garnish -->
    <circle cx="28" cy="26" r="1.2" fill="#2E7D32" opacity="0.7"/>
    <circle cx="31" cy="24" r="1" fill="#2E7D32" opacity="0.6"/>
    <circle cx="34" cy="26" r="0.8" fill="#2E7D32" opacity="0.5"/>
  </svg>`,

  curry: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Wide plate -->
    <ellipse cx="24" cy="30" rx="20" ry="12" fill="#FAFAFA" stroke="#085041" stroke-width="1.5"/>
    <!-- Plate inner rim -->
    <ellipse cx="24" cy="28" rx="16" ry="9" fill="#FFF" stroke="#E0E0E0" stroke-width="1"/>
    <!-- Rice side (left) - white mound -->
    <path d="M8 28c0-4 4-8 10-8s6 4 6 8" fill="#FEFEFE" stroke="#E0D8C8" stroke-width="1"/>
    <!-- Rice grain hints -->
    <ellipse cx="15" cy="24" rx="1.5" ry="0.6" fill="#F0EBE0" transform="rotate(-10 15 24)"/>
    <ellipse cx="19" cy="23" rx="1.5" ry="0.6" fill="#F0EBE0" transform="rotate(10 19 23)"/>
    <!-- Curry side (right) - brown/golden -->
    <path d="M24 28c0-5 4-8 10-8s8 3 8 8" fill="#B5751A" opacity="0.85"/>
    <!-- Curry texture/chunks -->
    <circle cx="30" cy="24" r="2" fill="#8B5E2A" opacity="0.5"/>
    <circle cx="35" cy="26" r="1.5" fill="#8B5E2A" opacity="0.4"/>
    <circle cx="32" cy="28" r="1" fill="#A06828" opacity="0.3"/>
    <!-- Division line between rice and curry -->
    <path d="M24 20v18" stroke="#C49A50" stroke-width="1" opacity="0.3" stroke-dasharray="2 2"/>
    <!-- Steam -->
    <path d="M18 12c0-3 1.5-2.5 1.5-5" stroke="#085041" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    <path d="M28 11c0-3 1.5-2.5 1.5-5" stroke="#085041" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
  </svg>`,

  gyudon: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Deep donburi bowl -->
    <path d="M4 18c0 0 3 22 20 22s20-22 20-22H4z" fill="#FAFAFA" stroke="#085041" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Bowl rim - decorative -->
    <ellipse cx="24" cy="18" rx="20" ry="4.5" fill="#E8F0E8" stroke="#085041" stroke-width="2"/>
    <!-- Rice base (visible around edges) -->
    <path d="M10 24c2-3 6-4 14-4s12 1 14 4" fill="#FFF" stroke="#E8E0D0" stroke-width="0.8" opacity="0.7"/>
    <!-- Beef slices on top - overlapping wavy pieces with orange tint -->
    <path d="M10 22c3-1 6 1 9-1s6 2 9 0s5 1 8-1" fill="#B5662A" stroke="#8B4513" stroke-width="1" opacity="0.9"/>
    <path d="M11 26c4-1 7 1 10 0s6-1 9 0s5 1 6 0" fill="#C47830" stroke="#8B4513" stroke-width="0.8" opacity="0.85"/>
    <path d="M13 30c3-1 5 1 8 0s5-1 7 0s4 1 6-1" fill="#B5662A" opacity="0.7"/>
    <!-- Onion slices -->
    <path d="M16 24c1 1 2-1 3 0" stroke="#FFE0A0" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    <path d="M26 23c1 1 2-1 3 0" stroke="#FFE0A0" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <!-- Egg yolk on top (optional topping but makes it look delicious) -->
    <circle cx="24" cy="22" r="3.5" fill="#FFB830" opacity="0.7"/>
    <circle cx="24" cy="22" r="1.5" fill="#FF9500" opacity="0.6"/>
    <!-- Steam -->
    <path d="M20 10c0-3 1.5-2.5 1.5-5" stroke="#085041" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    <path d="M27 9c0-3 1.5-2.5 1.5-5" stroke="#085041" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
  </svg>`,

  pizza: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Pizza slice - triangle -->
    <path d="M24 4L4 42h40L24 4z" fill="#F5D090" stroke="#D4964E" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Crust (bottom arc) -->
    <path d="M6 40c6 4 14 5 18 5s12-1 18-5" fill="#D4964E" stroke="#B5783A" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Red tomato sauce -->
    <path d="M24 10L8 38h32L24 10z" fill="#D44030" opacity="0.5"/>
    <!-- Melted cheese (yellowish, with drips) -->
    <path d="M24 12L10 36h28L24 12z" fill="#FFD966" opacity="0.65"/>
    <!-- Cheese stretch/melt texture -->
    <path d="M14 32c2 1 4 0 5 2" stroke="#F5C430" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    <!-- Pepperoni dots -->
    <circle cx="20" cy="24" r="3" fill="#C62828"/>
    <circle cx="28" cy="26" r="2.8" fill="#C62828"/>
    <circle cx="24" cy="16" r="2.2" fill="#C62828"/>
    <circle cx="16" cy="32" r="2.5" fill="#C62828"/>
    <circle cx="30" cy="34" r="2.2" fill="#C62828"/>
    <!-- Pepperoni shine -->
    <circle cx="20" cy="23" r="1" fill="#E04040" opacity="0.4"/>
    <circle cx="28" cy="25" r="0.8" fill="#E04040" opacity="0.4"/>
  </svg>`,

  bento: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Bento box -->
    <rect x="4" y="12" width="40" height="26" rx="3" fill="#FAFAFA" stroke="#085041" stroke-width="1.5"/>
    <!-- Dividers -->
    <line x1="24" y1="12" x2="24" y2="38" stroke="#085041" stroke-width="1.5" opacity="0.4"/>
    <line x1="4" y1="25" x2="24" y2="25" stroke="#085041" stroke-width="1.5" opacity="0.4"/>
    <!-- Top-left: umeboshi rice -->
    <rect x="6" y="14" width="16" height="9" rx="1" fill="#FFF"/>
    <circle cx="14" cy="18.5" r="3" fill="#CC2929" opacity="0.6"/>
    <circle cx="14" cy="18.5" r="1.5" fill="#E05050" opacity="0.5"/>
    <!-- Bottom-left: veggies -->
    <rect x="6" y="27" width="16" height="9" rx="1" fill="#C8E6C9" opacity="0.4"/>
    <circle cx="10" cy="31.5" r="2" fill="#4CAF50" opacity="0.5"/>
    <circle cx="15" cy="32" r="1.5" fill="#FF9800" opacity="0.5"/>
    <circle cx="19" cy="31" r="1.8" fill="#4CAF50" opacity="0.4"/>
    <!-- Right: main dish (tonkatsu/meat) -->
    <rect x="26" y="14" width="16" height="22" rx="1" fill="#F5E6D0" opacity="0.3"/>
    <ellipse cx="34" cy="22" rx="6" ry="4" fill="#D4964E" opacity="0.5"/>
    <path d="M30 28h8" stroke="#D4964E" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M30 32h8" stroke="#C49A6C" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  onigiri: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Rice triangle body -->
    <path d="M24 4L6 34c0 4 8 10 18 10s18-6 18-10L24 4z" fill="#FEFEFE" stroke="#085041" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Rice texture subtle -->
    <ellipse cx="20" cy="20" rx="1.5" ry="0.6" fill="#F0EBE0" transform="rotate(-10 20 20)"/>
    <ellipse cx="28" cy="22" rx="1.5" ry="0.6" fill="#F0EBE0" transform="rotate(10 28 22)"/>
    <!-- Nori (seaweed) wrap at bottom -->
    <path d="M12 30c0 0 3 10 12 10s12-10 12-10v4c0 3-5 8-12 8s-12-5-12-8v-4z" fill="#1A3A2A" opacity="0.9"/>
    <!-- Nori texture -->
    <path d="M16 34c3 2 6 3 8 3s5-1 8-3" stroke="#0D2E1A" stroke-width="0.5" opacity="0.3"/>
    <!-- Umeboshi (plum) filling visible -->
    <circle cx="24" cy="22" r="2.5" fill="#CC2929" opacity="0.55"/>
  </svg>`,

  sandwich: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Top bread slice - triangular/sloped -->
    <path d="M6 18l18-10 18 10" fill="#E8C87A" stroke="#C49A3C" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Top bread surface texture -->
    <path d="M10 17l14-7 14 7" fill="#DEB367" opacity="0.5"/>
    <!-- Lettuce layer -->
    <path d="M6 18c2 1 4-1 6 0s4 1 6 0s4-1 6 0s4 1 6 0s4-1 6 0s4 1 6 0" fill="#4CAF50" opacity="0.6" stroke="#388E3C" stroke-width="0.5"/>
    <rect x="6" y="18" width="36" height="4" rx="0" fill="#4CAF50" opacity="0.4"/>
    <!-- Ham/meat layer -->
    <rect x="6" y="22" width="36" height="4" rx="0" fill="#F5A0A0" opacity="0.7"/>
    <!-- Cheese layer -->
    <rect x="6" y="26" width="36" height="3" rx="0" fill="#FFD966" opacity="0.65"/>
    <!-- Tomato layer -->
    <rect x="6" y="29" width="36" height="3" rx="0" fill="#E53935" opacity="0.45"/>
    <!-- Bottom bread -->
    <path d="M6 32h36v3c0 1-2 3-6 4H12c-4-1-6-3-6-4v-3z" fill="#DEB367" stroke="#C49A3C" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,

  // ─── General ─────────────────────────────────────────

  new: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Star burst shape -->
    <polygon points="24,2 28,16 42,12 32,22 44,32 28,28 24,44 20,28 4,32 16,22 6,12 20,16" fill="#FF6B6B" stroke="#CC4444" stroke-width="1"/>
    <!-- Inner circle -->
    <circle cx="24" cy="23" r="9" fill="#FF6B6B"/>
    <!-- NEW text -->
    <text x="24" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="#FFF">NEW</text>
    <!-- Sparkle accents -->
    <circle cx="10" cy="8" r="1.5" fill="#FFD700"/>
    <circle cx="40" cy="6" r="1" fill="#FFD700"/>
    <circle cx="42" cy="38" r="1.2" fill="#FFD700"/>
  </svg>`,

  free: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Green circle -->
    <circle cx="24" cy="24" r="18" fill="#1D9E75" stroke="#085041" stroke-width="1.5"/>
    <!-- Checkmark -->
    <path d="M14 24l7 7 14-14" stroke="#FFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Subtle shine -->
    <path d="M14 14c3-3 6-4 10-4" stroke="#9FE1CB" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  default: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <!-- Fork -->
    <path d="M16 6v10c0 3 2 5 5 5v19a2 2 0 004 0V21c3 0 5-2 5-5V6" stroke="#1D9E75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <line x1="19" y1="6" x2="19" y2="14" stroke="#1D9E75" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="23" y1="6" x2="23" y2="14" stroke="#1D9E75" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Knife (crossed) -->
    <path d="M32 6c0 0-4 4-4 10s4 5 4 5v19a2 2 0 004 0V21s4 1 4-5-4-10-4-10" fill="#9FE1CB" stroke="#1D9E75" stroke-width="1.5" stroke-linejoin="round" opacity="0.6"/>
    <line x1="34" y1="21" x2="34" y2="40" stroke="#1D9E75" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

};


// ─── Helper Functions ─────────────────────────────────

/**
 * Get an SVG icon by key, optionally resized.
 * Falls back to the 'default' icon if key is not found.
 * @param {string} key - Icon key name
 * @param {number} size - Desired render size in px (default 32)
 * @returns {string} SVG markup string
 */
export function getIcon(key, size = 32) {
  const svg = ICONS[key] || ICONS['default'];
  return svg
    .replace('width="48"', `width="${size}"`)
    .replace('height="48"', `height="${size}"`);
}

/**
 * Returns categorized icon list for admin panel icon picker.
 * @returns {Array<{label: string, icons: string[]}>}
 */
export function getIconCategories() {
  return [
    {
      label: 'ドリンク',
      icons: [
        'water', 'coffee', 'tea', 'hot_water',
        'cola', 'cola_zero', 'energy_drink',
        'milk', 'orange_juice', 'juice',
      ],
    },
    {
      label: 'おやつ',
      icons: ['snack', 'cookie', 'chocolate', 'chips'],
    },
    {
      label: '食事',
      icons: [
        'rice', 'noodle', 'curry_noodle', 'udon', 'soba',
        'yakisoba', 'curry', 'gyudon', 'pizza',
        'bento', 'onigiri', 'sandwich',
      ],
    },
    {
      label: 'その他',
      icons: ['new', 'free', 'default'],
    },
  ];
}
