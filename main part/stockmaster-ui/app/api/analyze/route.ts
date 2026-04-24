import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const ZAI_API_KEY = process.env.ZAI_API_KEY || ""
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://api.ilmu.ai/anthropic"
const ZAI_VISION_MODEL = process.env.ZAI_VISION_MODEL || "glm-5.1"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const imageFile = formData.get("image") as File | null

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const mimeType = (imageFile.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp"

    const client = new OpenAI({
      apiKey: ZAI_API_KEY,
      baseURL: ZAI_BASE_URL,
    })

    const response = await client.chat.completions.create({
      model: ZAI_VISION_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: "text", text: "Analyze this fridge/storage photo for a milk tea shop. Identify items that are low or missing. Return a structured analysis with: 1) List of items detected, 2) Items that appear to be low or out of stock, 3) Recommended restock priorities." }
          ]
        }
      ]
    })

    const analysis = response.choices[0]?.message?.content || "Unable to analyze the image."

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Analyze API error:", error)
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    )
  }
}