const hostname = window.location.hostname;
let initialized = false;

const QUICK_EDIT_ID = 'quick-edit-iframe';
const QUICK_EDIT_SRC =
  hostname != "localhost"
    ? "https://da.live/drafts/wysiwyg/init"
    : `https://main--da-live--adobe.aem.live/drafts/wysiwyg/init?nx=local&ref=local`;

function pollConnection(action) {
  initialized = false;
  let count = 0;
  const interval = setInterval(() => {
    count += 1;
    if (initialized || count > 20) {
      clearInterval(interval);
      return;
    }
    action?.();
  }, 500);
}

function handleLoad({ target, config }) {
  const CHANNEL = new MessageChannel();
  const { port1, port2 } = CHANNEL;

  target.contentWindow.postMessage({ init: config }, "*", [port2]);

  port1.onmessage = (e) => {
    console.log("quick-edit message received", e.data);
  };
}

export default async function loadQuickEdit({ detail: payload }) {
  if (document.getElementById(QUICK_EDIT_ID)) return;

  console.log("quick-edit", payload);
  const iframe = document.createElement("iframe");
  iframe.id = QUICK_EDIT_ID;
  iframe.src = QUICK_EDIT_SRC;
  iframe.allow = "clipboard-write *";

  pollConnection(() => {
    handleLoad({ target: iframe, config: payload.config });
  });
  document.body.append(iframe);
}
