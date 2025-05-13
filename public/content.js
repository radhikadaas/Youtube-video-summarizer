// public/content.js

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_VIDEO_ID") {
      const url = window.location.href;
      const match = url.match(/v=([\\w-]{11})/);
      const videoId = match ? match[1] : null;
      sendResponse({ videoId });
    }
  });
  