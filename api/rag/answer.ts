type Action = {
  type: "open_url" | "mailto";
  label: string;
  url: string;
};

const isBuyIntent = (question: string) => /\b(buy|purchase|order|shop|where to buy)\b/i.test(question);
const isPriceIntent = (question: string) => /\b(price|prices|cost|how much|pricing)\b/i.test(question);
const isComplaintIntent = (question: string) => /\b(complaint|complain|issue|problem|refund|quality|bad|expired|stale)\b/i.test(question);

const buildAnswer = (question: string) => {
  if (isPriceIntent(question) || isBuyIntent(question)) {
    return "You can buy Lipton tea from Daraz. I can open the Daraz Lipton listing for you now.";
  }

  if (isComplaintIntent(question)) {
    return "I’m sorry about your experience. Click the complaint action and I’ll open email with a pre-filled complaint draft.";
  }

  return "Thanks! I can help with Lipton teas, products, and recipes. Ask about green tea benefits, black tea options, brewing tips, or buying links.";
};

const buildActions = (question: string) => {
  const actions: Action[] = [];
  const complaintGmail = process.env.RAG_COMPLAINT_GMAIL ?? "";

  if (isPriceIntent(question) || isBuyIntent(question)) {
    actions.push({
      type: "open_url",
      label: "Open Daraz tea page",
      url: "https://www.daraz.pk/catalog/?q=lipton%20tea",
    });
  }

  if (isComplaintIntent(question) && complaintGmail) {
    const subject = encodeURIComponent("Lipton chatbot complaint");
    const body = encodeURIComponent(`Complaint from chatbot user:\n\n${question}`);
    actions.push({
      type: "mailto",
      label: "Send complaint email",
      url: `mailto:${complaintGmail}?subject=${subject}&body=${body}`,
    });
  }

  return actions;
};

export default function handler(request: any, response: any) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const question = String(request?.body?.question ?? "").trim();
  if (question.length < 2) {
    response.status(400).json({ error: "Invalid request body" });
    return;
  }

  response.status(200).json({
    question,
    retrieval: "fallback",
    answer: buildAnswer(question),
    actions: buildActions(question),
    matches: [
      {
        id: "lipton-home",
        url: "https://www.lipton.com/us/en/",
        title: "Lipton US",
        score: 1,
      },
    ],
  });
}
