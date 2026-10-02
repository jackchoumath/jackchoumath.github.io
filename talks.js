(function () {
  "use strict";

  const upcoming = document.querySelector('[aria-labelledby="upcoming-title"] .talk-list');
  const past = document.querySelector('[aria-labelledby="past-title"] .talk-list');
  if (!upcoming || !past) return;

  // Use Minneapolis calendar dates, regardless of the visitor's timezone.
  const calendar = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  function datedEntries() {
    return Array.from(document.querySelectorAll(".talk-group .talk-list > li"))
    .map(function (item, index) {
      const time = item.querySelector("time[datetime]");
      const date = time && time.getAttribute("datetime");
      // Leave missing or invalid dates in their static group rather than guessing.
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      const parsed = new Date(date + "T00:00:00Z");
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
      return { item: item, date: date, index: index };
    })
    .filter(Boolean)
    .sort(function (a, b) {
      return b.date.localeCompare(a.date) || a.index - b.index;
    });
  }

  function emptyMessage(list, text) {
    const message = document.createElement("p");
    message.className = "list-note";
    message.textContent = text;
    message.hidden = true;
    list.after(message);
    return message;
  }

  const upcomingSection = upcoming.closest(".talk-group");
  const pastSectionHeading = past.closest(".talk-group").querySelector(".section-heading");
  const pastMessage = emptyMessage(past, "No past talks listed yet.");
  const observer = new MutationObserver(function () { refresh(true); });
  let previousDay;

  function observeLists() {
    [upcoming, past].forEach(function (list) {
      observer.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ["datetime"] });
    });
  }

  function refresh(force) {
    const parts = calendar.formatToParts(new Date());
    function part(type) { return parts.find(function (value) { return value.type === type; }).value; }
    const today = part("year") + "-" + part("month") + "-" + part("day");
    if (today === previousDay && force !== true) return;
    previousDay = today;

    observer.disconnect();
    // Moving the original nodes preserves every label, link, and date without duplicates.
    datedEntries().forEach(function (entry) {
      (entry.date >= today ? upcoming : past).appendChild(entry.item);
    });
    upcomingSection.hidden = upcoming.children.length === 0;
    if (pastSectionHeading) pastSectionHeading.hidden = upcomingSection.hidden;
    pastMessage.hidden = past.children.length > 0;
    observeLists();
  }

  refresh();
  // Refresh an open tab after midnight, and promptly when a suspended tab returns.
  window.setInterval(refresh, 30000);
  window.addEventListener("pageshow", refresh);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refresh();
  });
})();
