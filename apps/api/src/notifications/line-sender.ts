import type { NotificationSender } from "@ckace/database";

/** LINE Messaging API push (text). The channel access token comes from the runtime secret configuration. */
export class LinePushSender implements NotificationSender {
  readonly channel = "LINE" as const;

  constructor(
    private readonly accessToken: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!accessToken.trim()) {
      throw new Error("LINE channel access token is required");
    }
  }

  async send(input: { readonly to: string; readonly title: string; readonly body: string }): Promise<string | null> {
    const response = await this.fetcher("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        to: input.to,
        messages: [{ type: "text", text: `${input.title}\n${input.body}`.slice(0, 4900) }],
      }),
    });

    if (!response.ok) {
      throw new Error(`LINE push failed with status ${response.status}`);
    }

    return response.headers.get("x-line-request-id");
  }
}
