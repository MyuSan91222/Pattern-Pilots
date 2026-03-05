import { create } from 'zustand';

const STORAGE_KEY = 'aa_lostfound';

export const CATEGORIES = [
  { id: 'electronics', label: 'Electronics',        emoji: '💻' },
  { id: 'clothing',    label: 'Clothing',            emoji: '👗' },
  { id: 'bags',        label: 'Bags & Wallets',      emoji: '💼' },
  { id: 'jewelry',     label: 'Jewelry',             emoji: '✨' },
  { id: 'keys',        label: 'Keys',                emoji: '🗝️' },
  { id: 'documents',   label: 'Documents & IDs',     emoji: '🆔' },
  { id: 'pets',        label: 'Pets',                emoji: '🐕' },
  { id: 'books',       label: 'Books & Education',   emoji: '📖' },
  { id: 'sports',      label: 'Sports & Gear',       emoji: '🏃' },
  { id: 'glasses',     label: 'Glasses & Eyewear',   emoji: '🥽' },
  { id: 'toys',        label: 'Toys & Games',        emoji: '🎮' },
  { id: 'other',       label: 'Other',               emoji: '🎁' },
];

export const DEFAULT_LF_SETTINGS = {
  autoExpireEnabled:  false,
  autoExpireDays:     60,
  defaultContactName: '',
  defaultContactEmail:'',
  defaultSort:        'newest',
  defaultTypeFilter:  'all',
  defaultRewardOnly:  false,
  itemsPerPage:       12,
  privacyMode:        false,
  highlightRewards:   false,
  minRewardHighlight: 50,
  // Card design style: 'default' | 'glassmorphism' | 'skeuomorphism' | 'claymorphism' | 'liquid-glass' | 'minimalism'
  cardStyle:          'minimalism',
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const MOCK_ITEMS = [
  // Electronics
  { id: 'mock01', type: 'lost',  title: 'Black iPhone 14 Pro',         description: 'Black iPhone 14 Pro with a cracked back cover. Has a blue silicone case. Lock screen has a photo of a dog.', category: 'electronics', location: 'Library – 2nd Floor', date: daysAgo(2),  contactName: 'Aung Ko', contactEmail: 'aungko@example.com', tags: ['iphone', 'phone', 'apple'], reward: 50, status: 'active',   createdAt: daysAgo(2)  },
  { id: 'mock02', type: 'found', title: 'Wireless Earbuds (White)',     description: 'Found a pair of white wireless earbuds in a charging case near the vending machines. Brand looks like Samsung.', category: 'electronics', location: 'Cafeteria – Vending Area', date: daysAgo(1),  contactName: 'Su Lin',   contactEmail: 'sulin@example.com',  tags: ['earbuds', 'samsung', 'wireless'], reward: 0, status: 'active',   createdAt: daysAgo(1)  },
  { id: 'mock03', type: 'lost',  title: 'Dell Laptop Power Adapter',   description: '65W Dell USB-C power adapter, black with white cable. Left it plugged in at the computer lab.', category: 'electronics', location: 'Computer Lab – Room 204', date: daysAgo(5),  contactName: 'Kyaw Min', contactEmail: 'kyawmin@example.com', tags: ['dell', 'charger', 'laptop'], reward: 20, status: 'active',   createdAt: daysAgo(5)  },
  { id: 'mock04', type: 'found', title: 'USB Flash Drive (32GB)',       description: 'Found a small black SanDisk Cruzer 32GB flash drive on a desk in the lecture hall.', category: 'electronics', location: 'Lecture Hall A',          date: daysAgo(3),  contactName: 'Naw Paw',  contactEmail: 'nawpaw@example.com',  tags: ['usb', 'flashdrive', 'sandisk'], reward: 0, status: 'resolved', createdAt: daysAgo(3)  },

  // Bags & Wallets
  { id: 'mock05', type: 'lost',  title: 'Brown Leather Wallet',        description: 'Brown bifold leather wallet. Contains student ID, bank card, and some cash. Name card inside: "Zaw Htet".', category: 'bags',        location: 'Gym Changing Room',       date: daysAgo(1),  contactName: 'Zaw Htet', contactEmail: 'zawhtet@example.com', tags: ['wallet', 'leather', 'brown'], reward: 100, status: 'active',  createdAt: daysAgo(1) },
  { id: 'mock06', type: 'found', title: 'Blue Backpack (Nike)',         description: 'Found a navy blue Nike backpack left under a bench near the sports field. Contains textbooks and a pencil case.', category: 'bags',        location: 'Sports Field – South Bench', date: daysAgo(4),  contactName: 'Thida',    contactEmail: 'thida@example.com',   tags: ['backpack', 'nike', 'blue'], reward: 0, status: 'active',   createdAt: daysAgo(4)  },
  { id: 'mock07', type: 'lost',  title: 'Small Red Crossbody Bag',     description: 'Red faux-leather crossbody bag, gold zipper. Contains makeup and a small notebook. Very sentimental value.', category: 'bags',        location: 'Cafeteria – Main Hall',   date: daysAgo(6),  contactName: 'May Phyu', contactEmail: 'mayphyu@example.com', tags: ['bag', 'red', 'crossbody'], reward: 30, status: 'active',   createdAt: daysAgo(6)  },

  // Keys
  { id: 'mock08', type: 'lost',  title: 'Keychain with 3 Keys',        description: 'Silver keychain with a small Eiffel Tower charm, carrying 3 keys (house, car, mailbox). Lost somewhere on campus.', category: 'keys',        location: 'Main Campus – Unknown',   date: daysAgo(7),  contactName: 'Win Naing', contactEmail: 'winnaing@example.com', tags: ['keys', 'keychain', 'silver'], reward: 40, status: 'active',  createdAt: daysAgo(7) },
  { id: 'mock09', type: 'found', title: 'Toyota Car Key',              description: 'Found a Toyota smart key fob (black) in the parking lot near Block C. No identifying marks.', category: 'keys',        location: 'Parking Lot – Block C',   date: daysAgo(2),  contactName: 'Hla Min',  contactEmail: 'hlamin@example.com',  tags: ['car', 'toyota', 'key'], reward: 0, status: 'active',   createdAt: daysAgo(2)  },

  // Documents & IDs
  { id: 'mock10', type: 'found', title: 'Student ID Card',             description: 'Found a student ID card for "Nyi Nyi Lwin" on the floor of the registration office.', category: 'documents',   location: 'Registration Office',     date: daysAgo(1),  contactName: 'Office Staff', contactEmail: 'office@example.com', tags: ['id', 'student', 'card'], reward: 0, status: 'resolved', createdAt: daysAgo(1)  },
  { id: 'mock11', type: 'lost',  title: 'Passport (Myanmar)',          description: 'Myanmar passport lost near the international student office. Maroon cover, issued 2022.', category: 'documents',   location: 'International Office',    date: daysAgo(3),  contactName: 'Ei Phyu',  contactEmail: 'eiphyu@example.com',  tags: ['passport', 'myanmar', 'id'], reward: 200, status: 'active', createdAt: daysAgo(3) },

  // Clothing
  { id: 'mock12', type: 'lost',  title: 'Grey Hoodie (M)',             description: 'Plain grey cotton hoodie, size medium. Has a small ink stain on the left sleeve. Left at the library.', category: 'clothing',    location: 'Library – Ground Floor',  date: daysAgo(4),  contactName: 'Phyo Thu', contactEmail: 'phyothu@example.com', tags: ['hoodie', 'grey', 'clothing'], reward: 0, status: 'active',  createdAt: daysAgo(4) },
  { id: 'mock13', type: 'found', title: 'Black Umbrella',             description: 'Found a compact black automatic umbrella in the main corridor near the entrance.', category: 'clothing',    location: 'Main Corridor – Entrance', date: daysAgo(1),  contactName: 'Khin Zin', contactEmail: 'khinzin@example.com', tags: ['umbrella', 'black'], reward: 0, status: 'active',   createdAt: daysAgo(1)  },
  { id: 'mock14', type: 'lost',  title: 'Blue Denim Jacket',          description: 'Light blue denim jacket, no brand visible. Left on a chair in the student lounge.', category: 'clothing',    location: 'Student Lounge',          date: daysAgo(8),  contactName: 'Soe Moe',  contactEmail: 'soemoe@example.com',  tags: ['jacket', 'denim', 'blue'], reward: 15, status: 'active',   createdAt: daysAgo(8)  },

  // Jewelry
  { id: 'mock15', type: 'lost',  title: 'Gold Bracelet',              description: 'Thin gold chain bracelet with a small heart pendant. Very sentimental, a gift from my mother.', category: 'jewelry',     location: 'Gym – Weight Room',       date: daysAgo(3),  contactName: 'Aye Myat', contactEmail: 'ayemyat@example.com', tags: ['bracelet', 'gold', 'jewelry'], reward: 150, status: 'active', createdAt: daysAgo(3) },
  { id: 'mock16', type: 'found', title: 'Silver Ring',                description: 'Found a plain silver ring on the cafeteria floor. No engraving.', category: 'jewelry',     location: 'Cafeteria – Floor',       date: daysAgo(2),  contactName: 'Tin Tin',  contactEmail: 'tintin@example.com',  tags: ['ring', 'silver', 'jewelry'], reward: 0, status: 'active',   createdAt: daysAgo(2)  },

  // Books & Education
  { id: 'mock17', type: 'found', title: 'Calculus Textbook',          description: 'Found a "Calculus: Early Transcendentals" 8th edition textbook. Name written inside: "Ko Htun".', category: 'books',       location: 'Library – Study Room 3',  date: daysAgo(5),  contactName: 'Library Desk', contactEmail: 'library@example.com', tags: ['calculus', 'textbook', 'math'], reward: 0, status: 'active', createdAt: daysAgo(5) },
  { id: 'mock18', type: 'lost',  title: 'Scientific Calculator',      description: 'Casio fx-991EX ClassWiz calculator, slightly scratched on the back. Name sticker: "Myint".', category: 'books',       location: 'Exam Hall – Room 101',    date: daysAgo(6),  contactName: 'Myint Myint', contactEmail: 'myint@example.com', tags: ['calculator', 'casio', 'math'], reward: 10, status: 'active',  createdAt: daysAgo(6) },
  { id: 'mock19', type: 'found', title: 'Notebook – Pink Cover',      description: 'Found a spiral-bound notebook with a pink cover and floral design. Full of handwritten notes, no name.', category: 'books',       location: 'Lecture Hall B',          date: daysAgo(1),  contactName: 'Chan Myae', contactEmail: 'chanmyae@example.com', tags: ['notebook', 'pink', 'notes'], reward: 0, status: 'active', createdAt: daysAgo(1) },

  // Sports & Gear
  { id: 'mock20', type: 'lost',  title: 'Badminton Racket Pair',      description: 'Two Yonex badminton rackets in a black zippered case. Strings are blue.', category: 'sports',      location: 'Sports Hall – Badminton Court', date: daysAgo(2), contactName: 'Pyae Phyo', contactEmail: 'pyaephyo@example.com', tags: ['badminton', 'yonex', 'racket'], reward: 0, status: 'active', createdAt: daysAgo(2) },
  { id: 'mock21', type: 'found', title: 'Water Bottle (Green)',       description: 'Found a dark green stainless steel water bottle (500ml) near the track. Has stickers on it.', category: 'sports',      location: 'Running Track',           date: daysAgo(3),  contactName: 'Mg Mg',    contactEmail: 'mgmg@example.com',    tags: ['water bottle', 'green', 'sports'], reward: 0, status: 'active', createdAt: daysAgo(3) },

  // Glasses
  { id: 'mock22', type: 'lost',  title: 'Prescription Eyeglasses',    description: 'Black rectangular frame glasses, -2.5 prescription. In a dark brown leather case.', category: 'glasses',     location: 'Cafeteria – Table Area',  date: daysAgo(4),  contactName: 'Wai Lin',  contactEmail: 'wailin@example.com',  tags: ['glasses', 'eyeglasses', 'prescription'], reward: 30, status: 'active', createdAt: daysAgo(4) },
  { id: 'mock23', type: 'found', title: 'Sunglasses (Aviator)',       description: 'Found gold-frame aviator sunglasses on a bench in the courtyard. No case.', category: 'glasses',     location: 'Courtyard – Bench Area',  date: daysAgo(1),  contactName: 'Yadanar',  contactEmail: 'yadanar@example.com', tags: ['sunglasses', 'aviator', 'gold'], reward: 0, status: 'active', createdAt: daysAgo(1) },

  // Pets
  { id: 'mock24', type: 'lost',  title: 'Orange Tabby Cat "Mimi"',   description: 'Missing orange tabby cat named Mimi, about 2 years old. Wearing a pink collar with a bell. Very friendly.', category: 'pets',        location: 'Campus North Garden',     date: daysAgo(1),  contactName: 'Shwe Sin',  contactEmail: 'shwesin@example.com', tags: ['cat', 'orange', 'tabby', 'mimi'], reward: 500, status: 'active', createdAt: daysAgo(1) },

  // Other
  { id: 'mock25', type: 'found', title: 'Umbrella Stand (Folded)',    description: 'Found a compact blue folding umbrella left in the bathroom near the cafeteria.', category: 'other',       location: 'Bathroom – Cafeteria Block', date: daysAgo(2),  contactName: 'Anon Staff', contactEmail: 'staff@example.com', tags: ['umbrella', 'blue'], reward: 0, status: 'active', createdAt: daysAgo(2) },
  { id: 'mock26', type: 'lost',  title: 'Guitar Pick Collection',    description: 'Small tin box containing about 20 guitar picks of various thicknesses. Has "Jazz" written on the tin.', category: 'other',       location: 'Music Room',              date: daysAgo(9),  contactName: 'Kaung Htet', contactEmail: 'kaunghtet@example.com', tags: ['guitar', 'music', 'picks'], reward: 5, status: 'active', createdAt: daysAgo(9) },
  { id: 'mock27', type: 'found', title: 'Pocket Diary 2025',         description: 'Found a small black hardcover pocket diary for 2025 on the bus stop bench. Has a schedule filled in.', category: 'other',       location: 'Bus Stop – Main Gate',    date: daysAgo(5),  contactName: 'Nanda',    contactEmail: 'nanda@example.com',   tags: ['diary', 'notebook', '2025'], reward: 0, status: 'resolved', createdAt: daysAgo(5) },
  { id: 'mock28', type: 'lost',  title: 'Stainless Steel Lunchbox',  description: 'Silver stainless steel tiffin-style lunchbox, 3 tiers. Has a small dent on the lid. Contains my lunch prep containers.', category: 'other',   location: 'Staff Kitchen – Block B', date: daysAgo(3),  contactName: 'Ma Ma',    contactEmail: 'mama@example.com',    tags: ['lunchbox', 'tiffin', 'steel'], reward: 0, status: 'active', createdAt: daysAgo(3) },
  { id: 'mock29', type: 'found', title: 'Reusable Shopping Bag',     description: 'Found a green canvas reusable shopping bag with a cartoon design in the student store. Has items inside — some groceries.', category: 'other', location: 'Student Store', date: daysAgo(1), contactName: 'Store Staff', contactEmail: 'store@example.com', tags: ['bag', 'shopping', 'green'], reward: 0, status: 'active', createdAt: daysAgo(1) },
  { id: 'mock30', type: 'lost',  title: 'Headphones (Over-Ear)',     description: 'Sony WH-1000XM4 black over-ear noise-cancelling headphones. Left in the quiet study area.', category: 'electronics', location: 'Library – Quiet Study Zone', date: daysAgo(1), contactName: 'Naing Lin', contactEmail: 'nainglin@example.com', tags: ['headphones', 'sony', 'wireless', 'noise-cancelling'], reward: 80, status: 'active', createdAt: daysAgo(1) },
];

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items:      state.items,
      alertEmail: state.alertEmail,
      alertPrefs: state.alertPrefs,
      lfSettings: state.lfSettings,
    }));
  } catch { /* quota exceeded */ }
}

const saved = loadFromStorage();

export const useLostFoundStore = create((set, get) => ({
  items:      saved?.items      ?? MOCK_ITEMS,
  alertEmail: saved?.alertEmail ?? '',
  alertPrefs: saved?.alertPrefs ?? { category: '', location: '', status: '' },
  lfSettings: saved?.lfSettings ? { ...DEFAULT_LF_SETTINGS, ...saved.lfSettings } : { ...DEFAULT_LF_SETTINGS },

  addItem: (item) => {
    const newItem = {
      ...item,
      id: genId(),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };
    set((s) => {
      const next = { ...s, items: [newItem, ...s.items] };
      saveToStorage(next);
      return next;
    });
    return newItem;
  },

  resolveItem: (id) => {
    set((s) => {
      const next = { ...s, items: s.items.map(i => i.id === id ? { ...i, status: 'resolved' } : i) };
      saveToStorage(next);
      return next;
    });
  },

  deleteItem: (id) => {
    set((s) => {
      const next = { ...s, items: s.items.filter(i => i.id !== id) };
      saveToStorage(next);
      return next;
    });
  },

  setLfSettings: (updates) => {
    set((s) => {
      const next = { ...s, lfSettings: { ...s.lfSettings, ...updates } };
      saveToStorage(next);
      return next;
    });
  },

  setAlertPrefs: (alertEmail, alertPrefs) => {
    set((s) => {
      const next = { ...s, alertEmail, alertPrefs };
      saveToStorage(next);
      return next;
    });
  },
}));
