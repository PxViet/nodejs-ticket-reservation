import { addDays, formatDate } from '../date.util';

export interface MovieFixture {
  title: string;
  synopsis: string;
  posterUrl: string | null;
  durationMinutes: number;
  language: string;
  releaseDate: string;
  rating: number | null;
  genreNames: string[];
}

const daysFromNow = (days: number): string =>
  formatDate(addDays(new Date(), days));

// DDR-009's demo catalogue. Titles, synopses, runtimes, release dates, posters
// and IMDb ratings are taken from JustWatch (justwatch.com/us), with its genres
// folded into GENRE_NAMES. 15 released titles cover every genre.
export const MOVIE_FIXTURES: MovieFixture[] = [
  {
    title: 'Project Hail Mary',
    synopsis:
      'Science teacher Ryland Grace wakes up on a spaceship light years from home with no recollection of who he is or how he got there. As his memory returns, he begins to uncover his mission: solve the riddle of the mysterious substance causing the sun to die out. He must call on his scientific knowledge and unorthodox ideas to save everything on Earth from extinction.',
    posterUrl:
      'https://images.justwatch.com/poster/342918190/s592/project-hail-mary.avif',
    durationMinutes: 157,
    language: 'English',
    releaseDate: '2026-03-15',
    rating: 8.2,
    genreNames: ['Action', 'Comedy', 'Sci-Fi'],
  },
  {
    title: 'Toy Story 5',
    synopsis:
      "When Bonnie receives a Lilypad tablet as a gift and becomes obsessed, Buzz, Woody, Jessie and the rest of the gang's jobs become exponentially harder when they have to go head to head with the all-new threat to playtime.",
    posterUrl:
      'https://images.justwatch.com/poster/346646489/s592/toy-story-5.avif',
    durationMinutes: 102,
    language: 'English',
    releaseDate: '2026-06-17',
    rating: 7.3,
    genreNames: ['Action', 'Animation', 'Comedy'],
  },
  {
    title: 'Spider-Man: Brand New Day',
    synopsis:
      "Fighting crime full-time as Spider-Man in a world that doesn't remember him—and the pressure of seeing his old friends move on without him—sparks a change in Peter Parker he may not have the power to control. But that transformation might also be the only thing that can stop a shocking new threat to the city and those he loves - a powerful villain no one can even see.",
    posterUrl:
      'https://images.justwatch.com/poster/347907260/s592/spider-man-brand-new-day.avif',
    durationMinutes: 145,
    language: 'English',
    releaseDate: '2026-07-29',
    rating: 8.0,
    genreNames: ['Action', 'Sci-Fi'],
  },
  {
    title: 'Evil Dead Burn',
    synopsis:
      "After her husband's abrupt death, Alice seeks solace with his remaining family — descendants of a leading researcher on demonic possession. As her in-laws transform one by one into creatures that feed on fear, she comes to discover that the vows she took in life survive even in death.",
    posterUrl:
      'https://images.justwatch.com/poster/331043506/s592/evil-dead-burn.avif',
    durationMinutes: 110,
    language: 'English',
    releaseDate: '2026-07-07',
    rating: 6.2,
    genreNames: ['Horror'],
  },
  {
    title: 'Backrooms',
    synopsis:
      'A strange doorway appears in the basement of a furniture showroom.',
    posterUrl:
      'https://images.justwatch.com/poster/347350367/s592/backrooms.avif',
    durationMinutes: 110,
    language: 'English',
    releaseDate: '2026-05-27',
    rating: 6.7,
    genreNames: ['Horror', 'Sci-Fi'],
  },
  {
    title: 'The Odyssey',
    synopsis:
      'Odysseus, the legendary King of Ithaca, embarks on a long and perilous journey home following the Trojan War. Throughout his voyage, he is forced to confront the whims of gods, mythological monsters, and trials that stretch both his cunning and his humanity to the breaking point.',
    posterUrl:
      'https://images.justwatch.com/poster/347473608/s592/the-odyssey-2026.avif',
    durationMinutes: 173,
    language: 'English',
    releaseDate: '2026-07-15',
    rating: 8.4,
    genreNames: ['Action'],
  },
  {
    title: 'Coyote vs. Acme',
    synopsis:
      'After enduring years of malfunctioning products, Wile E. Coyote teams up with a local personal injury attorney to take on ACME, the manufacturer of anything and everything used by the Looney Tunes characters.',
    posterUrl:
      'https://images.justwatch.com/poster/348099537/s592/coyote-vs-acme.avif',
    durationMinutes: 103,
    language: 'English',
    releaseDate: '2026-08-20',
    rating: 7.4,
    genreNames: ['Action', 'Animation', 'Comedy'],
  },
  {
    title: 'The Super Mario Galaxy Movie',
    synopsis:
      "Having thwarted Bowser's previous plot to marry Princess Peach, Mario and Luigi now face a fresh threat in Bowser Jr., who is determined to liberate his father from captivity and restore the family legacy. Alongside companions new and old, the brothers travel across the stars to stop the young heir's crusade.",
    posterUrl:
      'https://images.justwatch.com/poster/342866876/s592/the-super-mario-galaxy-movie.avif',
    durationMinutes: 98,
    language: 'English',
    releaseDate: '2026-04-01',
    rating: 6.2,
    genreNames: ['Action', 'Animation', 'Comedy', 'Sci-Fi'],
  },
  {
    title: 'Minions & Monsters',
    synopsis:
      'This is the rambunctious, ridiculous and totally true story of how the Minions conquered Hollywood, became movie stars, lost everything, unleashed monsters onto the world and then banded together to try and save the planet from the mayhem they had just created.',
    posterUrl:
      'https://images.justwatch.com/poster/348305175/s592/minions-3.avif',
    durationMinutes: 90,
    language: 'English',
    releaseDate: '2026-06-24',
    rating: 6.3,
    genreNames: ['Action', 'Animation', 'Comedy'],
  },
  {
    title: 'The Devil Wears Prada 2',
    synopsis:
      "Andy Sachs returns to Runway as Miranda Priestly navigates a new media landscape and Runway's position within. The duo reconnect with former assistant Emily Charlton, now the head of a luxury brand that possesses funding which could ensure Runway's survival.",
    posterUrl:
      'https://images.justwatch.com/poster/338811810/s592/the-devil-wears-prada-2.avif',
    durationMinutes: 119,
    language: 'English',
    releaseDate: '2026-04-29',
    rating: 6.3,
    genreNames: ['Comedy', 'Drama'],
  },
  {
    title: 'Michael',
    synopsis:
      'The early life of musician Michael Jackson, from the discovery of his talent as the lead of the Jackson Five to the artist whose creative ambition fueled a pursuit to become the biggest entertainer in the world.',
    posterUrl:
      'https://images.justwatch.com/poster/345511514/s592/michael-2025-0.avif',
    durationMinutes: 127,
    language: 'English',
    releaseDate: '2026-04-22',
    rating: 7.3,
    genreNames: ['Drama'],
  },
  {
    title: 'The Housemaid',
    synopsis:
      'Millie a struggling young woman becomes live-in maid for a wealthy couple Nina and Andrew. She enters a mansion of secrets, manipulation, and escalating psychological games that pull her into a dangerous relationship dynamic.',
    posterUrl:
      'https://images.justwatch.com/poster/338639842/s592/the-housemaid-0.avif',
    durationMinutes: 131,
    language: 'English',
    releaseDate: '2025-12-18',
    rating: 6.7,
    genreNames: ['Drama'],
  },
  {
    title: 'Weapons',
    synopsis:
      'When all but one child from the same class mysteriously vanish on the same night at exactly the same time, a community is left questioning who or what is behind their disappearance.',
    posterUrl:
      'https://images.justwatch.com/poster/330423135/s592/weapons-2026.avif',
    durationMinutes: 129,
    language: 'English',
    releaseDate: '2025-08-04',
    rating: 7.4,
    genreNames: ['Horror'],
  },
  {
    title: 'Interstellar',
    synopsis:
      'In a dystopian future where Earth has become near-uninhabitable, a team of astronauts embark on a mission to find a new home for humanity.',
    posterUrl:
      'https://images.justwatch.com/poster/449990/s592/interstellar.avif',
    durationMinutes: 169,
    language: 'English',
    releaseDate: '2014-11-05',
    rating: 8.7,
    genreNames: ['Action', 'Drama', 'Sci-Fi'],
  },
  {
    title: 'Oppenheimer',
    synopsis:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    posterUrl:
      'https://images.justwatch.com/poster/305252655/s592/oppenheimer.avif',
    durationMinutes: 181,
    language: 'English',
    releaseDate: '2023-07-19',
    rating: 8.2,
    genreNames: ['Drama'],
  },

  // Coming soon (DDR-023: releaseDate > today). JustWatch dates these within
  // days of capture, so they are re-anchored relative to boot to keep the
  // section populated whenever the seed runs.
  {
    title: 'Wild Horse Nine',
    synopsis:
      "Shortly before the 1973 Chilean coup, CIA agents Chris and Lee are dispatched from Santiago to Easter Island by their bureau chief, MJ. Amongst the Island's iconic statues, and as the longtime partners wrestle with their dark pasts and present conspiracies, Chris's newfound bond with a pair of rebellious students threatens to send everyone’s trip to this remote paradise sideways.",
    posterUrl:
      'https://images.justwatch.com/poster/344194905/s592/wild-horse-nine.avif',
    durationMinutes: 118,
    language: 'English',
    releaseDate: daysFromNow(14),
    rating: 8.1,
    genreNames: ['Action', 'Comedy', 'Drama'],
  },
  {
    title: 'Crave',
    synopsis:
      'Haunted by her past, a grieving girl is drawn to a mysterious traveling carnival that arrives in her small town - only to discover an underground world that feeds on despair and demands a costly price for escape.',
    posterUrl:
      'https://images.justwatch.com/poster/355010964/s592/crave-2026.avif',
    durationMinutes: 106,
    language: 'English',
    releaseDate: daysFromNow(21),
    rating: null,
    genreNames: ['Horror'],
  },
  {
    title: 'Matchbox the Movie',
    synopsis:
      'When a group of former childhood friends reconnect, their reunion takes a wild turn as they stumble upon a dangerous international plot—and must save the world.',
    posterUrl:
      'https://images.justwatch.com/poster/354573347/s592/matchbox-2026.avif',
    durationMinutes: 127,
    language: 'English',
    releaseDate: daysFromNow(30),
    rating: null,
    genreNames: ['Action', 'Comedy'],
  },
  {
    title: 'A Prayer for the Dying',
    synopsis:
      'In 1870 Friendship, Wisconsin, a small town of Scandinavian settlers still suffering the repercussions of the recent Civil War. When faced with a new and even deadlier threat, one man is forced to make a harrowing choice: save his young family or defend the community that gave him a second chance at life and meaning.',
    posterUrl:
      'https://images.justwatch.com/poster/341457552/s592/a-prayer-for-the-dying-2026.avif',
    durationMinutes: 95,
    language: 'English',
    releaseDate: daysFromNow(45),
    rating: 6.0,
    genreNames: ['Drama'],
  },
  {
    title: 'Higher Love',
    synopsis:
      'When a devoted husband is faced with his wife’s critical health crisis, he must make an impossible choice between two unacceptable outcomes, and is thrust into a life of caregiving, loneliness, and unexpected friendship that challenges everything he thought he knew about love, family, and faith.',
    posterUrl:
      'https://images.justwatch.com/poster/354753747/s592/higher-love-2026.avif',
    durationMinutes: 108,
    language: 'English',
    releaseDate: daysFromNow(60),
    rating: null,
    genreNames: ['Drama'],
  },
];
