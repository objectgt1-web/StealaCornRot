
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
    const { title, category, severity, description, username, email } =
      req.body || {};

    // Require an email address
    if (
      typeof email !== "string" ||
      !email.trim() ||
      email.trim().length > 254
    ) {
      return res.status(400).json({
        success: false,
        error: "A valid email address is required."
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address."
      });
    }

    // Validate required report fields
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

    if (title.trim().length > 80 || description.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        error: "The title or description is too long."
      });
    }

    // EmailJS environment variables
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !privateKey) {
      console.error("Missing EmailJS environment variables.");

      return res.status(500).json({
        success: false,
        error: "Email service is not configured correctly."
      });
    }

    // Send the report through EmailJS
    const emailResponse = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          accessToken: privateKey,
          template_params: {
            title: title.trim(),
            category: String(category || "Other"),
            severity: String(severity || "Medium"),
            description: description.trim(),
            username: String(username || "Anonymous"),
            reply_to: email.trim(),
            email: email.trim()
          }
        })
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("EmailJS error:", errorText);

      return res.status(502).json({
        success: false,
        error: "The email could not be sent. Please try again later."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bug report emailed successfully, Check your email to see if its fixed"
    });
  } catch (error) {
    console.error("Bug report error:", error);

    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred while submitting the report."
    });
  }
}
