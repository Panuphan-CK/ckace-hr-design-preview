import { describe, expect, it, vi } from "vitest";

import { SmtpEmailSender } from "./email-sender";
import { LinePushSender } from "./line-sender";

describe("LinePushSender", () => {
  it("pushes a text message with the bearer token and returns the request id", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "x-line-request-id": "req-123" } }));
    const sender = new LinePushSender("secret-token", fetcher as unknown as typeof fetch);

    await expect(sender.send({ to: "U123", title: "มีใบลารออนุมัติ", body: "รายละเอียด" })).resolves.toBe("req-123");

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.line.me/v2/bot/message/push");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret-token");
    expect(JSON.parse(init.body as string)).toEqual({
      to: "U123",
      messages: [{ type: "text", text: "มีใบลารออนุมัติ\nรายละเอียด" }],
    });
  });

  it("fails with the status only, never echoing the token", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("nope", { status: 401 }));
    const sender = new LinePushSender("secret-token", fetcher as unknown as typeof fetch);
    const error = await sender.send({ to: "U1", title: "t", body: "b" }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("LINE push failed with status 401");
    expect((error as Error).message).not.toContain("secret-token");
  });

  it("refuses to start without a token", () => {
    expect(() => new LinePushSender("  ")).toThrow("token");
  });
});

describe("SmtpEmailSender", () => {
  it("sends plain text from the company mailbox", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "<m1@mail>" });
    const sender = new SmtpEmailSender('"CKACE HR" <ckace.hr@gmail.com>', { sendMail });

    await expect(sender.send({ to: "somchai@example.com", title: "หัวข้อ", body: "เนื้อหา" })).resolves.toBe("<m1@mail>");
    expect(sendMail).toHaveBeenCalledWith({
      from: '"CKACE HR" <ckace.hr@gmail.com>',
      to: "somchai@example.com",
      subject: "หัวข้อ",
      text: "เนื้อหา",
    });
  });

  it("propagates provider errors so the event is retried", async () => {
    const sender = new SmtpEmailSender("from", { sendMail: vi.fn().mockRejectedValue(new Error("smtp down")) });

    await expect(sender.send({ to: "a@b.co", title: "t", body: "b" })).rejects.toThrow("smtp down");
  });

  it("requires credentials for the Gmail helper", () => {
    expect(() => SmtpEmailSender.gmail("", "x")).toThrow("required");
    expect(() => SmtpEmailSender.gmail("ckace.hr@gmail.com", " ")).toThrow("required");
  });
});
