import { getSession } from "next-auth/react"

export interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  status: "active" | "inactive" | "suspended";
  postsCount: number;
  commentsCount: number;
  verified: boolean;
  joinDate: string;
  education?: string;
  work?: string;
  anonymousId?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: number;
  posts: number;
  verified: boolean;
  createdAt: string;
  moderationStatus?: string;
  moderationMode?: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  targetType?: string;
  targetValue?: string | null;
  mediaUrl?: string | null;
  targetGroup: string;
  sentAt: string;
  deliveredCount: number;
}

export interface GhostPost {
  id: string;
  content: string;
  author: string;
  likes: number;
  comments: number;
  createdAt: string;
}

export interface FOMOWindow {
  id: string;
  name: string;
  status: "active" | "scheduled" | "ended" | "disabled";
  startDate: string;
  endDate: string;
  postsCreated: number;
  usersParticipated: number;
}

export interface ContentFlag {
  id: string;
  postId: string;
  content: string;
  contentFull?: string;
  media?: Array<{ type: string; url: string; thumbnailUrl?: string }>;
  reason: string;
  flaggedAt: string;
  status: "pending" | "reviewed" | "hidden";
  author: string;
  authorFlaggedCount?: number;
}

export interface AICampaign {
  id: string;
  name: string;
  type: "engagement" | "posts" | "comments";
  status: "active" | "paused" | "completed";
  interactions: number;
  reach: number;
  startedAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description?: string;
  attachments?: string[];
  user: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VerificationRequest {
  id: string;
  displayName: string;
  email: string;
  type: string;
  submittedAt: string;
  status: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  contentType: "text" | "image" | "video" | "audio";
  contentText?: string;
  mediaUrl?: string;
  linkUrl?: string;
  placement?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  status: string;
  startTime?: string;
  endTime?: string;
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    reports: number;
    reposts: number;
  };
}

export interface DashboardSummary {
  totals: {
    users: number;
    onlineNow: number;
    verifiedAccounts: number;
    ghostPosts24h: number;
    flaggedContent: number;
  };
  topActiveUsers: Array<{
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    posts: number;
    comments: number;
    interactions: number;
  }>;
  aiEngagementToday: {
    comments: number;
    likes: number;
    replies: number;
  };
  fomoStatus:
    | {
        isActive: true;
        windowId: string;
        title: string;
        startTime: string;
        endTime: string;
        remainingMs: number;
        stats: { postCount: number; participantCount: number };
      }
    | { isActive: false };
  flaggedExplicitContent: {
    total: number;
    hiddenUnder18: number;
    escalated: number;
  };
}

export interface GhostSummary {
  totalGhostPosts: number;
  activeThisHour: number;
  avgEngagement: number;
}

export interface GhostInsights {
  breakdown: {
    textPosts: number;
    imagePosts: number;
    videoPosts: number;
    audioPosts: number;
  };
  flagged: Array<{
    id: string;
    contentPreview: string;
    ghostName: string | null;
    reportCount: number;
    reasons: string[];
    flaggedAt: string;
  }>;
}

export interface GhostNameEntry {
  name: string;
  username: string;
  school: string;
  work: string;
  status: "available" | "reserved" | "restricted";
  restricted: boolean;
  reserved: boolean;
}

export interface VerificationStats {
  pending: number;
  approved30d: number;
  rejected30d: number;
}

export interface AdSummary {
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  totalSpend: number;
  totalViews?: number;
  totalReports?: number;
}

export interface SecuritySummary {
  sslStatus: string;
  sslValidUntil: string | null;
  rateLimitStatus: string;
  twoFaAdoptionPercent: number;
  failedLogins24h: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const getAuthToken = async () => {
  if (typeof window === "undefined") return "";
  const localToken =
    window.localStorage.getItem("adminToken") ||
    window.localStorage.getItem("token") ||
    "";
  if (localToken) return localToken;

  const session = await getSession();
  if (session?.accessToken) {
    window.localStorage.setItem("adminToken", session.accessToken);
    return session.accessToken;
  }
  return "";
};

const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || "Request failed";
    throw new Error(message);
  }

  return payload as T;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiRequest<{ data: DashboardSummary }>(
    "/dashboard/summary"
  );
  return response.data;
}

export async function getUsers(
  page = 1,
  limit = 10,
  search?: string,
  status?: string
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  if (status && status !== "all") {
    const mappedStatus = status === "reviewed" ? "approved" : status === "hidden" ? "removed" : status;
    params.set("status", mappedStatus);
  }

  const response = await apiRequest<{
    data: User[];
    pagination: { total: number; page: number; limit: number };
  }>(`/user/admin/users?${params.toString()}`);

  const mappedUsers = response.data.map((user) => ({
    ...user,
    joinDate: new Date(user.joinDate).toISOString().split("T")[0],
  }));

  return {
    users: mappedUsers,
    total: response.pagination.total,
    page: response.pagination.page,
    limit: response.pagination.limit,
  };
}

export async function getUserProfile(userId: string) {
  const response = await apiRequest<{ data: any }>(`/user/user-details/${userId}`);
  const user = response.data;
  return {
    id: user.id || user._id || userId,
    username: user.username || user.displayName || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    education: user.education || "",
    work: user.work || "",
    anonymousId: user.anonymousId || "",
    verified: !!user.isVerified,
    joinDate: user.createdAt ? new Date(user.createdAt).toISOString().split("T")[0] : "",
  };
}

export async function updateUserStatus(
  userId: string,
  payload: { action: string; reason?: string; suspendedUntil?: string }
) {
  return apiRequest(`/user/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getGroups(page = 1, limit = 10, search?: string) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);

  const response = await apiRequest<{
    data: Array<{
      id: string;
      name: string;
      description: string;
      members: number;
      posts: number;
      isVerified: boolean;
      createdAt: string;
    }>;
    pagination: { total: number; page: number; limit: number };
  }>(`/group/admin/groups?${params.toString()}`);

  return {
    groups: response.data.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.members,
      posts: group.posts,
      verified: group.isVerified,
      moderationStatus: (group as any).moderationStatus || "active",
      moderationMode: (group as any).moderationMode || "full",
      createdAt: new Date(group.createdAt).toISOString().split("T")[0],
    })),
    total: response.pagination.total,
    page: response.pagination.page,
    limit: response.pagination.limit,
  };
}

export async function getGroupDetails(id: string) {
  const response = await apiRequest<{
    data: {
      id: string;
      name: string;
      description: string;
      visibility: string;
      isVerified: boolean;
      members: number;
      posts: number;
      createdAt: string;
      updatedAt: string;
      avatarUrl?: string;
    };
  }>(`/group/admin/groups/${id}`);

  const group = response.data;
  return {
    ...group,
    createdAt: new Date(group.createdAt).toISOString().split("T")[0],
    updatedAt: new Date(group.updatedAt).toISOString().split("T")[0],
  };
}

export async function updateGroup(
  id: string,
  payload: { name?: string; description?: string; visibility?: string; isVerified?: boolean }
) {
  return apiRequest(`/group/admin/groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateGroupModeration(
  id: string,
  payload: { status?: "active" | "restricted" | "suspended"; mode?: "full" | "chat_only"; note?: string }
) {
  return apiRequest(`/group/admin/groups/${id}/moderation`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function messageGroup(id: string, message: string) {
  return apiRequest(`/group/admin/groups/${id}/message`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function deleteGroup(id: string) {
  return apiRequest(`/group/admin/groups/${id}`, { method: "DELETE" });
}

export async function getNotifications(page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await apiRequest<{
    data: Array<{
      id: string;
      title: string;
      content: string;
      targetGroup: string;
      deliveredCount: number;
      createdAt: string;
    }>;
  }>(`/admin-notifications/admin?${params.toString()}`);

  return response.data.map((notif) => ({
    id: notif.id,
    title: notif.title,
    content: notif.content,
    targetType: (notif as any).targetType || notif.targetGroup,
    targetValue: (notif as any).targetValue || null,
    mediaUrl: (notif as any).mediaUrl || null,
    targetGroup: notif.targetGroup,
    deliveredCount: notif.deliveredCount,
    sentAt: new Date(notif.createdAt).toISOString().split("T")[0],
  }));
}

export async function sendNotification(notification: {
  title: string;
  content: string;
  targetType?: string;
  targetValue?: string;
  mediaUrl?: string;
  targetGroup?: string;
}) {
  const payload = {
    ...notification,
    targetGroup: notification.targetGroup || notification.targetType || "all",
  };
  const response = await apiRequest<{ data: { id: string } }>(
    "/admin-notifications/admin",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return response.data;
}

export async function getGhostSummary(): Promise<GhostSummary> {
  const response = await apiRequest<{ data: GhostSummary }>(
    "/ghost/admin/summary"
  );
  return response.data;
}

export async function getGhostPosts(page = 1, limit = 10) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await apiRequest<{
    data: Array<{
      id: string;
      contentPreview: string;
      author: string | null;
      likes: number;
      comments: number;
      createdAt: string;
    }>;
    pagination: { total: number; page: number; limit: number };
  }>(`/ghost/admin/posts?${params.toString()}`);

  return {
    posts: response.data.map((post) => ({
      id: post.id,
      content: post.contentPreview,
      author: post.author || "Ghost",
      likes: post.likes,
      comments: post.comments,
      createdAt: new Date(post.createdAt).toISOString().split("T")[0],
    })),
    total: response.pagination.total,
    page: response.pagination.page,
    limit: response.pagination.limit,
  };
}

export async function getGhostInsights(): Promise<GhostInsights> {
  const response = await apiRequest<{ data: any }>("/ghost/admin/insights");
  const data = response.data;
  return {
    breakdown: data.breakdown || { textPosts: 0, imagePosts: 0, videoPosts: 0, audioPosts: 0 },
    flagged: Array.isArray(data.flagged)
      ? data.flagged.map((item: any) => ({
          id: item.id,
          contentPreview: item.contentPreview || "",
          ghostName: item.ghostName || null,
          reportCount: item.reportCount || 0,
          reasons: item.reasons || [],
          flaggedAt: item.flaggedAt ? new Date(item.flaggedAt).toISOString().split("T")[0] : "",
        }))
      : [],
  };
}

export async function getGhostNames(): Promise<GhostNameEntry[]> {
  const response = await apiRequest<{ data: GhostNameEntry[] }>("/ghost/admin/names");
  return response.data;
}

export async function updateGhostNameStatus(name: string, status: GhostNameEntry["status"]) {
  return apiRequest(`/ghost/admin/names/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getFOMOWindows() {
  const response = await apiRequest<{
    data: Array<{
      id: string;
      title: string;
      description?: string;
      status: "active" | "scheduled" | "ended" | "disabled";
      startTime: string;
      endTime: string;
      stats: { postCount: number; participantCount: number };
    }>;
  }>("/fomo/admin/windows");

  return response.data.map((window) => ({
    id: window.id,
    name: window.title,
    status: window.status,
    startDate: new Date(window.startTime).toISOString().split("T")[0],
    endDate: new Date(window.endTime).toISOString().split("T")[0],
    postsCreated: window.stats?.postCount || 0,
    usersParticipated: window.stats?.participantCount || 0,
    description: window.description || "",
  }));
}

export async function createFOMOWindow(payload: {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  maxPostsPerUser?: number | null;
}) {
  return apiRequest("/fomo/admin/windows", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFOMOWindow(
  id: string,
  payload: { title?: string; description?: string; startTime?: string; endTime?: string; maxPostsPerUser?: number | null }
) {
  return apiRequest(`/fomo/admin/windows/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteFOMOWindow(id: string) {
  return apiRequest(`/fomo/admin/windows/${id}`, {
    method: "DELETE",
  });
}

export async function getFOMOWindowAnalytics(id: string) {
  return apiRequest(`/fomo/admin/windows/${id}/analytics`);
}

export async function getContentFlags(page = 1, limit = 10, status?: string) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status && status !== "all") {
    const mappedStatus = status === "reviewed" ? "approved" : status === "hidden" ? "removed" : status;
    params.set("status", mappedStatus);
  }

  const response = await apiRequest<{
    data: Array<{
      id: string;
      postId: string;
      contentPreview: string;
      contentFull?: string;
      media?: Array<{ type: string; url: string; thumbnailUrl?: string }>;
      reason: string;
      author: { username?: string; displayName?: string } | null;
      authorFlaggedCount?: number;
      status: string;
      displayStatus?: string;
      createdAt: string;
    }>;
    pagination: { total: number; page: number; limit: number };
  }>(`/moderation/queue?${params.toString()}`);

  return {
    flags: response.data.map((flag) => ({
      id: flag.id,
      postId: flag.postId,
      content: flag.contentPreview,
      contentFull: flag.contentFull || flag.contentPreview,
      media: flag.media || [],
      reason: flag.reason,
      flaggedAt: new Date(flag.createdAt).toISOString().split("T")[0],
      status: (flag.displayStatus || flag.status || "pending") as ContentFlag["status"],
      author: flag.author?.username || flag.author?.displayName || "-",
      authorFlaggedCount: flag.authorFlaggedCount || 0,
    })),
    total: response.pagination.total,
    page: response.pagination.page,
    limit: response.pagination.limit,
  };
}

export async function reviewContent(flagId: string, action: "approve" | "hide") {
  const status = action === "approve" ? "approved" : "removed";
  return apiRequest("/moderation/status", {
    method: "PATCH",
    body: JSON.stringify({ postId: flagId, status }),
  });
}

export async function getAICampaigns() {
  const response = await apiRequest<{ data: AICampaign[] }>("/ai-campaigns");
  return response.data.map((campaign) => ({
    ...campaign,
    startedAt: new Date(campaign.startedAt).toISOString().split("T")[0],
  }));
}

export async function createAICampaign(campaign: {
  name: string;
  type: AICampaign["type"];
  status: AICampaign["status"];
}) {
  return apiRequest("/ai-campaigns", {
    method: "POST",
    body: JSON.stringify(campaign),
  });
}

export async function updateAICampaignStatus(id: string, status: AICampaign["status"]) {
  return apiRequest(`/ai-campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteAICampaign(id: string) {
  return apiRequest(`/ai-campaigns/${id}`, { method: "DELETE" });
}

export async function getSupportTickets(page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await apiRequest<{
    data: Array<{
      _id: string;
      subject: string;
      status: string;
      priority: string;
      createdAt: string;
      user?: { displayName?: string; email?: string };
    }>;
    pagination: { total: number; page: number; limit: number };
  }>(`/support-ticket/admin/all-tickets?${params.toString()}`);

  return {
    tickets: response.data.map((ticket) => ({
      id: ticket._id,
      subject: ticket.subject,
      status: ticket.status || "open",
      priority: ticket.priority || "medium",
      createdAt: new Date(ticket.createdAt).toISOString().split("T")[0],
      user: ticket.user?.displayName || ticket.user?.email || "Unknown",
    })),
    total: response.pagination.total,
    page: response.pagination.page,
    limit: response.pagination.limit,
  };
}

export async function updateSupportTicketStatus(payload: {
  ticketId: string;
  status?: string;
  priority?: string;
}) {
  return apiRequest("/support-ticket/admin/update-status", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getVerificationRequests(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", "100");

  const response = await apiRequest<{
    data: Array<{
      id: string;
      email: string;
      displayName: string;
      createdAt: string;
      status: string;
      id_front?: string;
      id_back?: string;
      selfie?: string;
      reason?: string;
    }>;
  }>(`/verification/admin/requests?${params.toString()}`);

  return response.data.map((request) => ({
    id: request.id,
    displayName: request.displayName || "-",
    email: request.email,
    type: "Verification Badge",
    submittedAt: new Date(request.createdAt).toISOString().split("T")[0],
    status: request.status,
    documents: {
      id_front: request.id_front,
      id_back: request.id_back,
      selfie: request.selfie,
    },
    reason: request.reason,
  }));
}

export async function getVerificationStats(): Promise<VerificationStats> {
  const response = await apiRequest<{ data: VerificationStats }>(
    "/verification/admin/stats"
  );
  return response.data;
}

export async function updateVerificationRequest(payload: {
  id: string;
  status: "approved" | "rejected" | "processing" | "pending";
  reason?: string;
}) {
  return apiRequest(`/verification/admin/requests/${payload.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: payload.status, reason: payload.reason }),
  });
}

export async function getAdSummary(): Promise<AdSummary> {
  const response = await apiRequest<{ data: AdSummary }>("/ads/summary");
  return response.data;
}

export async function getAdCampaigns(): Promise<AdCampaign[]> {
  const response = await apiRequest<{ data: AdCampaign[] }>("/ads/campaigns");
  return response.data.map((campaign) => ({
    ...campaign,
    startTime: campaign.startTime ? new Date(campaign.startTime).toISOString() : undefined,
    endTime: campaign.endTime ? new Date(campaign.endTime).toISOString() : undefined,
  }));
}

export async function createAdCampaign(payload: {
  name: string;
  contentType: AdCampaign["contentType"];
  contentText?: string;
  mediaUrl?: string;
  linkUrl?: string;
  startTime?: string;
  endTime?: string;
  placement?: string;
  allowedUserIds?: string[];
  allowedGroupIds?: string[];
  spend?: number;
}) {
  return apiRequest("/ads/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdCampaignStatus(id: string, status: string) {
  return apiRequest(`/ads/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteAdCampaign(id: string) {
  return apiRequest(`/ads/campaigns/${id}`, { method: "DELETE" });
}

export async function getSecuritySummary(): Promise<SecuritySummary> {
  const response = await apiRequest<{ data: SecuritySummary }>(
    "/security/summary"
  );
  return response.data;
}

export async function getVerificationRequestDetails(id: string) {
  const response = await apiRequest<{ data: {
    id: string;
    avatar?: string;
    email: string;
    displayName: string;
    id_front?: string;
    id_back?: string;
    selfie?: string;
    status: string;
    reason?: string;
    createdAt: string;
    updatedAt: string;
  } }>(`/verification/admin/requests/${id}`);
  return response.data;
}
