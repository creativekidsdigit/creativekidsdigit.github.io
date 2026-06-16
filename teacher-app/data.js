/* =========================================================================
   Static data: classroom activities and problem-solver scripts.
   Pure data — no DOM, no logic.
   ========================================================================= */

window.ACTIVITIES = [
  {
    id: 'think-pair-share',
    name: 'Think-Pair-Share',
    blurb: 'Students think alone, discuss with a partner, then share with the class.',
    time: 5,
    timeLabel: '4–5 min',
    group: 'pair',
    purpose: 'discussion',
    materials: 'None',
    setup: '0 seconds. You just say it.',
    steps: [
      'Pose a question.',
      'Give 60 seconds of silent thinking — hold the silence.',
      'Pair students for 2 minutes of discussion.',
      'Call on 2–3 pairs to share with the class.'
    ],
    mistake: 'Skipping the silent think. Without it, only the loud students think; the others copy.',
    example: 'Think for 60 seconds: what is the difference between "few" and "a few"? Now turn to your partner. Pair 4, what did you decide?'
  },
  {
    id: 'quick-write',
    name: 'Quick Write',
    blurb: 'A 3-minute timed writing on a single prompt. No erasing.',
    time: 3,
    timeLabel: '3–5 min',
    group: 'individual',
    purpose: 'writing',
    materials: 'A prompt and a timer.',
    setup: '30 seconds. Write the prompt on the board, set the timer.',
    steps: [
      'Write the prompt clearly on the board.',
      'Tell students: 3 minutes, keep the pen moving, no erasing.',
      'Start the timer.',
      'Skim 5–6 papers as students write — that is your formative data.'
    ],
    mistake: 'Reading them all out loud. You do not need to. Skim a few while students work.',
    example: 'Describe yesterday in 5 sentences using the past simple.'
  },
  {
    id: 'gallery-walk',
    name: 'Gallery Walk',
    blurb: 'Student work goes on the walls; students rotate and leave sticky-note feedback.',
    time: 12,
    timeLabel: '10–12 min',
    group: 'whole-class',
    purpose: 'review',
    materials: 'Sticky notes, tape, student work.',
    setup: '2 minutes. Tape student work to walls. Hand out sticky notes.',
    steps: [
      'Tape 8–12 pieces of student work around the room.',
      'Give each student 4 sticky notes.',
      'Tell them: visit 4 pieces. On each, write ONE thing you would steal for your own work.',
      'Rotate. 2 minutes per piece.',
      'Return to seats. Discuss patterns.'
    ],
    mistake: 'Letting it become a chat. Give a feedback prompt; movement plus writing prevents drift.',
    example: 'Students wrote 5-sentence opinion paragraphs. Tape them up. Each student visits 4 paragraphs and leaves a sticky on each.'
  },
  {
    id: 'exit-ticket',
    name: 'Exit Ticket',
    blurb: 'One question, answered on a small piece of paper, dropped in a box on the way out.',
    time: 3,
    timeLabel: '3 min',
    group: 'individual',
    purpose: 'assessment',
    materials: 'Paper scraps, a box.',
    setup: '10 seconds. Write the question on the board.',
    steps: [
      'Last 3 minutes of class, write one question on the board.',
      'Hand each student a small piece of paper.',
      'They write the answer and drop it in a box on the way out.',
      'After class, sort into 3 piles: got it / partial / lost.'
    ],
    mistake: 'Asking "Did you understand?" — useless, they all say yes. Ask them to DO the thing.',
    example: 'Rewrite this sentence in reported speech: "He said: I will come."'
  },
  {
    id: 'four-corners',
    name: 'Four Corners',
    blurb: 'Four signs in the room: Strongly Agree / Agree / Disagree / Strongly Disagree. Students walk to a corner.',
    time: 10,
    timeLabel: '8–12 min',
    group: 'whole-class',
    purpose: 'discussion',
    materials: '4 printed signs.',
    setup: '1 minute. Tape 4 signs in 4 corners.',
    steps: [
      'Read a debatable statement.',
      'Students walk to the corner that matches their view.',
      'Ask 1–2 students from each corner to defend their position.',
      'Read the next statement. Repeat 3–4 times.'
    ],
    mistake: 'Using factual statements. Use opinions only — debatable, not provable.',
    example: 'Statements: Homework should be banned in secondary school. Watching films in English helps more than reading books. Texting is ruining the language.'
  },
  {
    id: 'concept-map',
    name: 'Concept Map',
    blurb: 'A visual diagram of how ideas connect. Central concept in the middle; branches outward.',
    time: 15,
    timeLabel: '15 min',
    group: 'individual',
    purpose: 'review',
    materials: 'Blank paper, pens.',
    setup: '30 seconds. Show one example on the board.',
    steps: [
      'Choose a central concept and write it in the middle.',
      'Brainstorm related sub-concepts.',
      'Draw lines between concepts.',
      'Label every line with the relationship.'
    ],
    mistake: 'Letting it become a list. Force students to draw lines AND label them.',
    example: 'Central concept: "Tenses." Branches: present simple, past simple, present continuous. Lines labeled with rules: "adds -ed," "adds -ing."'
  },
  {
    id: 'numbered-heads',
    name: 'Numbered Heads Together',
    blurb: 'Groups of 4 — each numbered 1–4. Group discusses; you call a number to answer.',
    time: 4,
    timeLabel: '3–4 min per question',
    group: 'group',
    purpose: 'practice',
    materials: 'Optional: small whiteboards per group.',
    setup: '1 minute. Assign numbers within each group.',
    steps: [
      'Form groups of 4. Number them 1–4.',
      'Pose a question. Group discusses for 2 minutes.',
      'Call a number — that person from each group answers.',
      'Vary the number you call between rounds.'
    ],
    mistake: 'Calling the same number twice in a row. They figure it out and the quiet ones stop preparing.',
    example: 'Question: What is the difference between past simple and present perfect? Number 3, please answer.'
  },
  {
    id: 'jigsaw',
    name: 'Jigsaw',
    blurb: 'Each student becomes "expert" on one piece, then teaches it to their group.',
    time: 25,
    timeLabel: '25 min',
    group: 'group',
    purpose: 'practice',
    materials: '4 short texts (~200 words each).',
    setup: '5 minutes (you need 4 sub-topics prepared).',
    steps: [
      'Assign each student to an expert group on one of 4 sub-topics.',
      'Expert groups read and master their sub-topic — 10 full minutes.',
      'Re-form home groups (one expert per sub-topic).',
      'Each expert teaches their bit for 3 minutes.',
      '3 minutes whole-class wrap-up.'
    ],
    mistake: 'Not giving expert groups enough time. They need 10 full minutes; if you give them 4, they teach garbage.',
    example: 'Topic: Four ways to use "have" in English — possession, auxiliary (have done), have to, have got.'
  },
  {
    id: 'one-word-checkin',
    name: 'One-Word Check-In',
    blurb: 'Each student says a single word. Speed matters; no explanations.',
    time: 2,
    timeLabel: '90 sec for 30 students',
    group: 'whole-class',
    purpose: 'assessment',
    materials: 'None.',
    setup: '0 seconds.',
    steps: [
      'Pose the prompt: "One word: ____"',
      'Go around the room.',
      'Each student says exactly one word — no explanations.',
      'You learn the room temperature in under 2 minutes.'
    ],
    mistake: 'Letting students explain. Stop them. The point is one word. Speed matters.',
    example: 'Prompts: "One word — how are you arriving today?" / "One word — today\'s lesson." / "One word — what made today hard?"'
  },
  {
    id: 'whiteboard-show',
    name: 'Whiteboard Show-Me',
    blurb: 'Students answer on mini-whiteboards. On 3, everyone holds up.',
    time: 2,
    timeLabel: '2 min per question',
    group: 'whole-class',
    purpose: 'assessment',
    materials: 'Mini-whiteboards or laminated paper, dry-erase markers.',
    setup: '30 seconds (or zero if you keep boards under desks).',
    steps: [
      'Ask a question. Students write on whiteboards.',
      'Tell them not to show until you say.',
      'Count: "1... 2... 3, show me!"',
      'Scan the room. The wrong answers are your next 5 minutes of small-group help.'
    ],
    mistake: 'Letting students show their answer before you say "show me." That tells the others.',
    example: 'On your whiteboards, rewrite this: "They said we are happy." Pause 30 seconds. 1... 2... 3, show me!'
  },
  {
    id: 'two-truths-lie',
    name: 'Two Truths and a Lie',
    blurb: 'Each student writes 3 sentences about themselves: 2 true, 1 false. Class guesses the lie.',
    time: 5,
    timeLabel: '5 min',
    group: 'whole-class',
    purpose: 'hook',
    materials: 'None.',
    setup: '0 seconds.',
    steps: [
      'Each student writes 3 sentences about themselves — 2 true, 1 false.',
      'Pick 3–4 students to read theirs aloud.',
      'After each, the class votes on which is the lie.',
      'Reveal the answer.'
    ],
    mistake: 'Letting it run too long. Cap at 5 minutes. It is a filler, not the lesson.',
    example: 'Practices sentence structure, listening, and fluency in any language class.'
  },
  {
    id: 'sixty-second-speech',
    name: 'The 60-Second Speech',
    blurb: 'Random students stand and speak for 60 seconds on a given topic. No notes.',
    time: 5,
    timeLabel: '5 min',
    group: 'whole-class',
    purpose: 'practice',
    materials: 'A topic and a timer.',
    setup: '0 seconds.',
    steps: [
      'Give a topic.',
      'Students get 60 seconds to think silently.',
      'Pick 3 random students to stand and speak for 60 seconds each.',
      'No notes. Class listens.'
    ],
    mistake: 'Letting nervous students opt out. Be encouraging — even 30 seconds is a win.',
    example: 'Topics: a memory of school, your favorite teacher, what you did yesterday.'
  },
  {
    id: 'three-two-one',
    name: '3-2-1 Reflection',
    blurb: '3 things they learned, 2 questions they have, 1 thing they will use.',
    time: 5,
    timeLabel: '5 min',
    group: 'individual',
    purpose: 'assessment',
    materials: 'Paper.',
    setup: '0 seconds.',
    steps: [
      'At the end of class, ask students to write:',
      '3 things they learned today.',
      '2 questions they still have.',
      '1 thing they will use this week.',
      'Use one of their questions as tomorrow\'s hook.'
    ],
    mistake: 'Collecting them but not reading them. Set aside 5 minutes after class to skim.',
    example: 'Use as a Friday wrap-up to plan next week\'s re-teaching points.'
  },
  {
    id: 'word-chain',
    name: 'Word Chain',
    blurb: 'You say a word; the next student says one starting with the last letter. No repeats.',
    time: 5,
    timeLabel: '5 min',
    group: 'whole-class',
    purpose: 'hook',
    materials: 'None.',
    setup: '0 seconds.',
    steps: [
      'Say a starter word out loud.',
      'Next student says a word that starts with the last letter of yours.',
      'Continue around the class.',
      'When someone gets stuck, restart with a new starter.'
    ],
    mistake: 'Only doing it once. Build the chain across multiple lessons; use themed starters.',
    example: 'English vocabulary: bread → dance → end → door → run → night...'
  },
  {
    id: 'stop-light',
    name: 'Stop Light',
    blurb: 'Students self-rate confidence: red (lost), yellow (almost), green (got it).',
    time: 2,
    timeLabel: '2 min',
    group: 'whole-class',
    purpose: 'assessment',
    materials: 'Three colored cards, or three columns on the board.',
    setup: '30 seconds.',
    steps: [
      'After teaching a concept, ask students to rate their confidence.',
      'Red = lost. Yellow = almost. Green = got it.',
      'They put their initial in the matching column.',
      'Group by color for the next activity. Greens get harder problems; reds get a re-explanation.'
    ],
    mistake: 'Not acting on the data. The point is to differentiate the next 10 minutes.',
    example: 'After teaching reported speech rules, run a stop light check before the worksheet.'
  }
];

/* ========================================================================= */

window.PROBLEMS = [
  {
    id: 'student-on-phone',
    title: 'A student is on their phone',
    summary: 'You see a phone screen during your lesson. The whole class is watching to see what you do.',
    sections: [
      {
        kind: 'dont',
        title: 'Do NOT say',
        text: '"Put it away, I will not repeat it."',
        why: 'This sets up a duel. The student will refuse to lose face in front of the class.'
      },
      {
        kind: 'say',
        title: 'Say instead, calmly',
        text: 'Hey [name], I see your phone. I am going to need it on the desk, screen down, until the end of class. We will talk after. Thank you.',
        why: 'You name the behavior, give a clear instruction, and end with thank-you. No threat, no audience.'
      },
      {
        kind: 'next',
        title: 'What to do next',
        text: 'Move on immediately. Do not wait for compliance — go to the next thing in the lesson. Most students comply within 30 seconds when you do not make it a duel. If they refuse: "OK, we will handle it after class. For now, please join the activity." Then genuinely move on.'
      }
    ]
  },
  {
    id: 'open-disrespect',
    title: 'A student is openly disrespectful in front of the class',
    summary: 'Sarcastic comment, eye-roll, or direct rudeness — and everyone heard it.',
    sections: [
      {
        kind: 'dont',
        title: 'Do NOT say',
        text: '"Get out."',
        why: 'Sometimes correct, but usually escalates and you lose the rest of the lesson. Save it for genuine danger.'
      },
      {
        kind: 'say',
        title: 'Say instead',
        text: 'That is not OK. We will talk after class. Right now I need you to sit down and let us continue.',
        why: 'Three short phrases. Do not engage with the substance of what they said. Repeat them if you have to. Do not add new ones.'
      },
      {
        kind: 'next',
        title: 'What to do next',
        text: 'After class, find them quietly. Short, calm conversation — not punishment, not lecture. Ask: "What was going on?" Listen first. Then say what you need from them tomorrow. End with a handshake or "See you tomorrow." Do not bring this up in front of the class the next day.'
      }
    ]
  },
  {
    id: 'student-shutting-down',
    title: 'A student is crying or shutting down',
    summary: 'You see tears, a hood pulled up, or a student going completely silent and still.',
    sections: [
      {
        kind: 'dont',
        title: 'Do NOT say',
        text: '"Are you OK?" — in front of the class.',
        why: 'They will say "yes" and shut down further. Public attention makes it worse.'
      },
      {
        kind: 'say',
        title: 'Say instead, quietly, while the rest of the class is busy',
        text: 'Take a minute. Get water. Come back when you are ready.',
        why: 'You give them a graceful exit without an audience. They do not owe you an explanation.'
      },
      {
        kind: 'next',
        title: 'What to do next',
        text: 'After the lesson, find them quietly and say: "Hey. Earlier — anything I should know?" Sometimes you will get a real answer. Sometimes "I am fine." Both are valid. Do not push. If it happens repeatedly, talk to the school counselor or pastoral lead — not as escalation, as support.'
      }
    ]
  },
  {
    id: 'losing-the-room',
    title: 'You are losing the room — energy has crashed',
    summary: 'Students chatting. Phones up. The lesson is alive but the students are gone.',
    sections: [
      {
        kind: 'say',
        title: 'The 90-second reset',
        text: '1. Stop talking. Mid-sentence. 2. Wait. Hold the silence (10–20 seconds). 3. One physical instruction: "Stand up" or "Move one seat to the left." 4. One 30-second task: "Write your name and one thing you want to learn today." 5. Restart at different energy.',
        why: 'A content reset is invisible to them. A physical reset breaks the trance.'
      },
      {
        kind: 'next',
        title: 'What to do next',
        text: 'After the reset, do not return to the same activity that crashed — switch to something different. If the energy crashes again in the same lesson, that is information for tomorrow: the activity was wrong, or this group needs more movement built in.'
      }
    ]
  },
  {
    id: 'lesson-finished-early',
    title: 'The lesson finished 10 minutes early',
    summary: 'You planned for 45. You are done at 35. Now what.',
    sections: [
      {
        kind: 'say',
        title: 'Pick one 5-minute filler — actually instructional, not babysitting',
        text: 'Two Truths and a Lie. The 60-Second Speech. Word Chain. Categories ("In 60 seconds, write as many ___ as you can"). Question of the Day ("What\'s one thing you would change about this school?").',
        why: 'Each builds fluency, vocabulary, or confidence. Some will become favorite lessons.'
      },
      {
        kind: 'next',
        title: 'What to do next',
        text: 'After class, ask yourself why the lesson ran short. Did you under-plan the You-Do? Was the activity too easy? Add 5 minutes to that block tomorrow.'
      }
    ]
  },
  {
    id: 'tech-failed',
    title: 'Tech or materials failed',
    summary: 'Projector dead. USB missing. Photocopier ate Worksheet 4. You have nothing.',
    sections: [
      {
        kind: 'say',
        title: 'Pick one 20-minute no-prep lesson',
        text: 'The 5-Sentence Story (give a topic, students write 5 sentences, share, peer feedback). The Newspaper (students write headlines about events in their lives). Reverse Engineering (write a sentence with one word missing, students brainstorm options). Vocabulary Mapping (pick a word from yesterday, build a giant map). The Interview (pairs interview each other, then write 5 sentences about their partner).',
        why: 'All of these work for any subject. None require materials beyond paper and pen.'
      },
      {
        kind: 'next',
        title: 'What to do next',
        text: 'Always print one extra copy of any worksheet. Always email the slides to yourself the night before. The first time tech fails on you teaches you how to be 99% reliable forever after.'
      }
    ]
  },
  {
    id: 'student-refusing',
    title: 'A student is refusing to participate',
    summary: 'They are physically present but they are not doing the work. Pen down. Arms crossed.',
    sections: [
      {
        kind: 'dont',
        title: 'Do NOT say',
        text: '"Why are you not working?" or "Do it now."',
        why: '"Why" invites a debate. "Do it now" creates a public power struggle the student cannot back down from.'
      },
      {
        kind: 'say',
        title: 'Say instead, quietly, kneeling at their desk',
        text: 'I want to make sure I have not lost you. What part is hard right now? — pause — Can you start with question one? I will check back in five minutes.',
        why: 'You assume good faith. You make the task smaller. You promise a return.'
      },
      {
        kind: 'next',
        title: 'What to do next',
        text: 'Come back in five minutes as promised. Even one question completed is progress. Do not pile on more. If the refusal is consistent across days, find them after class and ask: "What would help you do the work in this class?" The honest answer is often surprising and useful.'
      }
    ]
  },
  {
    id: 'loud-during-instruction',
    title: 'Loud talking while you are giving instructions',
    summary: 'You are explaining. The room is humming. You are competing with side conversations.',
    sections: [
      {
        kind: 'dont',
        title: 'Do NOT do this',
        text: 'Talk louder.',
        why: 'You will lose your voice by November and the room will keep matching your volume. They will always be louder than you.'
      },
      {
        kind: 'say',
        title: 'Do this instead',
        text: 'Stop mid-sentence. Stand still. Say nothing. Wait for the room to notice. (It takes 5–15 seconds. The room WILL notice.) When you have silence, speak again at half your normal volume. They will lean in to hear you.',
        why: 'Volume creates volume. Silence creates silence.'
      },
      {
        kind: 'next',
        title: 'What to do next',
        text: 'Do not give instructions for longer than 90 seconds at a stretch. If the instruction is complex, write it on the board, then use your voice for emphasis only. Most "loud during instruction" problems are really "instructions are too long" problems.'
      }
    ]
  },
  {
    id: 'lesson-flopped',
    title: 'The lesson completely flopped',
    summary: 'You are still in the room. Bell in 5 minutes. The lesson did not work. You know it. They know it.',
    sections: [
      {
        kind: 'say',
        title: 'For the last 5 minutes',
        text: 'Be honest. "OK — that did not land. My fault. Tomorrow we will come at this differently. For the next 5 minutes I want you to write down: one thing from today that confused you, and one question you want answered tomorrow."',
        why: 'Owning it disarms students faster than pretending it went well. They respect honesty more than performance.'
      },
      {
        kind: 'next',
        title: 'What to do tonight',
        text: 'Read what they wrote. The patterns will tell you what to teach tomorrow. Do not redesign the whole unit; redesign tomorrow only. One adjustment, not five. The lesson that flopped is not a verdict. It is data.'
      }
    ]
  },
  {
    id: 'going-home-overwhelmed',
    title: 'You are going home overwhelmed',
    summary: 'Bad day. You want to cry. You are wondering if you can do this job.',
    sections: [
      {
        kind: 'say',
        title: 'The 3-step end-of-day reset',
        text: '1. Close your classroom door. Sit. Phone away. 5 minutes of nothing. 2. Write 3 lines: One thing that went OK today. One thing I will fix tomorrow. One thing that is NOT my fault. 3. Leave the building. Do not stay another hour at your desk.',
        why: 'The third line is the most important one. Some things are not your fault — the student whose home life you do not know, the schedule, the broken projector. Name them so you stop carrying them.'
      },
      {
        kind: 'next',
        title: 'A note for the worst days',
        text: 'Today\'s lesson did not work. That is not a verdict on you — it is a Tuesday. The 22 students who said nothing today are not your enemies; they are 14-year-olds. Tomorrow you do it again, slightly better. Five years from now you will be a great teacher because of what did not work today, not in spite of it. Eat something. Sleep.'
      }
    ]
  }
];
