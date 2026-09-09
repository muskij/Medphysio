"use client";

import { useState } from "react";
import Link from "next/link";

const COLORS = ["coral", "amber", "blue", "teal", "purple", "green", "pink"];

export default function CourseModules({ modules, courseSlug, hasFullAccess }) {
  const [openId, setOpenId] = useState(modules[0]?.id);

  return (
    <div className="module-list">
      {modules.map((module, mi) => {
        const expanded = openId === module.id;
        return (
          <article key={module.id} className={`module ${COLORS[mi % COLORS.length]} ${expanded ? "expanded" : ""}`}>
            <button
              className="module-heading"
              aria-expanded={expanded}
              onClick={() => setOpenId(expanded ? null : module.id)}
            >
              <span className="module-number">{String(mi + 1).padStart(2, "0")}</span>
              <span className="module-title">
                <small>Topic {mi + 1}</small>
                <strong>{module.title}</strong>
              </span>
              <span className="module-time">{module.lessons.length} lessons</span>
              <span className="module-toggle">{expanded ? "\u2212" : "+"}</span>
            </button>
            {expanded && (
              <div className="module-body" hidden={false}>
                <div className="resource-grid">
                  {module.lessons.map((lesson) => {
                    const locked = !hasFullAccess && !lesson.free_preview;
                    const content = (
                      <>
                        <span>{locked ? "\u{1F512}" : "\u25b6"}</span>
                        <p>
                          <strong>{lesson.title}</strong>
                          <small>{locked ? "Enroll to unlock" : "Open lesson"}</small>
                        </p>
                        <i>&#8594;</i>
                      </>
                    );
                    return locked ? (
                      <span className="resource" key={lesson.id} style={{ opacity: 0.55, cursor: "not-allowed" }}>
                        {content}
                      </span>
                    ) : (
                      <Link className="resource" key={lesson.id} href={`/courses/${courseSlug}/${lesson.slug}`}>
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
