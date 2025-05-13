// public/popup.js

// See manifest.json to ensure this script is loaded as popup script.

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
  
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: "GET_VIDEO_ID" }, (res) => {
        if (res?.videoId) {
          currentVideoId = res.videoId;
          fetchAndDisplaySummary();
        } else {
          summaryDisplay.innerText = "Could not retrieve video ID.";
        }
      });
    });
  
    summaryLengthEl.addEventListener("change", fetchAndDisplaySummary);
    languageEl.addEventListener("change", fetchAndDisplaySummary);
  
    function fetchAndDisplaySummary() {
      const length = summaryLengthEl.value;
      const lang = languageEl.value;
  
      summaryDisplay.innerText = "Loading...";
  
      fetch(`https://your-backend/api/summarize`, {
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
          console.error(err);
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
      fetch(`https://your-backend/api/feedback`, {
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
        .catch(err => alert("Failed to submit feedback"));
    });
  });
  