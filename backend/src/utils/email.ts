import nodemailer from "nodemailer";

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetUrl: string
) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST!,
    port: Number(process.env.EMAIL_PORT!),
    secure: false, // TLS STARTTLS (Gmail uses port 587)
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASSWORD!,
    },
  });

  const html = `
    <p>Hello ${name},</p>
    <p>You requested a password reset. Click the link below:</p>
    <a href="${resetUrl}" target="_blank">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Password Reset Request",
    html,
  };

  await transporter.sendMail(mailOptions);
};
