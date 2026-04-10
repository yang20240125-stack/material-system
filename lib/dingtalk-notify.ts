import { getAccessToken } from "./dingtalk";
import { prisma } from "./prisma";

interface NotifyOptions {
  userId: string;
  title: string;
  content: string;
}

async function getAgentId(): Promise<string> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { configKey: "dingtalk_agent_id" },
    });
    return row?.configValue || process.env.DINGTALK_AGENT_ID || "";
  } catch {
    return process.env.DINGTALK_AGENT_ID || "";
  }
}

async function sendWorkNotification({ userId, title, content }: NotifyOptions) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dingtalk_userid: true },
    });

    if (!user?.dingtalk_userid) return;

    const accessToken = await getAccessToken();
    const agentId = await getAgentId();

    if (!agentId) {
      console.warn("DingTalk agent_id not configured, skipping notification");
      return;
    }

    const res = await fetch(
      `https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          userid_list: user.dingtalk_userid,
          msg: {
            msgtype: "oa",
            oa: {
              head: { text: title, bgcolor: "FF4A90E2" },
              body: {
                title,
                content,
              },
            },
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("DingTalk notification failed:", res.status);
    }
  } catch (error) {
    console.error("DingTalk notification error:", error);
  }
}

export async function notifyClaimSuccess(
  userId: string,
  itemName: string,
  quantity: number
) {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  await sendWorkNotification({
    userId,
    title: "物资领取成功",
    content: `物资：${itemName}\n数量：${quantity}\n时间：${now}`,
  });
}

export async function notifyAssignment(
  targetUserId: string,
  itemName: string,
  quantity: number,
  adminName: string
) {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  await sendWorkNotification({
    userId: targetUserId,
    title: "特殊物资分配通知",
    content: `物资：${itemName}\n数量：${quantity}\n分配人：${adminName}\n时间：${now}`,
  });
}
