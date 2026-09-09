import Link from "next/link";
import { getSessionUser } from "../lib/auth";
import { listCourses, isSubscribed } from "../lib/queries";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const CARD_COLORS = ["green", "pink", "coral", "blue", "purple", "yellow"];
const CARD_ICONS = ["\u2721", "\u25c6", "\u2764", "\u25cb", "\u2248", "\u2637"];

export default async function HomePage() {
  const user = await getSessionUser();
  const subscribed = user ? isSubscribed(user.id) : false;
  const courses = listCourses({ publishedOnly: true });

  return (
    <main>
      <SiteHeader user={user} subscribed={subscribed} />

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>&#10022;</span> Physiology, finally made clear
          </div>
          <h1>
            Understand the <em>why</em>
            <br />
            behind every <span>mechanism.</span>
          </h1>
          <p>
            Friendly, focused Physiology tutorials for university and medical-school students who want to
            understand deeply, remember longer and write better examination answers.
          </p>
          <div className="hero-actions">
            <a className="button" href="#courses">
              Explore courses <b>&#8594;</b>
            </a>
            <a className="text-link" href="#method">
              <i>&#9654;</i> See how it works
            </a>
          </div>
          <div className="hero-trust">
            <div className="faces">
              <span>AO</span>
              <span>MK</span>
              <span>JS</span>
              <span>+2k</span>
            </div>
            <p>
              <strong>Loved by curious learners</strong>
              <small>Built for students who want more than memorisation.</small>
            </p>
          </div>
        </div>

        <div className="hero-visual" aria-label="Illustration of a Physiology learning dashboard">
          <div className="visual-blob"></div>
          <div className="study-card">
            <div className="study-card-top">
              <span className="mini-brand">M+</span>
              <span>Today&rsquo;s lesson</span>
              <b>&bull;&bull;&bull;</b>
            </div>
            <div className="lesson-art">
              <span className="pulse pulse-one"></span>
              <span className="pulse pulse-two"></span>
              <div className="heart">&#9829;</div>
              <svg viewBox="0 0 300 70" aria-hidden="true">
                <path d="M0 38h55l12-15 16 31 16-47 18 51 15-20h42l13-24 16 43 16-19h81" />
              </svg>
            </div>
            <span className="lesson-label">Physiology, one system at a time</span>
            <h3>Structured for exams</h3>
            <p>Mini-text, voice notes, full lectures, structured answers and quizzes for every topic.</p>
            <div className="lesson-progress">
              <span></span>
            </div>
            <div className="lesson-meta">
              <span>{courses.length} courses live</span>
              <strong>Growing weekly</strong>
            </div>
          </div>
          <div className="floating-note note-one">
            <span>&#10003;</span>
            <p>
              <strong>Concept mastered!</strong>
              <small>Cardiac output</small>
            </p>
          </div>
          <div className="floating-note note-two">
            <span>87%</span>
            <p>
              <strong>Quiz score</strong>
              <small>Excellent work</small>
            </p>
          </div>
          <div className="doodle star-one">&#10022;</div>
          <div className="doodle star-two">&#10022;</div>
          <div className="doodle squiggle">&#12336;</div>
        </div>
      </section>

      <section className="proof-strip">
        <p>Learn with purpose</p>
        <div>
          <strong>{courses.length}</strong>
          <span>courses live</span>
        </div>
        <div>
          <strong>{courses.reduce((a, c) => a + c.lesson_count, 0)}</strong>
          <span>guided lessons</span>
        </div>
        <div>
          <strong>{courses.reduce((a, c) => a + c.enrolled_count, 0)}</strong>
          <span>students enrolled</span>
        </div>
        <div>
          <strong>100%</strong>
          <span>mechanism-focused</span>
        </div>
      </section>

      <section className="section courses" id="courses">
        <div className="section-heading">
          <div>
            <span className="kicker">Explore the body, system by system</span>
            <h2>
              Choose your next
              <br />
              <em>learning adventure.</em>
            </h2>
          </div>
          <p>
            Each course breaks complex Physiology into clear, connected lessons&mdash;without watering down the
            mechanisms you need to understand.
          </p>
        </div>
        <p style={{ margin: "-10px 0 26px", fontSize: 13, color: "#7c9195" }}>
          Free preview courses are open to everyone. Everything else is unlocked with one{" "}
          <Link href="/subscribe" style={{ color: "var(--teal)", fontWeight: 700 }}>
            site-wide subscription
          </Link>
          .
        </p>
        <div className="system-grid">
          {courses.map((course, i) => (
            <Link
              key={course.id}
              className={`system-card ${CARD_COLORS[i % CARD_COLORS.length]}`}
              href={`/courses/${course.slug}`}
            >
              <div className="system-top">
                <span className="system-icon">{CARD_ICONS[i % CARD_ICONS.length]}</span>
                <span className="arrow">&#8599;</span>
              </div>
              <span className="course-count">{course.lesson_count} lessons</span>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <div className="tiny-progress">
                <span style={{ width: course.requires_subscription ? "0%" : "100%" }}></span>
              </div>
            </Link>
          ))}
          {courses.length === 0 && (
            <p style={{ color: "#718589" }}>
              No courses published yet &mdash; add one from the{" "}
              <Link href="/admin" style={{ color: "var(--teal)", fontWeight: 700 }}>
                admin panel
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="section method" id="method">
        <div className="method-intro">
          <span className="kicker">The MedPhysio method</span>
          <h2>
            From &ldquo;I don&rsquo;t get it&rdquo;
            <br />
            to <em>&ldquo;Now it makes sense.&rdquo;</em>
          </h2>
          <p>
            We turn each topic into a simple learning journey that moves from understanding to confident recall and
            examination-ready writing.
          </p>
          <div className="quote-card">
            <span>&ldquo;</span>
            <p>Physiology becomes easier when every fact has a reason and every mechanism tells a story.</p>
          </div>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <div>
              <h3>Understand the concept</h3>
              <p>Start with a clear explanation that connects every new idea to what you already know.</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>See the mechanism</h3>
              <p>Follow processes step by step with visual summaries and carefully structured lessons.</p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Test yourself</h3>
              <p>Use focused quizzes and explanations to find gaps before the examination finds them.</p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>Ask when you&rsquo;re stuck</h3>
              <p>Ask the lesson&rsquo;s own AI assistant, grounded strictly in that lesson&rsquo;s material.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="section about" id="about">
        <div className="about-card">
          <div className="about-copy">
            <span className="kicker">Made for serious learners</span>
            <h2>
              Strong foundations.
              <br />
              <em>Better performance.</em>
            </h2>
            <p>
              Whether Physiology is your major subject or one important part of your curriculum, MedPhysio
              Tutorials helps you build the understanding needed for lectures, practicals and professional
              examinations.
            </p>
            <ul>
              <li>
                <span>&#10003;</span> Clear explanations without unnecessary jargon
              </li>
              <li>
                <span>&#10003;</span> Mechanisms connected across body systems
              </li>
              <li>
                <span>&#10003;</span> Examination-focused practice and feedback
              </li>
            </ul>
          </div>
          <div className="about-art">
            <div className="book book-one"></div>
            <div className="book book-two"></div>
            <div className="book book-three"></div>
            <div className="brain">&#9057;</div>
            <span className="orbit o1">Na&#8314;</span>
            <span className="orbit o2">CO&#8322;</span>
            <span className="orbit o3">ATP</span>
          </div>
        </div>
      </section>

      <section className="join" id="join">
        <div>
          <span className="kicker">Your learning journey starts here</span>
          <h2>
            Ready to make Physiology
            <br />
            <em>your strongest subject?</em>
          </h2>
          <p>Create a free student account and start your first course today.</p>
        </div>
        <div>
          <Link className="button" href="/register" style={{ width: "max-content" }}>
            Create your free account &#8594;
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
