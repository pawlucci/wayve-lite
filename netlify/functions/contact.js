export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { name, email, phone, message, source } = body;

  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contactGroupId = process.env.MAILERLITE_CONTACT_GROUP_ID || "177151137491716042";
  const newsletterGroupId = process.env.MAILERLITE_NEWSLETTER_GROUP_ID;
  const groupId = source === "newsletter" ? newsletterGroupId : contactGroupId;

  if (!groupId) {
    console.error("MailerLite group ID missing for source:", source || "contact");
    return new Response(JSON.stringify({ error: "MailerLite group is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fields = {};
  if (name) fields.name = name;
  if (phone) fields.phone = phone;
  if (source !== "newsletter" && message) fields.message = message;

  const payload = {
    email,
    groups: [groupId],
    ...(Object.keys(fields).length ? { fields } : {}),
  };

  const mlRes = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!mlRes.ok) {
    const err = await mlRes.text();
    console.error("MailerLite error:", err);
    return new Response(JSON.stringify({ error: "MailerLite error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/contact" };
