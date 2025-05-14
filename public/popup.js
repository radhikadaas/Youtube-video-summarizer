// public/popup.js

document.addEventListener("DOMContentLoaded", () => {
  const summaryLengthEl = document.getElementById("summary-length");
  const languageEl = document.getElementById("language-selection");
  const summaryDisplay = document.getElementById("summary-display");
  const highlightsList = document.getElementById("highlights-list");
  const keywordsList = document.getElementById("keywords-list");
  const questionsList = document.getElementById("questions-list");
  const playBtn = document.getElementById("play-voice-summary");
  const downloadBtn = document.getElementById("download-summary");
  const feedbackInput = document.getElementById("feedback-input");
  const upvoteBtn = document.getElementById("upvote");
  const downvoteBtn = document.getElementById("downvote");
  const submitBtn = document.getElementById("submit-feedback");

  let currentSummary = "";
  let currentVideoId = "";
  let feedbackState = null;

  // fallback: manually extract videoId from URL if Chrome extension messaging fails
  function extractVideoIdFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("v") || "";
    } catch (err) {
      return "";
    }
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || "";
    const videoId = extractVideoIdFromUrl(url);
    if (videoId) {
      currentVideoId = videoId;
      fetchAndDisplaySummary();
    } else {
      summaryDisplay.innerText = "Could not retrieve video ID.";
    }
  });

  summaryLengthEl.addEventListener("change", fetchAndDisplaySummary);
  languageEl.addEventListener("change", fetchAndDisplaySummary);

  function fetchAndDisplaySummary() {
    const length = summaryLengthEl.value;
    const lang = languageEl.value;

    summaryDisplay.innerText = "Loading...";

    fetch("https://youtube-video-summarizer-gh8g.onrender.com/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: currentVideoId, length, lang })
    })
      .then(res => res.json())
      .then(data => {
        currentSummary = data.summary;
        summaryDisplay.innerText = data.summary;
        highlightsList.innerHTML = data.highlights?.map(h => `<div>${h.time} - ${h.text}</div>`).join("") || "No highlights.";
        keywordsList.innerText = data.keywords?.join(", ") || "No keywords.";
        questionsList.innerHTML = data.questions?.map(q => `<li>${q}</li>`).join("") || "No questions generated.";
      })
      .catch(err => {
        summaryDisplay.innerText = "Error generating summary.";
        console.error("Summary Fetch Error:", err);
      });
  }

  playBtn.addEventListener("click", () => {
    if (!currentSummary) return;
    const utterance = new SpeechSynthesisUtterance(currentSummary);
    utterance.lang = languageEl.value || "en";
    speechSynthesis.speak(utterance);
  });

  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([currentSummary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: "summary.txt" });
  });

  upvoteBtn.addEventListener("click", () => feedbackState = true);
  downvoteBtn.addEventListener("click", () => feedbackState = false);

  submitBtn.addEventListener("click", () => {
    if (feedbackState === null) {
      alert("Please click 👍 or 👎 before submitting feedback.");
      return;
    }

    fetch("https://youtube-video-summarizer-gh8g.onrender.com/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: currentVideoId,
        like: feedbackState,
        comment: feedbackInput.value
      })
    })
      .then(res => res.json())
      .then(() => alert("Feedback submitted!"))
      .catch(err => {
        console.error("Feedback Error:", err);
        alert("Failed to submit feedback");
      });
  });
});
