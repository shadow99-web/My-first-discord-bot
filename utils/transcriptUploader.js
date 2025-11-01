const axios = require("axios");
const FormData = require("form-data");

// 🌍 Replace this with your Galactic Hosting server upload URL:
const UPLOAD_URL = "http://us6.galactichosting.net:30028/upload";

async function uploadTranscript({ buffer, filename }) {
  try {
    const form = new FormData();
    form.append("file", buffer, filename);

    const res = await axios.post(UPLOAD_URL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return {
      success: true,
      fileUrl: res.data.fileUrl || null,
    };
  } catch (err) {
    console.error("❌ Upload failed:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = { uploadTranscript };
