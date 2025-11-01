// utils/
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const UPLOAD_URL = process.env.TRANSCRIPT_UPLOAD_URL; // POST target
const HOST_BASE = process.env.TRANSCRIPT_HOST_BASE || ""; // used to attempt delete
const EXPIRE_MINUTES = parseInt(process.env.TRANSCRIPT_EXPIRE_MINUTES || "30", 10);

if (!UPLOAD_URL) {
  console.warn("⚠️ TRANSCRIPT_UPLOAD_URL not set — transcript upload will fail until configured.");
}

/**
 * Upload a file buffer or path to your host (multipart 'file').
 * Accepts { buffer, filename } OR { filepath }.
 * Returns { success, fileUrl, error }.
 */
async function uploadTranscript({ buffer, filename, filepath }) {
  try {
    if (!UPLOAD_URL) throw new Error("TRANSCRIPT_UPLOAD_URL not configured");

    const form = new FormData();

    if (filepath) {
      form.append("file", fs.createReadStream(filepath));
    } else if (buffer && filename) {
      form.append("file", buffer, { filename });
    } else {
      throw new Error("No data to upload");
    }

    const resp = await axios.post(UPLOAD_URL, form, {
      headers: { ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 5 * 60 * 1000, // 5 minutes upload timeout
    });

    // Try several expected response shapes
    const data = resp?.data;
    const fileUrl = data?.fileUrl || data?.file_url || data?.url || data?.file || null;

    if (!fileUrl) {
      // if upload endpoint returns the path only, try to build with HOST_BASE
      if (data?.filename && HOST_BASE) {
        return { success: true, fileUrl: `${HOST_BASE}/files/${data.filename}` };
      }
      // Return entire response as fallback
      return { success: true, fileUrl: typeof data === "string" ? data : JSON.stringify(data) };
    }

    // Schedule deletion attempt after EXPIRE_MINUTES
    scheduleDelete(fileUrl, EXPIRE_MINUTES);

    return { success: true, fileUrl };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Attempt to delete the file at fileUrl after `minutes`.
 * This function will attempt an HTTP DELETE to the file URL.
 * If the host doesn't support DELETE, this will fail silently.
 */
function scheduleDelete(fileUrl, minutes = EXPIRE_MINUTES) {
  if (!fileUrl) return;
  const ms = Math.max(1, minutes) * 60 * 1000;
  setTimeout(async () => {
    try {
      // Try DELETE
      await axios.delete(fileUrl, { timeout: 20_000 });
      console.log(`🗑️ Deleted transcript: ${fileUrl}`);
    } catch (e) {
      // If direct DELETE fails, try deleting via host base path (if available)
      try {
        if (HOST_BASE) {
          // If fileUrl is a full URL and contains the filename, attempt to extract path
          const url = new URL(fileUrl);
          const possible = `${HOST_BASE}${url.pathname}`;
          await axios.delete(possible, { timeout: 20_000 });
          console.log(`🗑️ Deleted transcript (alt): ${possible}`);
        }
      } catch (e2) {
        console.warn(`⚠️ Could not auto-delete ${fileUrl} — host may not support DELETE.`);
      }
    }
  }, ms);
}

module.exports = { uploadTranscript, scheduleDelete };
