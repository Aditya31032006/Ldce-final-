import { ChatMistralAI } from '@langchain/mistralai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { createClubAgentTools } from './chat.tools.js';

/**
 * Initializes and executes the LangChain agent for the sports club owner/manager using Mistral AI,
 * streaming tokens and tool execution notifications directly to the caller via an SSE callback.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user ID
 * @param {string} params.clubId - Verified active club ID
 * @param {string} params.clubName - Name of the club
 * @param {string} params.userRole - User's role (owner, manager, admin)
 * @param {string} params.message - The latest user prompt
 * @param {Array<Object>} params.history - Array of previous { role: 'user' | 'assistant', content: string }
 * @param {Function} onEvent - Callback for SSE events: ({ type: string, [key: string]: any }) => void
 */
export async function streamClubChat({
  userId,
  clubId,
  clubName = 'Sports Facility',
  userRole = 'owner',
  message,
  history = [],
  onEvent
}) {
  const mistralKey = process.env.MISTRAL_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!mistralKey && !geminiKey) {
    throw new Error('Neither MISTRAL_API_KEY nor GEMINI_API_KEY is configured in backend environment.');
  }

  // 1. Instantiate Tools scoped to this specific user & club
  const tools = createClubAgentTools(userId, clubId);
  const toolMap = new Map();
  for (const t of tools) {
    toolMap.set(t.name, t);
  }

  // Model setup: Prefer Mistral AI ministral-8b-latest, with fallback options
  let activeProvider = mistralKey ? 'mistral' : 'gemini';
  let activeModelName = process.env.MISTRAL_MODEL || (mistralKey ? 'ministral-8b-latest' : 'gemini-flash-latest');

  const createChatModel = (provider, modelName) => {
    if (provider === 'mistral') {
      return new ChatMistralAI({
        model: modelName,
        apiKey: mistralKey,
        temperature: 0.15,
        maxTokens: 2500,
      });
    }
    return new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey: geminiKey,
      temperature: 0.15,
      maxOutputTokens: 2500,
    });
  };

  let modelWithTools = createChatModel(activeProvider, activeModelName).bindTools(tools);

  // Helper to invoke model with automatic fallback
  const invokeWithFallback = async (msgs) => {
    try {
      return await modelWithTools.invoke(msgs);
    } catch (err) {
      console.warn(`[Chatbot] Error on ${activeProvider} (${activeModelName}):`, err.message);
      // If Mistral hits rate limit or error, try codestral or Gemini if available
      if (activeProvider === 'mistral' && activeModelName !== 'codestral-latest') {
        console.warn(`[Chatbot] Retrying with codestral-latest...`);
        activeModelName = 'codestral-latest';
        modelWithTools = createChatModel('mistral', activeModelName).bindTools(tools);
        return await modelWithTools.invoke(msgs);
      } else if (geminiKey && activeProvider === 'mistral') {
        console.warn(`[Chatbot] Mistral exhausted. Falling back to Gemini...`);
        activeProvider = 'gemini';
        activeModelName = 'gemini-flash-latest';
        modelWithTools = createChatModel('gemini', activeModelName).bindTools(tools);
        return await modelWithTools.invoke(msgs);
      }
      throw err;
    }
  };

  // Helper to stream model with automatic fallback
  const streamWithFallback = async (msgs) => {
    try {
      return await modelWithTools.stream(msgs);
    } catch (err) {
      console.warn(`[Chatbot] Stream error on ${activeProvider} (${activeModelName}):`, err.message);
      if (activeProvider === 'mistral' && activeModelName !== 'codestral-latest') {
        activeModelName = 'codestral-latest';
        modelWithTools = createChatModel('mistral', activeModelName).bindTools(tools);
        return await modelWithTools.stream(msgs);
      } else if (geminiKey && activeProvider === 'mistral') {
        activeProvider = 'gemini';
        activeModelName = 'gemini-flash-latest';
        modelWithTools = createChatModel('gemini', activeModelName).bindTools(tools);
        return await modelWithTools.stream(msgs);
      }
      throw err;
    }
  };

  // 3. Craft Executive System Prompt
  const systemPrompt = `You are the Executive AI Strategic Advisor and COO/CFO Assistant for "${clubName}".
Your user is a verified ${userRole.toUpperCase()} of this facility.

You have access to live database tools providing real-time telemetry on:
- Sales, gross revenue & multi-stream financial attribution (memberships, court rentals, F&B bar POS, pro shop)
- Staff HR, headcount, departmental salary distribution, individual salaries & pending leave requests
- Court facility utilization, hourly base rates, peak traffic hours & customer reservations
- Member demographics, membership tiers, subscription fees & active subscriber retention
- Courtside Bar & Cafe POS orders, top culinary items, beverages & active kitchen tickets
- Pro Shop retail gear, stock quantity levels, low-stock reorder warnings & merchandise sales
- Club official details, operating hours & amenities

STRICT INSTRUCTIONS:
1. ALWAYS use the provided database tools to retrieve authentic figures. Never hallucinate or assume financial or operational numbers.
2. FORMATTING: Present monetary amounts in Indian Rupees (₹) with proper Indian numbering (e.g. ₹1,25,000 or ₹450).
3. STRUCTURE & READABILITY:
   - Use clean Markdown headers (### Header) for key sections.
   - Use bullet points with bold labels (e.g., "* **Metric Name:** Value — Details") to make lists easy to scan.
   - Use markdown tables (| Column 1 | Column 2 | Column 3 |) whenever presenting structured data like financial breakdowns, staff rosters, court schedules, or POS items.
   - Use blockquotes (> Key Insight:) for strategic executive takeaways or alerts.
   - Ensure proper spacing between paragraphs and lists for maximum legibility.
4. TENANT ISOLATION: You are strictly and architecturally isolated to "${clubName}". If the user ever asks about other clubs or global platform data outside this club, politely explain that your security clearance and tool scope are strictly bound to ${clubName}.
5. ACTIONABILITY: Conclude comprehensive queries with 1 or 2 high-level operational recommendations or key executive takeaways.
`;

  // 4. Assemble Messages Array
  const messages = [new SystemMessage(systemPrompt)];

  // Inject conversational history (up to last 10 valid non-empty messages)
  // Mistral strictly throws 400 (code 3240) if an AIMessage has empty content without tool_calls.
  if (Array.isArray(history)) {
    const validHistory = history.filter(
      h => h && typeof h.content === 'string' && h.content.trim().length > 0
    );
    const recentHistory = validHistory.slice(-10);
    for (const h of recentHistory) {
      if (h.role === 'user') {
        messages.push(new HumanMessage(h.content.trim()));
      } else if (h.role === 'assistant') {
        messages.push(new AIMessage(h.content.trim()));
      }
    }
  }

  // Add the current user message
  messages.push(new HumanMessage(message.trim()));

  // 5. Agent Tool Calling Loop (up to 4 iterations for chained tool queries)
  let loopCount = 0;
  const maxLoops = 4;

  while (loopCount < maxLoops) {
    loopCount++;
    const aiResponse = await invokeWithFallback(messages);
    messages.push(aiResponse);

    const toolCalls = aiResponse.tool_calls || [];
    if (toolCalls.length === 0) {
      if (aiResponse.content) {
        onEvent({ type: 'token', content: aiResponse.content });
      }
      break;
    }

    // Process all requested tool calls
    for (const call of toolCalls) {
      const toolInstance = toolMap.get(call.name);
      if (toolInstance) {
        onEvent({
          type: 'tool_start',
          name: call.name,
          args: call.args,
          label: formatToolLabel(call.name)
        });

        try {
          const toolResult = await toolInstance.invoke(call.args);

          messages.push(new ToolMessage({
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
            tool_call_id: call.id,
            name: call.name
          }));

          onEvent({
            type: 'tool_end',
            name: call.name,
            label: formatToolLabel(call.name),
            status: 'success'
          });
        } catch (toolErr) {
          console.error(`Tool execution error for ${call.name}:`, toolErr);
          messages.push(new ToolMessage({
            content: JSON.stringify({ error: toolErr.message || 'Tool failed to execute' }),
            tool_call_id: call.id,
            name: call.name
          }));
          onEvent({
            type: 'tool_end',
            name: call.name,
            label: formatToolLabel(call.name),
            status: 'error'
          });
        }
      }
    }

    const stream = await streamWithFallback(messages);
    let streamedAny = false;

    for await (const chunk of stream) {
      // Check if this chunk is requesting further tool calls
      if (chunk.tool_calls && chunk.tool_calls.length > 0) {
        streamedAny = false;
        break;
      }
      if (chunk.content) {
        streamedAny = true;
        onEvent({ type: 'token', content: chunk.content });
      }
    }

    if (streamedAny) {
      // Successfully streamed the answer
      break;
    }
  }

  // 6. Signal completion
  onEvent({ type: 'done' });
}

function formatToolLabel(toolName) {
  const map = {
    get_sales_and_revenue_metrics: 'Analyzing Sales & Revenue Streams...',
    get_staff_and_salary_diagnostics: 'Inspecting Workforce Salaries & HR Ledger...',
    get_court_operations_and_bookings: 'Querying Court Telemetry & Peak Hours...',
    get_members_and_subscription_plans: 'Retrieving Member Accounts & Subscriptions...',
    get_bar_and_cafe_pos_intelligence: 'Fetching Bar & Kitchen POS Analytics...',
    get_pro_shop_inventory_and_orders: 'Checking Pro Shop Inventory & Store Orders...',
    get_club_facility_profile: 'Accessing Facility Rules & Club Details...'
  };
  return map[toolName] || `Running ${toolName}...`;
}
