import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import fs from "fs"
import path from "path"

const ZAI_API_KEY = process.env.ZAI_API_KEY || ""
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://api.ilmu.ai/anthropic"
const ZAI_MODEL = process.env.ZAI_MODEL || "glm-5.1"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatRequest {
  message: string
  conversationHistory: Message[]
}

function getInventory() {
  const filePath = path.join(process.cwd(), "data", "inventory.json")
  const data = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(data)
}

function getSuppliers() {
  const filePath = path.join(process.cwd(), "data", "suppliers.json")
  const data = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(data)
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json()
    const { message, conversationHistory = [] } = body

    const inventory = getInventory()
    const suppliers = getSuppliers()

    const systemPrompt = `You are StockMaster AI, a procurement assistant for a milk tea shop in Malaysia. 

CURRENT INVENTORY (items with stock levels):
${JSON.stringify(inventory.items, null, 2)}

AVAILABLE SUPPLIERS AND PRICES:
${JSON.stringify(suppliers.suppliers, null, 2)}

INSTRUCTIONS:
1. When user mentions items that are low or out of stock, identify them from the inventory
2. Compare prices across suppliers to find the best deal
3. Present supplier comparisons clearly with prices in RM
4. When creating an order draft, include the item name, quantity, and supplier
5. Your responses are in English or Malay (depending on what the user uses)
6. The shop uses WhatsApp for ordering from suppliers
7. Format important information clearly with cards or structured text
8. Always be helpful and proactive about restocking suggestions
9. You understand Manglish (Malaysian English mix) like "susu tak ada liao" means "milk is out of stock"`

    const client = new OpenAI({
      apiKey: ZAI_API_KEY,
      baseURL: ZAI_BASE_URL,
    })

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.map((msg: Message) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ]

    const completion = await client.chat.completions.create({
      model: ZAI_MODEL,
      max_tokens: 2048,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    })

    const response = completion.choices[0]?.message?.content || "Sorry, I couldn't process that request."

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    )
  }
}