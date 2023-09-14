import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createReadStream } from "node:fs";

import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post("/videos/:id/transcription", async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      prompt: z.string(),
    });

    const { id } = paramsSchema.parse(request.params);

    const { prompt } = bodySchema.parse(request.body);

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id,
      },
    });

    const videoPath = video.path;

    const audioReadStream = createReadStream(videoPath);

    const response = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "pt",
      response_format: "json",
      temperature: 0,
      prompt,
    });

    const transcription = response.text;

    await prisma.video.update({
      where: {
        id,
      },
      data: {
        transcription,
      },
    });

    return { transcription };
  });
}
