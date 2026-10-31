
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
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
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.trim().length > 254
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address."
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Bug title and description are required."
      });
    }

    if (
      title.trim().length > 80 ||
      description.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        error: "The title or description is too long."
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.BUG_REPORT_EMAIL;
    const sender = process.env.BUG_REPORT_FROM;

    if (!apiKey || !recipient || !sender) {
      console.error("Missing Resend environment variables.");

      return res.status(500).json({
        success: false,
        error: "Email service is not configured correctly."
      });
    }

    const clean = (value) =>
      String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);

    const report = {
      title: title.trim(),
      category: String(category || "Other"),
      severity: String(severity || "Medium"),
      description: description.trim(),
      username: String(username || "Anonymous"),
      email: email.trim()
    };

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient],
          reply_to: report.email,
          subject: `New Bug Report: ${report.title}`,
          text: `
New bug report

Title: ${report.title}
Category: ${report.category}
Severity: ${report.severity}
Username: ${report.username}
Email: ${report.email}

Description:
${report.description}
          `,
          html: `
            <h2>New Bug Report</h2>
            <p><b>Title:</b> ${clean(report.title)}</p>
            <p><b>Category:</b> ${clean(report.category)}</p>
            <p><b>Severity:</b> ${clean(report.severity)}</p>
            <p><b>Username:</b> ${clean(report.username)}</p>
            <p><b>Email:</b> ${clean(report.email)}</p>
            <h3>Description</h3>
            <p>${clean(report.description).replace(/\n/g, "<br>")}</p>
          `
        })
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend error:", errorText);

      return res.status(502).json({
        success: false,
        error: "The email could not be sent. Please try again later."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bug report emailed successfully!"
    });

  } catch (error) {
    console.error("Bug report error:", error);

    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred."
    });
  }
}
