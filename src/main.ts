import "./style.css";

interface ErrorResponse {
  error: string;
}

const news = document.getElementById("news") as HTMLTextAreaElement;
const classifyBtn = document.getElementById("submit");
const result = document.getElementById("result");
const progressBar = document.getElementById("progress") as HTMLElement;
const totalDuration = document.getElementById("totalDuration") as HTMLElement;

// Hide the progress bar
progressBar.style.display = "none";

classifyBtn?.addEventListener("click", async () => {
  // Show the progress bar
  progressBar.style.display = "block";
  // Clear the result
  result!.innerText = "";
  totalDuration!.innerText = "";

  const text = news.value;
  const classification = await getNewsClassification(text);
  console.log(classification, "classification");

  // Hide the progress bar
  progressBar.style.display = "none";
  // Set the result
  result!.innerText = classification.response;
  totalDuration!.innerText =
    "Total Duration: " + nsToTime(classification.total_duration);
});

// GET the news classification result from the server
const getNewsClassification = async (text: string) => {
  const response = await fetch(import.meta.env.VITE_LLM_URL, {
    method: "POST",
    body: JSON.stringify({
      model: "newsClassifier",
      prompt: `Classify this article: ${text}`,
      stream: false,
    }),
  });

  if (!response.body) {
    throw new Error("Missing body");
  }

  const itr = parseJSON<ErrorResponse>(response.body);

  const message = await itr.next();
  if (!message.value.done && (message.value as any).status !== "success") {
    throw new Error("Expected a completed response.");
  }
  return message.value;
};

// FROM: Ollama js library
export const parseJSON = async function* <T = unknown>(
  itr: ReadableStream<Uint8Array>
): AsyncGenerator<T> {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const reader = itr.getReader();

  while (true) {
    const { done, value: chunk } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(chunk);

    const parts = buffer.split("\n");

    buffer = parts.pop() ?? "";

    for (const part of parts) {
      try {
        yield JSON.parse(part);
      } catch (error) {
        console.warn("invalid json: ", part);
      }
    }
  }

  for (const part of buffer.split("\n").filter((p) => p !== "")) {
    try {
      yield JSON.parse(part);
    } catch (error) {
      console.warn("invalid json: ", part);
    }
  }
};

function nsToTime(duration: number) {
  const durationInSeconds = BigInt(duration) / BigInt(1e9);
  const dateObj = new Date(Number(durationInSeconds) * 1000);
  const hours = dateObj.getUTCHours();
  const minutes = dateObj.getUTCMinutes();
  const seconds = dateObj.getUTCSeconds();

  let timeString = '';
  if (hours > 0) {
    timeString += hours.toString().padStart(2, '0') + 'hr ';
  }
  if (minutes > 0) {
    timeString += minutes.toString().padStart(2, '0') + 'min ';
  }
  if (seconds > 0) {
    timeString += seconds.toString().padStart(2, '0') + 'sec';
  }

  return timeString.trim();
}
