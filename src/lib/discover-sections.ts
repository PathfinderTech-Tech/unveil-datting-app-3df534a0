// Discover Yourself — 10-section compatibility questionnaire.
// Each section maps to a dimension used by the matching engine.

export type DiscoverChoice = { id: string; label: string; hint?: string };
export type DiscoverQuestion = {
  id: string;
  prompt: string;
  type: "single" | "multi" | "scale";
  choices?: DiscoverChoice[];
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
};

export type DiscoverSection = {
  id: string;
  title: string;
  blurb: string;
  questions: DiscoverQuestion[];
};

const single = (id: string, prompt: string, choices: [string, string][]): DiscoverQuestion => ({
  id, prompt, type: "single",
  choices: choices.map(([cid, label]) => ({ id: cid, label })),
});
const scale = (id: string, prompt: string, lo: string, hi: string): DiscoverQuestion => ({
  id, prompt, type: "scale", scaleMinLabel: lo, scaleMaxLabel: hi,
});
const multi = (id: string, prompt: string, choices: [string, string][]): DiscoverQuestion => ({
  id, prompt, type: "multi",
  choices: choices.map(([cid, label]) => ({ id: cid, label })),
});

export const DISCOVER_SECTIONS: DiscoverSection[] = [
  {
    id: "goals", title: "Relationship Goals",
    blurb: "What you're actually building toward.",
    questions: [
      single("intent", "What kind of relationship do you want?", [
        ["serious", "Serious, long-term partnership"],
        ["open", "Open — see where it goes"],
        ["friendship", "Friendship first"],
        ["exploring", "Just exploring"],
      ]),
      single("horizon", "Where do you imagine yourself in 3 years?", [
        ["married", "Married or partnered"],
        ["committed", "In a committed relationship"],
        ["dating", "Still dating, no rush"],
        ["solo", "Happily single"],
      ]),
      single("speed", "How quickly do you like to commit?", [
        ["fast", "When I know, I know"],
        ["measured", "Slow, careful escalation"],
        ["flexible", "It depends on the person"],
      ]),
    ],
  },
  {
    id: "lifestyle", title: "Lifestyle Preferences",
    blurb: "How you spend your time and energy.",
    questions: [
      single("weekend", "Your ideal Saturday?", [
        ["adventure", "Outdoor adventure"],
        ["social", "Brunch and friends"],
        ["quiet", "Slow morning, a book, a walk"],
        ["creative", "Studio / project time"],
      ]),
      single("plans", "Do you prefer planning or spontaneity?", [
        ["planner", "Planner — I love an agenda"],
        ["spontaneous", "Spontaneous — let's just go"],
        ["mix", "Plan the bones, improvise the rest"],
      ]),
      single("social", "Social battery?", [
        ["high", "Always on, love a crowd"],
        ["mid", "Small groups, often"],
        ["low", "One person, deep, often"],
      ]),
      single("home", "Home base looks like…", [
        ["city", "Heart of a city"],
        ["suburb", "Quiet suburb"],
        ["rural", "Out in nature"],
        ["nomad", "Moving around"],
      ]),
    ],
  },
  {
    id: "communication", title: "Communication Style",
    blurb: "How you talk, listen, and handle friction.",
    questions: [
      single("conflict", "When there's a conflict, you…", [
        ["talk", "Talk it out immediately"],
        ["sleep", "Sleep on it first"],
        ["write", "Write before speaking"],
        ["space", "Take space, then return"],
      ]),
      single("expression", "How do you express what you feel?", [
        ["direct", "Direct and clear"],
        ["careful", "Carefully, after thinking"],
        ["playful", "Through humor"],
        ["actions", "Through actions, not words"],
      ]),
      single("texting", "Texting cadence?", [
        ["fast", "Reply in minutes"],
        ["daily", "A few times a day"],
        ["slow", "When I have something real to say"],
      ]),
    ],
  },
  {
    id: "love_languages", title: "Love Languages",
    blurb: "How you give and receive love.",
    questions: [
      single("give", "How do you most naturally show love?", [
        ["words", "Words of affirmation"],
        ["time", "Quality time"],
        ["acts", "Acts of service"],
        ["touch", "Physical touch"],
        ["gifts", "Thoughtful gifts"],
      ]),
      single("receive", "How do you most feel loved?", [
        ["words", "Hearing it"],
        ["time", "Undivided attention"],
        ["acts", "When they do things for me"],
        ["touch", "Closeness and touch"],
        ["gifts", "Small surprises"],
      ]),
    ],
  },
  {
    id: "attachment", title: "Attachment Style",
    blurb: "How you bond, and what scares you.",
    questions: [
      single("attachment", "Which sounds most like you?", [
        ["secure", "I trust easily and stay grounded"],
        ["anxious", "I crave closeness and worry about loss"],
        ["avoidant", "I value independence, distance feels safe"],
        ["mixed", "It depends — sometimes both"],
      ]),
      single("reassurance", "How much reassurance do you need?", [
        ["high", "I love it often"],
        ["mid", "Occasional check-ins are enough"],
        ["low", "I'd rather assume we're good"],
      ]),
      single("trigger", "What hurts most?", [
        ["ignored", "Being ignored"],
        ["controlled", "Being controlled"],
        ["misunderstood", "Being misunderstood"],
        ["abandoned", "Being abandoned"],
      ]),
    ],
  },
  {
    id: "family", title: "Family & Children",
    blurb: "Where family fits in your life.",
    questions: [
      single("children", "Do you want children?", [
        ["yes", "Yes, definitely"],
        ["maybe", "Maybe / open"],
        ["no", "No"],
        ["have", "I already have kids"],
      ]),
      single("family_close", "How important is being close to family?", [
        ["essential", "Essential"],
        ["important", "Important"],
        ["light", "Light — chosen family matters more"],
      ]),
      single("pets", "Pets?", [
        ["have", "I have one (or more)"],
        ["want", "I want one"],
        ["allergic", "Allergic / no thanks"],
      ]),
    ],
  },
  {
    id: "values", title: "Values & Beliefs",
    blurb: "What you stand on.",
    questions: [
      single("politics", "Political alignment matters in a partner?", [
        ["must", "Must align"],
        ["close", "Should be close"],
        ["flexible", "Open if respectful"],
      ]),
      single("spiritual", "Spirituality / religion?", [
        ["practicing", "Practicing"],
        ["spiritual", "Spiritual, not religious"],
        ["secular", "Secular"],
        ["seeking", "Still figuring it out"],
      ]),
      single("money", "Your relationship with money?", [
        ["save", "Saver — security first"],
        ["spend", "Spender — experiences first"],
        ["balanced", "Balanced"],
      ]),
      multi("priorities", "Pick your top values (choose up to 3)", [
        ["honesty", "Honesty"], ["growth", "Growth"], ["loyalty", "Loyalty"],
        ["freedom", "Freedom"], ["family", "Family"], ["adventure", "Adventure"],
        ["creativity", "Creativity"], ["service", "Service"], ["ambition", "Ambition"],
      ]),
    ],
  },
  {
    id: "personality", title: "Personality Insights",
    blurb: "The shape of who you are.",
    questions: [
      scale("introvert", "Introvert ←→ Extrovert", "Deep introvert", "Pure extrovert"),
      scale("structure", "Spontaneous ←→ Structured", "Spontaneous", "Highly structured"),
      scale("optimism", "Realist ←→ Optimist", "Realist", "Optimist"),
      single("humor", "Your humor is…", [
        ["dry", "Dry / observational"],
        ["playful", "Goofy / playful"],
        ["witty", "Sharp / witty"],
        ["warm", "Warm / gentle"],
      ]),
    ],
  },
  {
    id: "green_flags", title: "Green Flag Preferences",
    blurb: "What makes your heart open.",
    questions: [
      multi("green", "Which green flags matter most? (pick up to 4)", [
        ["listens", "Truly listens"],
        ["consistent", "Consistent words and actions"],
        ["apologizes", "Apologizes specifically"],
        ["curious", "Stays curious about me"],
        ["independent", "Has their own life"],
        ["growth", "Works on themselves"],
        ["funny", "Makes me laugh"],
        ["calm", "Stays calm under stress"],
        ["generous", "Generous with time and care"],
      ]),
    ],
  },
  {
    id: "red_flags", title: "Red Flag Preferences",
    blurb: "What you won't tolerate.",
    questions: [
      multi("red", "Hard red flags for you? (pick all that apply)", [
        ["dishonest", "Dishonesty"],
        ["mean", "Mean to service staff"],
        ["jealous", "Controlling jealousy"],
        ["ghosting", "Disappears when stressed"],
        ["ex_obsessed", "Talks endlessly about exes"],
        ["no_friends", "No close long-term friends"],
        ["phone", "Phone-first, always"],
        ["unreliable", "Says yes, doesn't show up"],
        ["closed", "Refuses to talk feelings"],
      ]),
    ],
  },
];

export type DiscoverAnswers = Record<string, string | string[] | number>;
