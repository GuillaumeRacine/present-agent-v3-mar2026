// ── 100 Gift Scenarios from Real Context ──────────────────────────
// Built from Guillaume's Google Contacts, Calendar, Family, and vault context
// Each scenario has: person, relationship, occasion, interests (real or inferred), budget

export interface GiftScenario {
  id: number;
  person: string;
  relationship: string;
  occasion: string;
  interests: string[];
  budget: string;
  giftDirection: string;
  context: string; // Extra context the "user" would share
}

export const SCENARIOS: GiftScenario[] = [
  // ══════════════════════════════════════════════════════════════════
  // FAMILY — Real people, real occasions
  // ══════════════════════════════════════════════════════════════════

  // Lisa (partner, pregnant, due May 2026)
  { id: 1, person: "Lisa", relationship: "partner", occasion: "Mother's Day", interests: ["wellness", "gym", "relaxation", "neurodiversity research"], budget: "$100-150", giftDirection: "Something for her wellbeing during pregnancy", context: "She's pregnant, due in May, dealing with bad back pain. She works at a gym." },
  { id: 2, person: "Lisa", relationship: "partner", occasion: "birthday", interests: ["fitness", "wellness", "home", "baby prep"], budget: "$150-200", giftDirection: "Something luxurious she wouldn't buy herself", context: "She's been handling everything for the nursery. She deserves something just for her." },
  { id: 3, person: "Lisa", relationship: "partner", occasion: "push present", interests: ["wellness", "jewelry", "relaxation"], budget: "$200-400", giftDirection: "Something meaningful for after the birth", context: "She's having a planned C-section in May. I want to give her something special." },
  { id: 4, person: "Lisa", relationship: "partner", occasion: "valentine's", interests: ["experiences", "food", "relaxation"], budget: "$100-150", giftDirection: "A romantic experience we can share", context: "We've been so busy with pregnancy and Theodore. Need something just for us." },
  { id: 5, person: "Lisa", relationship: "partner", occasion: "just because", interests: ["neurodiversity", "reading", "wellness"], budget: "$50-100", giftDirection: "Something to support her new project", context: "She's starting a neurodiversity research project. I want to support that." },

  // Theodore (son, 4yo, ASD)
  { id: 6, person: "Theodore", relationship: "son", occasion: "birthday", interests: ["dinosaurs", "numbers", "piano", "computers"], budget: "$50-100", giftDirection: "Something that combines his love of dinosaurs and learning", context: "He's turning 5 in July. He's autistic and loves dinosaurs, numbers, and piano." },
  { id: 7, person: "Theo", relationship: "son", occasion: "christmas", interests: ["dinosaurs", "piano", "sensory play", "computers"], budget: "$100-150", giftDirection: "Something educational and sensory-friendly", context: "He's 4, on the spectrum. Very into numbers and dinosaurs. Needs sensory-friendly stuff." },
  { id: 8, person: "Theodore", relationship: "son", occasion: "just because", interests: ["piano", "music", "numbers"], budget: "$30-50", giftDirection: "Something musical", context: "He's been loving piano lately. Want to encourage that." },

  // Cécile (mother, health concerns)
  { id: 9, person: "Cecile", relationship: "mother", occasion: "birthday", interests: ["health", "wellbeing", "home", "cooking"], budget: "$80-120", giftDirection: "Something practical that supports her health", context: "She's my mom, lives alone in Montreal. Has high blood pressure. Her birthday is May 8." },
  { id: 10, person: "Cécile", relationship: "mother", occasion: "Mother's Day", interests: ["comfort", "home", "relaxation", "family"], budget: "$100-150", giftDirection: "Something comforting for her home", context: "She's aging, cognition declining a bit. Lives in Ahuntsic. I call her every day." },
  { id: 11, person: "Cecile", relationship: "mother", occasion: "christmas", interests: ["cooking", "home", "health monitoring"], budget: "$50-100", giftDirection: "Something she'll actually use daily", context: "She doesn't like gadgets but needs health monitoring. Practical gifts only." },

  // Baby girl (due May 2026)
  { id: 12, person: "Baby girl", relationship: "daughter", occasion: "birth", interests: ["baby", "newborn", "nursery"], budget: "$50-100", giftDirection: "Something special for the nursery", context: "Our daughter is due in May. Lisa's handling nursery setup but I want to add something." },

  // Aunt Janet
  { id: 13, person: "Janet", relationship: "aunt", occasion: "christmas", interests: ["travel", "Italy", "cooking"], budget: "$50-80", giftDirection: "Something travel or Italy related", context: "She's my aunt, mom's sister. We're planning a trip to Italy together." },
  { id: 14, person: "Janet", relationship: "aunt", occasion: "thank you", interests: ["family", "care", "home"], budget: "$40-60", giftDirection: "A thank you for helping with mom", context: "She helps take care of my mom. Want to thank her." },

  // Lisa's family
  { id: 15, person: "Barbara", relationship: "partner's mother", occasion: "christmas", interests: ["home", "grandchildren"], budget: "$50-80", giftDirection: "Something from the grandkids", context: "Lisa's mom, Barbara. Divorced, remarried to Gary. She's becoming a grandma again." },
  { id: 16, person: "Ian Keen", relationship: "partner's brother", occasion: "christmas", interests: ["unknown"], budget: "$30-50", giftDirection: "Something safe and universal", context: "Lisa's brother Ian. Don't know him super well." },
  { id: 17, person: "John", relationship: "partner's father", occasion: "christmas", interests: ["unknown"], budget: "$50-80", giftDirection: "Something classic and safe", context: "Lisa's dad. Remarried. We see him occasionally." },

  // Cousins
  { id: 18, person: "Valerie", relationship: "cousin", occasion: "christmas", interests: ["kids", "family", "practical"], budget: "$40-60", giftDirection: "Something for her family", context: "My cousin Valerie. She has 3 kids around Theodore's age." },
  { id: 19, person: "Linda", relationship: "cousin", occasion: "birthday", interests: ["unknown"], budget: "$30-50", giftDirection: "Something thoughtful but safe", context: "My cousin Linda. We're not super close but family is family." },
  { id: 20, person: "Gabrielle", relationship: "cousin", occasion: "christmas", interests: ["unknown"], budget: "$30-50", giftDirection: "A nice surprise", context: "My cousin Gabrielle." },

  // ══════════════════════════════════════════════════════════════════
  // CLOSE FRIENDS — Inner circle
  // ══════════════════════════════════════════════════════════════════

  // Ian McLean (bandmate, close friend)
  { id: 21, person: "Ian McLean", relationship: "close friend", occasion: "birthday", interests: ["music", "singing", "guitar", "vinyl"], budget: "$80-120", giftDirection: "Something music-related", context: "My closest friend and bandmate. He sings in our band. We jam weekly." },
  { id: 22, person: "Ian McLean", relationship: "close friend", occasion: "christmas", interests: ["music", "craft beer", "vinyl"], budget: "$60-100", giftDirection: "Something fun for a musician", context: "He's my bandmate in Fiasco Tatal. Into music, good times." },
  { id: 23, person: "Ian", relationship: "close friend", occasion: "thank you", interests: ["music", "experiences"], budget: "$40-60", giftDirection: "Thanks for being a great friend", context: "We've been through a lot together. Business collaborator too." },

  // Fred (Bungalo, jam partner)
  { id: 24, person: "Fred", relationship: "friend", occasion: "birthday", interests: ["music", "guitar", "jamming"], budget: "$50-80", giftDirection: "Something for our jam sessions", context: "We jam together weekly. He's a musician." },
  { id: 25, person: "Fred", relationship: "friend", occasion: "christmas", interests: ["music", "gear", "guitar"], budget: "$40-60", giftDirection: "Music-related", context: "My jam buddy, part of Bungalo project." },

  // Max (founder friend)
  { id: 26, person: "Max", relationship: "close friend", occasion: "birthday", interests: ["startups", "tech", "coffee", "reading"], budget: "$60-100", giftDirection: "Something a founder would appreciate", context: "My closest founder friend. He gets the startup grind." },
  { id: 27, person: "Max", relationship: "close friend", occasion: "just because", interests: ["coffee", "business", "learning"], budget: "$40-60", giftDirection: "Thinking of you", context: "Haven't seen him in a while. Want to reconnect." },

  // Vincent (founder friend)
  { id: 28, person: "Vincent", relationship: "close friend", occasion: "birthday", interests: ["entrepreneurship", "tech", "wine"], budget: "$60-100", giftDirection: "Something for a fellow founder", context: "Close friend, founder of his own company. We understand each other's journey." },

  // Étienne (INSEAD friend)
  { id: 29, person: "Étienne", relationship: "close friend", occasion: "birthday", interests: ["business", "travel", "wine", "food"], budget: "$80-120", giftDirection: "Something sophisticated", context: "We met at INSEAD. Long-term friend, lives in Europe." },
  { id: 30, person: "Étienne", relationship: "close friend", occasion: "christmas", interests: ["wine", "food", "luxury", "travel"], budget: "$60-100", giftDirection: "Something from Canada he can't get in Europe", context: "He's in Europe. Want to send something uniquely Canadian." },

  // Nick (inner circle)
  { id: 31, person: "Nick", relationship: "close friend", occasion: "birthday", interests: ["unknown"], budget: "$50-80", giftDirection: "Something fun", context: "Part of my inner circle. Good friend." },

  // ══════════════════════════════════════════════════════════════════
  // PROFESSIONAL CONTACTS — Real names from contacts
  // ══════════════════════════════════════════════════════════════════

  // Yasser (former assistant)
  { id: 32, person: "Yasser", relationship: "former colleague", occasion: "birthday", interests: ["tech", "productivity", "learning"], budget: "$40-60", giftDirection: "Something thoughtful", context: "My former assistant. He helped me with a lot. His birthday is March 15." },

  // Colleagues/professional
  { id: 33, person: "Karim", relationship: "colleague", occasion: "thank you", interests: ["design", "tech", "Montreal"], budget: "$40-60", giftDirection: "A professional thank you", context: "Karim Charlebois-Zariffa. Professional contact, helped with a project." },
  { id: 34, person: "Simon De Baene", relationship: "professional", occasion: "thank you", interests: ["business", "leadership"], budget: "$50-80", giftDirection: "Professional appreciation", context: "Fellow entrepreneur. Want to thank him for advice." },
  { id: 35, person: "Robleh Jama", relationship: "professional", occasion: "thank you", interests: ["tech", "startups", "design"], budget: "$40-60", giftDirection: "A gesture of appreciation", context: "Startup world connection. Always helpful." },
  { id: 36, person: "Sylvain Carle", relationship: "professional", occasion: "christmas", interests: ["tech", "Montreal tech scene", "startups"], budget: "$50-80", giftDirection: "Something for a tech mentor", context: "Montreal tech scene legend. Mentor figure." },
  { id: 37, person: "Sophie", relationship: "colleague", occasion: "birthday", interests: ["design", "art", "Montreal"], budget: "$30-50", giftDirection: "Something creative", context: "Work colleague. Into design." },
  { id: 38, person: "Stéphane", relationship: "colleague", occasion: "christmas", interests: ["business", "golf", "wine"], budget: "$40-60", giftDirection: "Something classic", context: "Business contact. Traditional tastes." },
  { id: 39, person: "Sonia", relationship: "colleague", occasion: "retirement", interests: ["travel", "gardening", "reading"], budget: "$60-100", giftDirection: "Something for the next chapter", context: "She's retiring after 30 years. Want something meaningful." },
  { id: 40, person: "Roberto", relationship: "colleague", occasion: "promotion", interests: ["coffee", "tech"], budget: "$40-60", giftDirection: "Congratulations gift", context: "Just got promoted. Want to celebrate." },

  // ══════════════════════════════════════════════════════════════════
  // CALENDAR-DRIVEN OCCASIONS
  // ══════════════════════════════════════════════════════════════════

  // Théo's graduation (June 11)
  { id: 41, person: "Theodore", relationship: "son", occasion: "graduation", interests: ["dinosaurs", "piano", "learning"], budget: "$50-100", giftDirection: "Something to celebrate his big day", context: "He's graduating from daycare/pre-school in June. It's a big deal for him." },

  // Mother's Day (May 10) — 3 gifts needed per calendar
  { id: 42, person: "Cécile", relationship: "mother", occasion: "Mother's Day", interests: ["health", "comfort", "family photos"], budget: "$80-120", giftDirection: "Something from the heart", context: "Mother's Day. I call her every day. She means the world to me." },
  { id: 43, person: "Lisa", relationship: "partner", occasion: "Mother's Day", interests: ["wellness", "relaxation", "pregnancy support"], budget: "$100-150", giftDirection: "She's about to be a mom of two", context: "First Mother's Day where she'll be pregnant with our second. Special year." },
  { id: 44, person: "Barbara", relationship: "mother-in-law", occasion: "Mother's Day", interests: ["grandchildren", "home"], budget: "$50-80", giftDirection: "From Theodore and the family", context: "Lisa's mom. She's becoming a grandma again in May." },

  // ══════════════════════════════════════════════════════════════════
  // DIVERSE SCENARIOS — Varied budgets, occasions, relationships
  // ══════════════════════════════════════════════════════════════════

  // Low budget gifts
  { id: 45, person: "Julie", relationship: "acquaintance", occasion: "housewarming", interests: ["home", "cooking"], budget: "under $30", giftDirection: "Something small but nice", context: "Julie Lafrenaye just moved. Going to her housewarming." },
  { id: 46, person: "Marie-Sophie", relationship: "acquaintance", occasion: "birthday", interests: ["fashion", "Montreal"], budget: "under $30", giftDirection: "A small gesture", context: "Not super close. Something thoughtful but not over the top." },
  { id: 47, person: "Nicolas", relationship: "friend", occasion: "christmas", interests: ["beer", "hockey", "outdoors"], budget: "under $40", giftDirection: "Something fun", context: "Nicolas Brabant. We see each other a few times a year." },
  { id: 48, person: "Olivier", relationship: "friend", occasion: "birthday", interests: ["music", "outdoors", "tech"], budget: "under $40", giftDirection: "Something practical", context: "Olivier Lessard. Friend from way back." },

  // High budget / luxury
  { id: 49, person: "Lisa", relationship: "partner", occasion: "anniversary", interests: ["travel", "experiences", "wellness"], budget: "$300-500", giftDirection: "Something unforgettable", context: "We've been together 10 years. I want to go big." },
  { id: 50, person: "Theodore", relationship: "son", occasion: "christmas", interests: ["dinosaurs", "STEM", "piano", "computers"], budget: "$200-300", giftDirection: "A big gift that grows with him", context: "He's getting older and more interested in computers. Something he can grow into." },

  // Tricky situations
  { id: 51, person: "Jennifer", relationship: "acquaintance", occasion: "baby shower", interests: ["unknown"], budget: "$40-60", giftDirection: "Safe baby shower gift", context: "Jennifer McLean. Don't know her well, going to her baby shower." },
  { id: 52, person: "Steph Randall", relationship: "friend", occasion: "wedding", interests: ["outdoors", "travel"], budget: "$100-150", giftDirection: "Wedding gift", context: "Steph's getting married. Need a proper wedding gift." },
  { id: 53, person: "Zachary", relationship: "friend's kid", occasion: "birthday", interests: ["toys", "games"], budget: "under $30", giftDirection: "Something age-appropriate", context: "He's a friend's kid, around 6-7. Going to the party." },
  { id: 54, person: "Catherine", relationship: "friend", occasion: "birthday", interests: ["yoga", "wellness", "art"], budget: "$50-80", giftDirection: "Something zen", context: "Catherine Ouellette-Dupuis. She's into wellness and art." },
  { id: 55, person: "Margherita", relationship: "friend", occasion: "birthday", interests: ["food", "Italian culture", "cooking"], budget: "$50-80", giftDirection: "Something Italian", context: "She's Italian. Love of food and culture." },

  // Music community
  { id: 56, person: "Simon Karajian", relationship: "musician friend", occasion: "birthday", interests: ["music", "production", "gear"], budget: "$50-80", giftDirection: "Something for a fellow musician", context: "Musician in Montreal. We share music circles." },
  { id: 57, person: "Hugues", relationship: "musician friend", occasion: "christmas", interests: ["guitar", "music", "outdoors"], budget: "$40-60", giftDirection: "Something music or outdoor related", context: "Hugues Pelletier. Guitar player friend." },

  // International contacts
  { id: 58, person: "Sílvia", relationship: "friend", occasion: "birthday", interests: ["art", "culture", "travel"], budget: "$40-60", giftDirection: "Something meaningful from Canada", context: "Sílvia Campos. Friend from Portugal. Want to send something." },
  { id: 59, person: "Stefan", relationship: "professional", occasion: "thank you", interests: ["business", "German culture"], budget: "$50-80", giftDirection: "A Canadian gift to Germany", context: "Stefan Kollenberg. Business contact in Germany." },
  { id: 60, person: "Tatyana", relationship: "friend", occasion: "birthday", interests: ["art", "culture", "fitness"], budget: "$40-60", giftDirection: "Something creative", context: "Tatyana Mitkova. Artsy person." },

  // Last-minute gifts
  { id: 61, person: "someone", relationship: "colleague", occasion: "secret santa", interests: ["unknown"], budget: "under $25", giftDirection: "Universal crowd-pleaser", context: "Office secret santa. No idea who I got. Need something anyone would like." },
  { id: 62, person: "teacher", relationship: "Theodore's teacher", occasion: "end of year", interests: ["teaching", "kids"], budget: "under $30", giftDirection: "Teacher appreciation", context: "Theodore's daycare teacher. Want to say thanks." },
  { id: 63, person: "hairdresser", relationship: "service provider", occasion: "christmas", interests: ["unknown"], budget: "under $25", giftDirection: "A tip-replacement gift", context: "My hairdresser. Want something nicer than just money." },

  // Emotional/sentimental occasions
  { id: 64, person: "Cécile", relationship: "mother", occasion: "just because", interests: ["family photos", "memories", "home"], budget: "$50-100", giftDirection: "Something sentimental", context: "Her memory is declining. Want something that captures our memories together." },
  { id: 65, person: "Lisa", relationship: "partner", occasion: "push present", interests: ["jewelry", "sentimental"], budget: "$150-300", giftDirection: "Marking the birth of our daughter", context: "After the C-section. Something she can wear and think of this moment." },
  { id: 66, person: "Theodore", relationship: "son", occasion: "new baby sibling", interests: ["dinosaurs", "being a big brother"], budget: "$30-50", giftDirection: "Big brother gift", context: "When the baby arrives, I want Theo to feel special too. A 'big brother' gift." },

  // Seasonal
  { id: 67, person: "Jeannette Racine", relationship: "grandmother figure", occasion: "christmas", interests: ["home", "comfort", "family"], budget: "$40-60", giftDirection: "Something cozy", context: "Family elder. Practical and warm gifts appreciated." },
  { id: 68, person: "Lucie Leduc", relationship: "family friend", occasion: "christmas", interests: ["cooking", "home"], budget: "$30-50", giftDirection: "Something for the kitchen", context: "Family friend. She loves to cook." },

  // Repeat people, different occasions (testing variety)
  { id: 69, person: "Lisa", relationship: "partner", occasion: "christmas", interests: ["wellness", "home", "skincare"], budget: "$100-200", giftDirection: "Something luxurious", context: "She never buys nice things for herself. Splurge on her." },
  { id: 70, person: "Ian McLean", relationship: "close friend", occasion: "just because", interests: ["music", "studio", "vinyl"], budget: "$30-50", giftDirection: "Random appreciation", context: "Just want to say thanks for being a great bandmate." },

  // ══════════════════════════════════════════════════════════════════
  // EDGE CASES — Testing system limits
  // ══════════════════════════════════════════════════════════════════

  // Very vague
  { id: 71, person: "Sarah", relationship: "friend", occasion: "birthday", interests: ["unknown"], budget: "no idea", giftDirection: "no idea", context: "I need a gift for Sarah. It's her birthday. That's all I know." },
  { id: 72, person: "someone", relationship: "unknown", occasion: "unknown", interests: ["unknown"], budget: "unknown", giftDirection: "unknown", context: "I need a gift. I don't even know for who yet. Just browsing." },

  // Very specific
  { id: 73, person: "Lisa", relationship: "partner", occasion: "birthday", interests: ["prenatal yoga", "organic skincare", "pregnancy pillow"], budget: "exactly $89", giftDirection: "prenatal wellness", context: "She's 8 months pregnant, into prenatal yoga, and her current skincare broke her out. Exactly $89 budget." },
  { id: 74, person: "Theodore", relationship: "son", occasion: "birthday", interests: ["T-Rex specifically", "counting to 100", "Bach on piano"], budget: "$75", giftDirection: "T-Rex themed learning", context: "He's obsessed with T-Rex (not other dinosaurs). Counts to 100 endlessly. Plays Bach on piano by ear." },

  // Budget extremes
  { id: 75, person: "colleague", relationship: "acquaintance", occasion: "thank you", interests: ["coffee"], budget: "under $15", giftDirection: "A small token", context: "Just want to say thanks. Can't spend much." },
  { id: 76, person: "Lisa", relationship: "partner", occasion: "10 year anniversary", interests: ["travel", "experiences", "jewelry"], budget: "$500+", giftDirection: "Once in a decade", context: "10 years together. Go all out." },

  // Speed runs (minimal context given)
  { id: 77, person: "Mom", relationship: "mother", occasion: "Mother's Day", interests: [], budget: "$100", giftDirection: "", context: "Gift for mom, Mother's Day." },
  { id: 78, person: "Dad", relationship: "father", occasion: "Father's Day", interests: [], budget: "$80", giftDirection: "", context: "Father's Day gift." },
  { id: 79, person: "Boss", relationship: "professional", occasion: "christmas", interests: [], budget: "$50", giftDirection: "", context: "Gift for my boss." },
  { id: 80, person: "Neighbor", relationship: "acquaintance", occasion: "thank you", interests: [], budget: "$25", giftDirection: "", context: "Neighbor helped us move furniture." },

  // ══════════════════════════════════════════════════════════════════
  // MORE REAL CONTACTS — Varied scenarios
  // ══════════════════════════════════════════════════════════════════

  { id: 81, person: "Charline Pomerleau", relationship: "friend", occasion: "birthday", interests: ["fitness", "wellness"], budget: "$40-60", giftDirection: "Wellness related", context: "Friend in Montreal. Active lifestyle." },
  { id: 82, person: "Nathalie Guilbert", relationship: "professional", occasion: "christmas", interests: ["business", "reading"], budget: "$40-60", giftDirection: "Professional but warm", context: "Business connection." },
  { id: 83, person: "Sossy", relationship: "friend", occasion: "birthday", interests: ["art", "culture", "design"], budget: "$40-60", giftDirection: "Something artsy", context: "Sossy Kataroyan. Creative person." },
  { id: 84, person: "Vanessa", relationship: "friend", occasion: "housewarming", interests: ["home", "design", "cooking"], budget: "$50-80", giftDirection: "Something for the new place", context: "Vanessa Rhéaume. Just moved into a new place." },
  { id: 85, person: "Marc-André", relationship: "friend", occasion: "birthday", interests: ["music", "outdoors", "craft beer"], budget: "$40-60", giftDirection: "Something fun", context: "Marc-André La Barre. Good guy, likes the outdoors." },
  { id: 86, person: "Raphael", relationship: "friend", occasion: "christmas", interests: ["tech", "gaming", "coding"], budget: "$40-60", giftDirection: "Something techy", context: "Raphael Christian-Roy. Developer, into tech." },
  { id: 87, person: "Sarah Z", relationship: "friend", occasion: "birthday", interests: ["design", "art", "wellness"], budget: "$40-60", giftDirection: "Something beautiful", context: "Sarah Z. Design-minded person." },
  { id: 88, person: "Gabrielle Bonneville", relationship: "friend", occasion: "birthday", interests: ["creative", "Montreal"], budget: "$30-50", giftDirection: "Something local", context: "Friend in Montreal." },
  { id: 89, person: "Veronique", relationship: "friend", occasion: "christmas", interests: ["food", "wine", "hosting"], budget: "$40-60", giftDirection: "Something for a host", context: "Veronique Poulin. Great host, loves dinner parties." },
  { id: 90, person: "Roxanne Lessard", relationship: "friend", occasion: "birthday", interests: ["reading", "wellness", "travel"], budget: "$40-60", giftDirection: "Something thoughtful", context: "Roxanne. Reader, traveler." },

  // ══════════════════════════════════════════════════════════════════
  // REMAINING — Fill to 100
  // ══════════════════════════════════════════════════════════════════

  { id: 91, person: "Philippe", relationship: "friend", occasion: "birthday", interests: ["music", "philosophy"], budget: "$40-60", giftDirection: "Something intellectual", context: "Philippe Côté. Deep thinker." },
  { id: 92, person: "Tara", relationship: "colleague", occasion: "farewell", interests: ["travel", "food"], budget: "$40-60", giftDirection: "Bon voyage", context: "Tara Pellegrino is moving to another city." },
  { id: 93, person: "Tom", relationship: "professional", occasion: "thank you", interests: ["running", "outdoors"], budget: "$30-50", giftDirection: "Something active", context: "Tom Wilson helped with a big project." },
  { id: 94, person: "Pierre-Yves", relationship: "professional", occasion: "christmas", interests: ["ocean", "environment", "diving"], budget: "$50-80", giftDirection: "Ocean/environment themed", context: "Pierre-Yves Cousteau. Yes, from that family. Ocean conservationist." },
  { id: 95, person: "Babba Rivera", relationship: "professional", occasion: "thank you", interests: ["beauty", "branding", "entrepreneurship"], budget: "$50-80", giftDirection: "Something from a fellow founder", context: "She runs a beauty brand. Want to support her back." },
  { id: 96, person: "Manu", relationship: "friend", occasion: "birthday", interests: ["cooking", "soccer", "travel"], budget: "$30-50", giftDirection: "Something fun", context: "Manu. Laid-back friend." },
  { id: 97, person: "Pascal Jodoin", relationship: "friend", occasion: "christmas", interests: ["outdoors", "family"], budget: "$30-50", giftDirection: "Family-friendly", context: "Pascal. Has kids, family guy." },
  { id: 98, person: "Simon Trottier", relationship: "professional", occasion: "thank you", interests: ["science", "tech", "startups"], budget: "$50-80", giftDirection: "Something innovative", context: "Simon Trottier. Brilliant mind, tech founder." },
  { id: 99, person: "Stéphanie Randall", relationship: "friend", occasion: "birthday", interests: ["fitness", "wellness", "outdoors"], budget: "$40-60", giftDirection: "Something active", context: "Stéphanie. Active person, loves the outdoors." },
  { id: 100, person: "Xavier", relationship: "friend", occasion: "housewarming", interests: ["design", "tech", "minimalist"], budget: "$50-80", giftDirection: "Something minimal and beautiful", context: "Xavier Aubut. Just got a new place. Loves clean design." },
];
