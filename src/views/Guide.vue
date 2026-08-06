<template>
  <main class="guide-page">
    <article class="guide">
      <header id="guide">
        <RouterLink class="back-link" to="/">&lt; Back to calendar</RouterLink>
        <h1>How to use Git Calendar</h1>
        <p>
          Repositories are your calendars, and events are stored in them. You can work locally or connect a remote Git
          repository to sync your calendars.
        </p>
      </header>

      <nav id="contents" class="contents" aria-labelledby="contents-heading">
        <h2 id="contents-heading"><a href="#contents">Contents</a></h2>
        <ol>
          <li><a href="#quick-start">Quick start</a></li>
          <li><a href="#create-repository">Create a repository</a></li>
          <li><a href="#clone-repository">Clone a repository</a></li>
          <li><a href="#icalendar">Importing iCalendar</a></li>
          <li><a href="#dragging-tips">Dragging tips</a></li>
          <li><a href="#keyboard-shortcuts">Keyboard shortcuts</a></li>
          <li><a href="#other-controls">Other controls</a></li>
        </ol>
      </nav>

      <section id="quick-start" aria-labelledby="quick-start-heading">
        <h2 id="quick-start-heading"><a href="#quick-start">Quick start</a></h2>
        <ol>
          <li>
            <strong>Add a repository:</strong> open the sidebar and select the <strong>+</strong> next to Calendars.
          </li>
          <li>
            <strong>Create an event:</strong> click <strong>New event</strong>, or drag over an empty time range in the
            calendar.
          </li>
          <li><strong>Sync changes:</strong> all changes will be synced automatically if you use a Git remote.</li>
        </ol>
      </section>

      <section id="create-repository" aria-labelledby="create-repository-heading">
        <h2 id="create-repository-heading"><a href="#create-repository">Create a repository</a></h2>
        <ol>
          <li>Select the <strong>+</strong> next to Calendars and choose <strong>Init</strong>.</li>
          <li>Enter a name, such as <code>My Calendar</code>.</li>
          <li>
            If you want remote syncing, create an empty repository on your Git provider and paste its HTTPS URL. The URL
            must end in <code>.git</code>.
          </li>
          <li>For a private remote, enter your username and/or access token/password.</li>
          <li>Enable encryption if desired, save the key somewhere safe, and finish creating the repository.</li>
        </ol>
      </section>

      <section id="clone-repository" aria-labelledby="clone-repository-heading">
        <h2 id="clone-repository-heading"><a href="#clone-repository">Clone a repository</a></h2>
        <ol>
          <li>Copy the HTTPS clone URL, for example <code>https://host/user/calendar.git</code>.</li>
          <li>Select the <strong>+</strong> next to Calendars and choose <strong>Clone</strong>.</li>
          <li>Paste the URL and add credentials if the repository is private.</li>
          <li>Enable <strong>Read-only</strong> if you only want to view the calendar.</li>
          <li>If the repository is encrypted, enable encryption and enter its existing key.</li>
        </ol>
        <p>
          Encryption keys cannot be recovered from the repository. You need the same key on every device that clones it.
        </p>
      </section>

      <section id="icalendar" aria-labelledby="icalendar-heading">
        <h2 id="icalendar-heading"><a href="#icalendar">Importing iCalendar</a></h2>
        <p>
          iCalendar, also called iCal, is an open format for exchanging calendar events. Files and feeds use the
          <code>.ics</code> extension and are supported by calendar apps such as Apple Calendar, Google Calendar, and
          Outlook.
        </p>
        <ul>
          <li>
            <strong>Import a file:</strong> events from an <code>.ics</code> file are copied into a writable repository
            and become regular Git Calendar events. Later changes to the original file are not synchronized.
          </li>
          <li>
            <strong>Subscribe to a feed:</strong> an HTTPS URL ending in <code>.ics</code> creates a read-only calendar.
            The feed is refreshed during sync, and the last downloaded copy remains available while offline.
          </li>
        </ul>
        <p>To change events in a subscribed calendar, edit them in the service that publishes the iCalendar feed.</p>
      </section>

      <section id="dragging-tips" aria-labelledby="dragging-tips-heading">
        <h2 id="dragging-tips-heading"><a href="#dragging-tips">Dragging tips</a></h2>
        <ul>
          <li>
            <strong>Create:</strong> drag through empty time or all-day row, then release to open the event form and
            create event.
          </li>
          <li>
            <strong>Move:</strong> drag an event vertically to change its time or sideways to move it to another day.
          </li>
          <li><strong>Resize:</strong> on desktop, drag the top or bottom edge to change an event’s duration.</li>
          <li><strong>Mobile:</strong> press and hold briefly before dragging. A normal tap opens the event.</li>
          <li>
            <strong>Precision:</strong> change the drag interval in <RouterLink to="/settings">Settings</RouterLink>.
          </li>
        </ul>
        <p>Events in read-only repositories cannot be dragged or edited.</p>
      </section>

      <section id="keyboard-shortcuts" aria-labelledby="keyboard-shortcuts-heading">
        <h2 id="keyboard-shortcuts-heading"><a href="#keyboard-shortcuts">Keyboard shortcuts</a></h2>
        <p>These shortcuts work while the calendar is open and focus is not inside a form field.</p>
        <ul class="shortcuts">
          <li><kbd>N</kbd> Create a new event</li>
          <li><kbd>T</kbd> Go to today</li>
          <li><kbd>4</kbd> Switch to the four-day view</li>
          <li><kbd>W</kbd> Switch to the week view</li>
          <li><kbd>M</kbd> Switch to the month view</li>
          <li><kbd>←</kbd> Move to the previous period</li>
          <li><kbd>→</kbd> Move to the next period</li>
          <li><kbd>S</kbd> Show or hide the sidebar</li>
          <li><kbd>Esc</kbd> Close the open dialog</li>
        </ul>
      </section>

      <section id="other-controls" aria-labelledby="other-controls-heading">
        <h2 id="other-controls-heading"><a href="#other-controls">Other controls</a></h2>
        <ul>
          <li><strong>Filter:</strong> use the checkboxes under each repository to show or hide its tags.</li>
          <li><strong>Month map:</strong> use the small calendar in the sidebar to jump directly to a date.</li>
          <li><strong>Edit:</strong> select an event to update its details, repeat rule, repository, or tag.</li>
          <li>
            <strong>Navigate:</strong> switch views at the top, jump to today, or use the previous and next arrows.
          </li>
          <li><strong>Private remotes:</strong> prefer an access token over your Git provider account password.</li>
        </ul>
      </section>
    </article>
  </main>
</template>

<style scoped>
.guide-page {
  height: 100%;
  overflow-y: auto;
  padding: 2rem;
}

.guide {
  width: min(100%, 42rem);
  margin: 0 auto;
  padding-bottom: 3rem;
}

header {
  margin-bottom: 2rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 1.5rem;
}

h1 {
  margin-bottom: 0.75rem;
  color: var(--text-color-hard);
  font-size: 2rem;
}

h2 {
  margin-bottom: 0.75rem;
  color: var(--text-color-harder);
  font-size: 1.25rem;
}

:is(h1, h2) > a {
  color: inherit;
}

p,
li {
  line-height: 1.6;
}

ol,
ul {
  padding-left: 1.5rem;
}

li + li {
  margin-top: 0.5rem;
}

.contents {
  padding: 1rem;
  background-color: var(--sidebar-color);
}

.contents h2 {
  font-size: 1rem;
}

section {
  margin-top: 2.5rem;
  scroll-margin-top: 1rem;
}

code,
kbd {
  padding: 0.1rem 0.25rem;
  border-radius: var(--small-border-radius);
  background-color: var(--btn-bg-color);
  color: var(--text-color-harder);
  overflow-wrap: anywhere;
}

p + ul {
  margin-top: 0.75rem;
}

.shortcuts kbd {
  display: inline-block;
  min-width: 2.5rem;
  margin-right: 0.25rem;
  text-align: center;
}

section > p:last-child {
  margin-top: 1rem;
}

@media (max-width: 600px) {
  .guide-page {
    padding: 1.25rem;
  }
}
</style>
