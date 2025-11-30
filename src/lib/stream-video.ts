import { StreamClient, StreamVideoClient } from "@stream-io/node-sdk";

export const streamClient = new StreamClient(
  process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
  process.env.STREAM_VIDEO_SECRET_KEY!
);

export const streamVideo = new StreamVideoClient({
  streamClient,
  apiClient: streamClient.apiClient,
});