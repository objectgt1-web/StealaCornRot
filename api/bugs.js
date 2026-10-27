
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      title,
      category,
      severity,
      description,
      username,
      email
    } = req.body || {};

    if (
      typeof title !== "string" ||
      typeof description !== "string" ||
      !title.trim() ||
      !description.trim()
    ) {
      return res.status(400).json({
        error: "Enter a title and description."
      });
    }

    if (title.length > 120 || description.length > 4000) {
      return res.status(400).json({
        error: "Report is too long."
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.BUG_REPORT_EMAIL;
    const sender = process.env.BUG_REPORT_FROM;

    if (!apiKey || !recipient || !sender) {
      return res.status(500).json({
        error: "Email settings are missing."
      });
    }

    const safe = (v, max = 500) =>
      typeof v === "string" ? v.trim().slice(0, max) : "Not provided";

    const playerEmail =
      typeof email === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? email.trim()
        : "";

    const report = [
      "New Steal a Cornrot bug report!",
      "",
      `Title: ${safe(title, 120)}`,
      `Category: ${safe(category, 80)}`,
      `Severity: ${safe(severity, 40)}`,
      `Roblox username: ${safe(username, 80)}`,
      `Player email: ${playerEmail || "Not provided"}`,
      "",
      "Description:",
      safe(description, 4000)
    ].join("\n");

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient],
          subject: `Bug Report: ${safe(title, 100)}`,
          text: report,
          ...(playerEmail ? { reply_to: playerEmail } : {})
        })
      }
    );

    if (!response.ok) {
      console.error("Resend error:", await response.text());
      return res.status(502).json({
        error: "Email failed. Check your Resend settings."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bug report sent!, check your email to see if its fixed"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Something went wrong."
    });
  }
};
