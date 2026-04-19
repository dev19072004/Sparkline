import net from "node:net";
import { spawn } from "node:child_process";
import tls from "node:tls";

const defaultSendmailPath = process.env.SENDMAIL_PATH || "/usr/sbin/sendmail";

const smtpConfig = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true").toLowerCase() !== "false",
  user: process.env.SMTP_USER || process.env.MAIL_FROM || "",
  pass: process.env.SMTP_PASS || ""
};

const fromAddress =
  process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@sparkline.local";

const escapeSmtpBody = (value) =>
  String(value || "")
    .replace(/\r?\n/g, "\r\n")
    .replace(/^\./gm, "..");

const waitForSmtpResponse = (socket) =>
  new Promise((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1];

      if (!lastLine || !/^\d{3} /.test(lastLine)) {
        return;
      }

      cleanup();
      resolve(buffer);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed unexpectedly"));
    };

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });

const parseSmtpCode = (response) => {
  const lines = String(response || "").trim().split(/\r?\n/).filter(Boolean);
  const lastLine = lines[lines.length - 1] || "";
  return Number(lastLine.slice(0, 3));
};

const sendSmtpCommand = async (socket, command, expectedCodes) => {
  if (command) {
    socket.write(`${command}\r\n`);
  }

  const response = await waitForSmtpResponse(socket);
  const responseCode = parseSmtpCode(response);

  if (!expectedCodes.includes(responseCode)) {
    throw new Error(`SMTP error: ${response.trim()}`);
  }

  return response;
};

const connectSmtpSocket = async () => {
  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    throw new Error("SMTP is not fully configured");
  }

  const openSocket = () =>
    new Promise((resolve, reject) => {
      const socket = smtpConfig.secure
        ? tls.connect({
            host: smtpConfig.host,
            port: smtpConfig.port,
            servername: smtpConfig.host
          })
        : net.connect({
            host: smtpConfig.host,
            port: smtpConfig.port
          });

      const onError = (error) => {
        socket.destroy();
        reject(error);
      };
      const readyEvent = smtpConfig.secure ? "secureConnect" : "connect";

      socket.once("error", onError);
      socket.once(readyEvent, () => {
        socket.off("error", onError);
        resolve(socket);
      });
    });

  const socket = await openSocket();
  await sendSmtpCommand(socket, "", [220]);
  await sendSmtpCommand(socket, "EHLO sparklineindia.com", [250]);

  if (!smtpConfig.secure) {
    await sendSmtpCommand(socket, "STARTTLS", [220]);
    const upgradedSocket = await new Promise((resolve, reject) => {
      const tlsSocket = tls.connect({
        socket,
        servername: smtpConfig.host
      });

      tlsSocket.once("error", reject);
      tlsSocket.once("secureConnect", () => resolve(tlsSocket));
    });

    await sendSmtpCommand(upgradedSocket, "EHLO sparklineindia.com", [250]);
    return upgradedSocket;
  }

  return socket;
};

const sendViaSmtp = async ({ to, subject, html, text }) => {
  const socket = await connectSmtpSocket();

  try {
    await sendSmtpCommand(socket, "AUTH LOGIN", [334]);
    await sendSmtpCommand(
      socket,
      Buffer.from(smtpConfig.user).toString("base64"),
      [334]
    );
    await sendSmtpCommand(
      socket,
      Buffer.from(smtpConfig.pass).toString("base64"),
      [235]
    );
    await sendSmtpCommand(socket, `MAIL FROM:<${fromAddress}>`, [250]);
    await sendSmtpCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
    await sendSmtpCommand(socket, "DATA", [354]);

    const body = escapeSmtpBody(html || text || "");
    socket.write(`From: ${fromAddress}\r\n`);
    socket.write(`To: ${to}\r\n`);
    socket.write(`Subject: ${subject}\r\n`);
    socket.write("MIME-Version: 1.0\r\n");
    socket.write("Content-Type: text/html; charset=UTF-8\r\n");
    socket.write("\r\n");
    socket.write(body);
    socket.write("\r\n.\r\n");
    await sendSmtpCommand(socket, "", [250]);
    await sendSmtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
};

const sendViaSendmail = ({ to, subject, html, text }) =>
  new Promise((resolve, reject) => {
    const child = spawn(defaultSendmailPath, ["-t", "-i"]);
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `sendmail exited with non-zero status ${code}`));
    });

    child.stdin.write(`From: ${fromAddress}\n`);
    child.stdin.write(`To: ${to}\n`);
    child.stdin.write(`Subject: ${subject}\n`);
    child.stdin.write("MIME-Version: 1.0\n");
    child.stdin.write("Content-Type: text/html; charset=UTF-8\n");
    child.stdin.write("\n");
    child.stdin.write(html || text || "");
    child.stdin.end();
  });

export const sendEmail = async (payload) => {
  if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
    await sendViaSmtp(payload);
    return;
  }

  await sendViaSendmail(payload);
};
