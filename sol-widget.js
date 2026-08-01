/* Sol voice demo widget (ElevenLabs Agents).
   Included on every page. Injects the widget element, loads the embed, and
   rotates the collapsed bubble label through the three pitches. */
(function () {
  var AGENT_ID = 'agent_7501kyv2ce87f1tbd1nq3wjeq7m4';
  var EMBED_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

  // The key the widget writes "true" to once the visitor accepts the terms
  // modal, and reads back on load. localStorage is per-origin, so accepting on
  // any page suppresses the modal across the whole site. The terms copy itself
  // lives on the agent in the ElevenLabs dashboard - without it, no modal.
  var TERMS_KEY = 'sol_reception_terms_accepted';

  var LABELS = [
    'Try me out',
    'Let me book your appointment',
    'Let me tell you more about Sol',
  ];
  var START_CALL = 'Talk to Sol';
  var INTERVAL = 4000;

  function init() {
    // Belt and braces in case a page ends up with two includes.
    if (document.querySelector('elevenlabs-convai')) return;

    var widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', AGENT_ID);
    widget.setAttribute('terms-key', TERMS_KEY);

    // text-contents is an observed attribute, so rewriting it re-renders the
    // widget in place. Setting it before append means no flash of the default
    // "Need help?" label.
    function setLabel(i) {
      widget.setAttribute('text-contents', JSON.stringify({
        main_label: LABELS[i],
        start_call: START_CALL,
      }));
    }

    setLabel(0);
    document.body.appendChild(widget);

    var embed = document.createElement('script');
    embed.src = EMBED_SRC;
    embed.async = true;
    document.body.appendChild(embed);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var i = 0, timer = null, done = false;
    function stop() { clearInterval(timer); timer = null; }
    function start() {
      if (!done && !timer) {
        timer = setInterval(function () { setLabel(i = (i + 1) % LABELS.length); }, INTERVAL);
      }
    }

    // Copy that changes under the cursor is hostile, and once the call is
    // running the pitch has done its job.
    widget.addEventListener('mouseenter', stop);
    widget.addEventListener('mouseleave', start);
    widget.addEventListener('elevenlabs-convai:call', function () { done = true; stop(); });
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    start();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
