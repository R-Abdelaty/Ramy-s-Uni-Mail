import { DEFAULT_COURSES } from './courseMappings.js'

export const DEMO_BOOT_MS = 1000
export const DEMO_COURSES = DEFAULT_COURSES

// Local samples, including two announcements recreated from supplied screenshots.
// Sender and recipient addresses are fictional; never load a mailbox or database.
export const DEMO_EMAILS = [
  {
    id: 'demo-database-project',
    title: 'CSEN501 — Project milestone & lab updates',
    date: '2026-10-13T09:00:00+03:00',
    sender_name: 'Database Course Team',
    from: 'database@university.example',
    to: 'student@university.example',
    html_body: `<p>Dear students,</p>
      <p>The first project milestone for <strong>CSEN501</strong> is now available. This week, you will turn your university library design into a working relational database.</p>
      <h3>What to submit</h3>
      <ul><li>An entity–relationship diagram for books, students, and loans.</li>
      <li>Your SQL schema, including primary and foreign keys.</li>
      <li>Five sample queries and a short explanation of your design.</li></ul>
      <p><strong>Deadline:</strong> Thursday, 22 October at 11:59 PM.</p>
      <p>We will review joins and normalization in the next lab. Bring your draft schema and any questions from the practice sheet.</p>
      <p>If you are also taking <strong>MATH501</strong>, the work on sets and relations will be useful for this milestone.</p>
      <p>Good luck!<br>Database Course Team</p>`,
  },
  {
    id: 'demo-open-jam-session',
    title: 'TODAY: Semester Kick-Off Open Jam Session',
    date: '2026-10-12T13:28:00+03:00',
    sender_name: 'Student Activities Office',
    from: 'activities@university.example',
    to: 'student@university.example',
    html_body: `<div style="text-align:center">
      <p>Music has a way of bringing people together and what better way to kick off the semester than with an <strong>Open Jam Session!</strong><br>
      Come meet new people, jam together, connect, exchange ideas and get inspired by fellow music lovers.<br>
      Whether you sing, play an instrument, or simply enjoy being surrounded by good music, you’re welcome to join.<br>
      And if you’re not an active musician? <strong>Just come by, hang out and enjoy some tunes! 🎵</strong></p>
      <p><strong>🗓️ TODAY: Monday, 12<sup>th</sup> October<br>
      ⏰ 3:30–5:30 PM<br>
      📍 Music Hall- D5.01</strong><br>
      Bring your instrument, your voice, or simply yourself. See you there!</p>
    </div>`,
  },
  {
    id: 'demo-german-tutorials',
    title: 'Winter 2026: Start of German Tutorials (German 1)',
    date: '2026-10-07T17:47:00+03:00',
    sender_name: 'German Centre',
    from: 'german-centre@university.example',
    to: 'student@university.example',
    html_body: `<p>Dear Valued GUC Students,</p>
      <p>The German Centre is extending you its heartfelt wishes for a successful semester start.</p>
      <p>Kindly be informed that the <strong>German 1 tutorials</strong> will start on Saturday <strong>10<sup>th</sup> of October 2026.</strong></p>
      <p>Kindly find below some important information regarding the German Language Tutorials:</p>
      <p><strong><u>I Course Material</u></strong></p>
      <p>Kindly note, that <u>Only Original Books</u> are allowed on Campus/in Classes.</p>
      <p>Original German Language Course book are available <u>only at the GUC Copy Center</u></p>
      <p><em>Books from other sources are not originals and you will have to bear the legal and financial consequences if you obtain false copies</em></p>`,
  },
  {
    id: 'demo-networks-quiz',
    title: 'CSEN503 — Quiz 1 practice sheet',
    date: '2026-10-13T08:30:00+03:00',
    sender_name: 'Networks Course Team',
    from: 'networks@university.example',
    to: 'student@university.example',
    body: 'Dear students,\n\nThe CSEN503 practice sheet is ready. Quiz 1 covers network layers, packet switching, transmission delay, and propagation delay.\n\nPlease solve questions 1–6 before your tutorial. We will work through the solutions together and leave time for questions.\n\nThe quiz takes place during your regular tutorial next week. Bring a calculator and arrive ten minutes early.\n\nBest wishes,\nNetworks Course Team',
  },
  {
    id: 'demo-math-tutorial',
    title: 'MATH501 — Tutorial room change',
    date: '2026-10-12T14:20:00+03:00',
    sender_name: 'Mathematics Department',
    from: 'mathematics@university.example',
    to: 'student@university.example',
    body: 'Dear students,\n\nThis week’s MATH501 tutorial will take place in room B2.14 instead of B1.08. The time stays the same: Tuesday, 10:00–11:30 AM.\n\nWe will cover proof by induction, sets, and relations. Please bring your notes and the latest problem sheet.\n\nSee you there,\nMathematics Department',
  },
  {
    id: 'demo-media-workshop',
    title: 'DMET501 — Image processing workshop',
    date: '2026-10-12T11:00:00+03:00',
    sender_name: 'Media Engineering Team',
    from: 'media@university.example',
    to: 'student@university.example',
    html_body: '<p>Dear students,</p><p>Our next <strong>DMET501</strong> lab is a hands-on workshop on image processing.</p><p>You will experiment with color channels, grayscale conversion, and simple image filters. Bring a laptop and three photos of everyday objects to use in your exercises.</p><p><strong>Location:</strong> Media Lab, C1.03<br><strong>Time:</strong> Wednesday, 1:00–3:00 PM</p><p>No preparation beyond the lecture notes is required.</p><p>Media Engineering Team</p>',
  },
  {
    id: 'demo-campus-reminder',
    title: 'Campus newsletter — Clubs & student activities',
    date: '2026-10-11T15:00:00+03:00',
    sender_name: 'Student Activities Office',
    from: 'activities@university.example',
    to: 'student@university.example',
    body: 'Hello everyone,\n\nThe student club fair returns to the main courtyard this Thursday from 12:00 to 4:00 PM. Meet the robotics club, photography society, debate team, and volunteer groups.\n\nThere is also a short welcome session for new members at 1:30 PM. Drop by between classes and find something you enjoy.\n\nStudent Activities Office',
  },
  {
    id: 'demo-computation-sheet',
    title: 'CSEN502 — Finite automata exercise sheet',
    date: '2026-10-11T10:15:00+03:00',
    sender_name: 'Theory of Computation Team',
    from: 'computation@university.example',
    to: 'student@university.example',
    body: 'Dear students,\n\nExercise sheet 3 for CSEN502 covers deterministic and nondeterministic finite automata.\n\nStart with the transition tables, then draw a state diagram for each language. The final question asks you to convert an NFA into a DFA.\n\nOffice hours are Monday, 2:00–3:00 PM in room C2.06. Bring any attempted solutions you would like to discuss.\n\nTheory of Computation Team',
  },
  {
    id: 'demo-digital-design',
    title: 'CSEN605 — Lab preparation: Logic circuits',
    date: '2026-10-10T13:30:00+03:00',
    sender_name: 'Digital Design Course Team',
    from: 'digital-design@university.example',
    to: 'student@university.example',
    body: 'Dear students,\n\nIn the upcoming CSEN605 lab, you will build a small combinational circuit and verify its truth table.\n\nBefore the session, revise Boolean algebra, Karnaugh maps, and multiplexers. Prepare a simplified expression for the circuit in question 2 of your worksheet.\n\nYou will work in pairs. All components will be provided in the lab.\n\nDigital Design Course Team',
  },
  {
    id: 'demo-arabic-library',
    title: 'المكتبة — مواعيد قاعات المذاكرة',
    date: '2026-10-09T10:00:00+03:00',
    sender_name: 'مكتبة الجامعة',
    from: 'library@university.example',
    to: 'student@university.example',
    body: 'أعزاءنا الطلاب،\n\nتفتح قاعات المذاكرة بالمكتبة من الساعة التاسعة صباحًا حتى السادسة مساءً خلال أيام الدراسة.\n\nيمكنكم حجز غرفة للمذاكرة الجماعية لمدة ساعتين من مكتب الاستقبال. يرجى المحافظة على الهدوء وإعادة الكتب إلى الأماكن المخصصة لها.\n\nنتمنى لكم فصلًا دراسيًا موفقًا.\n\nفريق مكتبة الجامعة',
  },
]
