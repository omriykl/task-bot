const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const os = require("os");

const groq = new Groq();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function transcribeVoice(fileId) {
  // 1. Get file path from Telegram
  const fileResponse = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const fileData = await fileResponse.json();

  if (!fileData.ok) {
    throw new Error("Failed to get file info from Telegram");
  }

  const filePath = fileData.result.file_path;

  // 2. Download the voice file
  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const audioResponse = await fetch(downloadUrl);
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

  // 3. Save to temp file (Groq SDK needs a file path)
  const tempFile = path.join(os.tmpdir(), `voice_${Date.now()}.ogg`);
  fs.writeFileSync(tempFile, audioBuffer);

  try {
    // 4. Transcribe with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: "whisper-large-v3-turbo",
    });

    return transcription.text;
  } finally {
    // 5. Clean up temp file
    fs.unlinkSync(tempFile);
  }
}

module.exports = { transcribeVoice };
